#!/usr/bin/env python3
"""Bake per-truck traces for the App workbench.

    python data-pipeline/run_fleet_traces.py
    python data-pipeline/run_fleet_traces.py --output build/smoke --n-faulty 2 --n-healthy 2

Writes one file per truck plus an index, so the App fetches a few kilobytes to draw the selector and one
truck's record only when that truck is selected. A single bundle would make the first paint wait on every
truck in the fleet.
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
from truckvitals.lanes.fleet_traces import build_fleet_traces

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=None)
    ap.add_argument("--n-healthy", type=int, default=6)
    ap.add_argument("--n-faulty", type=int, default=8)
    ap.add_argument("--n-cycles", type=int, default=45)
    ap.add_argument("--budget", type=float, default=1.0)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    out_dir = Path(args.output) if args.output else CANONICAL
    fleet_dir = out_dir / "fleet"
    fleet_dir.mkdir(parents=True, exist_ok=True)

    result = build_fleet_traces(n_healthy=args.n_healthy, n_faulty=args.n_faulty,
                                n_cycles=args.n_cycles, budget_per_month=args.budget, seed=args.seed)

    for uid, trace in result["units"].items():
        write_json(fleet_dir / f"{uid}.json", trace, indent=None)

    index = {
        "schema": "truckvitals.fleet-traces/v1",
        "generated_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "regimecpd_version": rc.__version__,
        "python": platform.python_version(), "numpy": np.__version__,
        "config": result["config"],
        "thresholds": result["thresholds"],
        "units": result["index"],
        "honest_limits": [
            ("SYNTHETIC. Physically plausible magnitudes for a large rigid hauler, not measurements from "
            "one. Nothing on this page is calibrated against a real truck."),
            ("The threshold drawn on every trace is the FLEET threshold at the matched false-alarm "
            "budget, not a per-unit threshold. A per-unit threshold would be fitted on the record it is "
            "being judged on, which is the most common way this kind of chart flatters itself."),
            ("The regime confound is EMERGENT from the haul cycle, not injected. That is what stops the "
            "comparison being circular, and it also means the regime structure is a model of a cycle "
            "rather than an observation of one."),
            ("Units whose fault begins inside the baseline window are DROPPED, because there would be no "
            "healthy stretch to learn normal from. The count is in `config`."),
        ],
    }
    write_json(fleet_dir / "index.json", index)

    cfg = result["config"]
    total_kb = sum(f.stat().st_size for f in fleet_dir.glob("*.json")) / 1024
    print(f"wrote {fleet_dir} ({len(result['units'])} trucks, {total_kb:.0f} kB total)")
    print(f"kept {cfg['n_units_kept']}/{cfg['n_units_generated']} units "
          f"({cfg['n_units_dropped_fault_in_baseline']} dropped, fault inside the baseline window)\n")

    print(f"{'unit':10s} {'fault':14s} {'onset':>8s} {'cov':>5s}  delay per detector (raw | residual)")
    for row in result["index"]:
        u = result["units"][row["unit_id"]]
        onset = "-" if row["onset_t"] is None else f"{row['onset_t']:.0f}"
        parts = []
        for det in cfg["detectors"]:
            d = u["detectors"][det]
            def fmt(arm, d=d):
                return "-" if d[arm]["delay_min"] is None else f"{d[arm]['delay_min']:.0f}"
            parts.append(f"{det}:{fmt('raw')}|{fmt('residual')}")
        print(f"{row['unit_id']:10s} {row['fault_kind']:14s} {onset:>8s} "
              f"{row['regime_coverage']:5.2f}  {'  '.join(parts)}")


if __name__ == "__main__":
    main()
