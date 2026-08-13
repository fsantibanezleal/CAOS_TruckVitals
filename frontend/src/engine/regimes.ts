// Regime segmentation and within-regime residuals, ported from `regimecpd/regime.py` and
// `regimecpd/residual.py`.
//
// The regime is learned from CONTEXT channels only, never from the channels being monitored. If a regime
// were defined using brake temperature and the fault is a dragging brake, the segmentation would absorb
// the fault and the residual would go flat: the comparison this product exists to make would be circular.
//
// `-1` means UNASSIGNED and is never snapped to the nearest cluster. A truck operating in a context the
// baseline never saw is a case where the residual is not trustworthy, and hiding it inside the closest
// regime is how a regime-conditional method quietly becomes one with an unmodelled failure case.

import { makeRng } from './rng.ts';
import { nanMean, nanMeanAbs, nanStd, quantile, robustScale } from './scaling.ts';

export interface RegimeLabels {
  labels: Int32Array;
  nRegimes: number;
  /** Fraction of monitored samples that fell inside a regime seen during fitting. */
  coverage: number;
  centroids: number[][];
  radii: number[];
}

/** Standardise the context so no single channel dominates the distance metric by its units alone. */
export class ContextScaler {
  mean_: Float64Array = new Float64Array(0);
  scale_: Float64Array = new Float64Array(0);

  fit(context: number[][]): this {
    const d = context[0]?.length ?? 0;
    const mean = new Float64Array(d);
    const spread = new Float64Array(d);
    const loc = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      const col = context.map((r) => r[j]);
      mean[j] = nanMean(col);
      spread[j] = nanStd(col);
      loc[j] = nanMeanAbs(col);
    }
    this.mean_ = mean;
    this.scale_ = robustScale(spread, loc);
    return this;
  }

  transform(context: number[][]): number[][] {
    return context.map((r) => r.map((v, j) => (v - this.mean_[j]) / this.scale_[j]));
  }
}

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let j = 0; j < a.length; j++) { const d = a[j] - b[j]; s += d * d; }
  return s;
}

/** k-means++ seeding, then Lloyd. An empty cluster is RE-SEEDED at the worst-served point rather than
 *  dropped: dropping it silently returns fewer regimes than requested, and every downstream report then
 *  describes a k it did not use. */
function lloyd(x: number[][], k: number, seed: number, maxIter = 300): number[][] {
  const rng = makeRng(seed);
  const centres: number[][] = [x[rng.int(x.length)].slice()];
  while (centres.length < k) {
    const d2 = x.map((p) => Math.min(...centres.map((c) => dist2(p, c))));
    const total = d2.reduce((a, b) => a + b, 0);
    if (!(total > 0)) { centres.push(x[rng.int(x.length)].slice()); continue; }
    let r = rng.uniform() * total;
    let idx = 0;
    while (idx < d2.length - 1 && (r -= d2[idx]) > 0) idx++;
    centres.push(x[idx].slice());
  }

  const dim = x[0].length;
  let labels = new Int32Array(x.length);
  for (let it = 0; it < maxIter; it++) {
    let moved = false;
    for (let i = 0; i < x.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < k; j++) {
        const d = dist2(x[i], centres[j]);
        if (d < bd) { bd = d; best = j; }
      }
      if (labels[i] !== best) { labels[i] = best; moved = true; }
    }
    const sums = Array.from({ length: k }, () => new Float64Array(dim));
    const counts = new Int32Array(k);
    for (let i = 0; i < x.length; i++) {
      counts[labels[i]]++;
      for (let j = 0; j < dim; j++) sums[labels[i]][j] += x[i][j];
    }
    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        for (let m = 0; m < dim; m++) centres[j][m] = sums[j][m] / counts[j];
      } else {
        // Re-seed at the point worst served by the current centres.
        let worst = 0;
        let wd = -1;
        for (let i = 0; i < x.length; i++) {
          const d = Math.min(...centres.map((c) => dist2(x[i], c)));
          if (d > wd) { wd = d; worst = i; }
        }
        centres[j] = x[worst].slice();
        moved = true;
      }
    }
    if (!moved && it > 0) break;
  }
  return centres;
}

export interface KMeansOptions {
  nRegimes: number;
  noveltyQuantile: number;
  noveltyFactor: number;
  seed: number;
}

