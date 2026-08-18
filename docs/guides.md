# Guides

- [00, how this product was instantiated from the archetype](guides/00_instantiate.md)
- [01, bake the artifacts](guides/01_precompute-pipeline.md)
- [02, bring your own data](guides/02_bring-your-own-data.md)
- [03, the GPU lane](guides/03_gpu-lane.md)
- [05, the in-app Architecture modal (ADR-0058)](guides/05_architecture-modal.md)

There is no guide 04 (run the API): the FastAPI lane is dormant on purpose. `app/README.md` records
the trigger conditions for activating it; the deployed product is static deterministic replay plus a
parity-gated live lane, with no backend at request time.
