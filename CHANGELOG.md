# Changelog

Newest first, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions use the
`X.XX.XXX` display form. Stays in `0.x` while any lane is synthetic or the at-bar review is open.

## [0.03.002] - 2026-08-18

### Added

- `scripts/check_doc_paths.py`, in CI: every repo path a tracked markdown file names must exist. The
  gate the coherence audit showed was missing (the residue checker greps for known tokens, so residue
  naming plausible-but-nonexistent files sails through it). It earned its keep on its first run,
  catching five hits in files outside the audit's scope: STRUCTURE.md still carried the template's
  generic blueprint, data/README.md still described the SIR example contract, and app/README.md still
  pointed at data/derived/.

### Fixed

- STRUCTURE.md rewritten as the REAL structure map (lanes, tree, contracts, what CI enforces);
  data/README.md rewritten as the real artifact ledger with per-lane provenance and licences;
  app/README.md points at data/artifacts/. The docs map now links the published manuscript.

## [0.03.001] - 2026-08-18

### Added

- The manuscript is PUBLISHED: Zenodo record 22002432, CC-BY-4.0, concept DOI
  10.5281/zenodo.22002431 (cite this), v1.0 DOI 10.5281/zenodo.22002432. The DOI is mirrored where
  the update rule requires it: manuscripts/README.md (new), the README status section, and the
  Introduction page, which links the record and notes that the report's figures regenerate from the
  same artifacts these pages render.
- The dataset-verification table on the Experiments Questions tab (the last open audit item): per
  lane, the structure the pipeline ASSERTS at load (C-MAPSS subset table; APS 170 features and the
  primary-verified cost matrix; Component X 1,122,452 x 107 readouts confirmed from the downloaded
  bytes as 2 + 97 + 8; the 36-unit synthetic fleet), redistribution terms, and what this bake
  measures on it. Every cell verified against the lane code before shipping.

## [0.03.000] - 2026-08-18

The coherence release: a four-agent audit compared every documentation surface against the shipped
reality and the artifacts, found 73 defects (13 wrong, 20 stale, 14 missing, 26 thin), and this
release closes them.

### Added

- The manuscript: "Regime Conditioning Recovers Detection, Not Localisation" (IEEEtran, 5 pp, three
  artifact-derived figures, the defect record as an appendix), under manuscripts/, built and
  committed. Zenodo publication awaits explicit authorization.
- Introduction at exemplar depth: theme-aware pipeline figure with the unassigned dead-end branch,
  the detector-free effect-size equations with the fleet-denominator and regime-locked-channel
  honesty, a six-step product walkthrough, the industrial cost framing (50:1, the 4.1x F1 finding),
  and prior-art positioning (Hendrickx fleet axis, Carpentier cohort context, the Dimidov
  limitations concession), all newly registry-verified citations.
- Experiments at exemplar depth: a Questions tab with the four questions (one null), the CUSUM and
  chance-skill equations next to the tables they govern, the split-protocol figure with this
  product's own two corrected leaks struck out, the travelling honesty boundary, and the
  detected-only delay caveat.
- Implementation at exemplar depth: Parity, JSON-contract and Simulator tabs; a build-parameters
  versus engine-defaults table; the budget-threshold rule as an equation; PELT/mSTAMP and conformal
  scoping; the defect table caught up through 0.09.007 including the wrong-first-fix and the
  meta-defect (the version gate that failed unread).

### Fixed

- Methodology quoted 0.66 for the onset-null spread where the artifact says 0.74, and 12-14
  changepoints where the seeds say 11.5-14; the autoencoder architecture arrow placed a ReLU on the
  output map the code does not have; the neutral-rungs parenthetical lumped BOCPD (at floor) and SPE
  (unchanged) in with the at-ceiling rungs.
- Implementation claimed BOCPD and ADWIN both detect nothing (ADWIN residual is 0.0625 at 652 min)
  and understated the engine-fix cycle count; the fleet keynote claimed the 14-truck run produced
  ALL committed artifacts (it produced the fleet traces; the benchmark runs 36 units).
- The docs/ tree carried template residue naming files that do not exist (SIR engine, data/derived,
  pyodide lanes) and the experiment-protocol doc still led with the WITHDRAWN false-alarm claim and
  the pre-review numbers; rewritten against the code.
- regime_experiment.py's title line asked the withdrawn false-alarm question; it now states the
  measured claim and records the withdrawal.

## [0.02.000] - 2026-08-18

Everything that shipped since the first cut, collected into one release because the intermediate
merges went out unversioned, which this changelog will not repeat.

