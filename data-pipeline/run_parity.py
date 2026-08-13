#!/usr/bin/env python3
"""Bake the PARITY fixture: what the Python engine computes, for the browser engine to be checked against.

    python data-pipeline/run_parity.py

The App has a live lane. That means a second implementation of the engine exists, in TypeScript, and two
implementations of the same method are two things that can disagree. If they do, the App shows numbers
the product's own pipeline would not produce, and nothing in either test suite notices.

So the browser engine is gated on THIS file. Python writes inputs and the outputs it computes from them;
`frontend/test/parity.test.ts` recomputes both in TypeScript and asserts they match.

.. rubric:: What is compared, and what deliberately is not

Compared, because it is deterministic given the inputs: the baseline scaler, every classical detector
statistic, the within-regime residual given fixed labels, and every fleet metric (rising edges, false
alarms, detection, delay, the threshold chosen for a budget, the budget curve).

NOT compared bit for bit: the SIMULATOR and k-means SEEDING. numpy draws normals with a ziggurat over
PCG64 and reproducing that stream in the browser would mean shipping a reimplementation of numpy's
internals for no benefit, so the two simulators produce different realisations from the same seed. The
fixture therefore carries the ACTUAL ARRAYS rather than a seed, and the browser is checked on those.
k-means is checked separately, on its converged centroids over well-separated clusters, where Lloyd's
optimum does not depend on the seeding.
"""
from __future__ import annotations

import argparse
import platform
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import regimecpd as rc
from truckvitals.jsonio import write_json
from truckvitals.model.haulcycle import CONTEXT_CHANNELS, MONITORED_CHANNELS, HaulTruckSimulator, Fault

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"

DETECTORS = {
    "shewhart": lambda: rc.Shewhart(),
    "cusum": lambda: rc.CUSUM(k=0.5),
    "ewma": lambda: rc.EWMA(lam=0.1),
    "page-hinkley": lambda: rc.PageHinkley(delta=0.05),
}


def _round(a, nd=6):
    return [None if not np.isfinite(v) else round(float(v), nd) for v in np.asarray(a, float)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=None)
    ap.add_argument("--n-cycles", type=int, default=14)
    args = ap.parse_args()
    out_dir = Path(args.output) if args.output else CANONICAL

    # One faulty truck, short enough that the fixture stays small and long enough that a ramp develops.
    sim = HaulTruckSimulator(seed=7)
    cycle_len = (sim.cycle.load_min + sim.cycle.haul_min + sim.cycle.dump_min + sim.cycle.return_min)
    n_total = args.n_cycles * cycle_len
    onset = int(n_total * 0.55)
    t, x, meta = sim.simulate(args.n_cycles,
                              fault=Fault(kind="strut_leak", onset_index=onset,
                                          ramp_min=int(n_total * 0.2), severity=1.0))
    from truckvitals.model.haulcycle import CHANNELS
    cols = {name: x[:, j] for j, name in enumerate(CHANNELS)}

    fit_end = int(len(t) * 0.30)
    names = tuple(MONITORED_CHANNELS)

    baseline = {n: cols[n][:fit_end] for n in names}
    monitored = {n: cols[n][fit_end:] for n in names}
    t_mon = t[fit_end:]

    payload = {
        "schema": "truckvitals.parity/v1",
        "python": platform.python_version(),
        "numpy": np.__version__,
        "regimecpd_version": rc.__version__,
        "why": (
            "Inputs and the outputs the PYTHON engine computes from them. frontend/test/parity.test.ts "
            "recomputes these in TypeScript and asserts they match, so the App's live lane cannot drift "
            "from the pipeline that produces every other number on the site."),
        "channels": list(names),
        "context_channels": list(CONTEXT_CHANNELS),
        "fit_end": fit_end,
        "onset_t": float(onset),
        "t": _round(t_mon, 3),
        "baseline": {n: _round(baseline[n], 6) for n in names},
        "monitored": {n: _round(monitored[n], 6) for n in names},
        "detectors": {},
        "metrics": {},
    }

    base_series = rc.Series(t[:fit_end], np.column_stack([baseline[n] for n in names]), names)
    mon_series = rc.Series(t_mon, np.column_stack([monitored[n] for n in names]), names)

    for det_name, make in DETECTORS.items():
        d = make().fit(base_series).detect(mon_series)
        payload["detectors"][det_name] = {"statistic": _round(d.statistic, 6)}

    # Metrics, on a statistic with a known shape rather than on a detector's, so a metric mismatch cannot
    # be blamed on the detector that fed it.
    rng = np.random.default_rng(3)
    stat = np.abs(rng.normal(size=len(t_mon)))
    stat[len(stat) // 2:] += np.linspace(0, 4, len(stat) - len(stat) // 2)
    det = rc.Detection(t_mon, stat, "fixture")
    outcomes = [rc.UnitOutcome(det, onset_t=float(onset), unit_id="F"),
                rc.UnitOutcome(rc.Detection(t_mon, np.abs(rng.normal(size=len(t_mon))), "fixture"),
                               onset_t=None, unit_id="H")]
    budgets = [0.002, 0.005, 0.01, 0.02]
    payload["metrics"] = {
        "statistic_faulty": _round(stat, 6),
        "statistic_healthy": _round(outcomes[1].detection.statistic, 6),
        "onset_t": float(onset),
        "thresholds_probed": [0.5, 1.0, 1.5, 2.0, 3.0],
        "score_at_threshold": [
            {
                "threshold": th,
                "false_alarms_per_unit_time": float(rc.score_fleet(outcomes, th).false_alarms_per_unit_time),
                "n_false_alarms": int(rc.score_fleet(outcomes, th).n_false_alarms),
                "detection_rate": float(rc.score_fleet(outcomes, th).detection_rate),
                "median_delay": (None if rc.score_fleet(outcomes, th).median_delay is None
                                 else float(rc.score_fleet(outcomes, th).median_delay)),
                "healthy_duty": float(rc.score_fleet(outcomes, th).healthy_duty),
            } for th in [0.5, 1.0, 1.5, 2.0, 3.0]
        ],
        "budgets": budgets,
        "threshold_for_budget": [
            (None if (v := rc.threshold_for_budget(outcomes, b, n=200)) is None else float(v))
            for b in budgets
        ],
    }

    path = out_dir / "parity.json"
    write_json(path, payload)
    kb = path.stat().st_size / 1024
    print(f"wrote {path} ({kb:.0f} kB)")
    print(f"  {len(names)} channels, {len(t_mon)} monitored samples, {len(DETECTORS)} detectors")
    for b, th in zip(budgets, payload["metrics"]["threshold_for_budget"]):
        print(f"  budget {b:<7} -> threshold {'unreachable' if th is None else f'{th:.4f}'}")


if __name__ == "__main__":
    main()
