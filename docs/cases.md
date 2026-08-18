# Cases

The archetype's cases-by-category registry (a `cases/` folder with a taxonomy and one page per case)
is not how this product is organised. Its equivalents, each committed as evidence rather than as
configuration:

## The four lanes

The unit of coverage is the data lane, and each lane supports exactly the claim it can honestly carry
(sources, licences and limits are tabulated in the [README](../README.md)):

| lane | artifacts | supports |
|---|---|---|
| Regime contrast, NASA C-MAPSS | `cmapss_mechanism.json`, `cmapss_regime_contrast.json` | the central claim, measured under a controlled contrast |
| Failure window, SCANIA Component X | `componentx.json` | graded 5-class time-window prediction and its cost decision |
| Cost, SCANIA APS | `aps_cost.json` | the threshold decision against a published cost matrix |
| Synthetic haul-cycle fleet | `synthetic_benchmark.json`, `onset_seed_sweep.json`, `fleet/` | the 12-rung ladder, onset error against chance |

## The baked fleet, 14 trucks

`data/artifacts/fleet/index.json` lists 14 units: six healthy (`H000` to `H005`) and eight faulty,
two per fault kind (`strut_leak`, `tyre_leak`, `brake_drag`, `cooling_loss`), with the kind carried in
the unit id (`F000_strut_leak` and so on). Each entry records `fault_kind`, `onset_t`,
`fault_channels` and `regime_coverage`; each unit has a per-truck trace at
`data/artifacts/fleet/<unit_id>.json` and a shareable focus page at `/focus/<unit_id>`, materialized
at build time by `frontend/prerender-routes.mjs` so the link answers 200 rather than a soft 404.
Healthy units are not filler: they are where the false-alarm rate is measured.

## The live workbench

The App page (`frontend/src/pages/Tool.tsx`) and `/focus/live` re-run the whole pipeline in the
browser: fault kind, severity, onset fraction, cycle count, seed, regime count, detector and its
parameters, and the false-alarm budget are all knobs rather than captions. On the focus route the
configuration travels in the query string, so a "case" is a shareable URL rather than a registry
entry. The TypeScript engine computing it is gated against the Python engine by
`frontend/test/parity.test.ts`, so a live number is a number the pipeline would bake.
