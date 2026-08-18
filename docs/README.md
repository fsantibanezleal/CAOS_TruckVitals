# Docs, the product wiki

Navigable wiki (ADR-0056), authored as the product is built, not at the end. The pipeline, its
validation and these docs are the primary product; the web app renders the committed artifacts, plus
one live lane whose right to disagree with the pipeline is removed by a parity gate in CI.

## Map

- **[architecture/](architecture.md)**: how the repo works: the experiment protocol behind the central
  claim, determinism and browser-safe JSON, the precompute/live gate and the TypeScript engine, the
  eight artifact runners, the evaluation protocol, deploy, and the artifact contract.
- **[frameworks/](frameworks.md)**: one card per research-chosen engine, each bound to an exact pin:
  `regimecpd==0.9.6` (base, `[learned]` and `[deep]` across the three requirements files) and the
  optional torch GPU lane behind the autoencoder rung.
- **[guides/](guides.md)**: runnable how-tos: instantiate the archetype, bake the artifacts, bring your
  own data, the GPU lane, the in-app Architecture modal.
- **[cases.md](cases.md)**: what stands in for a case registry here: the four data lanes, the 14-truck
  baked fleet with per-truck focus pages, and the live workbench's URL-carried configurations.

## The web surface these docs describe

Seven pages: **App** (the live workbench), **Introduction**, **Methodology**, **Implementation**,
**Experiments**, **Benchmark**, and the ADR-0070 **Focus** view, which renders outside the shell so
the chart owns the viewport. Methodology is nine tabs (protocol, regimes, classical, multivariate,
streaming, learned, retrospective, metrics, confounds); the retrospective tab records why PELT and
mSTAMP are deliberately excluded from the online ladder. Focus routes are shareable:
`/focus/<unitId>` opens a baked truck, `/focus/live` re-runs the engine from the query string, and all
20 routes are prerendered so a shared link answers 200. Live at
[truckvitals.fasl-work.com](https://truckvitals.fasl-work.com/).

## Honesty + data policy

- Every number on the site is read from a committed artifact under `data/artifacts/` (the folder
  holds seven JSON files plus the per-truck `fleet/` traces), baked offline by the runners in
  `data-pipeline/`; `scripts/check_artifacts.py` strict-parses every one of them the way a browser
  would. Nothing is typed into a page. The one exception is the live lane, and
  `frontend/test/parity.test.ts` pins it to the Python engine's numbers.
- Raw datasets stay out of git. Each lane records its source, DOI and licence inside its own artifact,
  and the downloads are neither small nor ours to redistribute.
- The haul-truck fleet is SYNTHETIC and labelled synthetic everywhere it appears, including the shell
  footer. C-MAPSS is a simulated turbofan: the claim it supports is the mechanism, never a truck
  number.
