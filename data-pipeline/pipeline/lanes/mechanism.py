"""The mechanism, measured WITHOUT a detector, a threshold, an alarm convention or a budget.

Every number on the detection side of this product depends on choices: which detector, which threshold
rule, what counts as an alarm, which budget, which units survived the split. An adversarial review broke
three of four headline figures on exactly those choices while leaving the underlying idea untouched, and
the right response is to state the idea in a form none of them can reach.

The claim reduces to one sentence: **the fault's signature is small compared with the spread the
operating regime induces, and large compared with the spread WITHIN a regime.** That is a statement about
effect size, and it needs no detector at all.

For one unit and one channel:

    d_pooled  = |mean(faulty) - mean(healthy)| / sd(healthy, pooled across regimes)
    d_regime  = |mean(faulty) - mean(healthy)| / sd(healthy, within its own regime)

If the operating regime is what inflates the denominator, ``d_regime / d_pooled`` is large on a
multi-condition fleet and exactly 1 on a single-condition one, where there is only one regime and the two
denominators coincide by construction. The single-condition subsets are therefore a negative control that
nobody designed: they are what this same code returns on data with nothing to condition on.

.. rubric:: Why the denominators are estimated across the FLEET

A first version estimated both spreads from each unit's own healthy window. On C-MAPSS that window is as
short as 23 cycles, and split across six operating conditions it leaves regimes holding 1, 1, 3, 3, 4 and
11 samples. A within-regime standard deviation from 11 samples of a channel that barely moves is
approximately zero, and the ratio it produces is approximately infinite: that version reported a median
ratio of 2113, which is not a measurement of anything.

Both spreads now come from every unit's healthy stretch pooled, which is well conditioned (thousands of
samples per regime) and is also what a real deployment would do, since the regime structure is a property
of the fleet rather than of one machine. The per-unit part is only the shift, which is what varies.

.. rubric:: Regime-locked channels are counted, not divided by

Several C-MAPSS sensors are exactly constant within an operating condition and vary only because the
condition varies. They are the purest form of the effect under study, and they are also undefined as a
ratio. Dividing by their spread would report an infinity dressed as a finding, so they are excluded from
the ratio and COUNTED instead. The count is a result in its own right.
"""
from __future__ import annotations

import numpy as np

__all__ = ["regime_key", "fleet_denominators", "measure_mechanism"]

#: Relative floor for calling a spread real, matching `regimecpd.scaling`. A channel whose spread sits
#: below this fraction of its own magnitude is not standardisable; it is regime-locked or dead.
RTOL = 1e-8


def regime_key(ctx_rows: np.ndarray, decimals: int = 0) -> np.ndarray:
    """A discrete regime id per sample, from the DECLARED operating settings.

    Rounded to whole units before combining. C-MAPSS settings carry measurement noise in the last digits
    (34.9983, 41.9982), so at full precision nearly every row becomes its own regime. Verified on FD002:
    0 and 1 decimals both recover exactly the 6 declared conditions, while 2 decimals fragments them
    into 9.
    """
    _, ids = np.unique(np.round(ctx_rows, decimals), axis=0, return_inverse=True)
    return ids


def _healthy_slice(subset, unit, channels, max_cycles: int):
    """A unit's healthy prefix, ending strictly before its onset."""
    series = subset.series(unit, channels)
    ctx = subset.context(unit)
    onset_idx = series.n if unit["onset_t"] is None else int(np.searchsorted(series.t, unit["onset_t"]))
    end = min(max_cycles, onset_idx)
    return series, ctx, end


def fleet_denominators(subset, channels, *, healthy_cycles: int = 90, min_samples: int = 30):
    """Pooled and within-regime healthy spreads, estimated over the WHOLE fleet.

    Returns ``(sd_pooled, sd_within, n_regimes_used, regime_sizes)``. Within-regime spread is the root of
    the sample-weighted mean variance, which is the spread a regime-conditional model actually faces.
    """
    xs, ks = [], []
    for unit in subset.units:
        series, ctx, end = _healthy_slice(subset, unit, channels, healthy_cycles)
        if end < 5:
            continue
        xs.append(series.x[:end])
        ks.append(regime_key(ctx[:end]))
    if not xs:
        return None, None, 0, []

    x = np.vstack(xs)
    # Regime ids are recomputed on the STACKED context so they are comparable across units. Concatenating
    # per-unit ids would put two different conditions under the same integer.
    ctx_all = np.vstack([
        subset.context(u)[:e] for u, e in
        ((u, _healthy_slice(subset, u, channels, healthy_cycles)[2]) for u in subset.units)
        if e >= 5
    ])
    ids = regime_key(ctx_all)

    sd_pooled = np.nanstd(x, axis=0)
    variances, weights, sizes = [], [], []
    for k in np.unique(ids):
        member = ids == k
        n = int(np.count_nonzero(member))
        if n < min_samples:
            continue
        variances.append(np.nanvar(x[member], axis=0))
        weights.append(n)
        sizes.append(n)
    if not variances:
        return sd_pooled, None, 0, []
    w = np.asarray(weights, dtype=float)[:, None]
    sd_within = np.sqrt(np.sum(np.asarray(variances) * w, axis=0) / w.sum())
    return sd_pooled, sd_within, len(variances), sizes


