# Guide: run this on your own fleet

The method is not tied to the four lanes shipped here. What it needs from a dataset is specific and
short, and most telemetry archives can supply it.

## What a lane must provide

1. **Per-unit records on a shared clock.** One machine, one time axis, one array of channels. Irregular
   sampling is fine; the engine carries explicit time rather than assuming a fixed step.
2. **CONTEXT channels, disjoint from the monitored ones.** This is the part people get wrong. The regime
   must be defined by what the machine is DOING (payload, grade, speed, operating condition, ambient),
   never by what you are watching for faults. Define a regime using brake temperature and then look for a
   dragging brake, and the segmentation absorbs the fault: the residual goes flat and the method appears
   to fail. `tests/test_lanes.py` asserts the two sets are disjoint for the synthetic fleet.
3. **A healthy stretch per unit, before any fault.** Both the regime model and the residual statistics
   are fitted there and nowhere else.
4. **An onset time, or the honest absence of one.** A unit with no onset is not filler: healthy units are
   where the false-alarm rate is actually measured, and a benchmark run only on faulty units cannot
   report one.

## The adapter

Write a module under `data-pipeline/truckvitals/lanes/` exposing an object with:

```python
subset.units          # a list of dicts, each with unit_id, t, x, onset_t
subset.series(unit, channels)   # -> regimecpd.Series over those channels
subset.context(unit)            # -> ndarray of the CONTEXT channels, same length
```

`lanes/cmapss.py` is the reference for a real dataset; `model/haulcycle.py` is the reference for a
generated one. Then either call `regimecpd.make_arms` directly or reuse
`lanes/regime_experiment.build_outcomes`, which already implements the protocol below.

## The protocol you inherit, and why each rule is there

Reuse `regime_experiment` rather than rolling your own loop, because these are the rules an adversarial
review of this product found violated in its first version:

- **Both arms get the same healthy data.** The residual arm spends part of its window on a regime model;
  the raw arm has no regime model and spends all of it on the detector. Giving the raw arm only the
  leftover was worth 0.046 against 0.161 on one subset, reported as the cost of regime variation.
- **The threshold is cross-fitted over units.** Choosing it on the units it then scores is leakage.
- **Alarms are events, not samples**, and the bootstrap resamples **units**, not samples.
- **Channel selection reads the baseline window only.** Computed over the whole record it reads the
  faulty region.

## Before you believe a result

Run the negative control. Take a subset of your data with only ONE operating regime and run the same
code: the mechanism measurement must return a ratio of exactly 1.00, because with one regime the pooled
and within-regime denominators are the same quantity. A number away from 1.00 there means the pipeline is
broken, not that you have discovered something.

Then compute a chance baseline for anything that involves picking a nearest changepoint. This product
published a 2.40x onset-localisation result that a chance baseline later turned into a null: the
conditioned arm beat the raw arm on every seed by raw error, and all of it was explained by producing
four times as many changepoints.
