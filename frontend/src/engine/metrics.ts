// Fleet metrics, ported from `regimecpd/metrics.py`.
//
// Two conventions carry the whole meaning of every number this product reports.
//
// ALARMS ARE EVENTS, NOT SAMPLES. A statistic sitting above the threshold for an hour is ONE alarm an
// operator answers, not sixty. Every rate here counts rising edges.
//
// AN ALARM BEFORE THE ONSET IS NOT AN EARLY DETECTION. It is a false alarm, and detection is the first
// rising edge at or after the onset. Scoring it the other way rewards a detector for firing constantly.

export interface UnitOutcome {
  unitId: string;
  t: Float64Array;
  statistic: Float64Array;
  /** null for a healthy unit: every alarm on it is false, which is where the rate is measured. */
  onsetT: number | null;
}

export interface UnitScore {
  unitId: string;
  nFalseAlarms: number;
  healthyExposure: number;
  detected: boolean;
  delay: number | null;
  isFaulty: boolean;
  /** Fraction of healthy SAMPLES above the threshold. Event counting cannot tell a quiet detector from
   *  one pinned permanently on; this can, and it needs no onset labels. */
  healthyDuty: number;
}

export interface FleetScore {
  threshold: number;
  falseAlarmsPerUnitTime: number;
  nFalseAlarms: number;
  healthyExposure: number;
  detectionRate: number;
  nDetected: number;
  nFaulty: number;
  medianDelay: number | null;
  healthyDuty: number;
}

/** Indices where the mask transitions from not-alarming to alarming. A mask already true at index 0
 *  counts as an edge there: the record opens mid-excursion, and that is an alarm the operator sees. */
export function risingEdges(mask: boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < mask.length; i++) if (mask[i] && !(i > 0 && mask[i - 1])) out.push(i);
  return out;
}

export function scoreUnit(o: UnitOutcome, threshold: number): UnitScore {
  const mask = Array.from(o.statistic, (v) => Number.isFinite(v) && v > threshold);
  const edges = risingEdges(mask);
  const edgeTimes = edges.map((i) => o.t[i]);

  let nHealthy = 0;
  let nAlarmHealthy = 0;
  for (let i = 0; i < o.t.length; i++) {
    if (o.onsetT === null || o.t[i] < o.onsetT) {
      nHealthy++;
      if (mask[i]) nAlarmHealthy++;
    }
  }
  const duty = nHealthy ? nAlarmHealthy / nHealthy : 0;

  const span = o.t.length >= 2 ? o.t[o.t.length - 1] - o.t[0] : 0;
  const exposure = o.onsetT === null
    ? span
    : Math.max(0, Math.min(o.onsetT, o.t[o.t.length - 1]) - o.t[0]);

  if (o.onsetT === null) {
    return { unitId: o.unitId, nFalseAlarms: edgeTimes.length, healthyExposure: exposure,
      detected: false, delay: null, isFaulty: false, healthyDuty: duty };
  }
  const before = edgeTimes.filter((t) => t < o.onsetT!);
  const after = edgeTimes.filter((t) => t >= o.onsetT!);
  return {
    unitId: o.unitId,
    nFalseAlarms: before.length,
    healthyExposure: exposure,
    detected: after.length > 0,
    delay: after.length ? after[0] - o.onsetT : null,
    isFaulty: true,
    healthyDuty: duty,
  };
}

