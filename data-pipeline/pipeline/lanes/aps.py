"""The SCANIA APS lane: reporting a COST a maintenance planner can act on.

.. rubric:: Why this lane exists at all, given it has no time series

It has one thing no other lane has: a **published cost matrix and a published leaderboard**. That lets
this product report a number a planner decides on, and lets that number be checked against results other
people obtained on the same data.

Everything else about it is a limitation, and the product states all of them:

- One aggregated snapshot per truck. No time series, so **no onset detection, no detection delay, no
  false alarms per truck-month**. Nothing this lane produces belongs on the same axis as the C-MAPSS or
  synthetic results.
- **170** anonymised feature columns (the file has 171 columns in total, of which one is the class),
  described only as "single numerical counters and histograms consisting of bins
  with different conditions". No physical channel names, so no actionable attribution.
- A subset "selected by experts", so it is not a random sample of a fleet.

.. rubric:: The cost matrix, verified at the primary source

From ``aps_failure_description.txt``, shipped with the dataset itself:

    Cost_1 = 10 and cost_2 = 500

    In this case Cost_1 refers to the cost that an unnessecary check needs to be done by an mechanic at
    an workshop, while Cost_2 refer to the cost of missing a faulty truck, which may cause a breakdown.

    Total_cost = Cost_1*No_Instances + Cost_2*No_Instances.

That last line is malformed in the original, reusing one symbol for two different counts. The metric this
lane actually computes, and the form the product should quote, is

.. math:: \text{Total cost} = 10 \cdot \mathrm{FP} + 500 \cdot \mathrm{FN}

Reading the matrix carefully, because it is indexed by predicted ROW and true COLUMN: ``Cost_1`` sits at
(predicted pos, true neg) and is therefore the cost of a FALSE POSITIVE; ``Cost_2`` sits at (predicted
neg, true pos) and is the cost of a FALSE NEGATIVE. The source calls these "type 1" and "type 2"
FAILURES rather than errors.

So a miss costs **50 times** a false alarm. That ratio is the entire point of the lane, and it is why an
accuracy-optimal or F1-optimal decision is the wrong decision here.

.. rubric:: The published leaderboard, also primary

The same description file lists the IDA 2016 Industrial Challenge results:

======================================================  =====  =============  =============
top three                                               score  type 1 (FP)    type 2 (FN)
======================================================  =====  =============  =============
Camila F. Costa and Mario A. Nascimento                  9920            542              9
Christopher Gondek, Daniel Hafner and Oliver R. Sampson 10900            490             12
Sumeet Garnaik, Sushovan Das, Rama Syamala Sreepada,
Bidyut Kr. Patra                                        11480            398             15
======================================================  =====  =============  =============

These were previously carried in this project's research dossier as secondary-reported, sourced from
third-party write-ups. They are now **verified against a primary source**, because the dataset ships them.

.. rubric:: Missing data, which is severe here and is handled by NOT imputing

Missingness runs to the majority of rows on some columns. This lane uses
``HistGradientBoostingClassifier``, which handles NaN natively by learning a default split direction, so
no imputation happens at all.

That is a deliberate choice over median imputation. On this dataset missingness is plainly not random:
counters are absent because a subsystem never reported, and that absence is itself informative. Imputing
a median would replace a signal with a fabricated typical value, and it would do so most often on exactly
the columns that carry the most information about why a truck is unusual.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

__all__ = ["COST_FP", "COST_FN", "IDA2016_LEADERBOARD", "load_aps", "total_cost",
           "cost_curve", "APSData"]

# Verified in aps_failure_description.txt, shipped with the dataset.
COST_FP = 10.0
COST_FN = 500.0

IDA2016_LEADERBOARD = (
    {"rank": 1, "entrant": "Camila F. Costa and Mario A. Nascimento",
     "total_cost": 9920, "false_positives": 542, "false_negatives": 9},
    {"rank": 2, "entrant": "Christopher Gondek, Daniel Hafner and Oliver R. Sampson",
     "total_cost": 10900, "false_positives": 490, "false_negatives": 12},
    {"rank": 3, "entrant": "Sumeet Garnaik, Sushovan Das, Rama Syamala Sreepada and Bidyut Kr. Patra",
     "total_cost": 11480, "false_positives": 398, "false_negatives": 15},
)


@dataclass(frozen=True)
class APSData:
    x_train: np.ndarray
    y_train: np.ndarray
    x_test: np.ndarray
    y_test: np.ndarray
    feature_names: "tuple[str, ...]"
    missing_fraction: np.ndarray

    @property
    def n_features(self) -> int:
        return self.x_train.shape[1]


def _read_csv(path: Path) -> "tuple[np.ndarray, np.ndarray, tuple[str, ...]]":
    """Read one APS csv. The file carries a licence header before the real header row."""
    with path.open("r", encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()
    start = next(i for i, ln in enumerate(lines) if ln.startswith("class,"))
    header = lines[start].rstrip("\n").split(",")
    names = tuple(header[1:])

    y = np.empty(len(lines) - start - 1, dtype=int)
    x = np.empty((len(y), len(names)), dtype=float)
    for row, ln in enumerate(lines[start + 1:]):
        parts = ln.rstrip("\n").split(",")
        y[row] = 1 if parts[0] == "pos" else 0
        # "na" is the dataset's missing marker. It becomes NaN and STAYS NaN: see the module docstring
        # on why imputation would destroy the informative part of the missingness.
        x[row] = [np.nan if p == "na" else float(p) for p in parts[1:]]
    return x, y, names


def load_aps(root: "str | Path") -> APSData:
    root = Path(root)
    x_tr, y_tr, names = _read_csv(root / "aps_failure_training_set.csv")
    x_te, y_te, names_te = _read_csv(root / "aps_failure_test_set.csv")
    if names != names_te:
        raise ValueError("train and test feature names differ")

    # Declared structure, asserted. A mis-parse would leave every cost number looking reasonable.
    if len(y_tr) != 60000 or int(y_tr.sum()) != 1000:
        raise ValueError(f"train: {len(y_tr)} rows with {int(y_tr.sum())} positives, "
                         f"the description declares 60000 with 1000")
    if len(y_te) != 16000:
        raise ValueError(f"test: {len(y_te)} rows, the description declares 16000")

    missing = np.isnan(x_tr).mean(axis=0)
    return APSData(x_tr, y_tr, x_te, y_te, names, missing)


def total_cost(y_true: np.ndarray, y_pred: np.ndarray) -> "tuple[float, int, int]":
    """The challenge metric. Returns ``(total_cost, n_false_positives, n_false_negatives)``.

    Type 1 is a false positive (an unnecessary workshop check). Type 2 is a false negative (a faulty
    truck missed). Total cost is ``10 * type1 + 500 * type2``.
    """
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    return COST_FP * fp + COST_FN * fn, fp, fn


def cost_curve(y_true: np.ndarray, scores: np.ndarray,
               thresholds: "np.ndarray | None" = None) -> "list[dict]":
    """Total cost across decision thresholds, with the confusion counts that produce it.

    The curve rather than a single number, because the threshold IS the decision and quoting a cost
    without the threshold that achieved it hides the only choice being made.
    """
    if thresholds is None:
        thresholds = np.unique(np.quantile(scores, np.linspace(0.0, 1.0, 400)))
    rows = []
    for th in thresholds:
        pred = (scores >= th).astype(int)
        cost, fp, fn = total_cost(y_true, pred)
        rows.append({"threshold": float(th), "total_cost": float(cost),
                     "false_positives": fp, "false_negatives": fn,
                     "n_flagged": int(pred.sum())})
    return rows
