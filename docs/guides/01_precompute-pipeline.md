# Guide: bake the artifacts

Every number on the site comes from a JSON file under `data/artifacts/`, produced offline by the runners
in `data-pipeline/`. Nothing is computed in the browser and nothing is typed into a page.

## Setup

```bash
python -m venv .venv                       # never a global environment
.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt
.venv/Scripts/python -m pytest             # 35 tests, no data downloads needed
```

The engine is a **separate published package**, `regimecpd`, pinned in `requirements.txt`. This repo
declares no package of its own.

## The runners

Each writes one artifact. All accept `--output` so a smoke run cannot overwrite committed evidence.

| runner | artifact | needs |
|---|---|---|
| `run_mechanism.py` | `cmapss_mechanism.json` | C-MAPSS on disk |
| `run_cmapss_contrast.py` | `cmapss_regime_contrast.json` | C-MAPSS on disk |
| `run_synthetic_benchmark.py` | `synthetic_benchmark.json` | nothing, the fleet is generated |
| `run_onset_seeds.py` | `onset_seed_sweep.json` | nothing |
| `run_fleet_traces.py` | `data/artifacts/fleet/` | nothing |
| `run_aps_cost.py` | `aps_cost.json` | SCANIA APS on disk |
| `run_componentx.py` | `componentx.json` | SCANIA Component X on disk |

```bash
.venv/Scripts/python data-pipeline/run_mechanism.py --data <cmapss-dir>
.venv/Scripts/python data-pipeline/run_cmapss_contrast.py --data <cmapss-dir>
.venv/Scripts/python data-pipeline/run_synthetic_benchmark.py
.venv/Scripts/python data-pipeline/run_onset_seeds.py
.venv/Scripts/python data-pipeline/run_fleet_traces.py
python scripts/check_artifacts.py          # the gate CI runs
```

## Getting the data

None of it is redistributed here; each lane records its own DOI and licence in its artifact.

- **C-MAPSS**: the NASA turbofan degradation set. Unpack so `train_FD001.txt` and friends sit in one
  directory, and pass that directory as `--data`.
- **SCANIA APS**: UCI, doi:10.24432/C51S51. The cost matrix used by this product (FP 10, FN 500) is read
  from the dataset's own `aps_failure_description.txt`, not from a third-party write-up.
- **SCANIA Component X**: doi:10.5878/jvb5-d390, downloadable anonymously from the Swedish National Data
  Service with no login and no order form.

Keep downloads out of the repo. They are large and they are not ours to redistribute.

## Determinism, and where it stops

Every runner takes `--seed` and the same seed reproduces the same artifact. That is a property of the
CODE, not evidence that a result is stable: this product published an onset-localisation figure of 2.40x
from one perfectly reproducible run, and a second seed reversed it. `run_onset_seeds.py` exists because
of that. If a result matters, sweep it.

## The one hard rule about artifacts

They must be JSON a **browser** accepts. Python writes bare `NaN` by default and reads it back happily,
so a round-trip check in Python passes on precisely the file that kills the site. Write through
`truckvitals.jsonio.write_json`, which maps NaN to null, refuses infinities and parses its own output
strictly before it touches disk. `tests/test_artifacts_are_browser_json.py` enforces it, and guards
itself with a test that the gate still rejects a NaN.
