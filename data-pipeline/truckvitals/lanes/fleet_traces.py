"""Per-truck traces for the App: the whole pipeline on one machine, sample by sample.

The aggregate artifacts answer "does regime conditioning help across a fleet". They cannot answer "what
happened on THIS truck", which is the question a workbench exists for and the only view in which the
central idea is visible rather than asserted. This module bakes, for each selected truck, every stage of

    raw telemetry -> regime label -> within-regime residual -> detector statistic -> alarm -> onset

so the App can put the raw channel and its residual on the same time axis, with the same detector run on
both, and let the reader see why one fires late and the other early.

Both arms are built by exactly the same call the benchmark uses, so a trace cannot drift from the
measured result: `rc.make_arms` on a baseline window, then the same detector object on each arm. The
threshold shown per unit is the FLEET threshold from the matched-budget calibration, not a per-unit
threshold, because a per-unit threshold would be fitted on the record it is being judged on.
"""
from __future__ import annotations

import numpy as np
import regimecpd as rc

from ..model.haulcycle import CHANNELS, CONTEXT_CHANNELS, MONITORED_CHANNELS, build_fleet
from .synthetic_benchmark import DETECTOR_LADDER, FAULT_CHANNELS

__all__ = ["TRACE_DETECTORS", "build_fleet_traces"]

# The App shows a detector SELECTOR, not the whole ladder at once: nine statistics on one axis is a
# legend, not a reading. These four span the ladder's kinds (cumulative, exponentially weighted,
# multivariate projection residual, multivariate projection distance) and all four produce a
# per-sample statistic that is meaningful to plot. The full nine-rung comparison stays on Benchmark.
TRACE_DETECTORS = ("cusum", "ewma", "pca-spe", "pca-t2")

MINUTES_PER_MONTH = 43200.0


def _round(a, nd: int = 3) -> list:
    return [None if not np.isfinite(v) else round(float(v), nd) for v in np.asarray(a, dtype=float)]


