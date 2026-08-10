// Derivations shared by the App and the focus view.
//
// The raw arm is NOT stored in a trace: it is the full record sliced from the point the baseline window
// ends, and the pipeline asserts that identity every time it bakes. Reconstructing it here rather than
// shipping a second copy keeps the payload down and, more importantly, keeps one definition of what the
// raw arm is. Two copies of a signal are two things that can disagree.

import type { FleetTrace } from './artifacts.ts';

export interface Arms {
  t: number[];
  raw: (number | null)[];
  residual: (number | null)[];
  offset: number;
}

/** The monitored window of one channel, on both arms, on a shared time axis. */
export function armsForChannel(trace: FleetTrace, channel: string): Arms {
  const mt = trace.monitored.t;
  const t0 = mt[0];
  // searchsorted, on an axis the pipeline guarantees is the record's own axis.
  let offset = trace.t.findIndex((v) => v >= t0);
  if (offset < 0) offset = 0;
  const raw = (trace.channels[channel] || []).slice(offset);
  const residual = trace.monitored.residual[channel] || [];
  return { t: mt, raw, residual, offset };
}

export type Arm = 'raw' | 'residual';

/** Detection delay in minutes, or null when the detector never fired after the onset. */
export function delayOf(trace: FleetTrace, detector: string, arm: Arm): number | null {
  return trace.detectors[detector]?.[arm]?.delay_min ?? null;
}

/** Alarms raised BEFORE the onset, which are false by construction. A healthy truck's every alarm is
 *  false, which is the whole reason healthy trucks are in the fleet at all. */
export function falseAlarmsBeforeOnset(trace: FleetTrace, detector: string, arm: Arm): number {
  const d = trace.detectors[detector]?.[arm];
  if (!d) return 0;
  const onset = trace.onset_t;
  return onset == null ? d.alarm_times.length : d.alarm_times.filter((t) => t < onset).length;
}

/** Which arm detected first: 'raw', 'residual', or null when neither did or the truck is healthy. */
export function fasterArm(trace: FleetTrace, detector: string): Arm | null {
  const r = delayOf(trace, detector, 'raw');
  const s = delayOf(trace, detector, 'residual');
  if (r == null && s == null) return null;
  if (r == null) return 'residual';
  if (s == null) return 'raw';
  if (r === s) return null;
  return s < r ? 'residual' : 'raw';
}

export const fmt = (v: number | null | undefined, digits = 0, dash = '-') =>
  v == null || !Number.isFinite(v) ? dash : v.toFixed(digits);

/** Contiguous runs of one regime label, for drawing bands and for counting occupancy. */
export function regimeRuns(regime: number[], t: number[]): Array<{ label: number; t0: number; t1: number }> {
  const runs: Array<{ label: number; t0: number; t1: number }> = [];
  if (regime.length === 0) return runs;
  let start = 0;
  for (let i = 1; i <= regime.length; i++) {
    if (i === regime.length || regime[i] !== regime[start]) {
      runs.push({ label: regime[start], t0: t[start], t1: t[Math.min(i, t.length - 1)] });
      start = i;
    }
  }
  return runs;
}

/** Fraction of monitored time spent in each regime label. -1 (unassigned) is reported as its own key. */
export function regimeOccupancy(regime: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const r of regime) counts.set(r, (counts.get(r) || 0) + 1);
  const total = regime.length || 1;
  const out = new Map<number, number>();
  for (const [k, v] of counts) out.set(k, v / total);
  return out;
}
