// The detector ladder, ported from `regimecpd/classical.py`, `spc.py` and `drift.py`.
//
// Every detector returns a per-sample statistic where LARGER MEANS MORE ANOMALOUS, and none of them
// thresholds anything: the threshold is a fleet decision made later, at a matched false-alarm budget.
// That separation is what lets the same detector be read on the raw arm and on the residual arm without
// either being handed an operating point the other did not get.
//
// The multivariate statistic is a MAXIMUM across channels, which is why the degenerate-scale guard in
// scaling.ts matters so much: one channel with a nonsense z-score sets the statistic for every sample.

import { nanMeanAbs, nanStd, nanMean, robustScale } from './scaling.ts';

export interface Detection {
  t: Float64Array;
  /** across-channel maximum; NaN where no channel was observable */
  statistic: Float64Array;
  /** per-channel statistic, for attribution */
  perChannel: Record<string, Float64Array>;
  method: string;
}

export type DetectorName =
  | 'shewhart' | 'cusum' | 'ewma' | 'page-hinkley'
  | 'pca-spe' | 'pca-t2' | 'kswin' | 'adwin' | 'bocpd';

export const DETECTOR_LADDER: DetectorName[] = [
  'shewhart', 'cusum', 'ewma', 'page-hinkley', 'pca-spe', 'pca-t2', 'kswin', 'adwin', 'bocpd',
];

/** Which rungs are TIER-comparable, and what each is for. Shown in the App rather than hidden. */
export const DETECTOR_NOTES: Record<DetectorName, { tier: string; note: string }> = {
  shewhart: { tier: 'classical', note: 'Per-sample 3-sigma rule. No memory, so a slow ramp is invisible until it is large.' },
  cusum: { tier: 'classical', note: 'Accumulates deviation past a slack k. Built for small persistent shifts.' },
  ewma: { tier: 'classical', note: 'Exponentially weighted mean with an exact time-varying control limit.' },
  'page-hinkley': { tier: 'classical', note: 'A CUSUM variant from the same 1954 construction, NOT an independent rung.' },
  'pca-spe': { tier: 'multivariate', note: 'Squared error off a PCA fitted to healthy data: breaks in the correlation structure.' },
  'pca-t2': { tier: 'multivariate', note: 'Hotelling T-squared inside the retained subspace: movement along known modes.' },
  kswin: { tier: 'sota', note: 'Kolmogorov-Smirnov between a recent window and a reference window: distribution-free.' },
  adwin: { tier: 'sota', note: 'Adaptive windowing with a false-positive bound. Its integer statistic gives few budget points.' },
  bocpd: { tier: 'sota', note: 'Bayesian online change-point detection. Its independent-parameters assumption suits step changes, not slow ramps.' },
};

/** Per-channel location and scale, estimated once on a healthy baseline. */
class BaselineScaler {
  mean_: Float64Array = new Float64Array(0);
  scale_: Float64Array = new Float64Array(0);
  names_: string[] = [];

  fit(baseline: Record<string, Float64Array>, names: string[]): this {
    const mean = new Float64Array(names.length);
    const spread = new Float64Array(names.length);
    const loc = new Float64Array(names.length);
    names.forEach((name, j) => {
      mean[j] = nanMean(baseline[name]);
      spread[j] = nanStd(baseline[name]);
      // The channel's MAGNITUDE, not its signed mean. A residual arm's channels are centred on zero, so
      // a signed mean collapses the relative floor to atol and lets a dead channel through.
      loc[j] = nanMeanAbs(baseline[name]);
    });
    this.mean_ = mean;
    this.scale_ = robustScale(spread, loc);
    this.names_ = names;
    return this;
  }

  z(x: Record<string, Float64Array>, n: number): Float64Array[] {
    // rows of z, one per sample
    const out: Float64Array[] = [];
    for (let i = 0; i < n; i++) {
      const row = new Float64Array(this.names_.length);
      for (let j = 0; j < this.names_.length; j++) {
        row[j] = (x[this.names_[j]][i] - this.mean_[j]) / this.scale_[j];
      }
      out.push(row);
    }
    return out;
  }
}

function finalise(t: Float64Array, per: Float64Array[], names: string[], method: string): Detection {
  const n = t.length;
  const statistic = new Float64Array(n);
  const perChannel: Record<string, Float64Array> = {};
  names.forEach((name) => { perChannel[name] = new Float64Array(n); });
  for (let i = 0; i < n; i++) {
    let m = NaN;
    for (let j = 0; j < names.length; j++) {
      const v = per[i][j];
      perChannel[names[j]][i] = v;
      if (Number.isFinite(v) && (!Number.isFinite(m) || v > m)) m = v;
    }
    statistic[i] = m;
  }
  return { t, statistic, perChannel, method };
}

