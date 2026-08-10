"""A physically grounded haul-truck fleet, where the regime confound is EMERGENT.

This is the synthetic lane, and it is the only lane in the product with named physical channels: tyre
pressure, strut pressure, brake temperature. It exists because no redistributable continuous-channel truck
telemetry with named channels is public (see `docs/cases/` and the dossiers behind it), and because a
synthetic fleet is the only place where a TRUE ONSET TIME exists by construction, which is what makes
onset error measurable rather than asserted.

.. rubric:: The one thing this module must get right

The regime confound has to be **emergent, not injected**. If a generator produced clean channels and then
pasted a regime-shaped wiggle on top, the whole product would be circular: a detector would fail on raw
channels because a wiggle was added for it to fail on.

So the channels are computed from the cycle. Strut pressure rises because the truck is loaded. Fuel rate
rises because total resistance is higher on the ramp. Brake temperature rises on the loaded descent
because the brakes are absorbing potential energy. Every one of those is the physics doing it, and the
regime confound appears as a consequence rather than as a term.

.. rubric:: The physics, and where it comes from

**Resistance.** Total resistance is grade resistance plus rolling resistance, as a percentage of gross
vehicle weight. If grade is 10% and rolling resistance is 2%, total resistance is 12%. The tractive force
required is

.. math:: F = \\frac{TR}{100} \\, m g

and achievable speed comes off the rimpull-speed-gradeability relation for the machine, capped by the
governed maximum.

**Struts.** Haul-truck suspension struts are hydraulic cylinders holding pressurised oil and nitrogen.
When the truck is loaded the struts compress and pressure rises with the load carried by that corner.
This is not incidental: strut pressure IS how payload measurement systems weigh the load, by monitoring
the nitrogen-charged accumulator on each wheel. So a slow nitrogen loss looks like a payload change until
you condition on regime, which makes it the sharpest fault in the set for this product's purpose.

**Tyres.** Tyre workload is TKPH, mean load times mean speed. Heat is the failure driver, and the casing
temperature follows a first-order lag on the heat generated minus the heat shed to ambient.

Prior art on strut monitoring specifically: "Anomaly detection in mining haul truck suspension struts",
*International Journal of Condition Monitoring* (2015), doi:10.1784/204764215814981602, which evaluates on
six months of in-service strut pressure data and runs two methods in parallel expressly to cut false
alarms. That design choice is independent corroboration that false alarms, not detection, are the hard
part in this domain.

.. rubric:: What this is NOT

Not a validated truck model, and nothing here is calibrated against a real machine. Magnitudes are chosen
to be physically plausible for a large rigid hauler; they are not measurements. Every surface that shows
this data labels it synthetic. Its job is to provide a known onset time and an emergent confound, not to
predict any real truck's behaviour.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

G = 9.81

CHANNELS = (
    "payload_t",
    "grade_pct",
    "speed_kmh",
    "strut_fl_bar",
    "strut_fr_bar",
    "strut_rl_bar",
    "strut_rr_bar",
    "tyre_pressure_kpa",
    "tyre_temp_c",
    "brake_temp_c",
    "engine_temp_c",
    "fuel_rate_lph",
)

# Channels a monitoring system treats as CONTEXT rather than as health signals. Payload, grade and speed
# are what the truck is being asked to do; everything else is how it responds.
CONTEXT_CHANNELS = ("payload_t", "grade_pct", "speed_kmh")
MONITORED_CHANNELS = tuple(c for c in CHANNELS if c not in CONTEXT_CHANNELS)


@dataclass(frozen=True)
class TruckSpec:
    """A large rigid hauler. Plausible magnitudes, not measurements from any real machine."""

    empty_mass_t: float = 165.0
    rated_payload_t: float = 220.0
    rimpull_max_kn: float = 750.0
    speed_max_kmh: float = 55.0
    rolling_resistance_pct: float = 2.5
    # Nitrogen-charged struts: pressure at zero payload, and the rise per tonne carried by that corner.
    strut_base_bar: float = 65.0
    strut_bar_per_tonne: float = 0.42
    # The rear axle carries roughly two thirds of the payload on a rigid hauler.
    rear_share: float = 0.67
    tyre_cold_kpa: float = 620.0
    tyre_kpa_per_degc: float = 2.1
    ambient_c: float = 22.0


@dataclass(frozen=True)
class CycleSpec:
    """One haul cycle: load, haul out loaded, dump, return empty.

    Durations are in samples. A sample is one minute of operation by convention, which sets the units of
    every rate this product reports: the false-alarm rate comes out per truck-minute and is converted to
    per truck-month by the metrics layer.
    """

    load_min: int = 4
    haul_min: int = 22
    dump_min: int = 3
    return_min: int = 16
    ramp_grade_pct: float = 8.0
    bench_grade_pct: float = 1.0


def _phase_profile(cycle: CycleSpec) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Per-sample payload fraction, road grade and phase id for one cycle.

    The loaded haul climbs the ramp; the empty return descends it. That asymmetry is the whole source of
    the regime structure, and it is what a naive detector latches onto.
    """
    n = cycle.load_min + cycle.haul_min + cycle.dump_min + cycle.return_min
    payload = np.zeros(n)
    grade = np.zeros(n)
    phase = np.zeros(n, dtype=int)

    i = 0
    # 0 loading: payload ramps up on the bench
    for k in range(cycle.load_min):
        payload[i] = (k + 1) / cycle.load_min
        grade[i] = cycle.bench_grade_pct
        phase[i] = 0
        i += 1
    # 1 hauling loaded: up the ramp, then a short bench run to the dump
    for k in range(cycle.haul_min):
        payload[i] = 1.0
        frac = k / max(cycle.haul_min - 1, 1)
        grade[i] = cycle.ramp_grade_pct if frac < 0.75 else cycle.bench_grade_pct
        phase[i] = 1
        i += 1
    # 2 dumping
    for _ in range(cycle.dump_min):
        payload[i] = 0.0
        grade[i] = cycle.bench_grade_pct
        phase[i] = 2
        i += 1
    # 3 returning empty: back DOWN the ramp, which is where the brakes work
    for k in range(cycle.return_min):
        payload[i] = 0.0
        frac = k / max(cycle.return_min - 1, 1)
        grade[i] = -cycle.ramp_grade_pct if frac > 0.25 else cycle.bench_grade_pct
        phase[i] = 3
        i += 1
    return payload, grade, phase


