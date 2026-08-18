# 02 Determinism and the trace

What "the same run again" means in this repo, why the artifacts are strict JSON, and what the replay
record actually contains.

## Determinism, runner by runner

Every artifact records the configuration that produced it in its own `config` block, and re-running the
runner with those flags reproduces it. The randomness is not uniform across runners, so the claim is
stated per runner rather than as a slogan:

| Runner | Randomness | Reproduced by |
|---|---|---|
| `run_synthetic_benchmark.py` | fleet generation | `--seed` (default 0, recorded in `config.seed`) |
| `run_fleet_traces.py` | fleet generation | `--seed` (recorded in `config.seed`) |
| `run_onset_seeds.py` | fleet generation, swept | `--seeds N` runs seeds `0..N-1`; there is no single-seed flag because a single seed is the failure this runner exists to prevent |
| `run_cmapss_contrast.py` | bootstrap resampling | `--seed`; the data itself is a fixed download |
| `run_aps_cost.py` | fold shuffling and the estimator | `--seed` feeds `StratifiedKFold` and `HistGradientBoostingClassifier(random_state=...)` |
| `run_componentx.py` | the estimator | `--seed` feeds `random_state` |
| `run_mechanism.py` | none | no seed flag; the measurement is means and standard deviations over fixed windows of fixed data |
| `run_parity.py` | fixed internally | simulator `seed=7`, metrics `default_rng(3)`; the fixture must be one specific instance both engines read, so its seeds are constants, not flags |

## Determinism is not stability

A reproducible run proves the code is a pure function of its inputs. It does not prove the result is a
result. This product published an onset-localisation skill of 2.40x from one perfectly reproducible
run; seed 1 produced 0.96x. `run_onset_seeds.py` and the committed `onset_seed_sweep.json` (whose
verdict field reads NULL) are the permanent record of that lesson: if a number matters, sweep it. The
practice is documented in [guide 01](../guides/01_precompute-pipeline.md).

## The strict JSON contract

Python's `json.dump` writes bare `NaN`, `Infinity` and `-Infinity` by default, none of which is valid
JSON; `JSON.parse` in every browser rejects the whole document at the first one. Python's `json.load`
reads them back happily, so a naive round-trip test passes on exactly the file that kills the site.
That shipped here: `regime_coverage` is legitimately NaN on the raw arm, which has no regime model, and
four of those made `cmapss_regime_contrast.json` unparseable by the site that exists to display it.

Every artifact therefore goes through `data-pipeline/truckvitals/jsonio.py`:

- `clean()` recursively maps NaN to `null`. It raises on an infinity instead of coercing it: an
  infinite metric is a bug in the metric, and writing `null` would hide it.
- `dumps()` serialises with `allow_nan=False`, so any survivor is an error rather than a silent
  non-JSON token.
- `loads_strict()` parses with `parse_constant` set to reject all three tokens, which is the same
  strictness a browser applies. Plain `json.loads` is exactly the reassuring-but-wrong gate.
- `write_json()` runs `loads_strict` on the text it just produced before writing it, so a file that a
  browser would refuse never reaches disk.

## Schemas and provenance

Each artifact self-identifies with a `schema` string:

| Artifact | Schema |
|---|---|
| `cmapss_mechanism.json` | `truckvitals.mechanism/v1` |
| `cmapss_regime_contrast.json` | `truckvitals.cmapss-regime-contrast/v1` |
| `synthetic_benchmark.json` | `truckvitals.synthetic-benchmark/v1` |
| `onset_seed_sweep.json` | `truckvitals.onset-seed-sweep/v1` |
| `fleet/index.json` | `truckvitals.fleet-traces/v1` (the per-truck files carry no schema field; they are addressed through the index) |
| `aps_cost.json` | `truckvitals.aps-cost/v1` |
| `componentx.json` | `truckvitals.componentx/v1` |
| `parity.json` | `truckvitals.parity/v1` |

Every artifact records `python` and `numpy` versions. All except `parity.json` record `generated_utc`.
The six artifacts produced by the `regimecpd` engine (mechanism, contrast, benchmark, onset sweep, the
fleet index, parity) also record `regimecpd_version`, so a result can always be traced to the engine
release that computed it; the two SCANIA lanes run scikit-learn, not the engine, and record no engine
version. `frontend/test/parity.test.ts` starts by asserting the fixture's schema string, so a runner
and its consumer cannot silently disagree about what a file is.

## The trace that ships

The replay record for the App workbench is `data/artifacts/fleet/`: one JSON file per truck plus
`index.json`, baked by `run_fleet_traces.py`. The index carries the selector metadata (unit id, fault
kind, onset, fault channels, regime coverage) and the fleet thresholds; each unit file carries the full
record and everything each detector computed on it. The App fetches the index first and one truck only
when that truck is selected; a single bundle would make the first paint wait on the whole fleet, which
at fourteen trucks is about 6 MB.

Compactness is engineered, not hoped for (`truckvitals/lanes/fleet_traces.py`):

- Values are rounded at bake time: the time axis to 1 decimal, channels to 3, detector statistics to 4.
  Unit files are written with `indent=None`.
- The raw monitored arm is NOT stored. It is exactly the full record sliced at `fit_end_t`, the App
  slices it back out, and the bake asserts that identity per channel (`np.allclose` against
  `make_arms`' output) so the saving cannot become a silent lie. Shipping it anyway would spend about
  30% of the payload on a copy. The residual arm IS stored, because it is a different signal.
- Alarms are stored as event times (rising edges over the fleet threshold), not as a per-sample
  boolean.

## Enforcement

Two independent gates keep all of the above true ([03, the gate](03_the-gate.md) has the full map):

- `tests/test_artifacts_are_browser_json.py` (25 tests) asserts the required artifacts exist, parses
  every committed JSON file with browser strictness, and guards the guard: one test feeds `loads_strict`
  a literal `NaN` and `Infinity` and fails if they are ever accepted, so the gate cannot silently decay
  into `json.loads`.
- `scripts/check_artifacts.py`, stdlib-only, re-checks presence and strict parseability on disk plus
  fleet-index consistency. CI runs it on every push and `deploy-pages.yml` runs it before anything is
  installed.