export interface DetectorParams {
  /** CUSUM slack, in standard deviations. */
  k: number;
  /** EWMA smoothing. */
  lam: number;
  /** Page-Hinkley tolerated drift. */
  delta: number;
  /** PCA variance retained. */
  varianceTarget: number;
  /** KSWIN reference and recent window sizes. */
  window: number;
  recent: number;
  /** ADWIN confidence. */
  adwinDelta: number;
}

export const DEFAULT_PARAMS: DetectorParams = {
  k: 0.5, lam: 0.1, delta: 0.05, varianceTarget: 0.95, window: 240, recent: 60, adwinDelta: 0.002,
};

/* ------------------------------------------------------------------ classical */

function shewhart(z: Float64Array[]): Float64Array[] {
  return z.map((row) => row.map(Math.abs) as unknown as Float64Array);
}

function cusum(z: Float64Array[], k: number): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const pos = new Float64Array(d);
  const neg = new Float64Array(d);
  return z.map((row) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }   // state carried, statistic undefined
      pos[j] = Math.max(0, pos[j] + row[j] - k);
      neg[j] = Math.max(0, neg[j] - row[j] - k);
      out[j] = Math.max(pos[j], neg[j]);
    }
    return out;
  });
}

function ewma(z: Float64Array[], lam: number): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const w = new Float64Array(d);
  const seen = new Int32Array(d);
  const asym = lam / (2 - lam);
  return z.map((row) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }
      w[j] = lam * row[j] + (1 - lam) * w[j];
      seen[j] += 1;
      // The EXACT time-varying limit. The asymptotic lambda/(2-lambda) overstates the spread of the
      // early samples, so a chart using it is quietly insensitive exactly where a fault would be new.
      const varr = asym * (1 - Math.pow(1 - lam, 2 * Math.max(seen[j], 1)));
      out[j] = Math.abs(w[j]) / Math.sqrt(varr);
    }
    return out;
  });
}

function pageHinkley(z: Float64Array[], delta: number): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const mUp = new Float64Array(d);
  const minUp = new Float64Array(d);
  const mDn = new Float64Array(d);
  const minDn = new Float64Array(d);
  return z.map((row) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }
      mUp[j] += row[j] - delta;
      minUp[j] = Math.min(minUp[j], mUp[j]);
      mDn[j] += -row[j] - delta;
      minDn[j] = Math.min(minDn[j], mDn[j]);
      out[j] = Math.max(mUp[j] - minUp[j], mDn[j] - minDn[j]);
    }
    return out;
  });
}

/* -------------------------------------------------------------- multivariate */

/** Jacobi eigendecomposition of a symmetric matrix. Small d here (9 channels), so this is ample. */
function jacobiEigen(a0: number[][], iters = 100): { values: number[]; vectors: number[][] } {
  const d = a0.length;
  const a = a0.map((r) => r.slice());
  let v: number[][] = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < iters; sweep++) {
    let off = 0;
    for (let p = 0; p < d; p++) for (let q = p + 1; q < d; q++) off += a[p][q] * a[p][q];
    if (off < 1e-24) break;
    for (let p = 0; p < d; p++) {
      for (let q = p + 1; q < d; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let i = 0; i < d; i++) {
          const aip = a[i][p];
          const aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[i][q] = s * aip + c * aiq;
        }
        for (let i = 0; i < d; i++) {
          const api = a[p][i];
          const aqi = a[q][i];
          a[p][i] = c * api - s * aqi;
          a[q][i] = s * api + c * aqi;
        }
        for (let i = 0; i < d; i++) {
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }
  const values = a.map((r, i) => r[i]);
  const order = values.map((val, i) => [val, i] as const).sort((x, y) => y[0] - x[0]);
  return {
    values: order.map(([val]) => val),
    vectors: order.map(([, i]) => v.map((r) => r[i])),
  };
}

/** PCA fitted to the healthy baseline; T-squared inside the retained subspace and SPE off it. */
function pca(z: Float64Array[], monitored: Float64Array[], varianceTarget: number, statistic: 't2' | 'spe') {
  const d = z[0]?.length ?? 0;
  const rows = z.filter((r) => r.every(Number.isFinite));
  if (rows.length < d + 2) return monitored.map(() => new Float64Array(d).fill(NaN));

  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of rows) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] += r[i] * r[j];
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= rows.length - 1;

  const { values, vectors } = jacobiEigen(cov);
  const total = values.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
  let acc = 0;
  let kKeep = 0;
  while (kKeep < d && acc / total < varianceTarget) { acc += Math.max(values[kKeep], 0); kKeep++; }
  kKeep = Math.max(1, Math.min(kKeep, d - 1));

  return monitored.map((row) => {
    const out = new Float64Array(d);
    if (!row.every(Number.isFinite)) { out.fill(NaN); return out; }
    const scores = vectors.map((vec) => vec.reduce((s, vj, j) => s + vj * row[j], 0));
    if (statistic === 't2') {
      let t2 = 0;
      for (let m = 0; m < kKeep; m++) t2 += (scores[m] * scores[m]) / Math.max(values[m], 1e-12);
      // T-squared is ONE number per sample, but this ladder reports a per-channel statistic so that
      // attribution works the same way for every rung. Each channel gets a contribution weight (its
      // loading on the retained components, scaled by the score), and the weights are then normalised so
      // the across-channel MAXIMUM is exactly T-squared: the reported statistic is the real quantity, and
      // the split between channels only says which of them carried it.
      //
      // Contributions SMEAR: a shift in one variable spreads across the others through the loadings, so
      // this ranks suspects and does not diagnose. Westerhuis et al. (2000) treat that properly.
      let mx = 0;
      for (let j = 0; j < d; j++) {
        let contrib = 0;
        for (let m = 0; m < kKeep; m++) {
          contrib += Math.abs(vectors[m][j] * scores[m]) / Math.sqrt(Math.max(values[m], 1e-12));
        }
        out[j] = contrib;
        if (contrib > mx) mx = contrib;
      }
      if (mx > 0) for (let j = 0; j < d; j++) out[j] = (out[j] / mx) * t2;
      else out.fill(t2 / Math.max(d, 1));
      return out;
    }
    // SPE: the part of the sample that the retained subspace cannot explain, per channel.
    const recon = new Float64Array(d);
    for (let m = 0; m < kKeep; m++) for (let j = 0; j < d; j++) recon[j] += scores[m] * vectors[m][j];
    for (let j = 0; j < d; j++) { const e = row[j] - recon[j]; out[j] = e * e; }
    return out;
  });
}

