# 01 Overview

Where every number on the site comes from, and which code is allowed to compute what.

TruckVitals is a static site that replays committed measurements, plus one live lane that recomputes in
the browser. There is no request-time backend: GitHub Pages serves `frontend/dist`, and every number a
visitor sees is either read from a JSON artifact committed under `data/artifacts/` or computed by a
TypeScript engine that CI proves agrees with the Python one.

## The lanes

| Lane | Code | Runs | Produces |
|---|---|---|---|
| Offline (Python) | `data-pipeline/truckvitals/` | locally, via eight standalone `run_*.py` runners | the committed artifacts in `data/artifacts/` |
| Live (TypeScript) | `frontend/src/engine/` | in the visitor's browser | the App workbench's numbers, computed from the controls |
| Replay | `frontend/src/lib/artifacts.ts` + the pages | in the visitor's browser | every other panel, fetched from the committed artifacts |

There is no Pyodide and no per-case live-vs-replay classifier. The archetype template this repo was
instantiated from had both; this product replaced them with a simpler and stricter split: everything
canonical is precomputed, and the single live surface is a re-implementation whose right to exist is
earned by a parity gate ([03, the gate](03_the-gate.md)).

## The offline lane

`data-pipeline/truckvitals/` is a repo-local package, never published (the reusable engine is
`regimecpd`, a separate PyPI project pinned at `0.9.6` in the root `requirements*.txt` files: the base
package in `requirements.txt`, `regimecpd[learned]` in `requirements-precompute.txt`,
`regimecpd[deep]` in `requirements-gpu.txt`). It contains exactly three things:

- **`model/haulcycle.py`**: the synthetic haul-truck simulator. The regime confound is emergent from the
  load/haul/dump/return cycle, not injected, which is what keeps the synthetic comparisons non-circular.
- **`lanes/`**: one module per measurement. `mechanism.py` (the detector-free effect size),
  `cmapss.py` + `regime_experiment.py` (C-MAPSS loading and the protocol implementation),
  `synthetic_benchmark.py` (the 12-rung detector ladder), `fleet_traces.py` (per-truck replay records),
  `aps.py` (SCANIA APS cost decision), `componentx.py` (SCANIA Component X failure-window decision).
- **`jsonio.py`**: the one JSON writer every artifact goes through. It maps NaN to null, refuses
  infinities, and re-parses its own output with browser strictness before it touches disk
  ([02, determinism](02_determinism-and-trace.md)).

Eight standalone runners at `data-pipeline/run_*.py` call the lane modules and write one artifact each
([05, the precompute pipeline](05_precompute-pipeline.md)). There is no orchestrator: each runner is
invoked directly, takes `--output` to sandbox a non-canonical run, and stamps its artifact with a
`truckvitals.*/v1` schema string plus the versions that produced it.

## The live lane

`frontend/src/engine/` re-implements the pipeline in TypeScript: `haulcycle.ts` (the simulator),
`regimes.ts` (k-means regime segmentation with an UNASSIGNED label for unseen contexts), `scaling.ts`
(the degenerate-scale guard, ported from the engine's `scaling.py`), `detectors.ts` (the classical
detector rungs), `learned.ts` (the learned rungs), `metrics.ts` (fleet scoring, threshold-for-budget,
the alarm-budget curve), `rng.ts` (the seeded generator), and `live.ts` (the full simulate, segment,
residualise, detect, score loop).

This lane exists so the App page (`frontend/src/pages/Tool.tsx`, the `/` route) and the live focus
route are a workbench rather than a slideshow: every control re-enters `live.ts` and the numbers on
screen are computed from the knobs, not looked up. The cost of a second implementation is that two
implementations can disagree, so the lane is gated: `data-pipeline/run_parity.py` bakes what the Python
engine computes into `data/artifacts/parity.json`, and `frontend/test/parity.test.ts` asserts the
TypeScript engine reproduces it, on every CI run.

## The web surface

`frontend/` is a Vite + React SPA on `@fasl-work/caos-app-shell`. Six routes render inside the shell
(`frontend/src/main.tsx`): the App at `/`, then `/introduction`, `/methodology`, `/implementation`,
`/experiments`, `/benchmark`. The focus routes `/focus/:unitId` render outside the shell on purpose
(ADR-0070: the focus view's point is that the stage owns the viewport).

## The flow

```
data-pipeline/truckvitals/lanes/*.py
        |  eight run_*.py runners, strict JSON via truckvitals/jsonio.py
        v
data/artifacts/*.json + data/artifacts/fleet/   (committed; the evidence)
        |  frontend/copy-data.mjs at build time (fails the build if a required file is missing)
        v
frontend/public/data/  ->  frontend/dist/data/
        |  frontend/src/lib/artifacts.ts fetches data/<name>.json?v=<version>
        v
the pages replay it; frontend/src/engine/ recomputes the App live, parity-gated
```

Two details of that flow carry weight:

- **One copy of every number.** `frontend/public/` is git-ignored; `copy-data.mjs` overlays
  `data/artifacts/` into it before every dev run and build. The site cannot drift from the pipeline by
  editing a second copy, because there is no second copy to edit.
- **Cache-busting is part of the contract.** `artifacts.ts` appends `?v=${__APP_VERSION__}` (injected
  from `frontend/package.json` by `vite.config.ts`) to every data fetch. Pages serves the JSON through a
  CDN, and an artifact whose shape changed renders silently incomplete from a stale cache, so a release
  that changes an artifact's shape must bump the version.

## What is deliberately absent

- **No request-time compute.** `app/` is a dormant FastAPI scaffold from the archetype; nothing deploys
  or runs it, and `.github/workflows/deploy-pages.yml` builds only the frontend after verifying the
  committed artifacts with `scripts/check_artifacts.py`.
- **No package of this repo's own.** The engine is `regimecpd`, published and pinned; this repo consumes
  it and never vendors it.
- **No second venv.** One `.venv` at the repo root serves tests and the offline lane
  ([guide 01](../guides/01_precompute-pipeline.md)); the GPU extra is an install variant, not another
  environment.
