// LEARNED rungs for the live lane: an isolation forest and an autoencoder, both trained in the browser.
//
// These do not test a hypothesis about a change. They learn a model of NORMAL from the healthy baseline
// and score how far each sample sits from it. That is the right shape for this domain: a fleet has
// thousands of healthy machine-years and a handful of labelled failures, so a method that needs fault
// labels to train has almost nothing to train on.
//
// Both stack a WINDOW of consecutive samples into one feature vector, so they see a short trajectory
// rather than a point. A single sample of a haul truck says almost nothing: the same strut pressure is
// normal loaded and abnormal empty. The statistic lands on the window's LAST sample, which is the
// earliest moment the evidence exists.
//
// ONE-CLASS SVM IS NOT HERE. It is in the Python ladder and on the Benchmark page, but fitting one in the
// browser means shipping an SMO solver, and an approximation would be a third implementation of a method
// the parity gate could not check. Two learned rungs that are really the Python method beat three where
// one is a lookalike.

import { makeRng } from './rng.ts';
import { nanMeanAbs, nanStd, nanMean, robustScale } from './scaling.ts';

export interface LearnedResult {
  /** per-sample statistic, NaN where no complete window ends at that sample */
  statistic: Float64Array;
  /** per-channel attribution, spread from the window's reconstruction error */
  perChannel: Record<string, Float64Array>;
}

/** Standardise against the baseline, then stack `window` consecutive samples into one row. */
function featurise(baseline: Record<string, Float64Array>, x: Record<string, Float64Array>,
                   names: string[], n: number, window: number) {
  const mean = new Float64Array(names.length);
  const spread = new Float64Array(names.length);
  const loc = new Float64Array(names.length);
  names.forEach((nm, j) => {
    mean[j] = nanMean(baseline[nm]);
    spread[j] = nanStd(baseline[nm]);
    // The channel's MAGNITUDE, not its signed mean: a residual arm is centred on zero, which would
    // collapse the relative floor and let a dead channel through.
    loc[j] = nanMeanAbs(baseline[nm]);
  });
  const scale = robustScale(spread, loc);

  const rows: Float64Array[] = [];
  const index: number[] = [];
  for (let i = window - 1; i < n; i++) {
    const row = new Float64Array(names.length * window);
    let ok = true;
    for (let w = 0; w < window; w++) {
      for (let j = 0; j < names.length; j++) {
        const v = (x[names[j]][i - window + 1 + w] - mean[j]) / scale[j];
        if (!Number.isFinite(v)) { ok = false; break; }
        row[w * names.length + j] = v;
      }
      if (!ok) break;
    }
    if (ok) { rows.push(row); index.push(i); }   // placed at the window's LAST sample
  }
  return { rows, index, mean, scale };
}

function place(n: number, index: number[], scores: number[]): Float64Array {
  const out = new Float64Array(n).fill(NaN);
  for (let k = 0; k < index.length; k++) out[index[k]] = scores[k];
  return out;
}

/* ------------------------------------------------------------------ isolation forest */

interface INode { left?: INode; right?: INode; dim: number; split: number; size: number; depth: number }

function buildTree(rows: Float64Array[], idx: number[], depth: number, maxDepth: number,
                   rng: ReturnType<typeof makeRng>): INode {
  if (depth >= maxDepth || idx.length <= 1) {
    return { dim: -1, split: 0, size: idx.length, depth };
  }
  const d = rows[0].length;
  // Pick a dimension that actually varies in this node; a constant one cannot split anything.
  let dim = -1;
  let lo = 0;
  let hi = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const cand = rng.int(d);
    let mn = Infinity;
    let mx = -Infinity;
    for (const i of idx) { const v = rows[i][cand]; if (v < mn) mn = v; if (v > mx) mx = v; }
    if (mx > mn) { dim = cand; lo = mn; hi = mx; break; }
  }
  if (dim < 0) return { dim: -1, split: 0, size: idx.length, depth };

  const split = lo + rng.uniform() * (hi - lo);
  const left: number[] = [];
  const right: number[] = [];
  for (const i of idx) (rows[i][dim] < split ? left : right).push(i);
  if (!left.length || !right.length) return { dim: -1, split: 0, size: idx.length, depth };
  return {
    dim, split, size: idx.length, depth,
    left: buildTree(rows, left, depth + 1, maxDepth, rng),
    right: buildTree(rows, right, depth + 1, maxDepth, rng),
  };
}