/* ----------------------------------------------------------------------- drift */

function ksStatistic(a: number[], b: number[]): number {
  const sa = a.slice().sort((x, y) => x - y);
  const sb = b.slice().sort((x, y) => x - y);
  let i = 0;
  let j = 0;
  let dmax = 0;
  while (i < sa.length && j < sb.length) {
    const v = Math.min(sa[i], sb[j]);
    while (i < sa.length && sa[i] <= v) i++;
    while (j < sb.length && sb[j] <= v) j++;
    dmax = Math.max(dmax, Math.abs(i / sa.length - j / sb.length));
  }
  return dmax;
}

function kswin(z: Float64Array[], window: number, recent: number): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const hist: number[][] = Array.from({ length: d }, () => []);
  return z.map((row) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }
      hist[j].push(row[j]);
      if (hist[j].length > window) hist[j].shift();
      if (hist[j].length < window) { out[j] = 0; continue; }
      const ref = hist[j].slice(0, window - recent);
      const rec = hist[j].slice(window - recent);
      out[j] = ksStatistic(ref, rec);
    }
    return out;
  });
}

function adwinCut(n0: number, n1: number, variance: number, delta: number): number {
  const n = n0 + n1;
  // Bifet and Gavalda (2007) Section 3.2 verbatim: m = 1 / (1/n0 + 1/n1). No minus one; that variant
  // matched neither the paper nor MOA and made the detector quieter than its stated guarantee.
  const m = 1 / (1 / Math.max(n0, 1) + 1 / Math.max(n1, 1));
  const logTerm = Math.log(2 / (delta / Math.max(n, 1)));
  return Math.sqrt((2 / m) * variance * logTerm) + (2 / (3 * m)) * logTerm;
}

function adwin(z: Float64Array[], delta: number, minSub = 5, maxWindow = 2000): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const windows: number[][] = Array.from({ length: d }, () => []);
  const counts = new Float64Array(d);
  return z.map((row) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }
      const w = windows[j];
      w.push(row[j]);
      if (w.length > maxWindow) w.shift();
      const n = w.length;
      if (n >= 2 * minSub) {
        const mean = w.reduce((a, b) => a + b, 0) / n;
        const variance = w.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
        const prefix = [0];
        for (const v of w) prefix.push(prefix[prefix.length - 1] + v);
        for (let split = minSub; split <= n - minSub; split++) {
          const m0 = prefix[split] / split;
          const m1 = (prefix[n] - prefix[split]) / (n - split);
          if (Math.abs(m0 - m1) > adwinCut(split, n - split, variance, delta)) {
            w.splice(0, split);
            counts[j] += 1;
            break;
          }
        }
      }
      // The statistic is the CUT COUNT: an integer, which is why this rung offers only d+1 distinct
      // operating points and rarely sits anywhere useful on a matched-budget curve.
      out[j] = counts[j];
    }
    return out;
  });
}

