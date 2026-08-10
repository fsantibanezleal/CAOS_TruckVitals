"""The central experiment: does conditioning on operating regime actually reduce false alarms?

One detector at a time, held identical across arms. The only thing that differs between arm A and arm B
is whether the detector sees raw channels or within-regime residuals. Everything else (the detector, its
hyperparameters, the calibration split, the alarm budget) is shared by construction rather than by
intention, because `regimecpd.make_arms` returns both arms over the same channels and the same time axis
and the detector cannot tell them apart.

.. rubric:: The protocol, fixed here so it cannot drift toward a flattering configuration

For each unit, its record is split on its own clock:

``[0, calib)``
    Healthy. Every arm gets the SAME stretch and spends it as its method requires. The residual arm
    spends ``[0, fit)`` on the regime and residual model and ``[fit, calib)`` on the detector; the raw
    arm has no regime model and spends all of ``[0, calib)`` on the detector.
``[calib, end]``
    Scored. False alarms are counted on the part before the onset; detection is measured after it.

Nothing after ``calib`` informs any fit, INCLUDING the channel selection, which reads the baseline
window only. That ordering is the guard against the leakage that makes a regime-conditioned residual
look good by having had the fault subtracted out of its own baseline.

.. rubric:: Two corrections, from an adversarial review rather than from testing

Both were real and both flattered the result, so they are recorded here rather than quietly fixed.

**The raw arm used to get a third of the healthy data.** It discarded ``[0, fit)`` entirely instead of
using it, so the residual arm learned from 90 cycles and the raw arm from 30, and the difference was
reported as the cost of regime variation. Equalising moved FD002 raw from 0.046 to 0.161 and FD004 raw
from 0.062 to 0.247, and left the single-condition arms untouched.

**The threshold used to be chosen on the data it was then scored on.** ``score_arm`` accepted a
``calibration`` argument and dropped it on the floor while this docstring described calibration as the
guard. It is now CROSS-FITTED over units. The documented calibration-window route is not merely unused,
it is unusable for a cumulative statistic: that window is where a CUSUM has just been reset to zero, so a
threshold taken from it overshoots the budget by 16x to 146x.

.. rubric:: What is reported, and in both directions

At a **fixed false-alarm budget**, the detection delay. And at a fixed detection delay, the false-alarm
rate. Reporting only one direction is how this class of result gets quietly gamed, so both are computed.

Every headline number carries a bootstrap interval resampled over **units**, never over samples, because
consecutive cycles of one engine are not independent observations.

.. rubric:: A negative result is a result

If conditioning does not reduce the false-alarm rate at a fixed delay, this module reports that with the
same intervals and the same prominence. The experiment is not instrumented to find a win.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import regimecpd as rc

__all__ = ["DETECTORS", "ArmResult", "ExperimentResult", "run_contrast"]


def _cusum(k: float = 0.5):
    return lambda: rc.CUSUM(k=k)


def _ewma(lam: float = 0.1):
    return lambda: rc.EWMA(lam=lam)


DETECTORS = {
    "shewhart": lambda: rc.Shewhart(),
    "cusum": _cusum(),
    "ewma": _ewma(),
    "page-hinkley": lambda: rc.PageHinkley(delta=0.05),
}


@dataclass
class ArmResult:
    """One arm of the contrast, scored at a common budget."""

    arm: str
    subset: str
    detector: str
    n_units: int
    n_faulty: int
    threshold: float | None
    false_alarms_per_unit_time: float
    fa_ci: tuple[float, float]
    fa_per_1000_cycles: float
    detection_rate: float
    median_delay: float | None
    n_false_alarms: int
    healthy_exposure: float
    regime_coverage: float | None = None
    note: str = ""


@dataclass
class ExperimentResult:
    arms: list[ArmResult] = field(default_factory=list)
    meta: dict = field(default_factory=dict)

    def by(self, subset: str, arm: str, detector: str) -> ArmResult | None:
        for a in self.arms:
            if a.subset == subset and a.arm == arm and a.detector == detector:
                return a
        return None


def _split_points(n: int, fit_cycles: int, calib_cycles: int) -> tuple[int, int]:
    """Split points in ABSOLUTE cycles, not fractions of the record.

    Fractions look natural and select the sample. Every C-MAPSS unit starts healthy and runs to failure,
    so a fraction-based fit window scales with total life: a long-lived unit gets a long healthy fit
    window and survives, a short-lived one has its fit window run past its own onset and is dropped. The
    first version used 25% + 15% and kept 38 of 100 FD001 units and 30 of 100 FD002 units, silently
    restricting the whole experiment to the longest-lived third of each fleet.

    Absolute windows are the same for every unit, so the only units dropped are those genuinely too short
    to provide a healthy fit and calibration stretch, and that count is returned rather than invisible.
    """
    return fit_cycles, fit_cycles + calib_cycles


def build_outcomes(subset, detector_name: str, arm: str, channels, *,
                   n_regimes: int = 6, fit_cycles: int = 40, calib_cycles: int = 30,
                   discrete_regimes: bool = False, residual_method: str = "zscore",
                   setting_decimals: int = 0,
                   max_units: int | None = None) -> tuple[list, list, float, dict]:
    """Score every unit in a subset under one arm.

    Returns ``(outcomes, calibration_scores, mean_regime_coverage, dropped)`` where ``dropped`` counts
    why units were excluded. That count is returned rather than logged, because a silent exclusion is how
    a benchmark quietly restricts itself to the easy part of a fleet.
    """
    make = DETECTORS[detector_name]
    outcomes, calibration, coverages = [], [], []
    dropped = {"too_short": 0, "onset_in_fit_window": 0, "regime_fit_failed": 0}
    units = subset.units if max_units is None else subset.units[:max_units]

    for unit in units:
        series = subset.series(unit, channels)
        n = series.n
        fit_end, calib_end = _split_points(n, fit_cycles, calib_cycles)
        if n < calib_end + 20:
            dropped["too_short"] += 1
            continue
        onset_t = unit["onset_t"]
        # A unit whose onset falls inside the fit or calibration window would put the fault into the
        # definition of normal. Skipping it is the honest response; silently keeping it is the leak.
        if onset_t is not None and onset_t <= series.t[calib_end]:
            dropped["onset_in_fit_window"] += 1
            continue

        if arm == "raw":
            # EQUAL HEALTHY BUDGET. The residual arm spends [0, fit) on its regime and residual model and
            # [fit, calib) on the detector, so it consumes `calib` healthy cycles in total. Giving the raw
            # arm only [fit, calib) hands it a third of the data and then reports the difference as the
            # cost of regime variation. An adversarial review measured that: equalising moves FD002 raw
            # from 0.046 to 0.161 and FD004 raw from 0.062 to 0.247, while leaving the single-condition
            # arms unchanged, because they have nothing to gain from a longer baseline. The raw arm now
            # gets the SAME healthy stretch and spends all of it on the only model it has.
            scored = series
            coverage = None
        else:
            ctx = subset.context(unit)
            base_full = subset.series(unit, tuple(series.names))
            ctx_series = rc.Series(base_full.t, np.column_stack([base_full.x, ctx]),
                                   tuple(series.names) + ("op1", "op2", "op3"), series.unit_id)
            b = rc.Series(ctx_series.t[:fit_end], ctx_series.x[:fit_end], ctx_series.names,
                          series.unit_id)
            m = rc.Series(ctx_series.t[fit_end:], ctx_series.x[fit_end:], ctx_series.names,
                          series.unit_id)
            if discrete_regimes:
                # Rounded to WHOLE units before combinations are formed. C-MAPSS operational settings
                # carry measurement noise in the last digits (34.9983, 41.9982), so at three decimals
                # nearly every row becomes its own regime, every regime holds one sample, and the
                # residual model cannot fit anything. That is exactly the "float noise makes every sample
                # its own regime" failure the segmenter documents, and on the first run it cost this
                # experiment its whole observed-regime arm: zero units survived, printed as a blank row.
                ctx_series = rc.Series(
                    ctx_series.t,
                    np.column_stack([base_full.x, np.round(ctx, setting_decimals)]),
                    ctx_series.names, series.unit_id,
                )
                b = rc.Series(ctx_series.t[:fit_end], ctx_series.x[:fit_end], ctx_series.names,
                              series.unit_id)
                m = rc.Series(ctx_series.t[fit_end:], ctx_series.x[fit_end:], ctx_series.names,
                              series.unit_id)
            try:
                _, scored, labels = rc.make_arms(
                    b, m, ("op1", "op2", "op3"),
                    n_regimes=None if discrete_regimes else n_regimes,
                    monitor_names=tuple(series.names),
                    method=residual_method, discrete=discrete_regimes, min_samples=8,
                )
            except ValueError:
                dropped["regime_fit_failed"] += 1
                continue
            coverage = labels.coverage
            coverages.append(coverage)

        # `scored` starts at sample 0 on the raw arm and at `fit_end` on the residual arm, because the
        # residual arm has already spent [0, fit_end) building its regime model. Both therefore end their
        # healthy stretch at the SAME absolute cycle, `calib_end`, which is the point of the change.
        head = calib_end if arm == "raw" else calib_end - fit_end

        det = make()
        det.fit(rc.Series(scored.t[:head], scored.x[:head], scored.names, scored.unit_id))
        detection = det.detect(scored)

        # Calibration scores come from the healthy stretch the detector was fitted on.
        calib_slice = detection.statistic[:head]
        calibration.append(calib_slice[np.isfinite(calib_slice)])

        # Score only from calib onward, so nothing the detector or the residual model saw is counted.
        keep = slice(head, None)
        scored_detection = rc.Detection(detection.t[keep], detection.statistic[keep],
                                        detection.method, detection.meta)
        outcomes.append(rc.UnitOutcome(scored_detection, onset_t=onset_t, unit_id=series.unit_id))

    pooled = np.concatenate(calibration) if calibration else np.empty(0)
    return (outcomes, pooled, float(np.mean(coverages)) if coverages else float("nan"), dropped)


def _fold_assignment(outcomes, k: int = 5) -> list[int]:
    """Stratified round-robin folds over UNITS, faulty and healthy assigned separately.

    Stratifying matters: with a handful of healthy units a plain round robin can leave a fold with no
    healthy exposure at all, and `threshold_for_budget` on such a fold has no false alarms to constrain
    it and returns the bottom of the grid. Deterministic, so a re-bake reproduces the artifact.
    """
    folds = [0] * len(outcomes)
    for group in (True, False):
        idx = [i for i, o in enumerate(outcomes) if o.is_faulty is group]
        for j, i in enumerate(idx):
            folds[i] = j % k
    return folds


def _pool(scores) -> rc.FleetScore:
    """Pool per-unit scores that were computed at DIFFERENT thresholds, one per fold.

    `rc.score_fleet` pools at a single threshold and cannot be used here, which is the whole reason this
    exists. The pooling convention is the engine's: false alarms are total events over total healthy
    exposure rather than a mean over units, so a short record cannot weigh the same as a long one.
    """
    faulty = [s for s in scores if s.is_faulty]
    detected = [s for s in faulty if s.detected]
    delays = np.array([s.delay for s in detected], dtype=float) if detected else np.empty(0)
    n_fa = sum(s.n_false_alarms for s in scores)
    exposure = sum(s.healthy_exposure for s in scores)
    return rc.FleetScore(
        threshold=float("nan"),  # there is no single threshold; the median is reported separately
        false_alarms_per_unit_time=(n_fa / exposure) if exposure > 0 else float("nan"),
        n_false_alarms=n_fa, healthy_exposure=exposure,
        detection_rate=(len(detected) / len(faulty)) if faulty else float("nan"),
        n_detected=len(detected), n_faulty=len(faulty),
        median_delay=float(np.median(delays)) if delays.size else None,
        mean_delay=float(np.mean(delays)) if delays.size else None,
        healthy_duty=float(np.mean([s.healthy_duty for s in scores])) if scores else 0.0,
    )


def score_arm(outcomes, calibration, *, arm: str, subset: str, detector: str,
              budget_per_1000: float = 1.0, coverage: float = float("nan"),
              n_boot: int = 400, seed: int = 0, n_folds: int = 5) -> ArmResult:
    """Score one arm at a fixed false-alarm budget expressed per 1000 cycles.

    ``calibration`` is accepted and deliberately UNUSED, and that is now stated rather than implied. It
    is kept in the signature because `build_outcomes` computes it and it is written into the artifact as
    provenance, and because removing it would silently change every caller. See the cross-fitting comment
    below for why the calibration-window route cannot serve as a threshold source here.
    """
    del calibration
    faulty = sum(1 for o in outcomes if o.is_faulty)
    if not outcomes:
        return ArmResult(arm, subset, detector, 0, 0, None, float("nan"), (float("nan"),) * 2,
                         float("nan"), float("nan"), None, 0, 0.0, coverage,
                         note="no unit survived the leakage-safe split")

    target = budget_per_1000 / 1000.0

    # CROSS-FITTED THRESHOLD. The threshold is a fitted quantity: it is chosen to satisfy a false-alarm
    # constraint. Choosing it on the same units whose false-alarm rate and detection rate are then
    # reported is leakage, and this function previously did exactly that while accepting a `calibration`
    # argument it never read, under a module docstring promising the opposite. An adversarial review
    # found it.
    #
    # The fix is a unit-level split rather than the calibration window. The documented calibration route
    # is not merely unused, it is UNUSABLE for a cumulative statistic: the calibration window is the
    # first cycles of the detector's own output, where a CUSUM has just been reset to zero, so a
    # threshold taken from there overshoots the budget by 16x to 146x.
    #
    # Each fold's threshold comes from the OTHER folds and is applied to units it has never seen. Only
    # healthy exposure informs the choice, so no onset label leaks either way.
    folds = _fold_assignment(outcomes, k=n_folds)
    per_unit, thresholds = [], []
    for f in range(max(folds) + 1 if folds else 0):
        held_in = [o for o, g in zip(outcomes, folds) if g != f]
        held_out = [o for o, g in zip(outcomes, folds) if g == f]
        if not held_in or not held_out:
            continue
        th_f = rc.threshold_for_budget(held_in, target_rate=target, n=600)
        if th_f is None:
            continue
        thresholds.append(float(th_f))
        per_unit.extend(rc.score_unit(o, th_f) for o in held_out)

    if not per_unit or not thresholds:
        return ArmResult(arm, subset, detector, len(outcomes), faulty, None, float("nan"),
                         (float("nan"),) * 2, float("nan"), float("nan"), None, 0, 0.0, coverage,
                         note=f"cannot operate at {budget_per_1000} false alarms per 1000 cycles")

    fleet = _pool(per_unit)
    threshold = float(np.median(thresholds))

    # Bootstrap the CROSS-FITTED per-unit scores, not a re-score at the median threshold. Resampling at
    # a single threshold would report an interval for a quantity that was never computed. Units, never
    # samples: consecutive cycles of one engine are not independent observations.
    rng = np.random.default_rng(seed)
    reps = []
    for _ in range(n_boot):
        pick = [per_unit[i] for i in rng.integers(0, len(per_unit), len(per_unit))]
        r = _pool(pick).false_alarms_per_unit_time
        if np.isfinite(r):
            reps.append(r)
    lo, hi = (float(np.percentile(reps, 2.5)), float(np.percentile(reps, 97.5))) if reps \
        else (float("nan"), float("nan"))
    return ArmResult(
        arm=arm, subset=subset, detector=detector, n_units=len(outcomes), n_faulty=faulty,
        threshold=float(threshold),
        false_alarms_per_unit_time=fleet.false_alarms_per_unit_time,
        fa_ci=(lo, hi),
        fa_per_1000_cycles=fleet.per(1000.0),
        detection_rate=fleet.detection_rate,
        median_delay=fleet.median_delay,
        n_false_alarms=fleet.n_false_alarms,
        healthy_exposure=fleet.healthy_exposure,
        regime_coverage=coverage,
    )


def run_contrast(subsets: dict, detector: str = "cusum", channels=None,
                 budget_per_1000: float = 1.0, n_regimes: int = 6,
                 max_units: int | None = None, seed: int = 0) -> ExperimentResult:
    """Run the full contrast across the provided subsets and both arms.

    ``subsets`` maps a subset name to a loaded :class:`~pipeline.lanes.cmapss.CMAPSSSubset`.
    """
    result = ExperimentResult(meta={
        "detector": detector, "budget_per_1000_cycles": budget_per_1000,
        "n_regimes": n_regimes, "seed": seed,
    })
    for name, subset in subsets.items():
        chans = channels
        if chans is None:
            from .cmapss import _informative_sensors
            chans = _informative_sensors(subset.units)
        result.meta.setdefault("channels", {})[name] = list(chans)

        for arm, kwargs in (
            ("raw", {}),
            ("residual-observed", {"discrete_regimes": True}),
            ("residual-clustered", {"discrete_regimes": False, "n_regimes": n_regimes}),
        ):
            # A single-condition subset has nothing to condition ON, so the residual arms are skipped
            # rather than run and reported as a null gain. Running them would put a meaningless row in
            # the table that reads like a measured non-effect.
            if arm != "raw" and subset.n_conditions == 1:
                continue
            outcomes, calib, cov, dropped = build_outcomes(
                subset, detector, "raw" if arm == "raw" else "residual", chans,
                max_units=max_units, **kwargs)
            scored = score_arm(outcomes, calib, arm=arm, subset=name, detector=detector,
                               budget_per_1000=budget_per_1000, coverage=cov, seed=seed)
            scored.note = (scored.note + f" dropped={dropped}").strip()
            result.arms.append(scored)
    return result
