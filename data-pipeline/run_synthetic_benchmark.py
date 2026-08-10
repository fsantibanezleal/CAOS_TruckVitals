#!/usr/bin/env python3
"""Bake the synthetic-lane benchmark: every rung, both arms, onset error, attribution.

    python data-pipeline/run_synthetic_benchmark.py
    python data-pipeline/run_synthetic_benchmark.py --output build/smoke --quick
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
from pipeline.lanes.synthetic_benchmark import run_synthetic_benchmark  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=None)
    ap.add_argument("--quick", action="store_true", help="a small fleet, for smoke runs")
    ap.add_argument("--budget", type=float, default=1.0, help="false alarms per truck-month")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    out_dir = Path(args.output) if args.output else CANONICAL
    out_dir.mkdir(parents=True, exist_ok=True)

    kw = dict(n_healthy=10, n_faulty=8, n_cycles=35) if args.quick else \
        dict(n_healthy=36, n_faulty=24, n_cycles=70)

    result = run_synthetic_benchmark(budget_per_month=args.budget, seed=args.seed, **kw)
    result["schema"] = "truckvitals.synthetic-benchmark/v1"
    result["generated_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    result["regimecpd_version"] = rc.__version__
    result["python"] = platform.python_version()
    result["numpy"] = np.__version__
    result["honest_limits"] = [
        "SYNTHETIC. Nothing here is calibrated against a real truck; magnitudes are physically plausible "
        "for a large rigid hauler and are not measurements.",
        "The regime confound is emergent from the haul cycle rather than injected, which is what stops "
        "the comparison being circular, but the cycle itself is a model.",
        "Onset error uses the NEAREST changepoint, which is optimistic. The chance level for the same "
        "number of changepoints is reported beside it and is the number to read.",
    ]

    path = out_dir / "synthetic_benchmark.json"
    path.write_text(json.dumps(result, indent=2, default=float), encoding="utf-8")
    print(f"wrote {path}\n")

    print(f"{'detector':14s} {'arm':9s} {'n':>3s} {'FA/month':>9s} {'det':>5s} {'delay':>7s} {'cov':>5s}")
    for a in result["arms"]:
        delay = f"{a['median_delay_min']:.0f}" if a["median_delay_min"] is not None else "-"
        cov = f"{a['regime_coverage']:.2f}" if a["regime_coverage"] is not None else "-"
        fa = f"{a['fa_per_truck_month']:.3f}" if a["fa_per_truck_month"] == a["fa_per_truck_month"] else "nan"
        det = f"{a['detection_rate']:.2f}" if a["detection_rate"] == a["detection_rate"] else "nan"
        print(f"{a['detector']:14s} {a['arm']:9s} {a['n_units']:3d} {fa:>9s} {det:>5s} "
              f"{delay:>7s} {cov:>5s} {a['note'][:44]}")

    print("\nonset-time error (retrospective, PELT):")
    for arm, s in result["onset_estimation"].items():
        if not s:
            continue
        print(f"  {arm:9s} error {s['median_onset_error_min']:6.1f} min | chance "
              f"{s['median_chance_error_min']:6.1f} | skill {s['skill_vs_chance']:.2f}x | "
              f"{s['median_changepoints']:.0f} changepoints")

    tb = result["trivial_baseline"]
    if "detection_rate" in tb:
        print(f"\ntrivial baseline (fixed threshold, told which channel to watch): "
              f"det {tb['detection_rate']:.2f}, delay {tb['median_delay_min']}, "
              f"FA/month {tb['fa_per_truck_month']:.3f}")

    att = result["attribution"]
    print(f"\nattribution top-2 hit rate: {att['top2_hit_rate']} over {att['n_scored']} faulty units")
    for kind, d in att["per_fault_kind"].items():
        print(f"  {kind:14s} {d['hits']}/{d['n']}  truth={d['truth']}")


if __name__ == "__main__":
    main()