@dataclass
class Fault:
    """A degradation injected at a known time, which is what makes onset error measurable.

    ``kind`` is one of:

    ``strut_leak``
        Slow nitrogen loss from one strut. Pressure at that corner sags. This is the sharpest fault for
        this product because on raw channels it is indistinguishable from carrying less payload, and only
        conditioning on regime separates the two.
    ``tyre_leak``
        Slow inflation-pressure loss, which raises casing temperature because a softer tyre flexes more.
    ``brake_drag``
        A binding brake: extra heat and extra rolling resistance, so fuel rate rises too.
    ``cooling_loss``
        Reduced heat rejection, so engine temperature climbs, worst under load.

    ``severity`` is the fraction of full effect reached at the end of the ramp-in.
    """

    kind: str
    onset_index: int
    ramp_min: int = 900
    severity: float = 1.0

    def progress(self, n: int) -> np.ndarray:
        """Fault magnitude over time: zero before onset, ramping linearly to ``severity``."""
        t = np.arange(n)
        return self.severity * np.clip((t - self.onset_index) / max(self.ramp_min, 1), 0.0, 1.0)


@dataclass
class HaulTruckSimulator:
    """Generate one truck's continuous record over many haul cycles."""

    spec: TruckSpec = field(default_factory=TruckSpec)
    cycle: CycleSpec = field(default_factory=CycleSpec)
    seed: int = 0

    burn_in_cycles: int = 3

    def simulate(self, n_cycles: int, fault: Fault | None = None
                 ) -> tuple[np.ndarray, np.ndarray, dict]:
        """Return ``(t, x, meta)`` with ``x`` of shape ``(n, len(CHANNELS))``.

        Times are in minutes from the start of the record.

        ``burn_in_cycles`` extra cycles are simulated and then DISCARDED. The thermal channels are
        first-order lags starting from ambient, so without a burn-in the first hour of every record is a
        warm-up transient from 22 C to a working temperature near 130 C. That transient is far larger
        than any fault and it is the same in every truck, so it would dominate the variance of the
        thermal channels, make their between-regime share meaningless, and hand every detector a
        guaranteed excursion at the start of every record. It is an artefact of starting the simulation,
        not a property of trucks.
        """
        rng = np.random.default_rng(self.seed)
        payload_frac, grade, phase = _phase_profile(self.cycle)

        # Cycle-to-cycle variability is real and it matters here: without it every cycle is identical, the
        # regime clusters are points rather than clouds, and the segmentation problem becomes trivial in a
        # way no real fleet is.
        cycle_len = len(payload_frac)
        burn = self.burn_in_cycles * cycle_len
        reps = n_cycles + self.burn_in_cycles
        payload_frac = np.tile(payload_frac, reps)
        grade = np.tile(grade, reps)
        phase = np.tile(phase, reps)
        n = len(payload_frac)

        per_cycle_load = rng.normal(1.0, 0.06, reps).repeat(cycle_len)
        payload_frac = np.clip(payload_frac * per_cycle_load, 0.0, 1.15)
        grade = grade + rng.normal(0.0, 0.35, n)

        payload_t = payload_frac * self.spec.rated_payload_t
        gross_t = self.spec.empty_mass_t + payload_t

        # The fault clock runs on the RETAINED record, so an onset index means what the caller intended
        # rather than being shifted by the discarded burn-in.
        prog = np.concatenate([np.zeros(burn), fault.progress(n - burn)]) if fault is not None             else np.zeros(n)
        kind = fault.kind if fault is not None else "none"

        # --- resistance and speed -------------------------------------------------------------------
        rolling = np.full(n, self.spec.rolling_resistance_pct)
        if kind == "brake_drag":
            rolling = rolling + 1.6 * prog          # a binding brake is extra rolling resistance
        total_resistance = grade + rolling
        required_kn = total_resistance / 100.0 * gross_t * 1000.0 * G / 1000.0

        # Rimpull-limited speed: power is roughly constant above lugging speed, so v ~ P / F. Capped by
        # the governed maximum and floored so a stationary phase does not divide by zero downstream.
        with np.errstate(divide="ignore", invalid="ignore"):
            speed = np.where(required_kn > 1.0,
                             self.spec.rimpull_max_kn * self.spec.speed_max_kmh / (required_kn * 3.0),
                             self.spec.speed_max_kmh)
        speed = np.clip(speed, 3.0, self.spec.speed_max_kmh)
        speed = np.where(np.isin(phase, (0, 2)), 0.0, speed)      # stationary while loading or dumping
        speed = speed + rng.normal(0.0, 0.6, n)
        speed = np.clip(speed, 0.0, self.spec.speed_max_kmh)

        # --- struts ---------------------------------------------------------------------------------
        # Pressure at each corner rises with the payload that corner carries. This is the payload
        # measurement principle, so the fault and the signal share a channel by construction.
        front_t = payload_t * (1.0 - self.spec.rear_share) / 2.0
        rear_t = payload_t * self.spec.rear_share / 2.0
        struts = {}
        for name, share in (("fl", front_t), ("fr", front_t), ("rl", rear_t), ("rr", rear_t)):
            p = self.spec.strut_base_bar + self.spec.strut_bar_per_tonne * share
            # Dynamic component: rougher ride at speed on grade.
            p = p + 0.02 * speed * np.abs(grade) / 5.0
            struts[name] = p + rng.normal(0.0, 0.35, n)
        if kind == "strut_leak":
            # One corner only. Nitrogen loss drops the gas-spring pressure, so the corner sags.
            struts["rl"] = struts["rl"] - 9.0 * prog

        # --- tyres ----------------------------------------------------------------------------------
        # TKPH: the work the tyre is doing. Heat generated tracks it; heat shed tracks the excess over
        # ambient. First-order lag between the two.
        tkph = (gross_t / 6.0) * speed
        inflation = np.full(n, self.spec.tyre_cold_kpa)
        if kind == "tyre_leak":
            inflation = inflation - 150.0 * prog
        # A softer tyre flexes more and runs hotter: the deflection term is the coupling.
        deflection = np.clip(self.spec.tyre_cold_kpa / np.maximum(inflation, 200.0), 1.0, 3.0)
        heat_in = 0.0016 * tkph * deflection
        tyre_temp = np.empty(n)
        temp = self.spec.ambient_c
        tau = 0.03
        for i in range(n):
            temp += tau * (self.spec.ambient_c + heat_in[i] * 40.0 - temp)
            tyre_temp[i] = temp
        tyre_temp = tyre_temp + rng.normal(0.0, 0.5, n)
        # Gay-Lussac: a sealed tyre's pressure rises with its own temperature.
        tyre_pressure = inflation + self.spec.tyre_kpa_per_degc * (tyre_temp - self.spec.ambient_c)
        tyre_pressure = tyre_pressure + rng.normal(0.0, 2.5, n)

        # --- brakes ---------------------------------------------------------------------------------
        # The loaded descent is where brakes absorb potential energy. Retarding power tracks
        # m g v sin(theta) on a negative grade, and is near zero elsewhere.
        descending = np.minimum(grade, 0.0)
        retard_kw = np.abs(gross_t * 1000.0 * G * (speed / 3.6) * (descending / 100.0)) / 1000.0
        brake_heat = 0.010 * retard_kw
        if kind == "brake_drag":
            brake_heat = brake_heat + 9.0 * prog
        brake_temp = np.empty(n)
        temp = self.spec.ambient_c
        for i in range(n):
            temp += 0.06 * (self.spec.ambient_c + brake_heat[i] * 30.0 - temp)
            brake_temp[i] = temp
        brake_temp = brake_temp + rng.normal(0.0, 1.2, n)

        # --- engine ---------------------------------------------------------------------------------
        load_frac = np.clip(required_kn / self.spec.rimpull_max_kn, 0.0, 1.4)
        reject = np.full(n, 1.0)
        if kind == "cooling_loss":
            reject = reject - 0.45 * prog        # worst under load, which is the diagnostic signature
        engine_temp = np.empty(n)
        temp = 85.0
        for i in range(n):
            target = 82.0 + 26.0 * load_frac[i] / np.maximum(reject[i], 0.3)
            temp += 0.08 * (target - temp)
            engine_temp[i] = temp
        engine_temp = engine_temp + rng.normal(0.0, 0.7, n)

        fuel = 18.0 + 235.0 * load_frac + rng.normal(0.0, 4.0, n)
        fuel = np.where(speed < 0.5, 22.0 + rng.normal(0.0, 2.0, n), fuel)

        x = np.column_stack([
            payload_t, grade, speed,
            struts["fl"], struts["fr"], struts["rl"], struts["rr"],
            tyre_pressure, tyre_temp, brake_temp, engine_temp, fuel,
        ])[burn:]
        phase = phase[burn:]
        t = np.arange(float(len(x)))
        meta = {
            "n_cycles": n_cycles,
            "cycle_minutes": cycle_len,
            "burn_in_cycles": self.burn_in_cycles,
            "phase": phase,
            "fault_kind": kind,
            "onset_index": None if fault is None else int(fault.onset_index),
            "onset_t": None if fault is None else float(fault.onset_index),
            "seed": self.seed,
        }
        return t, x, meta


