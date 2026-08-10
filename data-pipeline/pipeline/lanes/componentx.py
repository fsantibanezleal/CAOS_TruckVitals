"""The SCANIA Component X lane: failure-window prediction under a GRADED cost matrix.

DOI 10.5878/jvb5-d390, CC BY 4.0, Swedish National Data Service. Verified obtainable by anonymous direct
download; the exact commands are in ``docs/cases/``.

.. rubric:: What this lane honestly supports, and what it does not

**Supports:** failure-window prediction over 33,641 vehicles, priced by a cost matrix that grades how
LATE a miss was. That grading is the reason this lane exists: it is the only public source in this
product that prices "how early did it fire" directly, which is the question the whole product is about.

**Does NOT support** the continuous-channel onset story. The readouts are per-readout **histograms and
accumulative counters**, not continuous per-second channels. There is no tyre pressure here, no strut
pressure, no time axis at a physical rate. Nothing from this lane may be presented as onset detection on
telemetry, and nothing from it belongs on the same axis as the C-MAPSS or synthetic results.

.. rubric:: Structure, verified against the downloaded bytes

============================================  =========  =====
file                                          rows       cols
============================================  =========  =====
``train_operational_readouts.csv``            1,122,452    107
``train_tte.csv``                                23,550      3
``train_specifications.csv``                     23,550      9
``validation_labels.csv``                         5,046      2
============================================  =========  =====

The 107 readout columns are 2 identifiers plus 97 histogram bins plus 8 accumulative counters. The 8
categorical **specification** features live in a separate per-vehicle table, which is what the research
pass predicted arithmetically (2 + 97 + 8 = 107) and is now confirmed from the files.

.. rubric:: The graded cost matrix

Rows are the true class, columns the predicted class:

=====  ===  ===  ===  ===  ===
true    0    1    2    3    4
=====  ===  ===  ===  ===  ===
0        0    7    8    9   10
1      200    0    7    8    9
2      300  200    0    7    8
3      400  300  200    0    7
4      500  400  300  200    0
=====  ===  ===  ===  ===  ===

Above the diagonal are false alarms, priced 7 to 10. Below are misses, priced 200 to 500 and rising with
how late the miss was. A planner reading this table pays 50 times more for missing an imminent failure
than for one unnecessary check, and pays progressively more the closer to failure the miss happened.

.. rubric:: The honesty anchor this lane must state

The best published **balanced accuracy** on this five-class problem is 0.2428 plus or minus 0.01
(Dimidov, Jafarnejad and Frank, arXiv:2606.12486), defined as mean per-class recall. Uniform guessing
over five classes scores **0.20**.

So the state of the art is roughly two points above chance on balanced accuracy, and separates from its
competitors on COST. Any presentation implying this problem is solved is contradicted by the best
published number, and this product says so on every surface that shows this lane.

Published cost scoreboard on the test split, lower better: XGBoost on last observation **37,733**;
Bi-LSTM 39,123; GNN 47,612; XGBoost on windowed tsfresh features 49,671.

.. rubric:: Caveats from the descriptor, all of which ship in the app

Component identity withheld; variable names anonymised; relative times rather than timestamps; repair and
readout frequencies possibly modified; scaling perturbations applied to operational data and repair
rates; sampling frequency uneven across vehicles; under 1% missingness per feature; ECU resets can
corrupt the accumulative counters; collection limited to vehicles with a complete workshop service
history; a carefully selected subset rather than the full operational data; rare rebuild events can cause
specification mismatches.

.. rubric:: Prior art this lane must position against, not ignore

Carpentier, De Temmerman and Verbeke, "Towards Contextual, Cost-Efficient Predictive Maintenance in
Heavy-Duty Trucks", IDA 2024, pp. 260-267, doi:10.1007/978-3-031-58553-1_21. Their "contextual" means a
per-vehicle **cohort**: the fleet is hierarchically clustered and one model is trained per cluster, with
the assignment made once per vehicle and resolved at inference by specification.

That is a different axis from this product's claim. Theirs partitions the **fleet**; this product's
regime conditioning partitions the **timeline**. The two compose without interacting. This product must
cite them and must not imply that nobody has tried conditioning a Scania model on context.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

import numpy as np

__all__ = ["COST_MATRIX", "CLASS_WINDOWS", "PUBLISHED_SCOREBOARD", "BEST_PUBLISHED_BALANCED_ACCURACY",
           "load_component_x", "graded_cost", "class_from_rul", "ComponentXData"]

# Verified from the descriptor preprint Table 1 (arXiv:2401.15199v2) and reproduced independently in
# arXiv:2606.12486. Rows are TRUE class, columns PREDICTED.
COST_MATRIX = np.array([
    [0,   7,   8,   9,  10],
    [200, 0,   7,   8,   9],
    [300, 200, 0,   7,   8],
    [400, 300, 200, 0,   7],
    [500, 400, 300, 200, 0],
], dtype=float)

# Time windows before failure, in time steps, from the descriptor.
CLASS_WINDOWS = {
    0: "more than 48 time steps before failure",
    1: "48 to 24 time steps",
    2: "24 to 12 time steps",
    3: "12 to 6 time steps",
    4: "6 to 0 time steps",
}

PUBLISHED_SCOREBOARD = (
    {"study": "Dimidov, Jafarnejad and Frank (2026)", "model": "XGBoost on last observation",
     "test_cost": 37733, "reference": "arXiv:2606.12486"},
    {"study": "Zhong and Wang (IDA 2024)", "model": "Bi-LSTM", "test_cost": 39123,
     "reference": "IDA 2024, pp. 268-276"},
    {"study": "Parton et al. (IDA 2024)", "model": "GNN on visibility graphs", "test_cost": 47612,
     "reference": "IDA 2024, pp. 251-259, doi:10.1007/978-3-031-58553-1_20"},
    {"study": "Carpentier, De Temmerman and Verbeke (IDA 2024)",
     "model": "XGBoost on windowed tsfresh features, per-cohort models", "test_cost": 49671,
     "reference": "IDA 2024, pp. 260-267, doi:10.1007/978-3-031-58553-1_21"},
)

BEST_PUBLISHED_BALANCED_ACCURACY = {
    "value": 0.2428, "uncertainty": 0.01, "chance_level": 0.20, "n_classes": 5,
    "definition": "mean per-class recall over the five classes",
    "source": "Dimidov, Jafarnejad and Frank, arXiv:2606.12486",
    "reading": ("roughly two percentage points above uniform guessing. The signal in this dataset is "
                "weak and methods separate on COST, not on accuracy. Any presentation implying the "
                "problem is solved is contradicted by the best published number."),
}


def class_from_rul(rul: np.ndarray) -> np.ndarray:
    """Map remaining time steps to the descriptor's five classes.

    Class 0 is more than 48 steps out; 1 is (24, 48]; 2 is (12, 24]; 3 is (6, 12]; 4 is [0, 6].
    """
    rul = np.asarray(rul, dtype=float)
    out = np.zeros(len(rul), dtype=int)
    out[rul <= 48] = 1
    out[rul <= 24] = 2
    out[rul <= 12] = 3
    out[rul <= 6] = 4
    return out


@dataclass(frozen=True)
class ComponentXData:
    x: np.ndarray
    y: np.ndarray
    vehicle_id: np.ndarray
    feature_names: "tuple[str, ...]"
    spec: np.ndarray
    spec_names: "tuple[str, ...]"
    censored: np.ndarray
    split: str


def _read_numeric_csv(path: Path) -> "tuple[np.ndarray, tuple[str, ...]]":
    with path.open("r", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = tuple(next(reader))
        rows = [[np.nan if v == "" else float(v) for v in r] for r in reader]
    return np.asarray(rows, dtype=float), header


def _read_spec_csv(path: Path) -> "tuple[np.ndarray, np.ndarray, tuple[str, ...]]":
    """Specifications are CATEGORICAL (Cat0..Cat28), so they are ordinal-encoded, not parsed as numbers."""
    with path.open("r", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = tuple(next(reader))
        rows = list(reader)
    ids = np.asarray([float(r[0]) for r in rows])
    cats = [r[1:] for r in rows]
    encoded = np.zeros((len(cats), len(header) - 1), dtype=float)
    for j in range(len(header) - 1):
        levels = {v: i for i, v in enumerate(sorted({c[j] for c in cats}))}
        encoded[:, j] = [levels[c[j]] for c in cats]
    return ids, encoded, header[1:]


def load_component_x(root: "str | Path", split: str = "train",
                     aggregate: str = "last") -> ComponentXData:
    """Load one split as a per-VEHICLE feature table with a five-class label.

    ``aggregate`` controls how a vehicle's many readouts become one row:

    ``"last"``
        The final readout only. This is what the current best published result uses, and its own authors
        record the cost: it "removes important temporal information".
    ``"last_delta"``
        The final readout plus its difference from the previous one, which restores a first-order sense of
        how fast the counters are moving. Twice the features.

    The label is the class of the LAST readout, so the task is "given this vehicle's state now, how close
    is it to failure".
    """
    root = Path(root)
    readouts, header = _read_numeric_csv(root / f"{split}_operational_readouts.csv")
    spec_ids, spec, spec_names = _read_spec_csv(root / f"{split}_specifications.csv")

    vid_col, step_col = header.index("vehicle_id"), header.index("time_step")
    feature_idx = [i for i in range(len(header)) if i not in (vid_col, step_col)]
    feature_names = tuple(header[i] for i in feature_idx)

    order = np.lexsort((readouts[:, step_col], readouts[:, vid_col]))
    readouts = readouts[order]
    vids = readouts[:, vid_col]
    boundaries = np.flatnonzero(np.diff(vids)) + 1
    starts = np.concatenate([[0], boundaries])
    ends = np.concatenate([boundaries, [len(vids)]])

    if split == "train":
        tte, tte_header = _read_numeric_csv(root / "train_tte.csv")
        tte_map = {int(r[tte_header.index("vehicle_id")]): (
            r[tte_header.index("length_of_study_time_step")],
            r[tte_header.index("in_study_repair")]) for r in tte}
    else:
        lab, lab_header = _read_numeric_csv(root / f"{split}_labels.csv")
        label_map = {int(r[lab_header.index("vehicle_id")]):
                     int(r[lab_header.index("class_label")]) for r in lab}

    rows, labels, ids, censored = [], [], [], []
    for s, e in zip(starts, ends):
        vid = int(vids[s])
        block = readouts[s:e]
        last = block[-1, feature_idx]
        if aggregate == "last_delta":
            prev = block[-2, feature_idx] if len(block) > 1 else last
            feat = np.concatenate([last, last - prev])
        else:
            feat = last

        if split == "train":
            if vid not in tte_map:
                continue
            length, repaired = tte_map[vid]
            # A censored vehicle (no in-study repair) never reached a failure window, so its last readout
            # is class 0. Treating censoring as a failure would invent 21278 failures out of 23550
            # vehicles, and the imbalance is the whole difficulty of this dataset.
            if repaired < 0.5:
                cls = 0
            else:
                cls = int(class_from_rul(np.array([length - block[-1, step_col]]))[0])
            censored.append(repaired < 0.5)
        else:
            if vid not in label_map:
                continue
            cls = label_map[vid]
            censored.append(False)

        rows.append(feat)
        labels.append(cls)
        ids.append(vid)

    x = np.asarray(rows, dtype=float)
    ids = np.asarray(ids, dtype=int)
    spec_lookup = {int(v): i for i, v in enumerate(spec_ids)}
    spec_rows = np.asarray([spec[spec_lookup[v]] if v in spec_lookup else
                            np.full(spec.shape[1], np.nan) for v in ids])

    names = feature_names if aggregate == "last" else \
        feature_names + tuple(f"{n}__delta" for n in feature_names)
    return ComponentXData(x=x, y=np.asarray(labels, dtype=int), vehicle_id=ids,
                          feature_names=names, spec=spec_rows, spec_names=spec_names,
                          censored=np.asarray(censored, dtype=bool), split=split)


def graded_cost(y_true: np.ndarray, y_pred: np.ndarray) -> "tuple[float, np.ndarray]":
    """Total cost under the graded matrix, and the 5x5 confusion counts that produce it."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    confusion = np.zeros((5, 5), dtype=int)
    for t, p in zip(y_true, y_pred):
        confusion[t, p] += 1
    return float(np.sum(confusion * COST_MATRIX)), confusion


def balanced_accuracy(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int = 5) -> float:
    """Mean per-class recall, the definition the published comparison uses."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    recalls = []
    for k in range(n_classes):
        mask = y_true == k
        if mask.any():
            recalls.append(float(np.mean(y_pred[mask] == k)))
    return float(np.mean(recalls)) if recalls else float("nan")
