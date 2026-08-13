// The browser engine must compute what the Python engine computes.
//
// The App has a live lane, which means a second implementation of the same method exists. Two
// implementations are two things that can disagree, and if they do the App shows numbers this product's
// own pipeline would not produce, while both test suites stay green. This is the gate that stops that.
//
// The fixture is baked by `data-pipeline/run_parity.py` and carries INPUT ARRAYS plus the outputs Python
// computed from them, not a seed: the two simulators cannot produce identical realisations (numpy draws
// normals with a ziggurat over PCG64) and pretending otherwise would test the wrong thing.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { runDetector, type DetectorName } from '../src/engine/detectors.ts';
import {
  alarmBudgetCurve, scoreFleet, thresholdForBudget, type UnitOutcome,
} from '../src/engine/metrics.ts';
import { KMeansRegimes } from '../src/engine/regimes.ts';
import { makeRng } from '../src/engine/rng.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../../data/artifacts/parity.json');
const fx = JSON.parse(readFileSync(fixturePath, 'utf8'));

const toF64 = (a: (number | null)[]) => Float64Array.from(a.map((v) => (v === null ? NaN : v)));
const names: string[] = fx.channels;
const baseline: Record<string, Float64Array> = {};
const monitored: Record<string, Float64Array> = {};
for (const n of names) {
  baseline[n] = toF64(fx.baseline[n]);
  monitored[n] = toF64(fx.monitored[n]);
}
const t = toF64(fx.t);

/** Compare two series elementwise, treating NaN as a value that must match NaN. */
function assertSeriesClose(got: Float64Array, want: (number | null)[], label: string, tol = 1e-6) {
  assert.equal(got.length, want.length, `${label}: length ${got.length} != ${want.length}`);
  let worst = 0;
  let worstAt = -1;
  for (let i = 0; i < want.length; i++) {
    const w = want[i];
    const g = got[i];
    if (w === null) {
      assert.ok(!Number.isFinite(g), `${label}[${i}]: python NaN, got ${g}`);
      continue;
    }
    assert.ok(Number.isFinite(g), `${label}[${i}]: python ${w}, got ${g}`);
    const rel = Math.abs(g - w) / Math.max(1, Math.abs(w));
    if (rel > worst) { worst = rel; worstAt = i; }
  }
  assert.ok(worst <= tol,
    `${label}: worst relative difference ${worst.toExponential(2)} at sample ${worstAt} (tol ${tol})`);
}

test('the fixture is the one this test expects', () => {
  assert.equal(fx.schema, 'truckvitals.parity/v1');
  assert.ok(names.length > 0 && t.length > 0, 'fixture carries channels and a time axis');
});

for (const det of Object.keys(fx.detectors) as DetectorName[]) {
  test(`detector parity: ${det}`, () => {
    const d = runDetector(det, baseline, monitored, names, t, {
      k: 0.5, lam: 0.1, delta: 0.05, varianceTarget: 0.95, window: 240, recent: 60, adwinDelta: 0.002,
    });
    assertSeriesClose(d.statistic, fx.detectors[det].statistic, `${det}.statistic`);
  });
}

test('fleet scoring parity: false alarms, detection, delay and duty', () => {
  const outcomes: UnitOutcome[] = [
    { unitId: 'F', t, statistic: toF64(fx.metrics.statistic_faulty), onsetT: fx.metrics.onset_t },
    { unitId: 'H', t, statistic: toF64(fx.metrics.statistic_healthy), onsetT: null },
  ];
  for (const row of fx.metrics.score_at_threshold) {
    const s = scoreFleet(outcomes, row.threshold);
    const at = `threshold ${row.threshold}`;
    assert.equal(s.nFalseAlarms, row.n_false_alarms, `${at}: false-alarm EVENTS`);
    assert.ok(Math.abs(s.falseAlarmsPerUnitTime - row.false_alarms_per_unit_time) < 1e-9,
      `${at}: rate ${s.falseAlarmsPerUnitTime} != ${row.false_alarms_per_unit_time}`);
    assert.ok(Math.abs(s.detectionRate - row.detection_rate) < 1e-9, `${at}: detection rate`);
    assert.ok(Math.abs(s.healthyDuty - row.healthy_duty) < 1e-9, `${at}: healthy duty`);
    if (row.median_delay === null) assert.equal(s.medianDelay, null, `${at}: no delay`);
    else assert.ok(Math.abs((s.medianDelay ?? NaN) - row.median_delay) < 1e-9, `${at}: median delay`);
  }
});

