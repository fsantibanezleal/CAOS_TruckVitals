# 01 The experiment protocol

The single document that defines how this product's central claim is measured. It is written down in one
place, before the results, so the protocol cannot drift toward whatever configuration happens to flatter
the method.

## The claim

> Running the **same detector** on within-regime residuals rather than on raw channels reduces false
> alarms at a fixed detection delay, and improves detection at a fixed false-alarm budget, on machines
> whose operating context varies.

It is a comparative claim about one intervention. It is not a claim that any particular detector is good.

## Why it needs a protocol at all

Compared at each arm's own favourite threshold, the claim is **unfalsifiable**: with two free thresholds
almost any ordering can be produced. Everything below exists to remove a degree of freedom that could
otherwise be used, consciously or not, to get the wanted answer.

## The five rules

### 1. One detector at a time, held identical across arms

Not "our pipeline against theirs". The same class, the same hyperparameters, the same fit data. The only
difference permitted between arm A and arm B is what the detector *sees*.

This is enforced structurally rather than by intention: `regimecpd.make_arms` returns both arms as plain
`Series` over the same channels and the same time axis, and `Residual.as_series()` means a detector
receives an indistinguishable object either way. It has no mechanism by which to behave differently.

### 2. Nothing after the calibration split informs any fit

Each unit's record is cut on its own clock:

| window | what happens | must be |
|---|---|---|
| `[0, fit)` | fit the regime model, the residual model, and the detector's baseline | healthy |
| `[fit, calib)` | conformal calibration; establishes the score scale | healthy, held out from the fit |
| `[calib, end]` | scored: false alarms before the onset, detection after | anything |

A unit whose onset falls inside the fit or calibration window is **excluded**, and the exclusion is
counted into the artifact. Keeping it would fold the fault into the definition of normal, which makes the
residual arm look good by having had the fault partly subtracted out of its own baseline. That failure is
silent: the residual looks well behaved and detection simply degrades.

### 3. Splits are absolute, never fractional

Fractions of each record look natural and **select the sample**. On run-to-failure data a fractional fit
window scales with total life, so short-lived units have their fit window run past their own onset and
get dropped.

Measured cost of getting this wrong: the first version of the C-MAPSS experiment used 25% + 15% and kept
**38 of 100** FD001 units and **30 of 100** FD002 units, silently restricting the whole experiment to the
longest-lived third of each fleet.

### 4. Both arms are read at a COMMON operating point

Every reported comparison fixes one axis and reads the other:

- false alarms per unit time at a fixed detection delay, and
- detection rate and delay at a fixed false-alarm budget.

Both directions, because reporting only one is how this class of result gets quietly gamed. Detector
statistics live on incompatible scales (accumulated sigma, squared residual, normalised distance), so the
budget is expressed as a rate and the threshold is derived from it per arm, never chosen by hand.

### 5. Every number carries an interval, bootstrapped over UNITS

Samples within one machine are strongly dependent, so a sample-level bootstrap produces intervals that
can be an order of magnitude too narrow. Resampling whole units is the honest unit of independence.

## What must be held constant besides the detector

Two confounds specific to a cross-dataset contrast, both found in this product and both capable of
producing the desired answer for the wrong reason.

**Channel count.** The multivariate statistic is a maximum across channels, so **more channels alone
raises the false-alarm rate**. FD002 has 21 informative sensors against FD001's 15, and FD001's are a
strict subset: the six extra vary *only* because the operating condition varies. Comparing 15 against 21
would confound "more regimes" with "more channels". Every cross-subset contrast therefore runs on the
**common informative channel set**.

**Unit population.** The surviving populations of the two arms must be comparable. Rule 3 addresses the
main mechanism; the artifact records the drop counts so the check is possible after the fact.

## What is a convention, and what is a measurement

C-MAPSS carries no onset label. The healthy/onset split uses the standard piecewise-linear RUL
convention: cycles with `RUL > 125` are treated as healthy and the crossing is treated as the onset.

**That is a convention, not a measurement.** Every number derived from it inherits that. The
**false-alarm half of the comparison does not depend on it at all**, which is deliberate: the half the
central claim rests on is measured purely on the healthy region, and its validity does not turn on where
the onset is declared to be.

## The negative-result commitment

If conditioning does not reduce the false-alarm rate at a fixed delay, the product reports that with the
same intervals and the same prominence. The experiment is not instrumented to find a win, and a null
would be a genuine contribution: the intuition that regime conditioning must help is widely held and
rarely measured.

## What was actually measured

See [`data/artifacts/cmapss_regime_contrast.json`](../../data/artifacts/cmapss_regime_contrast.json) for
the full matrix with intervals and budget sweeps, and the README for the headline table.

The result is that the claim **holds, and the effect is large**: regime variation costs detection 0.96 to
0.05 with the fault mode held fixed, and conditioning recovers it to 0.98.

## What this protocol cannot do

It cannot make C-MAPSS a truck. The contrast establishes a **mechanism** that is domain-general; it does
not establish a number that applies to haul trucks. That gap is why the synthetic lane exists, and why
the product's status stays honest about running on a simulated turbofan plus a physics model rather than
on fleet data nobody publishes.
