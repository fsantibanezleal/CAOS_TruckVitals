# 08 Data contracts

The seam between pipeline and web is a set of committed JSON artifacts under `data/artifacts/`. Every
number the site shows is loaded from one of them through a typed loader in
`frontend/src/lib/artifacts.ts`; nothing canonical is computed at request time. (The live lane
recomputes interactively in the browser, but none of its output is canonical, and its engine is
parity-gated against the Python one; see [07 Deploy](07_deploy.md).)

## The strict-JSON rule

Every artifact must be JSON a **browser** accepts, which is stricter than JSON Python accepts.
`json.dump` writes bare `NaN`, `Infinity` and `-Infinity` by default, `json.load` reads them back
happily, and `JSON.parse` in every browser rejects the whole document on the first one. The failure is
total and silent from the pipeline's side, and it shipped here: `regime_coverage` is legitimately NaN on
the raw arm, which has no regime model, and four bare NaN made `cmapss_regime_contrast.json` unparseable
by the site that exists to display it.

So there is one writer, `data-pipeline/truckvitals/jsonio.py :: write_json`:

- NaN becomes `null`, which the site already handles for genuinely absent values.
- An infinity is **refused**, not coerced: an infinite metric is a bug in the metric, and quietly
  writing `null` would hide it.
- Serialisation runs with `allow_nan=False`, and the writer re-parses its own output with browser
  strictness (`parse_constant` rejects all three tokens) before anything touches disk.

## The artifacts

Eight artifacts plus the per-truck traces. Common provenance keys on the pipeline artifacts: `schema`,
`generated_utc`, `python`, `numpy`, and `regimecpd_version` wherever the engine ran; all site-facing
artifacts except `cmapss_regime_contrast.json` also carry an `honest_limits` list stating what the
result does not support.

| file | `schema` | baked by | top-level keys |
|---|---|---|---|
| `cmapss_mechanism.json` | `truckvitals.mechanism/v1` | `run_mechanism.py` | `config`, `pairs`, `honest_limits` |
| `cmapss_regime_contrast.json` | `truckvitals.cmapss-regime-contrast/v1` | `run_cmapss_contrast.py` | `config`, `declared_structure`, `pairs` |
| `synthetic_benchmark.json` | `truckvitals.synthetic-benchmark/v1` | `run_synthetic_benchmark.py` | `config`, `arms`, `onset_estimation`, `trivial_baseline`, `budget_curves`, `budget_grid_per_truck_month`, `skipped_rungs`, `ladder_declared`, `ladder_run`, `attribution`, `honest_limits` |
| `onset_seed_sweep.json` | `truckvitals.onset-seed-sweep/v1` | `run_onset_seeds.py` | `config`, `per_seed`, `skill_summary`, `verdict`, `honest_limits` |
| `aps_cost.json` | `truckvitals.aps-cost/v1` | `run_aps_cost.py` | `cost_matrix`, `dataset`, `model`, `results`, `ida2016_leaderboard`, `test_cost_curve`, `honest_limits` |
| `componentx.json` | `truckvitals.componentx/v1` | `run_componentx.py` | `dataset`, `cost_matrix`, `class_windows`, `results`, `published_scoreboard`, `best_published_balanced_accuracy`, `honest_limits` |
| `parity.json` | `truckvitals.parity/v1` | `run_parity.py` | `why`, `channels`, `context_channels`, `fit_end`, `onset_t`, `t`, `baseline`, `monitored`, `detectors`, `metrics` |
| `fleet/index.json` | `truckvitals.fleet-traces/v1` | `run_fleet_traces.py` | `config`, `thresholds`, `units`, `honest_limits` |

Details worth knowing per artifact:

- **`cmapss_mechanism.json`**: the detector-free effect size. Per pair, per subset: the fault signature
  against the pooled spread and against the within-regime spread (`median_d_pooled`,
  `median_d_within_regime`, each with p10/p90), their `ratio`, regime sizes, and channel accounting
  (`n_channels_usable`, `n_channels_regime_locked`).
- **`cmapss_regime_contrast.json`**: the detection contrast at a matched budget. `config` records the
  protocol constants (detector `cusum`, `fit_cycles` 60, `calib_cycles` 30, `budget_per_1000_cycles`
  1.0, `n_boot` 300, `seed`, `rul_cap` 125). `declared_structure` restates each subset's published
  condition, fault-mode and unit counts so the artifact is self-describing. Each of the two `pairs`
  carries the common channel set with a `channel_note`, an `arms` list (per arm: `n_units_scored`, the
  `dropped` counts `{too_short, onset_in_fit_window, regime_fit_failed}`, `threshold`,
  `false_alarms_per_1000_cycles` with `false_alarms_ci_per_1000`, `detection_rate`,
  `median_delay_cycles`, `regime_coverage`, and a six-point `budget_curve` over
  `[0.25, 0.5, 1.0, 2.0, 5.0, 10.0]` per 1000 cycles with a `reachable` flag per point), and a
  `contrast` block: `single_condition_raw`, `multi_condition_raw`, `regime_conditioned_worst` and
  `_best` with their arm names, `eligible_arms`, and `non_regime_arms` reported beside them but
  excluded from any recovery claim. The headline recovery number is `regime_conditioned_worst` by
  construction, so it cannot depend on choosing the more flattering regime definition.
