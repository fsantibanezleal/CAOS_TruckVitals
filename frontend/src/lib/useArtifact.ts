// Pages read numbers from artifacts, never from literals in the page.
//
// This is not a style preference. An earlier version of this product's README carried a headline table
// typed by hand, and when the pipeline's numbers changed under an adversarial review the prose kept
// asserting the old ones. A page that renders from the artifact cannot do that: if the pipeline moves,
// the page moves, and if the artifact is missing the page says so instead of showing a stale figure.

import { useEffect, useState } from 'react';

export interface ArtifactState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useArtifact<T>(load: () => Promise<T>, deps: unknown[] = []): ArtifactState<T> {
  const [state, setState] = useState<ArtifactState<T>>({ data: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    load()
      .then((d) => { if (!cancelled) setState({ data: d, error: null, loading: false }); })
      .catch((e) => { if (!cancelled) setState({ data: null, error: String(e), loading: false }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Fixed-decimal formatter that shows a dash rather than "NaN" or "null" for a genuinely absent value. */
export const n = (v: number | null | undefined, digits = 2, dash = '-') =>
  v == null || !Number.isFinite(v) ? dash : v.toFixed(digits);

/** A percentage, from a fraction. */
export const pct = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? '-' : `${(v * 100).toFixed(digits)}%`;
