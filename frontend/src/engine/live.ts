// The live lane: simulate a truck, segment it, residualise it, run the ladder, score it. In the browser.
//
// This is what makes the App a workbench rather than a slideshow of precooked traces. Every control the
// user touches re-enters here, and the numbers on screen are computed from the knobs rather than looked
// up. The engine it calls is gated against the Python one by `test/parity.test.ts`, so "live" does not
// mean "a second, different method".

import {
  CONTEXT_CHANNELS, MONITORED_CHANNELS, simulate, trueRegime,
  type Channel, type SimOptions, type TruckRecord,
} from './haulcycle.ts';
import { KMeansRegimes, RegimeResidualizer, type KMeansOptions, type RegimeLabels } from './regimes.ts';
import { DEFAULT_PARAMS, runDetector, type Detection, type DetectorName, type DetectorParams } from './detectors.ts';
import {
  alarmBudgetCurve, scoreFleet, scoreUnit, thresholdForBudget,
  type BudgetPoint, type FleetScore, type UnitOutcome,
} from './metrics.ts';

/** A sample is one minute of operation, which sets the units of every rate this product reports. */
export const MINUTES_PER_MONTH = 43200;

export interface LiveOptions {
  sim: Partial<SimOptions>;
  regime: Partial<KMeansOptions>;
  params: Partial<DetectorParams>;
  detector: DetectorName;
  /** Fraction of the record used to fit the regime and residual models. */
  fitFraction: number;
  /** Fraction used to calibrate the detector, after the fit window. */
  calibFraction: number;
  /** False alarms per truck-month the threshold is chosen to meet. */
  budgetPerMonth: number;
  /** Healthy trucks generated alongside the faulty ones. The false-alarm rate is measured on THEM. */
  nHealthy: number;
  /** Faulty trucks in the live fleet, INCLUDING the one on screen.
   *
   *  With one faulty truck the detection rate can only be 0 or 1, so the alarm-budget curve is a flat
   *  line at 1.00 and says nothing. Detection rate needs a denominator before it is a measurement. */
  nFaulty: number;
}

export const DEFAULT_LIVE: LiveOptions = {
  sim: {}, regime: {}, params: {},
  detector: 'cusum',
  fitFraction: 0.30,
  calibFraction: 0.15,
  budgetPerMonth: 1.0,
  nHealthy: 5,
  nFaulty: 6,
};

export interface ArmResult {
  arm: 'raw' | 'residual';
  detection: Detection;
  threshold: number | null;
  fleet: FleetScore | null;
  /** Delay on the FAULTY truck specifically, which is the one on screen. */
  delayMin: number | null;
  alarmTimes: number[];
  falseAlarmsBeforeOnset: number;
}

export interface LiveResult {
  truck: TruckRecord;
  /** Index in the full record where the monitored window starts. */
  fitEnd: number;
  calibEnd: number;
  monitoredT: Float64Array;
  labels: RegimeLabels;
  trueRegimeLabels: Int32Array;
  residual: Record<Channel, Float64Array>;
  raw: ArmResult;
  residualArm: ArmResult;
  /** Which arm found it first, or null when neither did. */
  faster: 'raw' | 'residual' | null;
  budgetCurve: { raw: BudgetPoint[]; residual: BudgetPoint[] };
  /** How well the discovered segmentation matches the regime a perfect segmenter would recover. */
  regimeAgreement: number;
  timings: { simulateMs: number; segmentMs: number; detectMs: number; scoreMs: number };
}

function slice(x: Record<Channel, Float64Array>, from: number, to?: number) {
  const out = {} as Record<Channel, Float64Array>;
  for (const k of Object.keys(x) as Channel[]) out[k] = x[k].slice(from, to);
  return out;
}

function contextRows(x: Record<Channel, Float64Array>, n: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) rows.push(CONTEXT_CHANNELS.map((c) => x[c][i]));
  return rows;
}

