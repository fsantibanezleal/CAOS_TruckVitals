#!/usr/bin/env python3
"""Bake the detector-free mechanism measurement: the claim nothing about the detector can touch.

    python data-pipeline/run_mechanism.py --data E:/_Temp/cmapss/data

An adversarial review broke three of four figures in this product's original headline, every one of them
on a choice made downstream of the idea: the threshold rule, the alarm convention, the arm labelling. The
idea itself survived all eight attacks, including a shuffled-context placebo. This runner states the idea
in the only form that has no such surface: an effect size, measured directly, with the single-condition
subsets as a negative control that nobody had to design.
"""
from __future__ import annotations

import argparse
import platform
import sys
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import regimecpd as rc
from truckvitals.jsonio import write_json
from truckvitals.lanes.cmapss import _informative_sensors, load_subset
from truckvitals.lanes.mechanism import measure_mechanism

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"
PAIRS = (("FD001", "FD002"), ("FD003", "FD004"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--output", default=None)
    ap.add_argument("--healthy-cycles", type=int, default=90)
    ap.add_argument("--faulty-tail", type=int, default=30)
    args = ap.parse_args()

    out_dir = Path(args.output) if args.output else CANONICAL
    payload = {
        "schema": "truckvitals.mechanism/v1",
        "generated_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "regimecpd_version": rc.__version__,
        "python": platform.python_version(), "numpy": np.__version__,
        "config": {"healthy_cycles": args.healthy_cycles, "faulty_tail": args.faulty_tail,
                   "statistic": "median across channels of |mean(faulty) - mean(healthy)| / sd(healthy)",
                   "denominators": ["pooled across regimes", "within regime, variance-pooled"]},
        "pairs": [],
        "honest_limits": [
            ("This measures an EFFECT SIZE, not a detector's performance. It says the fault's signature is "
            "large relative to within-regime spread and small relative to pooled spread. It does NOT say "
            "any particular detector achieves that separation, and the detection tables are where that "
            "question is answered."),
            ("The single-condition subsets are the negative control and were not designed as one: they "
            "are what the identical code returns on data with only one regime, where the two denominators "
            "coincide by construction and the ratio must be 1.0. A ratio far from 1.0 there would mean "
            "this measurement is broken."),
            ("The healthy window ends before the onset and the faulty window is the record's tail, with "
            "the ramp between them excluded from both. Including the ramp would blur the contrast in both "
            "denominators."),
            ("C-MAPSS is turbofans, not trucks. What transfers is the MECHANISM, which is a statement "
            "about operating context and residual spread, not about engines."),
        ],
    }

    for single, multi in PAIRS:
        subs = {n: load_subset(args.data, n) for n in (single, multi)}
        baseline = args.healthy_cycles
        common = tuple(sorted(set(_informative_sensors(subs[single].units, baseline_cycles=baseline)) &
                              set(_informative_sensors(subs[multi].units, baseline_cycles=baseline))))
        entry = {"single_condition": single, "multi_condition": multi,
                 "n_channels": len(common), "channels": list(common), "subsets": {}}
        for name, sub in subs.items():
            entry["subsets"][name] = {
                "n_conditions": sub.n_conditions,
                **measure_mechanism(sub, common, healthy_cycles=args.healthy_cycles,
                                    faulty_tail=args.faulty_tail),
            }
        payload["pairs"].append(entry)

    path = out_dir / "cmapss_mechanism.json"
    write_json(path, payload)
    print(f"wrote {path}\n")

    print(f"{'subset':8s} {'cond':>5s} {'units':>6s} {'regimes':>8s} {'locked':>7s} "
          f"{'d pooled':>18s} {'d within':>18s} {'ratio':>8s}")
    for pair in payload["pairs"]:
        for name, s in pair["subsets"].items():
            if not s.get("n_units"):
                continue
            dp = f"{s['median_d_pooled']:.2f} [{s['d_pooled_p10']:.2f},{s['d_pooled_p90']:.2f}]"
            dw = f"{s['median_d_within_regime']:.2f} [{s['d_within_p10']:.2f},{s['d_within_p90']:.2f}]"
            print(f"{name:8s} {s['n_conditions']:5d} {s['n_units']:6d} {s['n_regimes_used']:8d} "
                  f"{s['n_channels_regime_locked']:7d} {dp:>18s} {dw:>18s} {s['ratio']:8.2f}")
    print("\nThe ratio is identical across units by construction (the fault shift cancels); "
          "the brackets are p10 to p90 over units.")


if __name__ == "__main__":
    main()
