# 05 The precompute pipeline

Eight standalone runners, one artifact each (the fleet runner writes a directory), one strict writer.
There is no orchestrator and no staged framework: each `data-pipeline/run_*.py` is invoked directly and
calls its lane module in
`data-pipeline/truckvitals/lanes/`. (`data-pipeline/run.py` is a dead template stub; it imports
`truckvitals.pipeline`, which does not exist. Use the runners.)

## The runners

| Runner | Artifact | Schema | Needs | Defaults that matter |
|---|---|---|---|---|
| `run_mechanism.py` | `cmapss_mechanism.json` | `truckvitals.mechanism/v1` | C-MAPSS via `--data` | `--healthy-cycles 90`, `--faulty-tail 30`; no RNG |
| `run_cmapss_contrast.py` | `cmapss_regime_contrast.json` | `truckvitals.cmapss-regime-contrast/v1` | C-MAPSS via `--data` | `--detector cusum`, `--fit-cycles 60`, `--calib-cycles 30`, `--budget 1.0` per 1000 cycles, `--n-boot 300`, `--seed 0` |
| `run_synthetic_benchmark.py` | `synthetic_benchmark.json` | `truckvitals.synthetic-benchmark/v1` | nothing | canonical fleet 20 healthy + 16 faulty x 45 cycles; `--budget 1.0` per truck-month; `--seed 0`; `--quick` shrinks to 10 + 8 x 35 |
| `run_onset_seeds.py` | `onset_seed_sweep.json` | `truckvitals.onset-seed-sweep/v1` | nothing | `--seeds 5` (paired sweep over seeds 0..4), fleet 20 + 16 x 45, PELT only (`detectors=()`) |
| `run_fleet_traces.py` | `fleet/<unitId>.json` x 14 + `fleet/index.json` | `truckvitals.fleet-traces/v1` (on the index) | nothing | `--n-healthy 6`, `--n-faulty 8`, `--n-cycles 45`, `--budget 1.0`, `--seed 0` |
| `run_aps_cost.py` | `aps_cost.json` | `truckvitals.aps-cost/v1` | SCANIA APS via `--data` | `--seed 0`; threshold chosen out-of-fold on train, never on test |
| `run_componentx.py` | `componentx.json` | `truckvitals.componentx/v1` | SCANIA Component X via `--data` | `--aggregate last_delta`, `--seed 0` |
| `run_parity.py` | `parity.json` | `truckvitals.parity/v1` | nothing | `--n-cycles 14`; internal seeds are fixed constants |

`run_parity.py` earns its row: it bakes the fixture `frontend/test/parity.test.ts` checks the browser
engine against in CI, so a re-bake pass that skips it ships a stale fixture, and the next engine change
fails CI on a file the re-bake never touched. Dataset acquisition (C-MAPSS, SCANIA APS, Component X)
and venv setup are in [guide 01](../guides/01_precompute-pipeline.md).

## Canonical output, and the sandbox rule

With no `--output`, every runner writes to `data/artifacts/`, the committed evidence the site replays.
Every runner also takes `--output <dir>`, and any run that is not intended to update that evidence must
use it:

```bash
# canonical: writes data/artifacts/synthetic_benchmark.json
.venv/Scripts/python data-pipeline/run_synthetic_benchmark.py

# sandboxed smoke: canonical files untouched
.venv/Scripts/python data-pipeline/run_synthetic_benchmark.py --quick --output build/smoke
```

The rule exists because the committed artifacts are the product's results. A smoke run, a test, or an
experiment that silently overwrites `data/artifacts/` replaces measured evidence with whatever the
smoke happened to compute, and `git diff` on a 400 kB JSON is not where that should be discovered.

`--quick` exists only on `run_synthetic_benchmark.py` (the 12-rung ladder over both arms is the
expensive bake); the other generators are cheap enough that their fleet-size flags
(`--n-healthy/--n-faulty/--n-cycles`, or `--seeds`) serve the same purpose.

## What CI runs, and why it writes to a temp dir

`.github/workflows/ci.yml` exercises the pipeline without touching the evidence:

```yaml
- name: Pipeline smoke (sandboxed; canonical artifacts are read-only)
  run: |
    python data-pipeline/run_synthetic_benchmark.py --quick --output "${{ runner.temp }}/smoke"
    python data-pipeline/run_fleet_traces.py --n-healthy 2 --n-faulty 2 --output "${{ runner.temp }}/smoke"
```

CI treats `data/artifacts/` as read-only on principle: those files ARE what the test suite and the
deploy verify (`tests/test_artifacts_are_browser_json.py` parametrises over them;
`scripts/check_artifacts.py` gates on them; `deploy-pages.yml` verifies and builds, never regenerates).
A CI job that regenerated them would be checking a file it had just created, which verifies the code
and silently stops verifying the commit. The smoke instead proves the runners still execute end to end
on a bare runner, into `${{ runner.temp }}/smoke`, which is discarded.

The smoke also keeps the dependency floor honest: CI installs `requirements-precompute.txt`
(`regimecpd[learned]`), not the `[deep]` extra that `requirements-gpu.txt` pins for the autoencoder
rung, so a machine that cannot run every rung is a normal case the bake must survive. The skip contract
below is what makes that safe.

## The graceful-skip contract

A ladder rung whose optional backend is missing must neither crash the bake nor silently vanish from
the table. `truckvitals/lanes/synthetic_benchmark.py` implements the contract:

- The probe must FIT, not merely construct: the learned detectors import their backends lazily inside
  `fit`, so constructing one succeeds on a machine that cannot run it. A constructor guard looked right
  and never fired once.
- A missing backend (`ImportError` at fit time) records the rung and the reason string into
  `skipped_rungs` and drops the rung from the run.
- The artifact carries `ladder_declared` (all 12 rungs) alongside `ladder_run` (the rungs that actually
  produced rows), so a partial ladder is a visible statement in the data, never a shorter list that
  reads as a ladder that never had more. The web surface renders the gap from these fields.

The full canonical bake is expected to have `skipped_rungs == {}` and `ladder_run` equal to
`ladder_declared`; the committed `synthetic_benchmark.json` does.

## A canonical re-bake, end to end

```bash
# data-free lanes
.venv/Scripts/python data-pipeline/run_synthetic_benchmark.py
.venv/Scripts/python data-pipeline/run_onset_seeds.py
.venv/Scripts/python data-pipeline/run_fleet_traces.py
.venv/Scripts/python data-pipeline/run_parity.py

# dataset lanes (paths per guide 01)
.venv/Scripts/python data-pipeline/run_mechanism.py --data <cmapss-dir>
.venv/Scripts/python data-pipeline/run_cmapss_contrast.py --data <cmapss-dir>
.venv/Scripts/python data-pipeline/run_aps_cost.py --data <aps-dir>
.venv/Scripts/python data-pipeline/run_componentx.py --data <componentx-dir>

# the gates, before committing
python scripts/check_artifacts.py
.venv/Scripts/python -m pytest
cd frontend && npm test        # parity: the TS engine against the fixture just baked
```

Failure modes this order prevents: re-baking after an engine bump but skipping `run_parity.py` (the
parity step fails against a stale fixture); re-baking the fleet without re-checking the index (the
artifact checker asserts index-to-file consistency in both directions); and committing an artifact a
browser would refuse (structurally prevented earlier: every runner writes through
`truckvitals/jsonio.py`, which maps NaN to null, raises on infinities, and strict-parses its own output
before disk; see [02](02_determinism-and-trace.md)).