def build_fleet(n_healthy: int, n_faulty: int, n_cycles: int = 60,
                fault_kinds: tuple[str, ...] = ("strut_leak", "tyre_leak", "brake_drag",
                                                  "cooling_loss"),
                onset_fraction: float = 0.55, severity: float = 1.0,
                seed: int = 0) -> list[dict]:
    """A fleet of trucks, most healthy, some developing a fault at a known time.

    Healthy trucks are the majority on purpose. They are where the false-alarm rate is actually measured,
    and a benchmark run only on faulty trucks cannot report one at all.
    """
    rng = np.random.default_rng(seed)
    fleet = []
    for i in range(n_healthy):
        sim = HaulTruckSimulator(seed=int(rng.integers(1 << 30)))
        t, x, meta = sim.simulate(n_cycles)
        fleet.append({"unit_id": f"H{i:03d}", "t": t, "x": x, "meta": meta})
    for i in range(n_faulty):
        kind = fault_kinds[i % len(fault_kinds)]
        sim = HaulTruckSimulator(seed=int(rng.integers(1 << 30)))
        n_total = n_cycles * (sim.cycle.load_min + sim.cycle.haul_min
                              + sim.cycle.dump_min + sim.cycle.return_min)
        onset = int(n_total * onset_fraction)
        fault = Fault(kind=kind, onset_index=onset,
                      ramp_min=int(n_total * 0.20), severity=severity)
        t, x, meta = sim.simulate(n_cycles, fault=fault)
        fleet.append({"unit_id": f"F{i:03d}_{kind}", "t": t, "x": x, "meta": meta})
    return fleet


def true_regime(payload_t: np.ndarray, grade_pct: np.ndarray, rated_payload_t: float = 220.0
                ) -> np.ndarray:
    """The regime label a perfect segmenter would recover: loaded/empty crossed with up/flat/down.

    Provided so the discovered segmentation can be scored against ground truth, which is a measurement
    the real lanes cannot offer and this one can.
    """
    loaded = (payload_t > 0.35 * rated_payload_t).astype(int)
    slope = np.digitize(grade_pct, [-3.0, 3.0])      # 0 down, 1 flat, 2 up
    return loaded * 3 + slope


def cycle_phase_name(phase_id: int) -> str:
    return ("loading", "hauling loaded", "dumping", "returning empty")[int(phase_id)]