def build_fleet_traces(n_healthy: int = 6, n_faulty: int = 8, n_cycles: int = 45,
                       fit_frac: float = 0.30, calib_frac: float = 0.15, n_regimes: int = 6,
                       budget_per_month: float = 1.0, seed: int = 0) -> dict:
    """Bake per-unit traces plus the fleet thresholds they are read against.

    Returns ``{"index": [...], "units": {unit_id: trace}, "config": {...}}``. The caller decides how to
    write it; the App fetches the index first and one unit at a time.
    """
    fleet = build_fleet(n_healthy=n_healthy, n_faulty=n_faulty, n_cycles=n_cycles, seed=seed)
    names = tuple(MONITORED_CHANNELS)

    prepared = []
    for unit in fleet:
        series = rc.Series(unit["t"], unit["x"], tuple(CHANNELS), unit_id=unit["unit_id"])
        n = series.n
        fit_end = int(n * fit_frac)
        calib_end = fit_end + int(n * calib_frac)
        onset = unit["meta"]["onset_t"]
        # A unit whose fault starts inside the window used to LEARN normal has no healthy baseline, so
        # the residual arm would be fitted on the fault. Dropped, and the drop is reported.
        if onset is not None and onset <= series.t[calib_end]:
            continue
        base = rc.Series(series.t[:fit_end], series.x[:fit_end], series.names, series.unit_id)
        mon = rc.Series(series.t[fit_end:], series.x[fit_end:], series.names, series.unit_id)
        raw_arm, res_arm, labels = rc.make_arms(base, mon, CONTEXT_CHANNELS, n_regimes=n_regimes,
                                                monitor_names=names, method="zscore", min_samples=20)
        prepared.append({
            "unit": unit, "series": series, "raw": raw_arm, "residual": res_arm, "labels": labels,
            "onset_t": onset, "fit_end": fit_end, "calib_end": calib_end,
            "calib_offset": calib_end - fit_end,
        })

    # Fleet thresholds, one per (detector, arm), chosen on the calibration stretch at the shared budget.
    # Same procedure as the benchmark: the threshold is a FLEET quantity and never fitted per unit.
    statistics: dict[tuple[str, str], list] = {}
    thresholds: dict[str, dict[str, float]] = {}
    for det_name in TRACE_DETECTORS:
        thresholds[det_name] = {}
        for arm in ("raw", "residual"):
            outcomes, stats = [], []
            for p in prepared:
                det = DETECTOR_LADDER[det_name]()
                s = p[arm]
                d = det.fit(rc.Series(s.t[:p["calib_offset"]], s.x[:p["calib_offset"]], s.names,
                                      s.unit_id)).detect(s)
                stats.append(d)
                outcomes.append(rc.UnitOutcome(detection=d, onset_t=p["onset_t"],
                                               unit_id=str(s.unit_id)))
            statistics[(det_name, arm)] = stats
            th = rc.threshold_for_budget(outcomes, budget_per_month / MINUTES_PER_MONTH)
            thresholds[det_name][arm] = float(th)

    index, units = [], {}
    for i, p in enumerate(prepared):
        unit, series = p["unit"], p["series"]
        uid = str(unit["unit_id"])
        meta = unit["meta"]
        mon_t = p["raw"].t

        # The App reconstructs the raw arm by slicing the full record, so that identity is asserted here
        # rather than assumed. If make_arms ever reorders, rescales or reindexes the raw arm, the App
        # would silently plot a different signal from the one the detector ran on, and every delay drawn
        # on the chart would be wrong while the page still rendered.
        offset = int(np.searchsorted(series.t, mon_t[0]))
        assert np.allclose(series.t[offset:], mon_t), f"{uid}: monitored window is not a slice of t"
        for j, name in enumerate(names):
            got = series.x[offset:, CHANNELS.index(name)]
            assert np.allclose(got, p["raw"].x[:, j], equal_nan=True), \
                f"{uid}: raw arm channel {name} is not the record sliced at fit_end"

        det_block = {}
        for det_name in TRACE_DETECTORS:
            det_block[det_name] = {}
            for arm in ("raw", "residual"):
                d = statistics[(det_name, arm)][i]
                th = thresholds[det_name][arm]
                # Alarms are EVENTS, not samples: a statistic that sits above the threshold for an hour
                # is one alarm an operator responds to, not sixty. Same convention as every rate in the
                # benchmark, which is why the two agree.
                edges = rc.rising_edges(np.asarray(d.statistic, dtype=float) > th)
                first_after = next((float(d.t[e]) for e in edges
                                    if p["onset_t"] is not None and d.t[e] >= p["onset_t"]), None)
                det_block[det_name][arm] = {
                    "statistic": _round(d.statistic, 4),
                    "threshold": round(th, 4),
                    "alarm_times": [float(d.t[e]) for e in edges],
                    "first_alarm_after_onset_t": first_after,
                    "delay_min": (None if first_after is None or p["onset_t"] is None
                                  else float(first_after - p["onset_t"])),
                }

        units[uid] = {
            "unit_id": uid,
            "fault_kind": meta["fault_kind"],
            "onset_t": None if p["onset_t"] is None else float(p["onset_t"]),
            "fault_channels": list(FAULT_CHANNELS.get(meta["fault_kind"], ())),
            "n_cycles": int(meta["n_cycles"]),
            "cycle_minutes": int(meta["cycle_minutes"]),
            "burn_in_cycles": int(meta["burn_in_cycles"]),
            # The FULL record, for the raw-channel view: the baseline window is part of the story.
            "t": _round(series.t, 1),
            "channels": {name: _round(series.x[:, j], 3) for j, name in enumerate(CHANNELS)},
            "phase": [int(v) for v in meta["phase"]],
            # The MONITORED window, where both arms and every detector live.
            "monitored": {
                "t": _round(mon_t, 1),
                "fit_end_t": float(series.t[p["fit_end"]]),
                "calib_end_t": float(series.t[p["calib_end"]]),
                "regime": [int(v) for v in p["labels"].labels],
                "regime_coverage": float(p["labels"].coverage),
                # The RAW arm is not stored: it is exactly `channels[name]` sliced from `fit_end_t`, and
                # a build gate asserts that, so shipping it again would be 30% of the payload spent on a
                # copy. The App slices. The RESIDUAL arm is stored because it is a different signal.
                "residual": {name: _round(p["residual"].x[:, j], 3) for j, name in enumerate(names)},
            },
            "detectors": det_block,
        }
        index.append({
            "unit_id": uid, "fault_kind": meta["fault_kind"],
            "onset_t": units[uid]["onset_t"],
            "fault_channels": units[uid]["fault_channels"],
            "regime_coverage": units[uid]["monitored"]["regime_coverage"],
        })

    return {
        "index": index,
        "units": units,
        "config": {
            "n_healthy": n_healthy, "n_faulty": n_faulty, "n_cycles": n_cycles,
            "fit_frac": fit_frac, "calib_frac": calib_frac, "n_regimes": n_regimes,
            "budget_per_truck_month": budget_per_month, "minutes_per_month": MINUTES_PER_MONTH,
            "seed": seed, "detectors": list(TRACE_DETECTORS),
            "channels": list(CHANNELS), "context_channels": list(CONTEXT_CHANNELS),
            "monitored_channels": list(names),
            "n_units_generated": len(fleet), "n_units_kept": len(prepared),
            "n_units_dropped_fault_in_baseline": len(fleet) - len(prepared),
        },
        "thresholds": thresholds,
    }
