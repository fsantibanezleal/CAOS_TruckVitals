# app/, DORMANT FastAPI backend

**This solution does not require a request-time backend at the moment.** The product is static
deterministic-replay (ADR-0054) plus a client-side live lane: the frontend loads the committed
artifacts in `data/artifacts/` directly, and the live workbench runs the parity-gated TypeScript
engine in the browser.

Activate this lane ONLY on an ADR-0002 trigger (server-side processing of uploaded data, auth-gated private data,
paid heavy compute). To activate: pin `requirements-api.txt`, install it, run `uvicorn app.main:app`. The
endpoints serve the SAME committed artifacts read-only, a thin layer over `data/`, never a re-implementation of
the engine.
