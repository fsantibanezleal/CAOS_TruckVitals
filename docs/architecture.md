# Architecture

- [01, overview](architecture/01_overview.md): the four data lanes, the offline-bake to static-site
  flow, and which parts are the frozen archetype base versus this product's core.
- [01, the experiment protocol](architecture/01_the-experiment-protocol.md): the one document that
  defines how the central claim is measured: the five rules, the channel-count confound, the RUL-125
  convention, the negative-result commitment. Written down before the results so the protocol cannot
  drift toward whatever configuration flatters the method.
- [02, determinism and browser-safe JSON](architecture/02_determinism-and-trace.md): seeded runners,
  `data-pipeline/truckvitals/jsonio.py` (NaN to null, infinities refused, strict self-parse before
  disk), the `truckvitals.*/v1` schema strings, and the enforcement in
  `tests/test_artifacts_are_browser_json.py` plus `scripts/check_artifacts.py`.
- [03, the precompute/live gate](architecture/03_the-gate.md): everything canonical is precomputed;
  the live lane earns its existence through the parity fixture rather than through trust.
- [05, the precompute pipeline](architecture/05_precompute-pipeline.md): the eight standalone
  `run_*.py` runners in `data-pipeline/` and the artifact each writes into `data/artifacts/`.
- [06, model evaluation](architecture/06_model-evaluation.md): matched false-alarm budgets,
  cross-fitted thresholds, bootstrap over units, chance baselines for onset localisation, negative
  controls.
- [07, deploy](architecture/07_deploy.md): verify-then-publish. The Pages workflow checks the
  committed artifacts and builds the SPA; it never recomputes anything. Cache-busting and the
  prerendered routes.
- [08, the artifact contract](architecture/08_data-contracts.md): the pipeline-to-web schemas,
  including `truckvitals.synthetic-benchmark/v1` with its budget curves and graceful-skip contract,
  `truckvitals.parity/v1`, and the fleet trace index the focus routes consume.

## The live TypeScript engine

The live lane is a second implementation of the engine, in
[`frontend/src/engine/`](../frontend/src/engine/): `haulcycle.ts` (the simulator), `regimes.ts`
(k-means segmentation), `scaling.ts` (the baseline scaler), `detectors.ts` (an 11-detector live
ladder), `learned.ts` (isolation forest and autoencoder trained in the browser), `metrics.ts` (fleet
scoring, threshold-for-budget, budget curves), `rng.ts` and `live.ts` (the pipeline). Two
implementations of one method are two things that can disagree, so the browser engine is gated:
`data-pipeline/run_parity.py` bakes `data/artifacts/parity.json` (input arrays plus the Python
engine's outputs), `frontend/test/parity.test.ts` recomputes them in TypeScript, and CI fails on
divergence. The decision this gate implements is [03, the precompute/live gate](architecture/03_the-gate.md).

Binding decision: ADR-0057, the product-repo archetype, in the private
[management repo](https://github.com/fsantibanezleal/CAOS_MANAGE).
