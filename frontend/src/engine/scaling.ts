// The degenerate-scale guard, ported from `regimecpd/scaling.py`.
//
// This exists because of a defect found on real data, not in review. NASA C-MAPSS `sensor_06` holds
// 21.61 across an entire baseline window and reports a standard deviation of 7.1e-15, on 43 of 100
// units. Later in the record it reports the adjacent quantisation level, 21.60. That utterly ordinary
// 0.01 step becomes a z-score of 1.4e12, and a CUSUM accumulates it to 8.4e12 over a healthy stretch.
//
// Nothing crashes. Because the multivariate statistic is a maximum across channels, ONE unit doing this
// sets the fleet-wide threshold for an entire benchmark, and detection rate at a fixed false-alarm budget
// falls from 0.79 to 0.07. Every individual unit still looks fine; the benchmark simply reports that the
// method does not work.
//
// The rule: a channel is standardisable only when `sigma > max(atol, rtol * |location|)`. The relative
// term is the point, and the LOCATION passed in must be the channel's own magnitude, never a residual's
// mean. A residual's mean is approximately zero by construction, which collapses the floor to `atol` and
// reopens the hole one branch over (that was defect D1 of the 2026-08-10 engine review).

export const RTOL = 1e-8;
export const ATOL = 1e-12;

/** True where the spread is too small, relative to the channel's own magnitude, to standardise by. */
export function degenerateMask(spread: Float64Array, location: Float64Array): boolean[] {
  const out: boolean[] = [];
  for (let j = 0; j < spread.length; j++) {
    const floor = Math.max(ATOL, RTOL * Math.abs(location[j]));
    out.push(!(Number.isFinite(spread[j]) && spread[j] > floor));
  }
  return out;
}

/** `spread`, with degenerate channels replaced by 1 so they pass through in raw units. */
export function robustScale(spread: Float64Array, location: Float64Array): Float64Array {
  const mask = degenerateMask(spread, location);
  const out = new Float64Array(spread.length);
  for (let j = 0; j < spread.length; j++) out[j] = mask[j] ? 1.0 : spread[j];
  return out;
}

/** Mean of the finite entries of a column, or NaN when there are none. */
export function nanMean(col: ArrayLike<number>): number {
  let s = 0;
  let k = 0;
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (Number.isFinite(v)) { s += v; k++; }
  }
  return k ? s / k : NaN;
}

/** Population standard deviation of the finite entries (ddof = 0, matching numpy's default). */
export function nanStd(col: ArrayLike<number>): number {
  const m = nanMean(col);
  if (!Number.isFinite(m)) return NaN;
  let s = 0;
  let k = 0;
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (Number.isFinite(v)) { s += (v - m) * (v - m); k++; }
  }
  return k ? Math.sqrt(s / k) : NaN;
}

/** Mean absolute magnitude: the location the scale floor is measured against. */
export function nanMeanAbs(col: ArrayLike<number>): number {
  let s = 0;
  let k = 0;
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (Number.isFinite(v)) { s += Math.abs(v); k++; }
  }
  return k ? s / k : NaN;
}

export function median(values: number[]): number {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function quantile(values: number[], q: number): number {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return NaN;
  // Linear interpolation between order statistics, matching numpy's default.
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? v[lo] : v[lo] + (pos - lo) * (v[hi] - v[lo]);
}