function median(v: number[]): number | null {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Pool per-unit scores. The false-alarm rate is total events over total healthy exposure, not a mean
 *  over units, so a unit observed for an hour cannot weigh the same as one observed for a year. */
export function poolScores(scores: UnitScore[], threshold = NaN): FleetScore {
  const faulty = scores.filter((s) => s.isFaulty);
  const detected = faulty.filter((s) => s.detected);
  const nFa = scores.reduce((a, s) => a + s.nFalseAlarms, 0);
  const exposure = scores.reduce((a, s) => a + s.healthyExposure, 0);
  return {
    threshold,
    falseAlarmsPerUnitTime: exposure > 0 ? nFa / exposure : NaN,
    nFalseAlarms: nFa,
    healthyExposure: exposure,
    detectionRate: faulty.length ? detected.length / faulty.length : NaN,
    nDetected: detected.length,
    nFaulty: faulty.length,
    medianDelay: median(detected.map((s) => s.delay!).filter((d) => d !== null)),
    healthyDuty: scores.length ? scores.reduce((a, s) => a + s.healthyDuty, 0) / scores.length : 0,
  };
}

export function scoreFleet(outcomes: UnitOutcome[], threshold: number): FleetScore {
  return poolScores(outcomes.map((o) => scoreUnit(o, threshold)), threshold);
}

/** A grid of thresholds spanning the pooled statistics, ascending.
 *
 *  QUANTILES of the pooled values, not a linear span. Detection statistics are heavily right-skewed, and
 *  a linear grid spends nearly all of its points in a region where nothing happens: the chosen threshold
 *  then lands a whole step away from the one Python picks, which is exactly what the parity gate caught. */
export function candidateThresholds(outcomes: UnitOutcome[], n = 200): number[] {
  const pooled: number[] = [];
  for (const o of outcomes) for (const v of o.statistic) if (Number.isFinite(v)) pooled.push(v);
  if (!pooled.length) return [];
  pooled.sort((a, b) => a - b);

  // numpy's default 'linear' interpolation between order statistics.
  const q = (p: number) => {
    const pos = (pooled.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return lo === hi ? pooled[lo] : pooled[lo] + (pos - lo) * (pooled[hi] - pooled[lo]);
  };
  const m = Math.max(2, n);
  const raw: number[] = [];
  for (let i = 0; i < m; i++) raw.push(q(i / (m - 1)));

  // np.unique: sorted and deduplicated.
  const grid = [...new Set(raw)].sort((a, b) => a - b);
  // One step above the maximum, so the "never fires" end of the curve is representable.
  const top = grid[grid.length - 1];
  grid.push(top === 0 ? Number.MIN_VALUE : top + Math.abs(top) * Number.EPSILON);
  return grid;
}

export const MAX_HEALTHY_DUTY = 0.05;

/** The most sensitive threshold whose false-alarm rate fits inside the budget.
 *
 *  The event-counted rate is NOT monotone in the threshold, and this function's shape is entirely due to
 *  that. At a very high threshold nothing crosses, in the middle the statistic crosses repeatedly, and at
 *  a very low threshold it sits above the line for the whole record, which is ONE excursion and so a
 *  superb rate for a detector that detects nothing.
 *
 *  Scanning the whole grid finds the qualifying pockets that a descend-until-violation search cannot
 *  reach; the DUTY cap excludes the degenerate always-on region. Duty needs no onset labels, so choosing
 *  on it is legitimate where choosing on detection rate would not be.
 *
 *  An earlier version stopped at the first violation from the never-fires end. On NASA C-MAPSS that left
 *  14 qualifying thresholds unreachable and cost a six-condition arm 0.046 against 0.276 available. */
export function thresholdForBudget(outcomes: UnitOutcome[], targetRate: number,
                                   n = 200, maxDuty = MAX_HEALTHY_DUTY): number | null {
  const qualifying: number[] = [];
  for (const th of candidateThresholds(outcomes, n)) {
    const s = scoreFleet(outcomes, th);
    if (Number.isFinite(s.falseAlarmsPerUnitTime)
      && s.falseAlarmsPerUnitTime <= targetRate && s.healthyDuty <= maxDuty) {
      qualifying.push(th);
    }
  }
  return qualifying.length ? Math.min(...qualifying) : null;
}

export interface BudgetPoint {
  budget: number;
  reachable: boolean;
  threshold: number | null;
  realised: number;
  detectionRate: number;
  medianDelay: number | null;
}

/** Detection across a sweep of budgets. One operating point is a choice; a curve is a measurement, and a
 *  method that wins only at one budget has not won. */
export function alarmBudgetCurve(outcomes: UnitOutcome[], budgets: number[],
                                 perUnits = 1): BudgetPoint[] {
  return budgets.map((b) => {
    const th = thresholdForBudget(outcomes, b / perUnits);
    if (th === null) {
      return { budget: b, reachable: false, threshold: null, realised: NaN,
        detectionRate: NaN, medianDelay: null };
    }
    const s = scoreFleet(outcomes, th);
    return {
      budget: b,
      reachable: true,
      threshold: th,
      realised: s.falseAlarmsPerUnitTime * perUnits,
      detectionRate: s.detectionRate,
      medianDelay: s.medianDelay,
    };
  });
}

/** Bootstrap over UNITS, never samples: consecutive samples of one machine are not independent, and a
 *  sample bootstrap reports an interval that narrows with the sampling rate. */
export function bootstrapCi(scores: UnitScore[], stat: (s: UnitScore[]) => number,
                            nBoot = 300, seed = 0): [number, number] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const reps: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    const pick = Array.from({ length: scores.length },
      () => scores[Math.floor(rand() * scores.length)]);
    const v = stat(pick);
    if (Number.isFinite(v)) reps.push(v);
  }
  if (!reps.length) return [NaN, NaN];
  reps.sort((x, y) => x - y);
  const at = (q: number) => reps[Math.min(reps.length - 1, Math.max(0, Math.round(q * (reps.length - 1))))];
  return [at(0.025), at(0.975)];
}