/** Adjusted Rand index between the discovered labels and the ground-truth regime. */
function adjustedRand(a: Int32Array, b: Int32Array): number {
  const pairs = new Map<string, number>();
  const ca = new Map<number, number>();
  const cb = new Map<number, number>();
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] < 0) continue;                       // unassigned samples are not scored either way
    n++;
    const key = `${a[i]}|${b[i]}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
    ca.set(a[i], (ca.get(a[i]) || 0) + 1);
    cb.set(b[i], (cb.get(b[i]) || 0) + 1);
  }
  if (n < 2) return NaN;
  const c2 = (k: number) => (k * (k - 1)) / 2;
  const sumPairs = [...pairs.values()].reduce((s, v) => s + c2(v), 0);
  const sumA = [...ca.values()].reduce((s, v) => s + c2(v), 0);
  const sumB = [...cb.values()].reduce((s, v) => s + c2(v), 0);
  const total = c2(n);
  const expected = (sumA * sumB) / total;
  const max = (sumA + sumB) / 2;
  return max === expected ? 0 : (sumPairs - expected) / (max - expected);
}

export function runLive(opts: Partial<LiveOptions> = {}): LiveResult {
  const o: LiveOptions = { ...DEFAULT_LIVE, ...opts };
  const params: DetectorParams = { ...DEFAULT_PARAMS, ...o.params };
  const t0 = performance.now();

  const truck = simulate(o.sim);
  const baseSeed = o.sim.seed ?? 1;
  // Healthy trucks are not filler. They are where the false-alarm rate is actually measured, and a
  // benchmark run only on faulty units cannot report one at all.
  const healthy = Array.from({ length: o.nHealthy }, (_, i) =>
    simulate({ ...o.sim, faultKind: 'none', seed: baseSeed * 1000 + i + 1 }));
  // The rest of the faulty fleet. Each gets its own seed and a slightly different onset, so detection
  // rate has a denominator and the budget curve has resolution instead of being 0 or 1.
  const faultyRest = Array.from({ length: Math.max(0, o.nFaulty - 1) }, (_, i) =>
    simulate({
      ...o.sim,
      seed: baseSeed * 7919 + i + 1,
      onsetFraction: Math.min(0.8, Math.max(0.25, (o.sim.onsetFraction ?? 0.55) + (i - 2) * 0.03)),
    }));
  const t1 = performance.now();

  const fitEnd = Math.floor(truck.n * o.fitFraction);
  const calibEnd = fitEnd + Math.floor(truck.n * o.calibFraction);
  const names = MONITORED_CHANNELS as string[];

  const segmentOne = (rec: TruckRecord) => {
    const fe = Math.floor(rec.n * o.fitFraction);
    const km = new KMeansRegimes({ nRegimes: 6, noveltyQuantile: 0.99, noveltyFactor: 1.5, seed: 0,
      ...o.regime });
    km.fit(contextRows(rec.x, fe));
    const monCtx: number[][] = [];
    for (let i = fe; i < rec.n; i++) monCtx.push(CONTEXT_CHANNELS.map((c) => rec.x[c][i]));
    const labels = km.predict(monCtx);
    const baseLabels = km.predict(contextRows(rec.x, fe));
    const res = new RegimeResidualizer(20)
      .fit(slice(rec.x, 0, fe) as Record<string, Float64Array>, names, baseLabels.labels)
      .transform(slice(rec.x, fe) as Record<string, Float64Array>, names, labels.labels);
    return { fe, labels, residual: res as Record<Channel, Float64Array> };
  };

  const seg = segmentOne(truck);
  const t2 = performance.now();

  const buildOutcomes = (arm: 'raw' | 'residual'): { outcomes: UnitOutcome[]; own: Detection } => {
    const outcomes: UnitOutcome[] = [];
    let own!: Detection;
    for (const rec of [truck, ...faultyRest, ...healthy]) {
      const s = rec === truck ? seg : segmentOne(rec);
      const ce = s.fe + Math.floor(rec.n * o.calibFraction);
      const head = ce - s.fe;                     // calibration length inside the monitored window
      const mon = arm === 'raw'
        ? (slice(rec.x, s.fe) as Record<string, Float64Array>)
        : (s.residual as Record<string, Float64Array>);
      const tMon = rec.t.slice(s.fe);
      const base = {} as Record<string, Float64Array>;
      for (const nme of names) base[nme] = mon[nme].slice(0, head);
      const det = runDetector(o.detector, base, mon, names, tMon, params);
      // Score only from the calibration boundary onward, so nothing the detector saw is counted.
      const keepFrom = head;
      const scored: Detection = {
        t: det.t.slice(keepFrom),
        statistic: det.statistic.slice(keepFrom),
        perChannel: det.perChannel,
        method: det.method,
      };
      if (rec === truck) own = det;
      outcomes.push({ unitId: rec === truck ? 'focus' : `${rec.onsetT === null ? 'H' : 'F'}${outcomes.length}`,
        t: scored.t, statistic: scored.statistic, onsetT: rec.onsetT });
    }
    return { outcomes, own };
  };

  const rawBuilt = buildOutcomes('raw');
  const resBuilt = buildOutcomes('residual');
  const t3 = performance.now();

  const target = o.budgetPerMonth / MINUTES_PER_MONTH;
  // Budgets stay in PER-TRUCK-MONTH units here. `alarmBudgetCurve` converts once, using `perUnits`;
  // converting here as well divided by 43200 twice, which made every budget render as 0.00 and every
  // threshold trivially satisfiable.
  const budgets = [0.25, 0.5, 1, 2, 5, 10];

  const finish = (arm: 'raw' | 'residual',
                  built: { outcomes: UnitOutcome[]; own: Detection }): ArmResult => {
    const th = thresholdForBudget(built.outcomes, target);
    const fleet = th === null ? null : scoreFleet(built.outcomes, th);
    const focus = built.outcomes[0];
    const score = th === null ? null : scoreUnit(focus, th);
    const alarms: number[] = [];
    if (th !== null) {
      for (let i = 0; i < built.own.statistic.length; i++) {
        const v = built.own.statistic[i];
        const prev = i > 0 ? built.own.statistic[i - 1] : NaN;
        if (Number.isFinite(v) && v > th && !(Number.isFinite(prev) && prev > th)) {
          alarms.push(built.own.t[i]);
        }
      }
    }
    return {
      arm,
      detection: built.own,
      threshold: th,
      fleet,
      delayMin: score?.delay ?? null,
      alarmTimes: alarms,
      falseAlarmsBeforeOnset: score?.nFalseAlarms ?? 0,
    };
  };

  const raw = finish('raw', rawBuilt);
  const residualArm = finish('residual', resBuilt);

  const curve = {
    raw: alarmBudgetCurve(rawBuilt.outcomes, budgets, MINUTES_PER_MONTH),
    residual: alarmBudgetCurve(resBuilt.outcomes, budgets, MINUTES_PER_MONTH),
  };
  const t4 = performance.now();

  const truthLabels = trueRegime(
    truck.x.payload_t.slice(seg.fe), truck.x.grade_pct.slice(seg.fe));

  let faster: 'raw' | 'residual' | null = null;
  if (raw.delayMin === null && residualArm.delayMin !== null) faster = 'residual';
  else if (residualArm.delayMin === null && raw.delayMin !== null) faster = 'raw';
  else if (raw.delayMin !== null && residualArm.delayMin !== null && raw.delayMin !== residualArm.delayMin) {
    faster = residualArm.delayMin < raw.delayMin ? 'residual' : 'raw';
  }

  return {
    truck,
    fitEnd: seg.fe,
    calibEnd,
    monitoredT: truck.t.slice(seg.fe),
    labels: seg.labels,
    trueRegimeLabels: truthLabels,
    residual: seg.residual,
    raw,
    residualArm,
    faster,
    budgetCurve: curve,
    regimeAgreement: adjustedRand(seg.labels.labels, truthLabels),
    timings: { simulateMs: t1 - t0, segmentMs: t2 - t1, detectMs: t3 - t2, scoreMs: t4 - t3 },
  };
}
