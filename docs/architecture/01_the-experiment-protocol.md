# 01 The experiment protocol

The single document that defines how this product's central claim is measured. It is written down in one
place, before the results, so the protocol cannot drift toward whatever configuration happens to flatter
the method.

## The claim register

Four results, each with its own evidential status. The register is exhaustive on purpose: a claim that
is not in it is not made by this product.

**1. Detection at a matched false-alarm budget.** The same detector (CUSUM, k = 0.5), identical across
arms, every arm read at a budget of 1 false alarm per 1000 cycles: going from one operating condition to
six costs detection **0.93 to 0.17** with the fault mode held fixed, and conditioning on the regime
recovers **0.95**. Repeated at two fault modes: **0.73 to 0.24**, recovering **0.90**. The recovery
number is the **worse** of the two arms that genuinely condition on a regime (`regime_conditioned_worst`
in the artifact's `contrast` block), computed in code from a fixed list of eligible arms rather than
read by eye off an arm table. Source: `data/artifacts/cmapss_regime_contrast.json`.

**2. The mechanism, with no detector in it.** An effect size with no detector, no threshold, no alarm
convention and no budget, so none of those choices can be argued with: on six-condition data the fault
signature is 0.16 sigma of the pooled spread and 11.95 sigma of the within-regime spread, a ratio of
**90.2** (62.3 on the two-fault-mode pair). The single-condition subsets return exactly **1.00**, which
is the built-in negative control: with one regime the two denominators are the same quantity. Source:
`data/artifacts/cmapss_mechanism.json`.

**3. Onset localisation: a NULL.** Regime conditioning does **not** improve onset localisation. Over
five paired seeds the difference in chance-corrected skill is smaller than the seed-to-seed spread
within either arm, and both arms sit close enough to chance that neither localises the onset better than
the same number of changepoints placed at random. Source: `data/artifacts/onset_seed_sweep.json`, field
`verdict`.

**4. One claim is WITHDRAWN, not silently absent.** This product used to describe itself as reducing
FALSE ALARMS. Neither lane demonstrates that: the C-MAPSS experiment measures detection at a fixed
false-alarm budget, and on the synthetic lane the raw arm wins the false-alarm metric outright. No
false-alarm-reduction claim is made anywhere in this repo, and this document, the one that defines how
claims are measured, is where the withdrawal is recorded rather than erased.

Everything in the register is comparative, about one intervention: the same detector on within-regime
residuals rather than on raw channels. None of it is a claim that any particular detector is good.

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

### 2. Nothing after the healthy split informs any fit, and both arms get the SAME healthy data

Each unit's record is cut on its own clock:

| window | what happens | must be |
|---|---|---|
| `[0, calib)` | the healthy budget, EQUAL for both arms. The residual arm spends `[0, fit)` on the regime and residual model and `[fit, calib)` on the detector's baseline; the raw arm has no regime model and spends the whole stretch on the detector | healthy |
| `[calib, end]` | scored: false alarms before the onset, detection after | anything |

The equality is itself a review-won correction: the first version gave the raw arm only `[fit, calib)`,
30 healthy cycles where the residual arm consumed 90, and reported the difference as the cost of regime
variation. Equalising moved FD002 raw from 0.046 to 0.161 and FD004 raw from 0.062 to 0.247, and left
the single-condition arms untouched, because they have nothing to gain from a longer baseline.

A unit whose onset falls inside the healthy window is **excluded**, and the exclusion is counted into
the artifact (`dropped.onset_in_fit_window`). Keeping it would fold the fault into the definition of
normal, which makes the residual arm look good by having had the fault partly subtracted out of its own
baseline. That failure is silent: the residual looks well behaved and detection simply degrades.

The **threshold is not taken from the healthy window either**. It is a fitted quantity, chosen to
satisfy the false-alarm constraint, so choosing it on the units it then scores is leakage; the first
version did exactly that while `score_arm` accepted a `calibration` argument it never read, and an
adversarial review found it. It is now **cross-fitted over units**: stratified folds, each fold scored
at a threshold fitted on the other folds, only healthy exposure informing the choice. The
calibration-window route is not merely unused, it is unusable for a cumulative statistic: that window is
where a CUSUM has just been reset to zero, and a threshold taken from it overshoots the budget by 16x to
146x (measured; see `score_arm` in `data-pipeline/truckvitals/lanes/regime_experiment.py`).

### 3. Splits are absolute, never fractional

Fractions of each record look natural and **select the sample**. On run-to-failure data a fractional fit
window scales with total life, so short-lived units have their fit window run past their own onset and
get dropped.

Measured cost of getting this wrong: the first version of the C-MAPSS experiment used 25% + 15% and kept
**38 of 100** FD001 units and **30 of 100** FD002 units, silently restricting the whole experiment to the
longest-lived third of each fleet.

### 4. Both arms are read at a COMMON operating point

Every reported comparison fixes the false-alarm budget and reads detection rate and delay there.
Detector statistics live on incompatible scales (accumulated sigma, squared residual, normalised
distance), so the operating point is expressed as a **rate**, false alarms per 1000 cycles, and the
threshold that meets it is derived per arm, never chosen by hand.

The **realised** rate is reported next to the detection rate so the match can be checked, and in the
published table the conditioned arms operate at a LOWER realised rate than the raw arms they beat (1.31
and 1.05 against 2.10 on the first pair; 0.99 and 0.90 against 1.08 on the second), so the budget
matching cannot be doing the winning.

One operating point is still a choice, so every arm also carries a `budget_curve`: the same reading
repeated at six budgets from 0.25 to 10 per 1000 cycles, with an explicit `reachable` flag per point. A
method that wins only at one budget has not won.

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

**That is a convention, not a measurement.** Every number derived from it inherits that: detection is
the first alarm at or after the declared crossing, and false alarms are the alarms counted before it.
Which is why the register's strongest entry is built NOT to depend on it: the mechanism effect size
(claim 2) reads each unit's first 90 cycles as healthy and its last 30 as the faulty tail
(`healthy_cycles` and `faulty_tail` in the `cmapss_mechanism.json` config), anchored to the actual end
of a run-to-failure record rather than to the RUL convention.

## The negative-result commitment

If a measurement comes back null, the product reports it with the same intervals and the same
prominence. That is not hypothetical: it has been exercised twice. The onset-localisation sweep came
back NULL and is published as claim 3 of the register, replacing a 2.40x figure that a chance baseline
dissolved. And the false-alarm-reduction claim was withdrawn outright (claim 4) when neither lane
supported it. The experiment is not instrumented to find a win, and a null is a genuine contribution:
the intuition that regime conditioning must help is widely held and rarely measured.

## What was actually measured

See [`data/artifacts/cmapss_regime_contrast.json`](../../data/artifacts/cmapss_regime_contrast.json) for
the full matrix with intervals, drop counts and budget sweeps, and the README for the headline table. At
the 1 per 1000 cycles budget: FD001 raw 0.93, FD002 raw 0.17, FD002 conditioned 0.95 on both regime
arms; FD003 raw 0.73, FD004 raw 0.24, FD004 conditioned 0.90 on both.

An earlier version of this document quoted 0.96 to 0.05 recovering 0.98. Those are pre-review numbers
and they were wrong: an adversarial review found the raw arm underfed with healthy data, threshold
selection leaking the units it scored, and a budget-search bug, all three flattering the result (the
README's review section records each with its measured effect). The numbers above are what the corrected
code computes, and they are transcribed from the committed artifact, not from this document's memory of
an older run.

## What this protocol cannot do

It cannot make C-MAPSS a truck. The contrast establishes a **mechanism** that is domain-general; it does
not establish a number that applies to haul trucks. That gap is why the synthetic lane exists, and why
the product's status stays honest about running on a simulated turbofan plus a physics model rather than
on fleet data nobody publishes.
