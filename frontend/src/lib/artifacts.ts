// Loaders for the baked artifacts, overlaid into public/data by copy-data.mjs.
//
// Every number this site shows comes from one of these files. There is no second copy hand-written into
// a page, because a hand-written number is a number that can disagree with the pipeline and still render.
// If a page wants a figure that is not in an artifact, the fix is a pipeline change, not a literal.

export interface FleetUnitIndexRow {
  unit_id: string;
  fault_kind: string;
  onset_t: number | null;
  fault_channels: string[];
  regime_coverage: number;
}

export interface FleetIndex {
  schema: string;
  generated_utc: string;
  regimecpd_version: string;
  python: string;
  numpy: string;
  config: {
    n_healthy: number; n_faulty: number; n_cycles: number;
    fit_frac: number; calib_frac: number; n_regimes: number;
    budget_per_truck_month: number; minutes_per_month: number; seed: number;
    detectors: string[]; channels: string[]; context_channels: string[];
    monitored_channels: string[];
    n_units_generated: number; n_units_kept: number;
    n_units_dropped_fault_in_baseline: number;
  };
  thresholds: Record<string, { raw: number; residual: number }>;
  units: FleetUnitIndexRow[];
  honest_limits: string[];
}

export interface ArmDetection {
  statistic: (number | null)[];
  threshold: number;
  alarm_times: number[];
  first_alarm_after_onset_t: number | null;
  delay_min: number | null;
}

export interface FleetTrace {
  unit_id: string;
  fault_kind: string;
  onset_t: number | null;
  fault_channels: string[];
  n_cycles: number;
  cycle_minutes: number;
  burn_in_cycles: number;
  t: number[];
  channels: Record<string, (number | null)[]>;
  phase: number[];
  monitored: {
    t: number[];
    fit_end_t: number;
    calib_end_t: number;
    regime: number[];
    regime_coverage: number;
    residual: Record<string, (number | null)[]>;
  };
  detectors: Record<string, { raw: ArmDetection; residual: ArmDetection }>;
}

export interface ContrastArm {
  subset: string;
  arm: string;
  n_units: number;
  n_faulty?: number;
  threshold: number;
  fa_per_unit_time?: number;
  detection_rate: number;
  median_delay?: number | null;
  note?: string;
  [k: string]: unknown;
}

export interface CmapssContrast {
  schema: string;
  generated_utc: string;
  regimecpd_version?: string;
  config?: Record<string, unknown>;
  arms?: ContrastArm[];
  contrast?: Record<string, unknown>;
  honest_limits?: string[];
  [k: string]: unknown;
}

export interface SyntheticArm {
  detector: string;
  arm: string;
  n_units: number;
  n_faulty: number;
  threshold: number;
  fa_per_truck_month: number;
  fa_ci: [number, number];
  detection_rate: number;
  median_delay_min: number | null;
  onset_error_min: number | null;
  attribution_top1: number | null;
  regime_coverage: number | null;
  note: string;
  /** The compute device a TRAINED rung actually used, read from the detector's own meta. Null for
   *  rungs that train nothing. Present since 0.04.000; older artifacts omit it. */
  device?: string | null;
  /** "boundary" or "reconstruction", declared by the detector itself. The deep tier exists to test
   *  whether this predicts the sign of the conditioning effect. Null for rungs that learn no model. */
  shape?: string | null;
}

export interface SyntheticBenchmark {
  schema: string;
  generated_utc: string;
  regimecpd_version: string;
  config: Record<string, unknown>;
  arms: SyntheticArm[];
  onset_estimation: Record<string, {
    median_onset_error_min: number; median_chance_error_min: number;
    skill_vs_chance: number; median_changepoints: number; n_units: number;
  } | null>;
  trivial_baseline: Record<string, unknown>;
  /** Rungs the ladder DECLARES, versus the ones that actually ran. A rung whose optional backend is not
   *  installed is skipped with a reason rather than crashing the bake or vanishing from the table. */
  ladder_declared?: string[];
  ladder_run?: string[];
  skipped_rungs?: Record<string, string>;
  /** Every rung read off at every budget in the sweep, with a bootstrap-over-units interval on the
   *  detection rate. An unreachable budget is an explicit cell with reachable=false, never absent. */
  budget_curves?: Record<string, Record<'raw' | 'residual', Array<{
    budget_per_truck_month: number; reachable: boolean; threshold: number | null;
    detection_rate: number | null; det_ci: [number, number] | null;
    fa_per_truck_month: number | null;
  }>>>;
  budget_grid_per_truck_month?: number[];
  attribution: {
    top2_hit_rate: number | null; n_scored: number;
    per_fault_kind: Record<string, { hits: number; n: number; truth: string[] }>;
  };
  honest_limits: string[];
}

