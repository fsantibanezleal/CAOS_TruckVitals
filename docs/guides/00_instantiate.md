# Guide, instantiate a new product from the archetype

How this repo was instantiated from the product archetype (ADR-0057), kept as the playbook for the
next product. Each step names the concrete thing this repo did, so the guide describes a repo that
exists rather than a template that no longer does.

1. **Copy** the archetype tree into the new product repo (its own git repo; code-repo flow
   `task/* -> develop -> main`). Then **delete the `.template-source` sentinel file at the repo
   root.** That arms `scripts/check_template_residue.py` (a CI guard): from then on the build FAILS if
   any example pipeline or placeholder scaffold survives, including any `.ts.txt` file.
2. **Rename the pipeline package** to the product slug. Here it is
   `data-pipeline/truckvitals/` (`jsonio.py`, `lanes/`, `model/`), imported by every `run_*.py`
   runner.
3. **Replace the example engine with the real method ladder.** Here the engine is a separate
   published package, `regimecpd==0.9.6` (a product declares no package of its own), and the ladder is
   12 rungs from Shewhart to a trained autoencoder, each an ADR-0069 vertical unit: pin, provenance
   and licence, fit/calibrate, held-out evaluation, tests, docs, an honest lane. No rung stays an
   example or a no-op.
4. **Define the ingestion boundary for YOUR data.** Here that is the lane adapter contract of
   [guide 02](02_bring-your-own-data.md): per-unit records on a shared clock, CONTEXT channels
   disjoint from the monitored ones, a healthy stretch per unit, and an onset time or its honest
   absence. `tests/test_lanes.py` asserts the context/monitored disjointness.
5. **Decide what stands in for cases.** Here: the four data lanes, the 14-truck baked fleet, and the
   live workbench's URL-carried configurations, documented in [docs/cases.md](../cases.md).
6. **Pin your engines** in the lane requirements files (`requirements.txt`,
   `requirements-precompute.txt`, `requirements-gpu.txt`) and add a card per engine in
   `docs/frameworks/<NN>_<tool>/` (here `01_regimecpd/` and `02_torch/`). The deep research is made
   binding; no toy substitute for an engine the research prescribed.
7. **Mirror the artifact shapes in the frontend.** The typed loaders live in
   `frontend/src/lib/artifacts.ts`, so a shape drift fails `tsc` during `npm run build`. Views live in
   `frontend/src/pages/` and `frontend/src/viz/`, routed from `frontend/src/main.tsx`.
8. **Activate only the lanes you need.** Leave the rest dormant with a README marker. Here `app/` is a
   dormant FastAPI lane (`app/README.md` records the activation triggers); the frontend plus the
   committed artifacts are the whole deployed surface.
9. **Verify in separate operations**: setup, sandboxed smoke, tests, explicit canonical bake, artifact
   validation (`scripts/check_artifacts.py`), frontend build. CI guards green. Deployment only
   re-verifies and publishes; it never trains or recomputes canonical inference.
10. **Version** from day 1: `CHANGELOG.md` (`X.XX.XXX`, staying `0.x` while any lane is synthetic)
    plus a tag per release.
11. **Ship the Architecture modal** (ADR-0058, mandatory): author `frontend/src/architecture.ts` with
    the product's tabs, one hand-authored themed SVG per tab under `frontend/public/svg/tech/`, pass
    `architecture` into the `ShellConfig` in `main.tsx`, and pin `@fasl-work/caos-app-shell` `^0.5.0`.
    See [guide 05](05_architecture-modal.md). Verified in screenshot-verify.

The base is frozen: the work is replacing the core (engine, lanes, visualizations, content), never the
structure, contracts, env or deploy. Editing the base is the smell ADR-0057 exists to remove.