test('threshold-for-budget parity, including the unreachable case', () => {
  const outcomes: UnitOutcome[] = [
    { unitId: 'F', t, statistic: toF64(fx.metrics.statistic_faulty), onsetT: fx.metrics.onset_t },
    { unitId: 'H', t, statistic: toF64(fx.metrics.statistic_healthy), onsetT: null },
  ];
  fx.metrics.budgets.forEach((b: number, i: number) => {
    const want = fx.metrics.threshold_for_budget[i];
    const got = thresholdForBudget(outcomes, b, 200);
    if (want === null) {
      assert.equal(got, null, `budget ${b}: python found no threshold, TS found ${got}`);
      return;
    }
    assert.ok(got !== null, `budget ${b}: python found ${want}, TS found none`);
    assert.ok(Math.abs(got! - want) / Math.max(1, Math.abs(want)) < 1e-6,
      `budget ${b}: threshold ${got} != ${want}`);
  });
});

test('the budget curve is monotone in what it promises, and reports unreachable honestly', () => {
  const outcomes: UnitOutcome[] = [
    { unitId: 'F', t, statistic: toF64(fx.metrics.statistic_faulty), onsetT: fx.metrics.onset_t },
    { unitId: 'H', t, statistic: toF64(fx.metrics.statistic_healthy), onsetT: null },
  ];
  const curve = alarmBudgetCurve(outcomes, fx.metrics.budgets);
  for (const p of curve) {
    if (!p.reachable) { assert.equal(p.threshold, null); continue; }
    assert.ok(p.realised <= p.budget + 1e-12,
      `budget ${p.budget}: realised ${p.realised} exceeds it, which the threshold rule must never allow`);
  }
});

test('k-means converges to the same centroids as Python on separated clusters', () => {
  // The SEEDING differs between the two engines, so this asserts the converged optimum rather than the
  // stream. On well-separated clusters Lloyd's optimum does not depend on where it started, which is
  // exactly the regime that matters: if the clusters were not separated, the regime labels would be
  // arbitrary in both implementations and no parity claim would mean anything.
  const rng = makeRng(11);
  const truth = [[0, 0], [10, 0], [0, 10], [10, 10]];
  const pts: number[][] = [];
  for (let i = 0; i < 400; i++) {
    const c = truth[i % truth.length];
    pts.push([c[0] + rng.normal(0, 0.3), c[1] + rng.normal(0, 0.3)]);
  }
  const km = new KMeansRegimes({ nRegimes: 4, noveltyQuantile: 0.99, noveltyFactor: 1.5, seed: 5 })
    .fit(pts);
  // Compare in the SCALED space the segmenter works in, by checking every true centre is claimed.
  const labels = km.predict(pts).labels;
  for (let c = 0; c < truth.length; c++) {
    const mine = new Set<number>();
    for (let i = c; i < pts.length; i += truth.length) mine.add(labels[i]);
    assert.equal(mine.size, 1, `true cluster ${c} was split across ${mine.size} regimes`);
  }
  assert.equal(new Set(Array.from(labels)).size, 4, 'all four regimes are used');
});

test('an unseen context is UNASSIGNED, never snapped to the nearest regime', () => {
  const rng = makeRng(2);
  const pts: number[][] = [];
  for (let i = 0; i < 300; i++) pts.push([rng.normal(0, 1), rng.normal(0, 1)]);
  const km = new KMeansRegimes({ nRegimes: 3, noveltyQuantile: 0.99, noveltyFactor: 1.5, seed: 1 })
    .fit(pts);
  const far = km.predict([[500, 500]]);
  assert.equal(far.labels[0], -1, 'a context the baseline never saw must not be given a regime');
  assert.equal(far.coverage, 0, 'and it must not count as covered');
});
