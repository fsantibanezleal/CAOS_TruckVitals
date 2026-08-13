// The haul-truck simulator, ported from `data-pipeline/truckvitals/model/haulcycle.py`.
//
// Same physics, same constants, same channel order. It exists so the App's knobs actually compute a
// truck rather than swapping between precooked ones: change the fault kind, its severity, when it starts
// or how the cycle is shaped, and a new record is generated in the browser.
//
// THE ONE THING THIS MUST GET RIGHT, restated from the Python because it is the whole basis of the
// product: the regime confound has to be EMERGENT, not injected. Nothing here adds a regime-shaped wiggle
// for a detector to fail on. Strut pressure rises because the truck is loaded. Brake temperature rises on
// the loaded descent because the brakes are absorbing potential energy. Fuel rate rises because total
// resistance is higher on the ramp. The regime structure is a consequence of the cycle, and if it were
// pasted on instead, the product's central comparison would be circular.
//
// NOT a validated truck model. Magnitudes are physically plausible for a large rigid hauler; they are not
// measurements from one. The realisation differs from the Python's for the same seed (see rng.ts); the
// physics does not.

import { makeRng } from './rng.ts';

export const CHANNELS = [
  'payload_t', 'grade_pct', 'speed_kmh',
  'strut_fl_bar', 'strut_fr_bar', 'strut_rl_bar', 'strut_rr_bar',
  'tyre_pressure_kpa', 'tyre_temp_c', 'brake_temp_c', 'engine_temp_c', 'fuel_rate_lph',
] as const;

export type Channel = (typeof CHANNELS)[number];

/** What the truck is being ASKED to do. Never monitored for faults; used to define the regime. */
export const CONTEXT_CHANNELS: Channel[] = ['payload_t', 'grade_pct', 'speed_kmh'];
/** How the truck RESPONDS. These are the health signals. */
export const MONITORED_CHANNELS: Channel[] = CHANNELS.filter(
  (c) => !CONTEXT_CHANNELS.includes(c)) as Channel[];

export const FAULT_KINDS = ['none', 'strut_leak', 'tyre_leak', 'brake_drag', 'cooling_loss'] as const;
export type FaultKind = (typeof FAULT_KINDS)[number];

/** The channels each fault expresses itself in, by construction. Ground truth for attribution. */
export const FAULT_CHANNELS: Record<FaultKind, Channel[]> = {
  none: [],
  strut_leak: ['strut_rl_bar'],
  tyre_leak: ['tyre_pressure_kpa', 'tyre_temp_c'],
  brake_drag: ['brake_temp_c', 'fuel_rate_lph'],
  cooling_loss: ['engine_temp_c'],
};

const G = 9.81;

export interface TruckSpec {
  emptyMassT: number;
  ratedPayloadT: number;
  rimpullMaxKn: number;
  speedMaxKmh: number;
  rollingResistancePct: number;
  strutBaseBar: number;
  strutBarPerTonne: number;
  rearShare: number;
  tyreColdKpa: number;
  tyreKpaPerDegC: number;
  ambientC: number;
}

export const DEFAULT_SPEC: TruckSpec = {
  emptyMassT: 165.0,
  ratedPayloadT: 220.0,
  rimpullMaxKn: 750.0,
  speedMaxKmh: 55.0,
  rollingResistancePct: 2.5,
  strutBaseBar: 65.0,
  strutBarPerTonne: 0.42,
  rearShare: 0.67,          // a rigid hauler puts about two thirds of the payload on the rear axle
  tyreColdKpa: 620.0,
  tyreKpaPerDegC: 2.1,
  ambientC: 22.0,
};

export interface CycleSpec {
  loadMin: number;
  haulMin: number;
  dumpMin: number;
  returnMin: number;
  rampGradePct: number;
  benchGradePct: number;
}

export const DEFAULT_CYCLE: CycleSpec = {
  loadMin: 4, haulMin: 22, dumpMin: 3, returnMin: 16, rampGradePct: 8.0, benchGradePct: 1.0,
};