def measure_mechanism(subset, channels, *, healthy_cycles: int = 90, faulty_tail: int = 30,
                      min_samples: int = 30) -> dict:
    """Effect size of the fault against a pooled and a within-regime denominator, over a subset."""
    sd_pooled, sd_within, n_reg, sizes = fleet_denominators(
        subset, channels, healthy_cycles=healthy_cycles, min_samples=min_samples)
    if sd_pooled is None or sd_within is None:
        return {"n_units": 0}

    magnitude = np.maximum(np.abs(np.asarray(sd_pooled)), 1.0)
    locked = sd_within <= RTOL * magnitude          # constant within a regime: undefined as a ratio
    usable = (sd_pooled > RTOL * magnitude) & ~locked

    rows = []
    for unit in subset.units:
        if unit["onset_t"] is None:
            continue
        series, _, end = _healthy_slice(subset, unit, channels, healthy_cycles)
        if end < 20 or series.n < end + faulty_tail + 10:
            continue
        shift = np.abs(np.nanmean(series.x[-faulty_tail:], axis=0) - np.nanmean(series.x[:end], axis=0))
        if not np.any(usable):
            continue
        d_p = shift[usable] / sd_pooled[usable]
        d_w = shift[usable] / sd_within[usable]
        good = np.isfinite(d_p) & np.isfinite(d_w) & (d_p > 0)
        if not np.any(good):
            continue
        # MEDIAN across channels, not maximum. The maximum is set by whichever channel has the most
        # marginal denominator and is not robust; the median describes the typical channel and is what
        # survives a change of channel set.
        rows.append({
            "d_pooled": float(np.median(d_p[good])),
            "d_within_regime": float(np.median(d_w[good])),
            "ratio": float(np.median(d_w[good] / d_p[good])),
        })

    if not rows:
        return {"n_units": 0}

    ratios = np.array([r["ratio"] for r in rows], dtype=float)
    dp = np.array([r["d_pooled"] for r in rows], dtype=float)
    dw = np.array([r["d_within_regime"] for r in rows], dtype=float)
    return {
        "n_units": len(rows),
        "n_regimes_used": int(n_reg),
        "regime_sizes": sorted(sizes),
        "n_channels": int(len(channels)),
        "n_channels_usable": int(np.count_nonzero(usable)),
        "n_channels_regime_locked": int(np.count_nonzero(locked)),
        "median_d_pooled": float(np.median(dp)),
        "d_pooled_p10": float(np.percentile(dp, 10)),
        "d_pooled_p90": float(np.percentile(dp, 90)),
        "median_d_within_regime": float(np.median(dw)),
        "d_within_p10": float(np.percentile(dw, 10)),
        "d_within_p90": float(np.percentile(dw, 90)),
        "ratio": float(np.median(ratios)),
        # The ratio is IDENTICAL for every unit, and that is a property of the quantity rather than a
        # coincidence: the unit's fault shift appears in the numerator of both effect sizes and cancels,
        # leaving the median over channels of sd_pooled / sd_within. So the ratio describes the DATA's
        # regime structure, not any unit's fault, and quoting a percentile interval for it would invent
        # an uncertainty it does not have. The spread that IS real is in d_pooled and d_within, reported
        # above, which vary from unit to unit with the size of the fault.
        "ratio_is_unit_invariant": bool(np.allclose(ratios, ratios[0])),
        "ratio_note": (
            "median over channels of sd_pooled / sd_within on the healthy fleet baseline. The per-unit "
            "fault shift cancels, so this is a property of the operating-regime structure and is "
            "identical for every unit in the subset."),
    }
