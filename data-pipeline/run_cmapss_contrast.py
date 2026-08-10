#!/usr/bin/env python3
"""Bake the C-MAPSS regime contrast: the product's headline result.

Repo-local tooling, invoked BY PATH and never installed:

    python data-pipeline/run_cmapss_contrast.py --data E:/_Temp/cmapss/data
    python data-pipeline/run_cmapss_contrast.py --data <dir> --output build/smoke   # sandboxed

Writing to the canonical artifact directory is an explicit release operation. Tests and CI smoke runs
pass ``--output`` so they cannot mutate committed scientific evidence.
"""
from __future__ import annotations

import argparse
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import regimecpd as rc  # noqa: E402
from pipeline.lanes.cmapss import SUBSETS, _informative_sensors, load_subset  # noqa: E402
from pipeline.lanes.regime_experiment import build_outcomes, score_arm  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"

PAIRS = (("FD001", "FD002"), ("FD003", "FD004"))
ARMS = (
    ("raw", "raw", {}),
    ("residual", "residual-observed", {"discrete_regimes": True}),
    ("residual", "residual-clustered", {"discrete_regimes": False, "n_regimes": 6}),
    ("residual", "residual-regression",
     {"discrete_regimes": False, "n_regimes": 1, "residual_method": "linear"}),
)


def budget_curve(outcomes, budgets_per_1000):
    """Detection rate and delay across a sweep of false-alarm budgets.

    Reported instead of a single operating point because one point is a choice and a curve is a
    measurement. A method that wins only at one budget has not won.
    """
    rows = []
    for b in budgets_per_1000:
        th = rc.threshold_for_budget(outcomes, b / 1000.0, n=600)
        if th is None:
            rows.append({"budget_per_1000": b, "reachable": False})
            continue
        f = rc.score_fleet(outcomes, th)
        rows.append({
            "budget_per_1000": b, "reachable": True, "threshold": float(th),
            "realised_per_1000": f.per(1000.0), "detection_rate": f.detection_rate,
            "median_delay": f.median_delay, "n_detected": f.n_detected, "n_faulty": f.n_faulty,
        })
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="directory holding train_FD00N.txt")
    ap.add_argument("--output", default=None, help="write here instead of the canonical artifacts")
    ap.add_argument("--detector", default="cusum", choices=("shewhart", "cusum", "ewma",
                                                            "page-hinkley"))
    ap.add_argument("--fit-cycles", type=int, default=60)
    ap.add_argument("--calib-cycles", type=int, default=30)
    ap.add_argument("--budget", type=float, default=1.0, help="false alarms per 1000 cycles")
    ap.add_argument("--n-boot", type=int, default=300)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    out_dir = Path(args.output) if args.output else CANONICAL
    out_dir.mkdir(parents=True, exist_ok=True)

    budgets = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0]
    payload = {
        "schema": "truckvitals.cmapss-regime-contrast/v1",
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "regimecpd_version": rc.__version__,
        "python": platform.python_version(),
        "numpy": np.__version__,
        "config": {
            "detector": args.detector, "fit_cycles": args.fit_cycles,
            "calib_cycles": args.calib_cycles, "budget_per_1000_cycles": args.budget,
            "n_boot": args.n_boot, "seed": args.seed, "rul_cap": 125.0,
        },
        "declared_structure": SUBSETS,
        "pairs": [],
    }

    for single, multi in PAIRS:
        subs = {n: load_subset(args.data, n) for n in (single, multi)}
        common = tuple(sorted(set(_informative_sensors(subs[single].units)) &
                              set(_informative_sensors(subs[multi].units))))
        pair = {
            "single_condition": single, "multi_condition": multi,
            "fault_modes": subs[single].n_fault_modes,
            "channels": list(common), "n_channels": len(common),
            "channel_note": (
                "The COMMON informative sensors of both subsets. The multi-condition subset has more "
                "channels that vary, but they vary only because the operating condition varies. "
                "Including them would let the contrast confound 'more regimes' with 'more channels', "
                "and the statistic is a maximum across channels, so more channels alone raises the "
                "false-alarm rate."
            ),
            "arms": [],
        }
        for name, sub in subs.items():
            for kind, label, kw in ARMS:
                if label != "raw" and sub.n_conditions == 1:
                    continue
                outs, calib, cov, dropped = build_outcomes(
                    sub, args.detector, kind, common,
                    fit_cycles=args.fit_cycles, calib_cycles=args.calib_cycles, **kw)
                r = score_arm(outs, calib, arm=label, subset=name, detector=args.detector,
                              budget_per_1000=args.budget, coverage=cov,
                              n_boot=args.n_boot, seed=args.seed)
                pair["arms"].append({
                    "subset": name, "arm": label, "n_conditions": sub.n_conditions,
                    "n_units_scored": r.n_units, "n_faulty": r.n_faulty,
                    "dropped": dropped,
                    "threshold": r.threshold,
                    "false_alarms_per_1000_cycles": r.fa_per_1000_cycles,
                    "false_alarms_ci_per_1000": [r.fa_ci[0] * 1000.0, r.fa_ci[1] * 1000.0],
                    "detection_rate": r.detection_rate,
                    "median_delay_cycles": r.median_delay,
                    "regime_coverage": r.regime_coverage,
                    "budget_curve": budget_curve(outs, budgets),
                })
        payload["pairs"].append(pair)

    path = out_dir / "cmapss_regime_contrast.json"
    path.write_text(json.dumps(payload, indent=2, default=float), encoding="utf-8")
    print(f"wrote {path}")

    for pair in payload["pairs"]:
        print(f"\n{pair['single_condition']} vs {pair['multi_condition']} "
              f"({pair['fault_modes']} fault mode(s), {pair['n_channels']} common channels)")
        for a in pair["arms"]:
            cov = f"{a['regime_coverage']:.2f}" if a["regime_coverage"] == a["regime_coverage"] else "-"
            delay = f"{a['median_delay_cycles']:.0f}" if a["median_delay_cycles"] else "-"
            print(f"  {a['subset']:6s} {a['arm']:20s} n={a['n_units_scored']:3d} "
                  f"FA/1000={a['false_alarms_per_1000_cycles']:.3f} "
                  f"det={a['detection_rate']:.2f} delay={delay:>4s} cov={cov}")


if __name__ == "__main__":
    main()
