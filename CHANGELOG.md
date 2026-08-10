# Changelog

Newest first, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions use the
`X.XX.XXX` display form. Stays in `0.x` while any lane is synthetic or the at-bar review is open.

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
