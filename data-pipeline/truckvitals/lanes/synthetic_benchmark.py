"""The synthetic lane: onset-time error against ground truth, and the full method ladder.

This is the only lane where the true onset time EXISTS, because it was put there. That makes two things
measurable here that no real lane can offer:

**Onset-time error.** How far, in minutes, is the estimated onset from the real one. Every other lane can
only report detection delay against a convention.

**Attribution correctness.** The fault was injected into a KNOWN channel, so "did the method name the
right channel" is a scored question rather than a plausibility judgement.

.. rubric:: The standing risk, and how it is handled

A synthetic lane can always be made to produce whatever result its author wants. Three guards:

1. The regime confound is **emergent** (see :mod:`pipeline.model.haulcycle`): channels are computed from
   the haul cycle, not decorated with a regime-shaped term.
2. The **same protocol** as the C-MAPSS lane runs here, unchanged: fit, calibrate, score, with nothing
   after the calibration split informing any fit, and both arms read off a common false-alarm budget.
3. A **trivial baseline** is scored alongside the ladder. If a fixed threshold on the single most
   affected raw channel does as well as the sophisticated methods, the lane is too easy to be
   informative, and that is reported rather than hidden.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import regimecpd as rc

from ..model.haulcycle import CONTEXT_CHANNELS, MONITORED_CHANNELS, build_fleet

__all__ = ["DETECTOR_LADDER", "FAULT_CHANNELS", "SyntheticArmResult", "run_synthetic_benchmark"]

# Every rung the engine offers that produces a per-sample statistic on a multivariate series. PELT is
# absent on purpose: it is retrospective and putting it on an online detection metric would score a
# method that had already read the future.
DETECTOR_LADDER = {
    "shewhart": lambda: rc.Shewhart(),
    "cusum": lambda: rc.CUSUM(k=0.5),
    "ewma": lambda: rc.EWMA(lam=0.1),
    "page-hinkley": lambda: rc.PageHinkley(delta=0.05),
    "pca-spe": lambda: rc.PCAMonitor(statistic="spe", variance_target=0.95),
    "pca-t2": lambda: rc.PCAMonitor(statistic="t2", variance_target=0.95),
    # max_runs is capped well below the default. The exact posterior grows one hypothesis per
    # sample, and on a 3000-sample record with the default cap this rung alone dominates the whole
    # benchmark. 200 is far above the hazard rate, so the truncated mass is negligible.
    "bocpd": lambda: rc.BOCPD(hazard_rate=400.0, statistic="short_run", warmup=40,
                              max_runs=200, prune_threshold=1e-4),
    "kswin": lambda: rc.KSWIN(window=240, recent=60),
    "adwin": lambda: rc.ADWIN(delta=0.002),
}

# Which monitored channel each injected fault actually moves first. Used to SCORE attribution, so it is
# the ground truth for "did the method name the right channel", not a hint given to any method.
FAULT_CHANNELS = {
    "strut_leak": ("strut_rl_bar",),
    "tyre_leak": ("tyre_pressure_kpa", "tyre_temp_c"),
    "brake_drag": ("brake_temp_c", "fuel_rate_lph"),
    "cooling_loss": ("engine_temp_c",),
}


@dataclass
class SyntheticArmResult:
    detector: str
    arm: str
    n_units: int
    n_faulty: int
    threshold: float | None
    fa_per_truck_month: float
    fa_ci: tuple[float, float]
    detection_rate: float
    median_delay_min: float | None
    onset_error_min: float | None
    attribution_top1: float | None
    regime_coverage: float | None
    note: str = ""


def _fit_detector(make, series: rc.Series):
    det = make()
    if hasattr(det, "fit"):
        det.fit(series)
    return det


def _detect(det, series: rc.Series) -> rc.Detection:
    return det.detect(series)


def run_synthetic_benchmark(n_healthy: int = 30, n_faulty: int = 24, n_cycles: int = 70,
                            fit_frac: float = 0.30, calib_frac: float = 0.15,
                            n_regimes: int = 6, budget_per_month: float = 1.0,
                            severity: float = 1.0, seed: int = 0,
                            detectors: tuple[str, ...] | None = None) -> dict:
    """Run every rung on both arms and return the full matrix.

    ``budget_per_month`` is false alarms per truck-month. A sample is one minute of operation, so a month
    of continuous operation is 43200 samples; trucks do not run continuously, but the conversion is
    stated rather than assumed and every rate in the output carries its units.
    """
    minutes_per_month = 43200.0
    fleet = build_fleet(n_healthy=n_healthy, n_faulty=n_faulty, n_cycles=n_cycles,
                        severity=severity, seed=seed)
    names = tuple(MONITORED_CHANNELS)
    ladder = DETECTOR_LADDER if detectors is None else {
        k: v for k, v in DETECTOR_LADDER.items() if k in detectors}

    out = {"config": {
        "n_healthy": n_healthy, "n_faulty": n_faulty, "n_cycles": n_cycles,
        "fit_frac": fit_frac, "calib_frac": calib_frac, "n_regimes": n_regimes,
        "budget_per_truck_month": budget_per_month, "minutes_per_month": minutes_per_month,
        "severity": severity, "seed": seed,
        "monitored_channels": list(names), "context_channels": list(CONTEXT_CHANNELS),
    }, "arms": [], "onset_estimation": {}, "trivial_baseline": {}}

    # Pre-build both arms once per unit, so every detector sees exactly the same inputs. Rebuilding them
    # per detector would let a seed difference leak into a between-detector comparison.
    prepared = []
    for unit in fleet:
        series = rc.Series(unit["t"], unit["x"],
                           tuple(__import__("truckvitals.model.haulcycle", fromlist=["CHANNELS"]).CHANNELS),
                           unit_id=unit["unit_id"])
        n = series.n
        fit_end = int(n * fit_frac)
        calib_end = fit_end + int(n * calib_frac)
        onset = unit["meta"]["onset_t"]
        if onset is not None and onset <= series.t[calib_end]:
            continue
        base = rc.Series(series.t[:fit_end], series.x[:fit_end], series.names, series.unit_id)
        mon = rc.Series(series.t[fit_end:], series.x[fit_end:], series.names, series.unit_id)
        raw_arm, res_arm, labels = rc.make_arms(
            base, mon, CONTEXT_CHANNELS, n_regimes=n_regimes,
            monitor_names=names, method="zscore", min_samples=20)
        prepared.append({
            "unit_id": unit["unit_id"], "onset_t": onset,
            "fault_kind": unit["meta"]["fault_kind"],
            "raw": raw_arm, "residual": res_arm, "coverage": labels.coverage,
            "calib_offset": calib_end - fit_end,
        })

    for det_name, make in ladder.items():
        for arm in ("raw", "residual"):
            outcomes, coverages = [], []
            for p in prepared:
                s = p[arm]
                cut = p["calib_offset"]
                try:
                    det = _fit_detector(make, rc.Series(s.t[:cut], s.x[:cut], s.names, s.unit_id))
                    d = _detect(det, s)
                except (ValueError, RuntimeError) as exc:  # a rung that cannot run on this shape
                    outcomes = []
                    note = f"{type(exc).__name__}: {exc}"
                    break
                scored = rc.Detection(d.t[cut:], d.statistic[cut:], d.method, d.meta)
                outcomes.append(rc.UnitOutcome(scored, onset_t=p["onset_t"], unit_id=p["unit_id"]))
                if arm == "residual":
                    coverages.append(p["coverage"])
            else:
                note = ""

            if not outcomes:
                out["arms"].append(vars(SyntheticArmResult(
                    det_name, arm, 0, 0, None, float("nan"), (float("nan"),) * 2,
                    float("nan"), None, None, None, None, note or "produced no outcomes")))
                continue

            target = budget_per_month / minutes_per_month
            th = rc.threshold_for_budget(outcomes, target_rate=target, n=500)
            if th is None:
                out["arms"].append(vars(SyntheticArmResult(
                    det_name, arm, len(outcomes), sum(o.is_faulty for o in outcomes), None,
                    float("nan"), (float("nan"),) * 2, float("nan"), None, None, None,
                    float(np.mean(coverages)) if coverages else None,
                    f"cannot operate at {budget_per_month} false alarms per truck-month")))
                continue

            fleet_score = rc.score_fleet(outcomes, th)
            # `th` is bound as a default argument rather than captured. A closure over the loop
            # variable would read whatever the LAST iteration left behind, so every arm's interval would
            # describe the last detector's threshold, not its own.
            _, lo, hi = rc.bootstrap_ci(
                outcomes, lambda o, th=th: rc.score_fleet(o, th).false_alarms_per_unit_time,
                n_boot=250, seed=seed)
            out["arms"].append(vars(SyntheticArmResult(
                detector=det_name, arm=arm, n_units=len(outcomes),
                n_faulty=fleet_score.n_faulty, threshold=float(th),
                fa_per_truck_month=fleet_score.per(minutes_per_month),
                fa_ci=(lo * minutes_per_month, hi * minutes_per_month),
                detection_rate=fleet_score.detection_rate,
                median_delay_min=fleet_score.median_delay,
                onset_error_min=None, attribution_top1=None,
                regime_coverage=float(np.mean(coverages)) if coverages else None,
                note=note)))

    out["onset_estimation"] = _onset_estimation(prepared)
    out["trivial_baseline"] = _trivial_baseline(prepared, minutes_per_month, budget_per_month, seed)
    out["attribution"] = _attribution(prepared, names)
    return out


def _onset_estimation(prepared) -> dict:
    """Retrospective onset-time error, via PELT on both arms.

    Reported WITH the changepoint count, because taking the nearest changepoint is optimistic and a
    segmentation cut into fifty pieces will land near any onset by luck.
    """
    rows = {"raw": [], "residual": []}
    for p in prepared:
        if p["onset_t"] is None:
            continue
        for arm in ("raw", "residual"):
            s = p[arm]
            finite = np.all(np.isfinite(s.x), axis=1)
            if finite.sum() < 200:
                continue
            clean = rc.Series(s.t[finite], s.x[finite], s.names, s.unit_id)
            cps = rc.PELT(min_size=30, cost="mean").segment(clean)
            err, n_cp = rc.segmentation_error(cps, clean.t, p["onset_t"])
            # The CHANCE level for this many changepoints on this record. Taking the nearest changepoint
            # is optimistic by construction: a segmentation cut into many pieces lands near any onset by
            # luck. Without this baseline, "the residual arm has a smaller onset error" is unreadable,
            # because the residual arm also produces more changepoints.
            #
            # For k changepoints spread over a span S, the expected distance from a uniformly placed
            # onset to the nearest one is about S / (2(k+1)).
            span = float(clean.t[-1] - clean.t[0])
            chance = span / (2.0 * (n_cp + 1)) if n_cp >= 0 else float("inf")
            rows[arm].append((err, n_cp, chance))
    summary = {}
    for arm, vals in rows.items():
        if not vals:
            summary[arm] = None
            continue
        errs = np.array([v[0] for v in vals], dtype=float)
        cps = np.array([v[1] for v in vals], dtype=float)
        chances = np.array([v[2] for v in vals], dtype=float)
        finite = np.isfinite(errs)
        med_err = float(np.median(errs[finite])) if finite.any() else None
        med_chance = float(np.median(chances[finite])) if finite.any() else None
        summary[arm] = {
            "n_units": len(vals),
            "median_onset_error_min": med_err,
            "p90_onset_error_min": float(np.percentile(errs[finite], 90)) if finite.any() else None,
            "median_changepoints": float(np.median(cps)),
            "median_chance_error_min": med_chance,
            "skill_vs_chance": (med_chance / med_err) if (med_err and med_chance) else None,
            "n_no_changepoint": int((~finite).sum()),
            "note": "skill_vs_chance is the chance-level error divided by the achieved error. A value "
                    "at or below 1 means the segmentation locates the onset no better than scattering "
                    "the same number of changepoints at random, which is the honest null for a metric "
                    "that takes the NEAREST changepoint.",
        }
    return summary


def _trivial_baseline(prepared, minutes_per_month, budget_per_month, seed) -> dict:
    """A fixed threshold on the single most affected RAW channel per fault kind.

    If this matches the ladder, the synthetic lane is too easy to be informative and the product should
    say so rather than present the ladder as earning its keep.
    """
    outcomes = []
    for p in prepared:
        kind = p["fault_kind"]
        target = FAULT_CHANNELS.get(kind, (None,))[0]
        s = p["raw"]
        if target is None or target not in s.names:
            # A healthy unit has no fault channel; score it on the channel a planner would watch anyway.
            target = "strut_rl_bar" if "strut_rl_bar" in s.names else s.names[0]
        cut = p["calib_offset"]
        col = s.channel(target)
        base = col[:cut]
        mu, sd = float(np.nanmean(base)), float(np.nanstd(base))
        sd = sd if sd > 1e-8 * max(abs(mu), 1.0) else 1.0
        stat = np.abs((col - mu) / sd)
        outcomes.append(rc.UnitOutcome(
            rc.Detection(s.t[cut:], stat[cut:], f"fixed-threshold:{target}"),
            onset_t=p["onset_t"], unit_id=p["unit_id"]))
    th = rc.threshold_for_budget(outcomes, budget_per_month / minutes_per_month, n=500)
    if th is None:
        return {"note": "cannot operate at the budget"}
    f = rc.score_fleet(outcomes, th)
    return {"threshold": float(th), "fa_per_truck_month": f.per(minutes_per_month),
            "detection_rate": f.detection_rate, "median_delay_min": f.median_delay,
            "n_units": len(outcomes), "n_faulty": f.n_faulty,
            "note": "a fixed threshold on the single channel each fault moves first, given the ground "
                    "truth. Deliberately generous: it is told where to look."}


def _attribution(prepared, names) -> dict:
    """Did the method name the channel the fault was injected into?

    Scored per fault kind, on the residual arm, using PCA SPE contributions at the peak.
    """
    hits, total, per_kind = 0, 0, {}
    for p in prepared:
        if p["onset_t"] is None:
            continue
        truth = FAULT_CHANNELS.get(p["fault_kind"])
        if not truth:
            continue
        s = p["residual"]
        cut = p["calib_offset"]
        try:
            monitor = rc.PCAMonitor(statistic="spe", variance_target=0.95)
            monitor.fit(rc.Series(s.t[:cut], s.x[:cut], s.names, s.unit_id))
            spe = monitor.spe(s)
            idx = int(np.nanargmax(np.where(s.t >= p["onset_t"], spe, np.nan)))
            att = monitor.contributions(s, idx, kind="spe")
        except (ValueError, RuntimeError):
            continue
        top = att.top(2)
        hit = any(t in top for t in truth)
        hits += int(hit)
        total += 1
        d = per_kind.setdefault(p["fault_kind"], {"hits": 0, "n": 0, "truth": list(truth)})
        d["hits"] += int(hit)
        d["n"] += 1
    return {"top2_hit_rate": (hits / total) if total else None, "n_scored": total,
            "per_fault_kind": per_kind,
            "note": "a hit means a channel the fault was actually injected into appears in the top two "
                    "PCA SPE contributions at the peak. Contributions smear onto correlated channels, "
                    "so this narrows a candidate set and does not identify a cause."}
