# Repository structure, as built

The instantiated shape of this product. The template's generic blueprint stood here until 2026-08-18;
it described stages, contracts and paths this repo never had, and the `check_doc_paths` gate now fails
on any path a document names that does not exist. Everything below is the shipped tree.

## Three lanes and a fallback, separate dependencies AND implementations

| Lane | Dependencies | Implementation | Notes |
|---|---|---|---|
| **Offline (precompute)** | `requirements-precompute.txt` (+ `requirements-gpu.txt` for the autoencoder rung) | `data-pipeline/truckvitals/` driven by eight `run_*.py` runners | bakes the committed artifacts in `data/artifacts/`; pins `regimecpd` exactly, and every artifact records the version that baked it |
| **Live (client-side)** | frontend npm deps only | `frontend/src/engine/` (TypeScript) | the App's workbench: a REDUCED engine (classical detectors, PCA, k-means regimes, a small autoencoder) recomputing on every control change; gated against the Python engine by the parity fixture, in CI |
| **API / backend** (dormant) | `requirements-api.txt` | `app/` (FastAPI) | not required: the product is static replay plus the client-side live lane; activate only on an ADR-0002 trigger |
| **Replay fallback** | none | `frontend/src/lib/artifacts.ts` | every page renders the committed artifacts; nothing canonical is computed in the browser, and data fetches are cache-busted with `?v=<version>` |

The one-class SVM deliberately does NOT run live: fitting it in the browser would need an SMO solver,
and an approximation would be a third implementation the parity gate cannot check.

## The real tree

```
CAOS_TruckVitals/
├─ README.md · CHANGELOG.md (X.XX.XXX + tags) · LICENSE · STRUCTURE.md (this file)
├─ requirements.txt (regimecpd pin) · -dev (pytest/ruff/matplotlib) · -precompute · -gpu · -api
├─ data-pipeline/
│  ├─ run_cmapss_contrast.py · run_synthetic_benchmark.py · run_onset_seeds.py · run_mechanism.py
│  ├─ run_aps_cost.py · run_componentx.py · run_fleet_traces.py · run_parity.py     # the eight bakers
│  └─ truckvitals/
│     ├─ jsonio.py            # strict JSON: NaN -> null on write, infinities RAISE, loads_strict re-parse
│     ├─ model/haulcycle.py   # the synthetic fleet: 12 channels = 9 monitored + 3 context, emergent confound
│     └─ lanes/               # cmapss · regime_experiment · synthetic_benchmark · mechanism · aps · componentx · fleet_traces
├─ data/
│  ├─ artifacts/              # the seven committed artifacts + fleet/ traces; the site's whole payload
│  ├─ raw/ (gitignored) · examples/ · samples/ · demo/
│  └─ README.md               # per-lane provenance, licences, and the artifact contract
├─ frontend/
│  ├─ src/pages/              # App(Tool) · Introduction · Methodology (9 tabs) · Implementation · Experiments · Benchmark · Focus
│  ├─ src/engine/             # the live TS engine: rng · haulcycle · scaling · regimes · detectors · learned · metrics · live
│  ├─ src/viz/ · src/lib/ · src/data/citations.ts (primary-source verified registry)
│  ├─ test/parity.test.ts     # recomputes the parity fixture in TS and asserts the match (CI)
│  └─ prerender-routes.mjs · spa-404.mjs · copy-data.mjs
├─ manuscripts/regime-conditioning-benchmark/   # the published report (DOI 10.5281/zenodo.22002431)
├─ scripts/  check_artifacts.py · check_content_standards.py · check_template_residue.py · check_doc_paths.py
├─ tests/    test_lanes.py · test_artifacts_are_browser_json.py
├─ docs/     architecture/ · guides/ · frameworks/ · cases.md   # the ADR-0056 wiki, code-verified 2026-08-18
├─ app/      # dormant FastAPI lane
└─ .github/workflows/  ci.yml · deploy-pages.yml
```

## The contracts that hold it together

1. **Strict browser JSON** (`data-pipeline/truckvitals/jsonio.py`): NaN becomes null, an infinity
   raises, and every file is re-parsed with a browser's strictness before it reaches disk.
   `scripts/check_artifacts.py` re-verifies presence, parseability and fleet-index consistency in CI.
2. **Engine parity** (`data-pipeline/run_parity.py` + `frontend/test/parity.test.ts`): Python bakes
   inputs and its outputs; TypeScript recomputes and must match. What is deliberately not compared bit
   for bit (the simulator's RNG stream, k-means seeding) is documented in the fixture itself.
3. **Doc-path truth** (`scripts/check_doc_paths.py`): any repo path a tracked markdown file names must
   exist. Written after a 73-finding audit showed the residue gate cannot see residue that names
   plausible-but-nonexistent files.

## What CI enforces

`ruff` · `pytest` (39) · the TS-vs-Python **parity gate** · a **sandboxed pipeline smoke** (canonical
artifacts are read-only in CI) · artifact presence + browser-parseability · base-integrity guards (no
real `.env`, no venvs or heavy data tracked, no leaked local paths) · no template residue · no em-dash
or emoji (ADR-0067) · doc-path truth. The release bake is an explicit local command; the deploy
workflow only verifies and copies committed artifacts, never runs canonical science. Browser gates
(canvas ink, layout floor, at-rest, focus routes, method tabs) run from the management toolbox against
the LIVE site at every deploy.