export interface OnsetSeedSweep {
  schema: string;
  generated_utc: string;
  regimecpd_version: string;
  config: Record<string, unknown>;
  per_seed: Array<{
    seed: number;
    raw: { onset_error_min: number; chance_error_min: number; skill_vs_chance: number; changepoints: number; n_units: number };
    residual: { onset_error_min: number; chance_error_min: number; skill_vs_chance: number; changepoints: number; n_units: number };
  }>;
  skill_summary: {
    raw: Stat; residual: Stat; paired_difference: Stat;
    residual_ahead_in_seeds: number;
  };
  verdict: string;
  honest_limits: string[];
}

export interface Stat { mean: number; sd: number; min: number; max: number; n: number }

export interface ApsCost {
  schema: string;
  generated_utc: string;
  cost_matrix?: Record<string, number>;
  cost_fp: number;
  cost_fn: number;
  results: Record<string, {
    rule: string; threshold: number; total_cost: number;
    fp: number; fn: number; tp?: number; tn?: number; f1: number;
  }>;
  ida2016_leaderboard?: Array<{ rank?: number; team?: string; cost: number; fp: number; fn: number }>;
  honest_limits: string[];
  [k: string]: unknown;
}

export interface ComponentX {
  schema: string;
  generated_utc: string;
  dataset: Record<string, unknown>;
  cost_matrix: number[][];
  class_windows: Record<string, string> | string[];
  results: Record<string, {
    class_weight: string; decision: string; total_cost: number; cost_per_vehicle: number;
    balanced_accuracy: number; accuracy: number; confusion: number[][]; n_flagged_nonzero: number;
  }>;
  published_scoreboard: unknown[];
  best_published_balanced_accuracy: { value: number; chance_level: number; source: string };
  honest_limits: string[];
}


export interface MechanismSubset {
  n_conditions: number;
  n_units: number;
  n_regimes_used: number;
  regime_sizes: number[];
  n_channels: number;
  n_channels_usable: number;
  n_channels_regime_locked: number;
  median_d_pooled: number;
  d_pooled_p10: number;
  d_pooled_p90: number;
  median_d_within_regime: number;
  d_within_p10: number;
  d_within_p90: number;
  ratio: number;
  ratio_is_unit_invariant: boolean;
  ratio_note: string;
}

export interface Mechanism {
  schema: string;
  generated_utc: string;
  regimecpd_version: string;
  config: Record<string, unknown>;
  pairs: Array<{
    single_condition: string;
    multi_condition: string;
    n_channels: number;
    channels: string[];
    subsets: Record<string, MechanismSubset>;
  }>;
  honest_limits: string[];
}

const base = () => import.meta.env.BASE_URL || '/';

// The app version, injected at build time (vite.config.ts). Used as a cache-buster: Pages serves
// these JSON files through a CDN, and an artifact whose SHAPE changed renders silently incomplete
// from a stale cache. Bumping the version is what invalidates every visitor's copy.
declare const __APP_VERSION__: string;

async function getJSON<T>(rel: string): Promise<T> {
  const r = await fetch(`${base()}${rel}?v=${__APP_VERSION__}`);
  if (!r.ok) throw new Error(`fetch ${rel} -> ${r.status}`);
  return (await r.json()) as T;
}

export const loadFleetIndex = () => getJSON<FleetIndex>('data/fleet/index.json');
export const loadFleetTrace = (unitId: string) => getJSON<FleetTrace>(`data/fleet/${unitId}.json`);
export const loadMechanism = () => getJSON<Mechanism>('data/cmapss_mechanism.json');
export const loadCmapss = () => getJSON<CmapssContrast>('data/cmapss_regime_contrast.json');
export const loadSynthetic = () => getJSON<SyntheticBenchmark>('data/synthetic_benchmark.json');
export const loadOnsetSweep = () => getJSON<OnsetSeedSweep>('data/onset_seed_sweep.json');
export const loadAps = () => getJSON<ApsCost>('data/aps_cost.json');
export const loadComponentX = () => getJSON<ComponentX>('data/componentx.json');
