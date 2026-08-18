"""Tests for the lanes this product actually has.

These replace the template's epidemic-contract tests, which described a different product entirely.

The two that matter most are the negative controls. A benchmark that only ever runs on data where the
effect exists cannot tell a working measurement from a broken one, and this product has already shipped
one number that a chance baseline later overturned.
"""
from __future__ import annotations

import numpy as np
import pytest
from truckvitals.lanes.mechanism import fleet_denominators, measure_mechanism, regime_key
from truckvitals.model.haulcycle import CHANNELS, CONTEXT_CHANNELS, MONITORED_CHANNELS, build_fleet


class TestSyntheticFleet:
    def test_the_same_seed_gives_an_identical_fleet(self):
        a = build_fleet(n_healthy=2, n_faulty=2, n_cycles=8, seed=3)
        b = build_fleet(n_healthy=2, n_faulty=2, n_cycles=8, seed=3)
        assert len(a) == len(b)
        for ua, ub in zip(a, b):
            assert ua["unit_id"] == ub["unit_id"]
            assert np.array_equal(ua["x"], ub["x"])

    def test_a_different_seed_gives_a_different_fleet(self):
        a = build_fleet(n_healthy=2, n_faulty=2, n_cycles=8, seed=3)
        b = build_fleet(n_healthy=2, n_faulty=2, n_cycles=8, seed=4)
        assert not np.array_equal(a[0]["x"], b[0]["x"])

    def test_context_channels_are_disjoint_from_monitored_channels(self):
        # The whole comparison is circular if a regime is defined using a channel being monitored: the
        # segmentation would absorb the fault and the residual would go flat. This is the structural
        # guarantee that stops it, so it is asserted rather than trusted.
        assert not (set(CONTEXT_CHANNELS) & set(MONITORED_CHANNELS))
        assert set(CONTEXT_CHANNELS) | set(MONITORED_CHANNELS) == set(CHANNELS)

    def test_a_healthy_unit_has_no_onset_and_a_faulty_one_does(self):
        fleet = build_fleet(n_healthy=2, n_faulty=2, n_cycles=10, seed=0)
        healthy = [u for u in fleet if u["meta"]["fault_kind"] == "none"]
        faulty = [u for u in fleet if u["meta"]["fault_kind"] != "none"]
        assert healthy and faulty
        assert all(u["meta"]["onset_t"] is None for u in healthy)
        assert all(u["meta"]["onset_t"] is not None for u in faulty)

    def test_the_burn_in_is_discarded(self):
        # Cycles at the very start of a simulation carry transients from arbitrary initial conditions.
        # Leaving them in the record would put a real change at t=0 in every unit, healthy ones included.
        fleet = build_fleet(n_healthy=1, n_faulty=0, n_cycles=10, seed=0)
        meta = fleet[0]["meta"]
        assert meta["burn_in_cycles"] > 0, "there must be a burn-in to discard"
        # The burn-in cycles are simulated and then dropped, so the RECORD is exactly the requested
        # length. If the burn-in were simply not simulated, the record would still be this long and this
        # assertion would pass, which is why the transient check below is the one that has teeth.
        assert fleet[0]["x"].shape[0] == meta["n_cycles"] * meta["cycle_minutes"]

    def test_a_healthy_record_does_not_open_on_a_transient(self):
        # The point of a burn-in: without it every unit, healthy ones included, starts with a settling
        # transient that any change detector reads as a real change at t=0.
        fleet = build_fleet(n_healthy=4, n_faulty=0, n_cycles=12, seed=1)
        for unit in fleet:
            for j, name in enumerate(CHANNELS):
                x = unit["x"][:, j]
                if np.nanstd(x) <= 0:
                    continue
                head, rest = x[:60], x[60:]
                drift = abs(np.nanmean(head) - np.nanmean(rest)) / np.nanstd(x)
                assert drift < 1.0, f"{unit['unit_id']} {name}: opens {drift:.2f} sd away from its own record"