export const DEFAULT_REGIME: KMeansOptions = {
  nRegimes: 6, noveltyQuantile: 0.99, noveltyFactor: 1.5, seed: 0,
};

export class KMeansRegimes {
  private scaler = new ContextScaler();
  centroids: number[][] = [];
  radii: number[] = [];

  constructor(private opts: KMeansOptions = DEFAULT_REGIME) {}

  fit(baselineContext: number[][]): this {
    const z = this.scaler.fit(baselineContext).transform(baselineContext);
    this.centroids = lloyd(z, this.opts.nRegimes, this.opts.seed);
    // Radius per cluster: the given quantile of the baseline distances to that centre. A monitored
    // sample farther than `noveltyFactor` times this is UNASSIGNED rather than forced into the cluster.
    const per: number[][] = Array.from({ length: this.opts.nRegimes }, () => []);
    for (const p of z) {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < this.centroids.length; j++) {
        const d = dist2(p, this.centroids[j]);
        if (d < bd) { bd = d; best = j; }
      }
      per[best].push(Math.sqrt(bd));
    }
    this.radii = per.map((ds) => (ds.length ? quantile(ds, this.opts.noveltyQuantile) : 0));
    return this;
  }

  predict(context: number[][]): RegimeLabels {
    const z = this.scaler.transform(context);
    const labels = new Int32Array(z.length);
    let assigned = 0;
    for (let i = 0; i < z.length; i++) {
      let best = -1;
      let bd = Infinity;
      for (let j = 0; j < this.centroids.length; j++) {
        const d = dist2(z[i], this.centroids[j]);
        if (d < bd) { bd = d; best = j; }
      }
      const r = this.radii[best] * this.opts.noveltyFactor;
      if (best >= 0 && Math.sqrt(bd) <= Math.max(r, 1e-12)) { labels[i] = best; assigned++; }
      else labels[i] = -1;
    }
    return {
      labels,
      nRegimes: this.opts.nRegimes,
      coverage: z.length ? assigned / z.length : 0,
      centroids: this.centroids,
      radii: this.radii,
    };
  }
}

/** Within-regime z-score. Statistics are fitted on the BASELINE only, per regime.
 *
 *  A regime with fewer than `minSamples` baseline samples is not usable: its residual would be a z-score
 *  against a mean and spread estimated from a handful of points. Samples in such a regime come back NaN,
 *  which every detector here treats as "no observation" rather than as zero. */
export class RegimeResidualizer {
  private mean_: Map<number, Float64Array> = new Map();
  private scale_: Map<number, Float64Array> = new Map();

  constructor(private minSamples = 20) {}

  fit(baseline: Record<string, Float64Array>, names: string[], labels: Int32Array): this {
    const byRegime = new Map<number, number[]>();
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] < 0) continue;
      if (!byRegime.has(labels[i])) byRegime.set(labels[i], []);
      byRegime.get(labels[i])!.push(i);
    }
    for (const [k, idx] of byRegime) {
      if (idx.length < this.minSamples) continue;
      const mean = new Float64Array(names.length);
      const scale = new Float64Array(names.length);
      const spread = new Float64Array(names.length);
      const loc = new Float64Array(names.length);
      names.forEach((name, j) => {
        const col = idx.map((i) => baseline[name][i]);
        mean[j] = nanMean(col);
        spread[j] = nanStd(col);
        // The channel's own magnitude, never the residual's mean. See scaling.ts.
        loc[j] = nanMeanAbs(col);
      });
      const scaled = robustScale(spread, loc);
      for (let j = 0; j < names.length; j++) scale[j] = scaled[j];
      this.mean_.set(k, mean);
      this.scale_.set(k, scale);
    }
    if (this.mean_.size === 0) {
      throw new Error(`no regime reached minSamples=${this.minSamples}; the baseline is too short `
        + 'or nRegimes is too high for it');
    }
    return this;
  }

  transform(x: Record<string, Float64Array>, names: string[], labels: Int32Array
  ): Record<string, Float64Array> {
    const out: Record<string, Float64Array> = {};
    names.forEach((name, j) => {
      const col = new Float64Array(labels.length);
      for (let i = 0; i < labels.length; i++) {
        const k = labels[i];
        const mean = this.mean_.get(k);
        const scale = this.scale_.get(k);
        col[i] = mean && scale ? (x[name][i] - mean[j]) / scale[j] : NaN;
      }
      out[name] = col;
    });
    return out;
  }
}
