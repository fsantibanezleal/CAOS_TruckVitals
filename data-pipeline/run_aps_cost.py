#!/usr/bin/env python3
"""Bake the SCANIA APS cost lane.

    python data-pipeline/run_aps_cost.py --data E:/_Temp/scania/aps
    python data-pipeline/run_aps_cost.py --data <dir> --output build/smoke

The question this lane answers is not "how accurate is the model". It is "what does the decision cost",
and specifically how much is lost by choosing the threshold the way almost everyone chooses it.
"""
from __future__ import annotations

import argparse
import platform
import sys
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from truckvitals.jsonio import write_json
from truckvitals.lanes.aps import (
    COST_FN,
    COST_FP,
    IDA2016_LEADERBOARD,
    cost_curve,
    load_aps,
    total_cost,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
CANONICAL = REPO_ROOT / "data" / "artifacts"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--output", default=None)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import f1_score, roc_auc_score
    from sklearn.model_selection import StratifiedKFold

    out_dir = Path(args.output) if args.output else CANONICAL
    out_dir.mkdir(parents=True, exist_ok=True)

    data = load_aps(args.data)
    print(f"train {data.x_train.shape}, test {data.x_test.shape}, "
          f"{int(data.y_train.sum())} positives in train")

    # The threshold is chosen on OUT-OF-FOLD training predictions, never on the test set. Choosing it on
    # the test set would be selecting the operating point using the data the cost is then reported on,
    # which is the single easiest way to publish a cost that cannot be reproduced.
    oof = np.zeros(len(data.y_train))
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=args.seed)
    for tr, va in folds.split(data.x_train, data.y_train):
        m = HistGradientBoostingClassifier(random_state=args.seed, max_iter=300,
                                           learning_rate=0.1)
        m.fit(data.x_train[tr], data.y_train[tr])
        oof[va] = m.predict_proba(data.x_train[va])[:, 1]

    oof_curve = cost_curve(data.y_train, oof)
    best = min(oof_curve, key=lambda r: r["total_cost"])
    tuned_threshold = best["threshold"]
    print(f"cost-optimal threshold chosen out-of-fold on TRAIN: {tuned_threshold:.6f}")

    model = HistGradientBoostingClassifier(random_state=args.seed, max_iter=300, learning_rate=0.1)
    model.fit(data.x_train, data.y_train)
    test_scores = model.predict_proba(data.x_test)[:, 1]

    results = {}
    for name, th in (("default_0.5", 0.5), ("cost_optimal", tuned_threshold)):
        pred = (test_scores >= th).astype(int)
        cost, fp, fn = total_cost(data.y_test, pred)
        results[name] = {
            "threshold": float(th), "total_cost": float(cost),
            "false_positives": fp, "false_negatives": fn,
            "n_flagged": int(pred.sum()),
            "f1": float(f1_score(data.y_test, pred)),
        }

    # The F1-optimal threshold, computed out-of-fold too, so the comparison is like for like. This is the
    # decision a team optimising the usual metric would ship.
    f1_rows = []
    for th in np.unique(np.quantile(oof, np.linspace(0.0, 1.0, 400))):
        f1_rows.append((float(f1_score(data.y_train, (oof >= th).astype(int))), float(th)))
    f1_threshold = max(f1_rows)[1]
    pred = (test_scores >= f1_threshold).astype(int)
    cost, fp, fn = total_cost(data.y_test, pred)
    results["f1_optimal"] = {
        "threshold": f1_threshold, "total_cost": float(cost),
        "false_positives": fp, "false_negatives": fn, "n_flagged": int(pred.sum()),
        "f1": float(f1_score(data.y_test, pred)),
    }

    payload = {
        "schema": "truckvitals.aps-cost/v1",
        "generated_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "python": platform.python_version(), "numpy": np.__version__,
        "cost_matrix": {"false_positive": COST_FP, "false_negative": COST_FN,
                        "ratio": COST_FN / COST_FP,
                        "source": "aps_failure_description.txt, shipped with the dataset"},
        "dataset": {
            "n_train": len(data.y_train), "n_train_positive": int(data.y_train.sum()),
            "n_test": len(data.y_test), "n_test_positive": int(data.y_test.sum()),
            "n_features": data.n_features,
            "missing_fraction_max": float(data.missing_fraction.max()),
            "missing_fraction_mean": float(data.missing_fraction.mean()),
            "columns_over_half_missing": int(np.sum(data.missing_fraction > 0.5)),
        },
        "model": {"estimator": "HistGradientBoostingClassifier", "max_iter": 300,
                  "imputation": "none, NaN handled natively by the estimator",
                  "threshold_selected_on": "out-of-fold training predictions, never the test set",
                  "test_roc_auc": float(roc_auc_score(data.y_test, test_scores))},
        "results": results,
        "ida2016_leaderboard": list(IDA2016_LEADERBOARD),
        "test_cost_curve": cost_curve(data.y_test, test_scores),
        "honest_limits": [
            ("One aggregated snapshot per truck. No time series, so no onset detection, no detection "
            "delay and no false alarms per truck-month. Nothing here belongs on the same axis as the "
            "C-MAPSS or synthetic results."),
            "170 anonymised features with no physical names, so no actionable attribution.",
            "A subset selected by experts, not a random sample of a fleet.",
            ("The leaderboard is a reference point, not a like-for-like comparison: those entries were "
            "produced under challenge conditions this run does not reproduce."),
        ],
    }
    path = out_dir / "aps_cost.json"
    write_json(path, payload)
    print(f"wrote {path}\n")

    print(f"{'decision':16s} {'threshold':>10s} {'cost':>9s} {'FP':>6s} {'FN':>5s} {'F1':>6s}")
    for name in ("default_0.5", "f1_optimal", "cost_optimal"):
        r = results[name]
        print(f"{name:16s} {r['threshold']:10.5f} {r['total_cost']:9.0f} "
              f"{r['false_positives']:6d} {r['false_negatives']:5d} {r['f1']:6.3f}")
    print(f"\nIDA 2016 winner (reference): {IDA2016_LEADERBOARD[0]['total_cost']} "
          f"with {IDA2016_LEADERBOARD[0]['false_positives']} FP and "
          f"{IDA2016_LEADERBOARD[0]['false_negatives']} FN")


if __name__ == "__main__":
    main()