class TestMechanismNegativeControls:
    """The mechanism measurement must return 1.0 when there is nothing to condition on."""

    def _subset(self, n_regimes: int, n_units: int = 12, n: int = 200, shift: float = 2.0, seed: int = 0):
        """A minimal object with the two attributes `measure_mechanism` uses."""
        rng = np.random.default_rng(seed)
        names = ("a", "b", "c")

        class _Series:
            def __init__(self, t, x):
                self.t, self.x, self.n = t, x, len(t)

        class _Subset:
            def __init__(self, units):
                self.units = units
                self._ctx = {}

            def series(self, unit, channels):
                idx = [names.index(c) for c in channels]
                return _Series(unit["t"], unit["x"][:, idx])

            def context(self, unit):
                return unit["ctx"]

        units = []
        for u in range(n_units):
            # The regime SHIFTS each channel by a large amount, so pooled spread is dominated by it.
            # PERIODIC rather than random, so every window holds the same regime mixture. With a random
            # sequence the healthy and faulty windows differ in composition, and since each regime shifts
            # the channels by 50 units that difference swamps the fault entirely.
            reg = np.arange(n) % n_regimes
            ctx = np.column_stack([reg.astype(float), np.zeros(n), np.zeros(n)])
            base = rng.normal(scale=0.3, size=(n, 3)) + 50.0 * reg[:, None]
            base[150:] += shift          # the fault, in the tail only
            units.append({"unit_id": f"u{u}", "t": np.arange(n, dtype=float),
                          "x": base, "ctx": ctx, "onset_t": 140.0})
        return _Subset(units), names

    def test_one_regime_gives_a_ratio_of_exactly_one(self):
        subset, names = self._subset(n_regimes=1)
        out = measure_mechanism(subset, names, healthy_cycles=120, faulty_tail=40, min_samples=30)
        assert out["n_units"] > 0
        assert out["ratio"] == pytest.approx(1.0, abs=1e-9), (
            "with a single regime the pooled and within-regime denominators are the same quantity; "
            f"got {out['ratio']}")

    def test_many_regimes_give_a_ratio_far_above_one(self):
        subset, names = self._subset(n_regimes=6)
        out = measure_mechanism(subset, names, healthy_cycles=120, faulty_tail=40, min_samples=30)
        assert out["n_regimes_used"] == 6
        assert out["ratio"] > 10.0, f"regime structure should inflate the pooled denominator, got {out['ratio']}"
        assert out["median_d_pooled"] < out["median_d_within_regime"]

    def test_the_ratio_does_not_depend_on_the_size_of_the_fault(self):
        # The fault shift appears in the numerator of both effect sizes and cancels. If this ever stops
        # holding, the ratio has started measuring the fault rather than the regime structure.
        small, names = self._subset(n_regimes=6, shift=0.5)
        large, _ = self._subset(n_regimes=6, shift=8.0)
        a = measure_mechanism(small, names, healthy_cycles=120, faulty_tail=42, min_samples=30)
        b = measure_mechanism(large, names, healthy_cycles=120, faulty_tail=42, min_samples=30)
        assert a["ratio"] == pytest.approx(b["ratio"], rel=1e-9)

    def test_regime_key_rounds_before_combining(self):
        # C-MAPSS settings carry noise in the last digits (34.9983, 41.9982). At full precision nearly
        # every row becomes its own regime and every within-regime spread comes from one sample.
        ctx = np.array([[34.9983, 0.84, 100.0], [35.0011, 0.8401, 100.0], [41.9982, 0.84, 100.0]])
        assert len(np.unique(regime_key(ctx, decimals=0))) == 2
        assert len(np.unique(regime_key(ctx, decimals=4))) == 3

    def test_denominators_need_enough_samples_per_regime(self):
        subset, names = self._subset(n_regimes=6, n_units=1, n=60)
        _, sd_within, n_used, _ = fleet_denominators(subset, names, healthy_cycles=40, min_samples=500)
        assert sd_within is None and n_used == 0, (
            "a regime with too few samples must be skipped, not used to produce a spread from noise")


class TestBudgetCurves:
    """The baked alarm-budget curve: every rung read off at every budget, no silently absent cell."""

    @classmethod
    def setup_class(cls):
        from truckvitals.lanes.synthetic_benchmark import BUDGET_GRID, run_synthetic_benchmark
        cls.grid = BUDGET_GRID
        cls.result = run_synthetic_benchmark(
            n_healthy=4, n_faulty=3, n_cycles=12, seed=0, detectors=("shewhart", "cusum"))

    def test_every_detector_and_arm_has_a_full_curve(self):
        curves = self.result["budget_curves"]
        assert set(curves) == {"shewhart", "cusum"}
        for det, arms in curves.items():
            assert set(arms) == {"raw", "residual"}, det
            for arm, curve in arms.items():
                assert [c["budget_per_truck_month"] for c in curve] == list(self.grid), (
                    f"{det}/{arm}: a curve with silently absent points reads as one never swept there")

    def test_a_cell_is_either_fully_populated_or_explicitly_unreachable(self):
        for det, arms in self.result["budget_curves"].items():
            for arm, curve in arms.items():
                for c in curve:
                    if c["reachable"]:
                        assert 0.0 <= c["detection_rate"] <= 1.0
                        lo, hi = c["det_ci"]
                        assert lo <= c["detection_rate"] <= hi, (
                            f"{det}/{arm} at {c['budget_per_truck_month']}: the point estimate must "
                            "sit inside its own bootstrap interval")
                        assert c["threshold"] is not None
                    else:
                        assert c["detection_rate"] is None and c["det_ci"] is None, (
                            "an unreachable budget must not carry numbers a reader would trust")

    def test_the_grid_travels_into_the_artifact(self):
        assert self.result["budget_grid_per_truck_month"] == list(self.grid)
