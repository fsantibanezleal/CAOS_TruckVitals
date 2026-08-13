// A seeded RNG for the live lane.
//
// This does NOT reproduce numpy's PCG64 stream, and it cannot: numpy draws normals with a ziggurat over
// its own bit generator, and matching that in the browser would mean shipping a reimplementation of
// numpy's internals to no purpose. So the live simulator and the Python simulator produce DIFFERENT
// realisations from the same seed.
//
// That is fine and it is stated everywhere it matters, because the simulator is not what has to agree.
// The ENGINE has to agree: given the same input series, the regimes, residuals, detector statistics and
// fleet metrics computed in the browser must match the ones computed in Python. That is gated by
// `test/parity.test.ts` against a fixture Python bakes, and it is checked on the arrays themselves rather
// than on anything either side regenerates.

/** mulberry32: small, fast, and good enough for plausible sensor noise. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normals by Box-Muller, both variates kept so nothing is thrown away. */
export function normals(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const f = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * f;
    return u * f;
  };
}

export interface Rng {
  uniform(): number;
  normal(mean?: number, sd?: number): number;
  normalArray(n: number, mean?: number, sd?: number): Float64Array;
  int(maxExclusive: number): number;
}

export function makeRng(seed: number): Rng {
  const rand = mulberry32(seed);
  const norm = normals(rand);
  return {
    uniform: () => rand(),
    normal: (mean = 0, sd = 1) => mean + sd * norm(),
    normalArray(n, mean = 0, sd = 1) {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = mean + sd * norm();
      return out;
    },
    int: (maxExclusive) => Math.floor(rand() * maxExclusive),
  };
}