### Added

- The App is a LIVE workbench: the engine ported to TypeScript, every control recomputing in the
  browser, gated against the Python engine by a 10-assertion parity fixture that runs in CI.
- The ladder is complete at 12 rungs including a learned tier (isolation forest, one-class SVM,
  autoencoder); a rung whose optional backend is missing degrades to a NAMED skip in the artifact.
- Baked alarm-budget curves: every rung, both arms, six budgets, bootstrap-over-units intervals,
  unreachable budgets as explicit cells, rendered on the Benchmark page with a per-detector selector.
- Method theory at exemplar depth: Methodology grew from four tabs to nine, transcribed from
  engine-verified dossiers, equations in the implementation's form with divergences stated.
- ADR-0070 focus route for one truck, baked or live, shareable by URL; 20 prerendered routes.

### Fixed

- The citation registry is now fully primary-source verified: carpentier2024 corrected (wrong title,
  missing year/venue/DOI), sakurada2014 added for the autoencoder.
- Data fetches are cache-busted with ?v=APP_VERSION. They never were, despite the deploy notes
  claiming it: an artifact whose shape changed rendered silently incomplete from a stale CDN cache.

### Changed

- regimecpd pinned at 0.9.6; artifacts record the version that baked them. Engine 0.09.007 released
  (docs-only, found by the dossier extraction behind the method pages).
## [0.01.000] - 2026-08-10

First cut. The central claim is measured; the product around it is not built yet, and this entry says so.

### Added

- **The C-MAPSS lane and the controlled regime contrast**, the product's headline result. FD001 (one
  operating condition) against FD002 (six), fault mode held fixed, and FD003 against FD004 repeating it
  at two fault modes. Baked to `data/artifacts/cmapss_regime_contrast.json` with bootstrap intervals
  resampled over units and a six-point budget sweep per arm.
- **The synthetic haul-cycle fleet**, physically grounded: resistance-driven cycles, strut pressure as
  the payload measurement principle, TKPH-driven tyre heating, brakes absorbing potential energy on the
  descent. Four fault kinds with a known onset time.
- `regimecpd==0.9.1` pinned as a published dependency. This repo declares no package of its own.

### Measured

At a matched false-alarm budget of about 1 per 1000 cycles, identical detector and windows:

| pair | arm | detection rate | median delay |
|---|---|---|---|
| 1 fault mode | FD001 raw (1 regime) | 0.96 | 59 |
| | FD002 raw (6 regimes) | 0.05 | 122 |
| | FD002 conditioned, observed | 0.98 | 65 |
| | FD002 conditioned, clustered | 0.98 | 65 |
| 2 fault modes | FD003 raw (1 regime) | 0.69 | 68 |
| | FD004 raw (6 regimes) | 0.06 | 59 |
| | FD004 conditioned, clustered | 0.73 | 92 |
| | FD004 conditioned, regression | 0.88 | 54 |

Regime variation costs 0.96 to 0.05 and 0.69 to 0.06. Conditioning recovers 0.05 to 0.98 and 0.06 to
0.88. The price of discovering the regime rather than being handed it is near zero.

### Two confounds removed before the numbers were believed

**Channel count.** FD002 has 21 informative sensors against FD001's 15, and FD001's are a strict subset.
The six extra channels vary only because the operating condition varies. Since the statistic is a maximum
across channels, more channels alone raises the false-alarm rate, so the contrast runs on the COMMON
informative set.

**Unit selection.** The first version split each record by fractions of its own life, which kept 38 of
100 FD001 units and 30 of 100 FD002 units and silently restricted the experiment to the longest-lived
third of each fleet. Splits are now absolute cycle counts, identical for every unit, and every exclusion
is counted and reported in the artifact.

### Found while running it, and fixed upstream

A channel constant to within floating-point noise was being standardised by that noise. C-MAPSS
`sensor_06` holds 21.61 across a baseline window with a standard deviation of 7.1e-15, on 43 of 100
FD001 units; a later 0.01 quantisation step becomes a z-score of 1.4e12 and a CUSUM of 8.4e12 over a
HEALTHY stretch. Because the statistic is a max across channels, one unit doing this set the fleet-wide
threshold and dropped detection from 0.79 to 0.07 while every unit still looked fine.

Fixed in `regimecpd` v0.09.001 as a shared degenerate-scale guard, with 12 regression tests.

### Not built yet, and not represented as done

The SCANIA Component X and APS lanes, the full benchmark matrix across the method ladder, and the entire
web surface.