/** BOCPD, reduced to the quantity this product reads: p(run length <= warmup), i.e. "a change recently".
 *
 *  Two traps from the Python implementation are preserved. Under a constant hazard, p(r_t = 0 | x) is
 *  IDENTICALLY the hazard rate and carries no information, so the short-run mass is used instead. And
 *  without a warm-up, p(r <= w) is structurally 1 while t <= w, so every record would "detect" at
 *  sample zero. */
function bocpd(z: Float64Array[], hazardRate = 400, warmup = 40, maxRuns = 200): Float64Array[] {
  const d = z[0]?.length ?? 0;
  const H = 1 / hazardRate;
  const state = Array.from({ length: d }, () => ({
    runs: [0], probs: [1], mu: [0], kappa: [1], alpha: [1], beta: [1],
  }));
  return z.map((row, tIdx) => {
    const out = new Float64Array(d);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(row[j])) { out[j] = NaN; continue; }
      const s = state[j];
      const x = row[j];
      const pred = s.mu.map((mu, i) => {
        const scale2 = (s.beta[i] * (s.kappa[i] + 1)) / (s.alpha[i] * s.kappa[i]);
        const nu = 2 * s.alpha[i];
        const dx = (x - mu) / Math.sqrt(scale2);
        return Math.exp(-0.5 * (nu + 1) * Math.log1p((dx * dx) / nu)) / Math.sqrt(scale2);
      });
      const growth = s.probs.map((p, i) => p * pred[i] * (1 - H));
      const cp = s.probs.reduce((a, p, i) => a + p * pred[i] * H, 0);
      const newRuns = [0, ...s.runs.map((r) => r + 1)];
      const newProbs = [cp, ...growth];
      const newMu = [0, ...s.mu.map((mu, i) => (s.kappa[i] * mu + x) / (s.kappa[i] + 1))];
      const newKappa = [1, ...s.kappa.map((k) => k + 1)];
      const newAlpha = [1, ...s.alpha.map((a) => a + 0.5)];
      const newBeta = [1, ...s.beta.map((b, i) =>
        b + (s.kappa[i] * (x - s.mu[i]) * (x - s.mu[i])) / (2 * (s.kappa[i] + 1)))];
      const total = newProbs.reduce((a, b) => a + b, 0) || 1;
      // Prune, and carry the TRUE run length with each surviving hypothesis: after pruning, array
      // position is no longer the run length, and conflating them was a real defect in the Python.
      const keep = newProbs
        .map((p, i) => [p / total, i] as const)
        .filter(([p]) => p > 1e-4)
        .sort((a, b) => b[0] - a[0])
        .slice(0, maxRuns);
      s.runs = keep.map(([, i]) => newRuns[i]);
      s.probs = keep.map(([p]) => p);
      s.mu = keep.map(([, i]) => newMu[i]);
      s.kappa = keep.map(([, i]) => newKappa[i]);
      s.alpha = keep.map(([, i]) => newAlpha[i]);
      s.beta = keep.map(([, i]) => newBeta[i]);
      const norm = s.probs.reduce((a, b) => a + b, 0) || 1;
      s.probs = s.probs.map((p) => p / norm);
      out[j] = tIdx < warmup ? 0
        : s.probs.reduce((a, p, i) => a + (s.runs[i] <= warmup ? p : 0), 0);
    }
    return out;
  });
}

/* ------------------------------------------------------------------------ api */

export function runDetector(
  name: DetectorName,
  baseline: Record<string, Float64Array>,
  monitored: Record<string, Float64Array>,
  names: string[],
  t: Float64Array,
  params: DetectorParams = DEFAULT_PARAMS,
): Detection {
  const scaler = new BaselineScaler().fit(baseline, names);
  const nBase = baseline[names[0]].length;
  const zBase = scaler.z(baseline, nBase);
  const z = scaler.z(monitored, t.length);

  let per: Float64Array[];
  switch (name) {
    case 'shewhart': per = shewhart(z); break;
    case 'cusum': per = cusum(z, params.k); break;
    case 'ewma': per = ewma(z, params.lam); break;
    case 'page-hinkley': per = pageHinkley(z, params.delta); break;
    case 'pca-t2': per = pca(zBase, z, params.varianceTarget, 't2'); break;
    case 'pca-spe': per = pca(zBase, z, params.varianceTarget, 'spe'); break;
    case 'kswin': per = kswin(z, params.window, params.recent); break;
    case 'adwin': per = adwin(z, params.adwinDelta); break;
    case 'bocpd': per = bocpd(z); break;
    default: throw new Error(`unknown detector ${name}`);
  }
  return finalise(t, per, names, name);
}
