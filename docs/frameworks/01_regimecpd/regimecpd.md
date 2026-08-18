# Framework card, `regimecpd`

## What and why

[`regimecpd`](https://pypi.org/project/regimecpd/)
([source](https://github.com/fsantibanezleal/CAOS_RegimeCPD), MIT) is the regime-conditional
change-point engine: segment the operating regime from CONTEXT channels, build the within-regime
residual, detect on that, and measure whether the regime stage actually earns its place. It is a
separate published package because this repo declares no package of its own, and because this
product's own headline experiment validates the engine on a turbofan: an engine demonstrated to work
outside its product's domain, inside that product's own evidence, is by demonstration not product
plumbing.

## Install (exact, pinned)

Pinned `==0.9.6` in all three requirements files, one per lane:

| file | pin | pulls |
|---|---|---|
| `requirements.txt` | `regimecpd==0.9.6` | `numpy>=1.24` |
| `requirements-precompute.txt` | `regimecpd[learned]==0.9.6` | plus `scikit-learn>=1.3` |
| `requirements-gpu.txt` | `regimecpd[deep]==0.9.6` | plus `torch>=2.0` |

The `[learned]` extra backs the isolation-forest and one-class-SVM rungs; `[deep]` backs the
autoencoder rung (see the [torch card](../02_torch/torch.md)). The backends import lazily inside
`fit`, so a machine without an extra still constructs the detector, and the ladder bake degrades that
rung to a NAMED skip recorded in the artifact's `skipped_rungs`, never a crash and never a silently
shorter table.

Every artifact records the engine version that baked it in a `regimecpd_version` field (display form
`0.09.006` for the committed set).

## Usage

```python
import regimecpd as rc

base = rc.Series(t_fit, x_fit, channels, unit_id="F000_strut_leak")   # healthy window only
mon = rc.Series(t_mon, x_mon, channels, unit_id="F000_strut_leak")    # the scored window
raw, residual, labels = rc.make_arms(base, mon, context_channels, n_regimes=4,
                                     monitor_names=monitored, method="zscore", min_samples=20)
det = rc.CUSUM(k=0.5)   # the identical object scores both arms; it cannot tell them apart
```

`make_arms` returns both arms as plain `Series` over the same channels and the same time axis, which
is what makes rule 1 of the
[experiment protocol](../../architecture/01_the-experiment-protocol.md) structural rather than a
matter of intention.

## Applying it here

- `data-pipeline/truckvitals/lanes/regime_experiment.py` and `lanes/cmapss.py`: the C-MAPSS contrast
  (`make_arms`, cross-fitted thresholds, `FleetScore`, `UnitOutcome`).
- `lanes/synthetic_benchmark.py`: the 12-rung ladder. `DETECTOR_LADDER` maps every rung to an engine
  class, from `Shewhart` through `PCAMonitor(statistic="spe"|"t2")`, `BOCPD`, `KSWIN`, `ADWIN`, to
  `IsolationForestDetector`, `OneClassSVMDetector` and `AutoencoderDetector`. The same module runs the
  retrospective onset estimation with `PELT(min_size=30, cost="mean")` plus `segmentation_error`.
- `lanes/fleet_traces.py`: the 14 baked per-truck traces the App's Fleet tab and the focus pages
  replay.
- `run_parity.py`: bakes the fixture the TypeScript port is gated against.

## Caveats / license

MIT. Engine history that moved this product's published numbers, recorded in the README because both
fixes changed published figures: 0.09.003 fixed `threshold_for_budget` stopping at the first budget
violation, and 0.09.005 stopped counting a NaN gap inside a sustained excursion as a second alarm.
PELT is deliberately not on the online ladder: it is retrospective, and here it is used only for
after-the-fact onset localisation.
