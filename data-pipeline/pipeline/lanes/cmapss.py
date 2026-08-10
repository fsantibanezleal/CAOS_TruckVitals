"""The C-MAPSS lane: the controlled public experiment behind this product's central claim.

.. rubric:: Why this dataset, for a product about trucks

Because it is the only public, redistributable, run-to-failure benchmark whose subsets differ in
**exactly one factor that matters here**:

======  ====================  ===========  ==================
subset  operating conditions  fault modes  train / test units
======  ====================  ===========  ==================
FD001   **1**                 1            100 / 100
FD002   **6**                 1            260 / 259
FD003   **1**                 2            100 / 100
FD004   **6**                 2            249 / 248
======  ====================  ===========  ==================

FD001 against FD002 varies the number of operating regimes with the fault mode held fixed. FD003 against
FD004 repeats the contrast at two fault modes. That is a controlled ablation of regime confounding on
data whose structure nobody here chose, which is worth far more than the same comparison on synthetic
data designed by the person making the claim.

.. rubric:: The three questions this lane answers

1. **What does regime variation cost?** Identical detector, identical settings, FD001 against FD002. Any
   difference is the six regimes, because nothing else changed.
2. **How much does conditioning recover?** The same detector on within-regime residuals of FD002.
3. **What is the price of not being told the regime?** C-MAPSS ships three operational setting columns,
   so the regime is observable. Real truck telemetry does not. Running both the observed-regime route and
   the discovered (clustered) route, and reporting the gap, keeps the benchmark from flattering the
   method through a convenience it will not have in the field.

.. rubric:: The honesty boundary

C-MAPSS is a **simulated turbofan**, not a truck. The claim it supports is the MECHANISM (regime
variation inflates false alarms; conditioning on regime removes some of it), which is domain-general. It
is not a claim about trucks, and no surface of this product may present it as one.

.. rubric:: Where "healthy" and "onset" come from, since the data has no onset label

C-MAPSS records run to failure with no annotation of when degradation began. Inventing one would be
fabricating ground truth, so this lane uses the **standard piecewise-linear RUL convention** from the
prognostics literature: remaining useful life is treated as flat at a cap until the final ``rul_cap``
cycles, because a unit is not meaningfully "more healthy" at 300 cycles remaining than at 200.

Cycles with ``RUL > rul_cap`` are treated as healthy; the crossing is treated as the onset. **This is a
convention, not a measurement**, and every number derived from it inherits that. The false-alarm half of
the comparison does not depend on it at all, which is deliberate: that is the half the central claim
rests on, and it is measured purely on the healthy region.

Source: Saxena, A., Goebel, K., Simon, D., Eklund, N. "Damage propagation modeling for aircraft engine
run-to-failure simulation." *2008 International Conference on Prognostics and Health Management*,
pp. 1-9.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from regimecpd import Series

__all__ = ["CMAPSSSubset", "load_subset", "SUBSETS", "SENSOR_COLUMNS", "SETTING_COLUMNS"]

SETTING_COLUMNS = ("op_setting_1", "op_setting_2", "op_setting_3")
SENSOR_COLUMNS = tuple(f"sensor_{i:02d}" for i in range(1, 22))
ALL_COLUMNS = ("unit", "cycle") + SETTING_COLUMNS + SENSOR_COLUMNS

# Declared structure, from the dataset readme. Asserted at load time against what is actually in the
# files, because a silently mis-parsed subset would make the whole contrast meaningless while every
# downstream number still looked reasonable.
SUBSETS = {
    "FD001": {"conditions": 1, "fault_modes": 1, "train_units": 100, "test_units": 100},
    "FD002": {"conditions": 6, "fault_modes": 1, "train_units": 260, "test_units": 259},
    "FD003": {"conditions": 1, "fault_modes": 2, "train_units": 100, "test_units": 100},
    "FD004": {"conditions": 6, "fault_modes": 2, "train_units": 249, "test_units": 248},
}


@dataclass(frozen=True)
class CMAPSSSubset:
    """One subset, parsed into per-unit series with their run-to-failure structure intact."""

    name: str
    units: "list[dict]"
    n_conditions: int
    n_fault_modes: int

    @property
    def n_units(self) -> int:
        return len(self.units)

    def series(self, unit: dict, channels: "tuple[str, ...]" = SENSOR_COLUMNS) -> Series:
        idx = [ALL_COLUMNS.index(c) for c in channels]
        return Series(unit["cycle"].astype(float), unit["raw"][:, idx], channels,
                      unit_id=f"{self.name}-u{unit['unit']:03d}")

    def context(self, unit: dict) -> np.ndarray:
        idx = [ALL_COLUMNS.index(c) for c in SETTING_COLUMNS]
        return unit["raw"][:, idx]


def _informative_sensors(units: "list[dict]", tol: float = 1e-9,
                         baseline_cycles: "int | None" = None) -> "tuple[str, ...]":
    """Sensors that actually vary. Several C-MAPSS channels are constant and carry no information.

    Kept as a function rather than a hard-coded list, because WHICH sensors are constant differs between
    subsets: a channel frozen under one operating condition moves under six. Hard-coding the FD001 answer
    and applying it to FD002 would silently drop informative channels from exactly the subset the
    comparison depends on.

    ``baseline_cycles`` restricts the variance test to each unit's first N cycles. Passing it is what
    keeps channel selection out of the faulty region: computed over the whole record, the criterion reads
    data from after the onset, which contradicts the protocol's "nothing after calib informs any fit".
    The leak is weak (the criterion is only "does this channel move at all", and a channel frozen while
    healthy and moving while faulty is not a realistic C-MAPSS failure) but it is a leak, and closing it
    costs nothing.
    """
    if baseline_cycles is not None:
        stacked = np.vstack([u["raw"][:baseline_cycles] for u in units])
    else:
        stacked = np.vstack([u["raw"] for u in units])
    keep = []
    for name in SENSOR_COLUMNS:
        col = stacked[:, ALL_COLUMNS.index(name)]
        if float(np.nanstd(col)) > tol:
            keep.append(name)
    return tuple(keep)


def load_subset(root: "str | Path", name: str, split: str = "train",
                rul_cap: float = 125.0) -> CMAPSSSubset:
    """Parse one C-MAPSS subset.

    ``rul_cap`` sets the healthy/onset convention described in the module docstring.
    """
    if name not in SUBSETS:
        raise ValueError(f"unknown subset {name!r}; expected one of {sorted(SUBSETS)}")
    path = Path(root) / f"{split}_{name}.txt"
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Fetch C-MAPSS with scripts/fetch-data (NASA PHM data repository) "
            f"before running this lane."
        )

    raw = np.loadtxt(path)
    if raw.shape[1] != len(ALL_COLUMNS):
        raise ValueError(f"{path.name} has {raw.shape[1]} columns, expected {len(ALL_COLUMNS)}")

    units = []
    for unit_id in np.unique(raw[:, 0]).astype(int):
        block = raw[raw[:, 0] == unit_id]
        cycle = block[:, 1]
        rul = cycle.max() - cycle
        onset_index = int(np.argmax(rul <= rul_cap)) if np.any(rul <= rul_cap) else None
        units.append({
            "unit": int(unit_id),
            "raw": block,
            "cycle": cycle,
            "rul": rul,
            # The onset TIME on this unit's own clock, or None when the record never gets within the cap
            # (which does not happen on the training splits but is representable).
            "onset_t": None if onset_index is None else float(cycle[onset_index]),
            "life": float(cycle.max()),
        })

    declared = SUBSETS[name]
    expected = declared["train_units"] if split == "train" else declared["test_units"]
    if len(units) != expected:
        raise ValueError(
            f"{name} {split}: parsed {len(units)} units, the descriptor declares {expected}. "
            f"A mis-parse here would leave every downstream number looking reasonable and meaning nothing."
        )

    # The operating conditions are the thing the whole contrast turns on, so the count is VERIFIED
    # against the declared structure rather than assumed. Settings are rounded before counting because
    # they carry measurement noise in the last digits.
    settings = np.vstack([u["raw"][:, [ALL_COLUMNS.index(c) for c in SETTING_COLUMNS]] for u in units])
    observed = len({tuple(r) for r in np.round(settings, 0)})
    if observed != declared["conditions"]:
        raise ValueError(
            f"{name}: found {observed} distinct rounded operating conditions, "
            f"the descriptor declares {declared['conditions']}"
        )

    return CMAPSSSubset(name=name, units=units, n_conditions=declared["conditions"],
                        n_fault_modes=declared["fault_modes"])