/** Average path length of an unsuccessful BST search, the isolation-forest normaliser. */
function cFactor(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

function pathLength(node: INode, row: Float64Array): number {
  let cur = node;
  let depth = 0;
  while (cur.dim >= 0 && cur.left && cur.right) {
    cur = row[cur.dim] < cur.split ? cur.left : cur.right;
    depth++;
  }
  return depth + cFactor(cur.size);
}

/** Isolation Forest: anomalies are easier to isolate, so they sit at shorter average path length.
 *
 *  The statistic is NEGATED path length normalised to the standard score, so LARGER MEANS MORE ANOMALOUS,
 *  matching every other rung. Getting that direction wrong would be invisible: the chart would still look
 *  like a detector, and it would alarm on the healthiest samples. */
export function isolationForest(
  baseline: Record<string, Float64Array>, x: Record<string, Float64Array>, names: string[], n: number,
  { window = 10, nTrees = 200, sampleSize = 256, seed = 0 } = {},
): LearnedResult {
  const rng = makeRng(seed);
  const train = featurise(baseline, baseline, names, baseline[names[0]].length, window);
  const test = featurise(baseline, x, names, n, window);
  if (train.rows.length < 2 || !test.rows.length) {
    return { statistic: new Float64Array(n).fill(NaN), perChannel: {} };
  }

  const m = Math.min(sampleSize, train.rows.length);
  const maxDepth = Math.ceil(Math.log2(Math.max(m, 2)));
  const trees: INode[] = [];
  for (let t = 0; t < nTrees; t++) {
    // WITHOUT replacement, matching sklearn. Sampling with replacement puts duplicate points in a node,
    // which cannot be separated by any split and so shortens path lengths for reasons that have nothing
    // to do with how isolated a point is.
    const pool = Array.from({ length: train.rows.length }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    trees.push(buildTree(train.rows, pool.slice(0, m), 0, maxDepth, rng));
  }

  const c = cFactor(m);
  const scores = test.rows.map((row) => {
    let sum = 0;
    for (const tree of trees) sum += pathLength(tree, row);
    // 2^(-E[h]/c) in [0,1], larger = more anomalous.
    return Math.pow(2, -(sum / trees.length) / (c || 1));
  });

  // Attribution: how far each channel sits from its baseline range, within the scored window.
  const perChannel: Record<string, Float64Array> = {};
  names.forEach((nm, j) => {
    const col = new Float64Array(n).fill(NaN);
    for (let k = 0; k < test.index.length; k++) {
      let worst = 0;
      for (let w = 0; w < window; w++) worst = Math.max(worst, Math.abs(test.rows[k][w * names.length + j]));
      col[test.index[k]] = worst * scores[k];
    }
    perChannel[nm] = col;
  });

  return { statistic: place(n, test.index, scores), perChannel };
}

/* ----------------------------------------------------------------------- autoencoder */

/** A small dense autoencoder trained in the browser on the healthy baseline.
 *
 *  The statistic is reconstruction error: what the model of normal cannot reproduce. Trained with plain
 *  SGD and momentum on a few hundred windows, which takes tens of milliseconds at this size, so it can
 *  live behind a slider.
 *
 *  This is genuinely TRAINED here, not a shipped set of weights: change the fault, the severity or the
 *  seed and a new model is fitted to that truck's own healthy stretch. */
export function autoencoder(
  baseline: Record<string, Float64Array>, x: Record<string, Float64Array>, names: string[], n: number,
  { window = 10, hidden = 12, epochs = 40, lr = 0.05, seed = 0, stepsPerEpoch = 64 } = {},
): LearnedResult {
  const rng = makeRng(seed);
  const train = featurise(baseline, baseline, names, baseline[names[0]].length, window);
  const test = featurise(baseline, x, names, n, window);
  const d = names.length * window;
  if (train.rows.length < 8 || !test.rows.length) {
    return { statistic: new Float64Array(n).fill(NaN), perChannel: {} };
  }

  // Xavier-ish init, so the first forward pass is neither saturated nor vanishing.
  const s1 = Math.sqrt(6 / (d + hidden));
  const s2 = Math.sqrt(6 / (hidden + d));
  const W1 = new Float64Array(d * hidden);
  const b1 = new Float64Array(hidden);
  const W2 = new Float64Array(hidden * d);
  const b2 = new Float64Array(d);
  for (let i = 0; i < W1.length; i++) W1[i] = (rng.uniform() * 2 - 1) * s1;
  for (let i = 0; i < W2.length; i++) W2[i] = (rng.uniform() * 2 - 1) * s2;

  const mW1 = new Float64Array(W1.length);
  const mb1 = new Float64Array(b1.length);
  const mW2 = new Float64Array(W2.length);
  const mb2 = new Float64Array(b2.length);
  const momentum = 0.9;

  const h = new Float64Array(hidden);
  const out = new Float64Array(d);
  const dh = new Float64Array(hidden);

  const forward = (row: Float64Array) => {
    for (let k = 0; k < hidden; k++) {
      let s = b1[k];
      for (let j = 0; j < d; j++) s += row[j] * W1[j * hidden + k];
      h[k] = Math.tanh(s);
    }
    for (let j = 0; j < d; j++) {
      let s = b2[j];
      for (let k = 0; k < hidden; k++) s += h[k] * W2[k * d + j];
      out[j] = s;
    }
  };

  // Sampled steps rather than a full pass. The live lane fits one model per truck per arm, so a full
  // pass over every window took 3.9 seconds for the fleet: too slow to sit behind a slider. Sampling a
  // fixed number of windows per epoch keeps the fit quality (the statistic is reconstruction error on a
  // low-dimensional manifold, which converges quickly) and brings it under a second.
  const steps = Math.min(stepsPerEpoch, train.rows.length);
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let step = 0; step < steps; step++) {
      const row = train.rows[rng.int(train.rows.length)];
      forward(row);
      dh.fill(0);
      for (let j = 0; j < d; j++) {
        const err = (out[j] - row[j]) * (2 / d);
        b2[j] -= lr * (mb2[j] = momentum * mb2[j] + (1 - momentum) * err);
        for (let k = 0; k < hidden; k++) {
          const g = err * h[k];
          dh[k] += err * W2[k * d + j];
          W2[k * d + j] -= lr * (mW2[k * d + j] = momentum * mW2[k * d + j] + (1 - momentum) * g);
        }
      }
      for (let k = 0; k < hidden; k++) {
        const g0 = dh[k] * (1 - h[k] * h[k]);          // tanh'
        b1[k] -= lr * (mb1[k] = momentum * mb1[k] + (1 - momentum) * g0);
        for (let j = 0; j < d; j++) {
          const g = g0 * row[j];
          W1[j * hidden + k] -= lr * (mW1[j * hidden + k] =
            momentum * mW1[j * hidden + k] + (1 - momentum) * g);
        }
      }
    }
  }

  const scores: number[] = [];
  const perWindowChannel: number[][] = [];
  for (const row of test.rows) {
    forward(row);
    let sse = 0;
    const byChannel = new Array(names.length).fill(0);
    for (let j = 0; j < d; j++) {
      const e = (out[j] - row[j]) ** 2;
      sse += e;
      byChannel[j % names.length] += e;
    }
    scores.push(sse / d);
    perWindowChannel.push(byChannel);
  }

  const perChannel: Record<string, Float64Array> = {};
  names.forEach((nm, j) => {
    const col = new Float64Array(n).fill(NaN);
    for (let k = 0; k < test.index.length; k++) col[test.index[k]] = perWindowChannel[k][j] / window;
    perChannel[nm] = col;
  });

  return { statistic: place(n, test.index, scores), perChannel };
}