export interface SimOptions {
  nCycles: number;
  seed: number;
  faultKind: FaultKind;
  /** Fraction of the retained record at which the fault begins. */
  onsetFraction: number;
  /** Fraction of full effect reached at the end of the ramp-in. */
  severity: number;
  /** Ramp-in length as a fraction of the record. */
  rampFraction: number;
  spec: TruckSpec;
  cycle: CycleSpec;
  burnInCycles: number;
}

export const DEFAULT_SIM: SimOptions = {
  nCycles: 45,
  seed: 1,
  faultKind: 'strut_leak',
  onsetFraction: 0.55,
  severity: 1.0,
  rampFraction: 0.20,
  spec: DEFAULT_SPEC,
  cycle: DEFAULT_CYCLE,
  burnInCycles: 3,
};

export interface TruckRecord {
  t: Float64Array;
  /** column-major: `x[channel][sample]`, which is what every chart and detector wants. */
  x: Record<Channel, Float64Array>;
  phase: Int32Array;
  n: number;
  cycleMinutes: number;
  faultKind: FaultKind;
  /** null on a healthy truck. */
  onsetT: number | null;
  faultChannels: Channel[];
}

function phaseProfile(cycle: CycleSpec) {
  const n = cycle.loadMin + cycle.haulMin + cycle.dumpMin + cycle.returnMin;
  const payload = new Float64Array(n);
  const grade = new Float64Array(n);
  const phase = new Int32Array(n);
  let i = 0;
  for (let k = 0; k < cycle.loadMin; k++, i++) {
    payload[i] = (k + 1) / cycle.loadMin;      // loading on the bench
    grade[i] = cycle.benchGradePct;
    phase[i] = 0;
  }
  for (let k = 0; k < cycle.haulMin; k++, i++) {
    payload[i] = 1.0;                           // loaded, UP the ramp then a bench run to the dump
    const frac = k / Math.max(cycle.haulMin - 1, 1);
    grade[i] = frac < 0.75 ? cycle.rampGradePct : cycle.benchGradePct;
    phase[i] = 1;
  }
  for (let k = 0; k < cycle.dumpMin; k++, i++) {
    payload[i] = 0.0;
    grade[i] = cycle.benchGradePct;
    phase[i] = 2;
  }
  for (let k = 0; k < cycle.returnMin; k++, i++) {
    payload[i] = 0.0;                           // empty, back DOWN the ramp: this is where brakes work
    const frac = k / Math.max(cycle.returnMin - 1, 1);
    grade[i] = frac > 0.25 ? -cycle.rampGradePct : cycle.benchGradePct;
    phase[i] = 3;
  }
  return { payload, grade, phase, n };
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function simulate(opts: Partial<SimOptions> = {}): TruckRecord {
  const o: SimOptions = { ...DEFAULT_SIM, ...opts };
  const rng = makeRng(o.seed);
  const base = phaseProfile(o.cycle);
  const cycleLen = base.n;
  const reps = o.nCycles + o.burnInCycles;
  const burn = o.burnInCycles * cycleLen;
  const n = cycleLen * reps;

  // Cycle-to-cycle variability is not decoration: without it every cycle is identical, the regime
  // clusters are points rather than clouds, and the segmentation problem becomes trivial in a way no
  // real fleet is.
  const payloadFrac = new Float64Array(n);
  const grade = new Float64Array(n);
  const phase = new Int32Array(n);
  for (let c = 0; c < reps; c++) {
    const load = rng.normal(1.0, 0.06);
    for (let k = 0; k < cycleLen; k++) {
      const i = c * cycleLen + k;
      payloadFrac[i] = clamp(base.payload[k] * load, 0.0, 1.15);
      grade[i] = base.grade[k] + rng.normal(0.0, 0.35);
      phase[i] = base.phase[k];
    }
  }

  const retained = n - burn;
  const onsetIndex = o.faultKind === 'none' ? -1 : Math.floor(retained * o.onsetFraction);
  const rampMin = Math.max(1, Math.floor(retained * o.rampFraction));
  // The fault clock runs on the RETAINED record, so an onset means what the caller intended rather than
  // being shifted by the discarded burn-in.
  const prog = new Float64Array(n);
  if (o.faultKind !== 'none') {
    for (let i = burn; i < n; i++) {
      prog[i] = o.severity * clamp((i - burn - onsetIndex) / rampMin, 0.0, 1.0);
    }
  }

  const payloadT = new Float64Array(n);
  const grossT = new Float64Array(n);
  const speed = new Float64Array(n);
  const requiredKn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    payloadT[i] = payloadFrac[i] * o.spec.ratedPayloadT;
    grossT[i] = o.spec.emptyMassT + payloadT[i];
    let rolling = o.spec.rollingResistancePct;
    if (o.faultKind === 'brake_drag') rolling += 1.6 * prog[i];   // a binding brake IS extra resistance
    const totalResistance = grade[i] + rolling;
    requiredKn[i] = (totalResistance / 100.0) * grossT[i] * 1000.0 * G / 1000.0;
    // Rimpull-limited: power is roughly constant above lugging speed, so v ~ P / F.
    let v = requiredKn[i] > 1.0
      ? (o.spec.rimpullMaxKn * o.spec.speedMaxKmh) / (requiredKn[i] * 3.0)
      : o.spec.speedMaxKmh;
    v = clamp(v, 3.0, o.spec.speedMaxKmh);
    if (phase[i] === 0 || phase[i] === 2) v = 0.0;                 // stationary loading or dumping
    speed[i] = clamp(v + rng.normal(0.0, 0.6), 0.0, o.spec.speedMaxKmh);
  }

  // --- struts: pressure at each corner rises with the payload that corner carries, which is exactly how
  // a payload measurement system weighs the load. The fault and the signal share a channel by
  // construction, which is what makes a strut leak the sharpest test of regime conditioning.
  const strut: Record<'fl' | 'fr' | 'rl' | 'rr', Float64Array> = {
    fl: new Float64Array(n), fr: new Float64Array(n), rl: new Float64Array(n), rr: new Float64Array(n),
  };
  for (let i = 0; i < n; i++) {
    const frontT = (payloadT[i] * (1 - o.spec.rearShare)) / 2;
    const rearT = (payloadT[i] * o.spec.rearShare) / 2;
    const dyn = 0.02 * speed[i] * Math.abs(grade[i]) / 5.0;        // rougher ride at speed on grade
    strut.fl[i] = o.spec.strutBaseBar + o.spec.strutBarPerTonne * frontT + dyn + rng.normal(0, 0.35);
    strut.fr[i] = o.spec.strutBaseBar + o.spec.strutBarPerTonne * frontT + dyn + rng.normal(0, 0.35);
    strut.rl[i] = o.spec.strutBaseBar + o.spec.strutBarPerTonne * rearT + dyn + rng.normal(0, 0.35);
    strut.rr[i] = o.spec.strutBaseBar + o.spec.strutBarPerTonne * rearT + dyn + rng.normal(0, 0.35);
    if (o.faultKind === 'strut_leak') strut.rl[i] -= 9.0 * prog[i];  // one corner sags as nitrogen goes
  }

  // --- tyres: TKPH is the work the tyre does; heat follows a first-order lag on generation minus
  // shedding, and a softer tyre flexes more and runs hotter (the deflection term is that coupling).
  const tyreTemp = new Float64Array(n);
  const tyrePressure = new Float64Array(n);
  let temp = o.spec.ambientC;
  const tau = 0.03;
  for (let i = 0; i < n; i++) {
    const inflation = o.spec.tyreColdKpa - (o.faultKind === 'tyre_leak' ? 150.0 * prog[i] : 0);
    const deflection = clamp(o.spec.tyreColdKpa / Math.max(inflation, 200.0), 1.0, 3.0);
    const tkph = (grossT[i] / 6.0) * speed[i];
    const heatIn = 0.0016 * tkph * deflection;
    temp += tau * (o.spec.ambientC + heatIn * 40.0 - temp);
    tyreTemp[i] = temp + rng.normal(0, 0.5);
    // Gay-Lussac: a sealed tyre's pressure rises with its own temperature.
    tyrePressure[i] = inflation + o.spec.tyreKpaPerDegC * (tyreTemp[i] - o.spec.ambientC)
      + rng.normal(0, 2.5);
  }

  // --- brakes: the loaded descent is where they absorb potential energy.
  const brakeTemp = new Float64Array(n);
  temp = o.spec.ambientC;
  for (let i = 0; i < n; i++) {
    const descending = Math.min(grade[i], 0.0);
    const retardKw = Math.abs(grossT[i] * 1000.0 * G * (speed[i] / 3.6) * (descending / 100.0)) / 1000.0;
    let heat = 0.010 * retardKw;
    if (o.faultKind === 'brake_drag') heat += 9.0 * prog[i];
    temp += 0.06 * (o.spec.ambientC + heat * 30.0 - temp);
    brakeTemp[i] = temp + rng.normal(0, 1.2);
  }

  // --- engine: reduced heat rejection shows up worst under load, which is the diagnostic signature.
  const engineTemp = new Float64Array(n);
  const fuel = new Float64Array(n);
  temp = 85.0;
  for (let i = 0; i < n; i++) {
    const loadFrac = clamp(requiredKn[i] / o.spec.rimpullMaxKn, 0.0, 1.4);
    const reject = 1.0 - (o.faultKind === 'cooling_loss' ? 0.45 * prog[i] : 0);
    const target = 82.0 + (26.0 * loadFrac) / Math.max(reject, 0.3);
    temp += 0.08 * (target - temp);
    engineTemp[i] = temp + rng.normal(0, 0.7);
    fuel[i] = speed[i] < 0.5
      ? 22.0 + rng.normal(0, 2.0)
      : 18.0 + 235.0 * loadFrac + rng.normal(0, 4.0);
  }

  // Drop the burn-in. The thermal channels are first-order lags starting from ambient, so without it the
  // first hour of every record is a warm-up transient far larger than any fault, identical in every
  // truck, handing every detector a guaranteed excursion at t=0.
  const cut = (a: Float64Array) => a.slice(burn);
  const x = {
    payload_t: cut(payloadT), grade_pct: cut(grade), speed_kmh: cut(speed),
    strut_fl_bar: cut(strut.fl), strut_fr_bar: cut(strut.fr),
    strut_rl_bar: cut(strut.rl), strut_rr_bar: cut(strut.rr),
    tyre_pressure_kpa: cut(tyrePressure), tyre_temp_c: cut(tyreTemp),
    brake_temp_c: cut(brakeTemp), engine_temp_c: cut(engineTemp), fuel_rate_lph: cut(fuel),
  } as Record<Channel, Float64Array>;

  const t = new Float64Array(retained);
  for (let i = 0; i < retained; i++) t[i] = i;

  return {
    t,
    x,
    phase: phase.slice(burn),
    n: retained,
    cycleMinutes: cycleLen,
    faultKind: o.faultKind,
    onsetT: o.faultKind === 'none' ? null : onsetIndex,
    faultChannels: FAULT_CHANNELS[o.faultKind],
  };
}

/** The regime label a perfect segmenter would recover: loaded/empty crossed with down/flat/up. */
export function trueRegime(payloadT: Float64Array, gradePct: Float64Array,
                           ratedPayloadT = DEFAULT_SPEC.ratedPayloadT): Int32Array {
  const out = new Int32Array(payloadT.length);
  for (let i = 0; i < payloadT.length; i++) {
    const loaded = payloadT[i] > 0.35 * ratedPayloadT ? 1 : 0;
    const slope = gradePct[i] < -3.0 ? 0 : gradePct[i] < 3.0 ? 1 : 2;
    out[i] = loaded * 3 + slope;
  }
  return out;
}

export const PHASE_NAMES = ['loading', 'hauling loaded', 'dumping', 'returning empty'];