- **`synthetic_benchmark.json`**: the full ladder. `arms` holds 24 rows, 12 rungs times two arms, each
  with `detector`, `arm`, `threshold`, `fa_per_truck_month` with `fa_ci`, `detection_rate`,
  `median_delay_min`, `regime_coverage` and a `note` that carries the reason when a rung could not
  operate. `budget_curves` maps rung to arm to one point per budget in `budget_grid_per_truck_month`
  (`[0.1, 0.25, 0.5, 1.0, 2.0, 4.0]`): `threshold`, `detection_rate`, `det_ci` (bootstrap over units),
  `fa_per_truck_month`, and `reachable`; an unreachable budget is an explicit `reachable: false` cell
  with null metrics, never a missing point. `onset_estimation`, `trivial_baseline` and `attribution`
  carry the retrospective onset skill, the told-where-to-look baseline, and the PCA-SPE top-2
  channel-attribution score.
- **The graceful-skip contract** (also `synthetic_benchmark.json`): a rung whose optional backend is
  missing degrades to a NAMED skip. The probe must FIT, not merely construct, because the learned
  detectors import their backend lazily inside `fit`, so construction succeeds on a machine that cannot
  run them; guarding the constructor looked right and never fired once. The `ImportError` string lands
  in `skipped_rungs` keyed by rung name. `ladder_declared` is the ladder at declaration;
  `ladder_run` is computed AFTER the run from the rows actually produced, because a rung can only be
  found unavailable at fit time. Declared minus run minus skipped must be empty, so a silent partial
  ladder is unrepresentable: the web surface shows the gap instead of a shorter list. In the committed
  artifact `skipped_rungs` is `{}` and both lists carry the same 12 rungs.
- **`parity.json`**: the only artifact the site does not read. It is the CI fixture for
  `frontend/test/parity.test.ts`: input arrays (`baseline`, `monitored`, `t`) plus the outputs the
  Python engine computed from them (per-detector `statistic` series; `metrics` with fleet scores at
  probe thresholds and `threshold_for_budget` over a budget list). It carries the actual arrays rather
  than a seed, because numpy's normal stream is not reproducible in a browser and pretending otherwise
  would test the wrong thing (`run_parity.py` docstring).
- **`fleet/index.json` and `fleet/<unitId>.json`**: the baked 14-truck fleet behind the selector and
  the `/focus/<unitId>` routes. The index `config` records the generation parameters, the four baked
  detectors (`cusum`, `ewma`, `pca-spe`, `pca-t2`) and the channel lists; `thresholds` holds the
  fleet-level threshold per detector per arm; `units` lists `unit_id`, `fault_kind`, `onset_t`,
  `fault_channels` and `regime_coverage` per truck. Each trace file carries the full record: `t`,
  `channels` (12 named channels), `phase`, a `monitored` block (`fit_end_t`, `calib_end_t`, per-sample
  `regime`, `regime_coverage`, per-channel `residual`), and a `detectors` block with, per detector and
  arm, the `statistic` series, `threshold`, `alarm_times`, `first_alarm_after_onset_t` and `delay_min`.

## Enforcement

Four layers, three of them in CI:

1. **`scripts/check_artifacts.py`** (stdlib only; run by `ci.yml` and by the deploy workflow before
   anything is installed). It fails on: a missing or empty required artifact (the seven site-facing
   files above, each with a stated reason); any file under `data/artifacts/` that does not parse under
   browser strictness; and a **fleet index inconsistency**, in both directions plus the count: a unit
   listed in `fleet/index.json` with no `fleet/<unitId>.json` is a selector entry that 404s, a trace
   file on disk that the index does not list is unreachable by the App, and `config.n_units_kept` must
   equal the number of listed units.
2. **`tests/test_artifacts_are_browser_json.py`** (25 collected tests): strict-parses every committed
   artifact file, asserts the required set exists, and guards the guard, verifying that the gate still
   rejects bare `NaN` and `Infinity` and that the writer maps NaN to null and refuses infinities.
3. **`frontend/copy-data.mjs`**: the build itself fails if a `REQUIRED` artifact is missing after the
   overlay, or if the fleet directory has an index but no traces.
4. **`frontend/src/lib/artifacts.ts`**: one typed loader per artifact (TypeScript interfaces over the
   shapes above), every fetch cache-busted with `?v=APP_VERSION` so a shape change cannot render
   silently incomplete from a stale CDN copy.

## Why this shape

One copy of every number, written by one strict writer, verified by a gate that needs no dependencies,
and consumed through typed loaders: each layer exists because its absence produced a real failure in
this repo (a NaN that killed a page, a fleet index that could 404, a stale CDN copy that rendered
incomplete). The contract is the seam that lets the static site claim, honestly, that it shows exactly
what the pipeline computed.
