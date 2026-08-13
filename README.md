# TruckVitals

**Onset detection and prognosis on haul-truck fleet telemetry, built on the one idea that makes it hard.**

Every truck variable moves with payload, road grade, gear and ambient temperature. Run a change detector
on raw channels and you detect the truck going uphill, not a fault. So the pipeline is not "detect":

```
raw telemetry -> REGIME SEGMENTATION -> within-regime residual -> change-point -> onset -> prognosis
```

and the product's central scientific claim is a **measured comparison**: the same detector run on raw
channels versus on regime-normalised residuals, and the difference between them.

> This is why TruckVitals is not a RotorVitals feature. RotorVitals runs on constant-load rotating
> machinery benchmarks (XJTU-SY, FEMTO, IMS), where load and speed are fixed and a rising RMS really does
> mean damage. It never faces the confound this product is entirely about.

## The headline result

Measured, not asserted, on **NASA C-MAPSS**, whose subsets differ in exactly one factor that matters
here: FD001 has one operating condition and FD002 has six, with the fault mode held fixed. FD003 against
FD004 repeats the contrast at two fault modes. Nobody here chose that structure, which is what makes it a
controlled experiment rather than a demonstration.

### 1. The mechanism, with no detector in it at all

The strongest statement this product can make involves no detector, no threshold, no alarm convention
and no budget, so none of those choices can be argued with. It is an effect size: how large is the
fault's signature, measured against the spread across regimes and against the spread within one?

| subset | operating conditions | fault signature, pooled | fault signature, within regime | ratio |
|---|---|---|---|---|
| FD001 | 1 | 2.81 sigma | 2.81 sigma | **1.00** |
| FD002 | **6** | **0.16 sigma** | **11.95 sigma** | **90.2** |
| FD003 | 1 | 2.79 sigma | 2.79 sigma | **1.00** |
| FD004 | **6** | **0.17 sigma** | **10.17 sigma** | **62.3** |

On six-condition data the fault moves the sensors by **a sixth of a standard deviation** of the spread
the operating regime induces, which is invisible, and by **ten to twelve standard deviations** of the
spread within a regime, which is unmissable. Same data, same channels, same fault. Only the denominator
changes.

**The single-condition subsets return exactly 1.00**, as they must: with one regime the two denominators
are the same quantity. That negative control was not designed, it is what the identical code returns on
data with nothing to condition on, and a number away from 1.00 there would mean the measurement is
broken.

### 2. Detection, where the choices start

Same idea, now run through an actual detector, so every number below depends on the detector, the
threshold rule and the budget. All arms at a **matched false-alarm budget** of about 1 per 1000 cycles,
identical detector (CUSUM, k = 0.5), equal healthy data per arm, cross-fitted thresholds, common
informative channels only.

| pair | arm | detection rate | median delay | FA / 1000 cycles |
|---|---|---|---|---|
| 1 fault mode | FD001 raw, **1 regime** | **0.93** | 46 | 1.45 |
| | FD002 raw, **6 regimes** | **0.17** | 110 | 2.10 |
| | FD002 regime-conditioned (observed) | **0.95** | 52 | 1.31 |
| | FD002 regime-conditioned (clustered) | **0.95** | 52 | 1.05 |
| 2 fault modes | FD003 raw, **1 regime** | **0.73** | 68 | 1.07 |
| | FD004 raw, **6 regimes** | **0.24** | 107 | 1.08 |
| | FD004 regime-conditioned (observed) | **0.90** | 66 | 0.99 |
| | FD004 regime-conditioned (clustered) | **0.90** | 64 | 0.90 |

**What regime variation costs.** One operating condition to six, everything else held fixed: 0.93 to
0.17, and 0.73 to 0.24.

**What conditioning recovers.** 0.95 and 0.90, both above their single-condition references, and at a
LOWER realised false-alarm rate than the raw arm they are compared against in each pair.

**The price of not being told the regime is zero, twice.** C-MAPSS ships its operating conditions as
columns; real truck telemetry does not. Discovering the regimes by clustering scores identically to being
handed them, on both pairs (0.95 against 0.95, 0.90 against 0.90).

**These numbers moved once more, on 2026-08-11, and upward.** An engine review found that a NaN gap
inside a sustained excursion was counted as a SECOND alarm. The residual arm carries NaN by design (a
sample outside every regime seen in the baseline is deliberately unassigned), so the bias fell on exactly
the arm being argued for and inflated its false-alarm count. Fixing it in `regimecpd` 0.09.005 let the
conditioned arm operate at a lower threshold: FD004 recovery went from 0.70 to 0.90, and FD002 from 0.98
to 0.95. The direction of the correction was against the previously published figure in one case and for
it in the other, which is what an unbiased fix looks like.

### What an adversarial review changed here

An earlier version of this section reported 0.96 to 0.05 recovering to 0.98, and 0.69 to 0.06 recovering
to 0.88. A review commissioned to refute it confirmed the mechanism through eight attacks, including a
shuffled-context placebo, and **broke three of those four numbers**. All three causes were real defects,
all three flattered the result, and each is fixed rather than annotated:

| what was wrong | effect |
|---|---|
| The raw arm got 30 healthy cycles where the residual arm got 90, and the difference was reported as the cost of regimes | FD002 raw 0.046 to 0.161, FD004 raw 0.062 to 0.247; single-condition arms unchanged |
| The threshold was chosen on the same data it was scored on, while `score_arm` accepted a `calibration` argument it never read | now cross-fitted over units |
| `threshold_for_budget` stopped at the first budget violation, missing 14 qualifying thresholds below it, and the penalty fell almost entirely on the multi-condition arms | fixed in `regimecpd` 0.09.003 |
| The 0.88 came from an arm with `n_regimes=1`: a global context regression with **no regime segmentation in it at all** | renamed `context-regression-global` and excluded from any recovery claim |

The last one is the reason this README now leads with an effect size. The claim was assembled by eye from
an arm table, and the arm that scored highest turned out not to be measuring the thing being claimed. The
contrast is now computed in code from a fixed list of eligible arms, and it quotes the **worse** of the
two regime arms rather than the better.

**One claim was withdrawn entirely.** This product used to describe itself as reducing FALSE ALARMS.
Neither lane demonstrates that: C-MAPSS measures detection at a fixed false-alarm budget, and on the
synthetic lane the raw arm actually wins the false-alarm metric outright. No false-alarm-reduction claim
is made anywhere in this repo.

### The honesty boundary

C-MAPSS is a **simulated turbofan**, not a truck. The claim it supports is the MECHANISM, which is
domain-general: operating-regime variation buries a fault's signature in the pooled spread, and
conditioning on the regime recovers it. It is not a claim about trucks, and nothing in this product
presents it as one. It is also **not** a claim that false alarms fall; see above for why that one was
withdrawn.

The healthy/onset split uses the standard piecewise-linear RUL convention (RUL capped at 125). That is a
**convention, not a measurement**. The false-alarm half of the comparison does not depend on it at all,
which is deliberate.

## The four lanes, and what each honestly supports

| lane | source | licence | supports | does NOT support |
|---|---|---|---|---|
| **Regime contrast** | NASA C-MAPSS | US government work | the central claim, measured under a controlled contrast | anything truck-specific: it is a simulated turbofan |
| **Failure window** | SCANIA Component X, DOI [10.5878/jvb5-d390](https://doi.org/10.5878/jvb5-d390) | CC BY 4.0 | 5-class time-window prediction over 33,641 vehicles, graded cost | continuous-channel onset: these are per-readout histograms and accumulative counters |
| **Cost** | SCANIA APS, UCI, DOI [10.24432/C51S51](https://doi.org/10.24432/C51S51) | CC BY 4.0 | a published cost matrix (**FP 10, FN 500**) and a published leaderboard, both verified in the dataset's own description file | time series: one aggregated snapshot per truck, 170 anonymised features |
| **Synthetic** | ours, physically grounded | MIT | onset-time error against ground truth that exists by construction; named channels (tyre, strut, brake) | anything about real trucks. Labelled synthetic everywhere |

**No redistributable continuous-channel truck telemetry with named physical channels exists.** The
closest is EngineAD (25 trucks, 13 sensors, 1 Hz, six months), and it fails twice over: access is by
request, and the release is PCA-transformed to 8 components, which destroys the channel identity this
product needs. Naming the near-miss is more useful than claiming nothing exists.

## The synthetic lane is physics, not a pasted wiggle

The regime confound is **emergent**. Strut pressure rises because the truck is loaded; fuel rate rises
because total resistance is higher on the ramp; brake temperature rises on the descent because the brakes
absorb potential energy. A generator that produced clean channels and then added a regime-shaped term
would make the whole product circular.

Measured on the generated fleet, the share of each channel's variance that lives **between** regimes:

| channel | between-regime share |
|---|---|
| strut pressures | 0.96 |
| fuel rate | 0.97 |
| engine temperature | 0.38 |
| tyre pressure and temperature | 0.33 |
| brake temperature | 0.26 |

Struts and fuel are almost entirely reporting which regime the truck is in. That is what a naive detector
latches onto, and the differentiated picture is itself a result: conditioning should help enormously on
struts and much less on the thermal channels.

## The engine is a separate published package

This repo declares **no package of its own**
([conventions/no-internal-packages.md](https://github.com/fsantibanezleal/CAOS_MANAGE)). The
regime-conditional change-point engine lives in its own repo and is consumed as a pinned dependency:

**[`regimecpd`](https://pypi.org/project/regimecpd/)** ([source](https://github.com/fsantibanezleal/CAOS_RegimeCPD)),
MIT, 302 tests, the full ladder from Shewhart to conformal calibration.

The evidence that it deserved to be a package rather than product plumbing is structural: this product's
headline experiment validates it on a **turbofan**. An engine demonstrated to work outside its product's
domain, inside that product's own evidence, is by demonstration not product-specific.

## The cost lane: the metric everyone reports selects the more expensive decision

SCANIA APS ships a published cost matrix (**a miss costs 50 times a false alarm**) and a published
leaderboard, both verified in the dataset's own description file. That makes it the one lane where this
product can report a number a planner decides on.

The threshold is chosen on out-of-fold training predictions, never on the test set. Test-set results:

| decision rule | threshold | total cost | false positives | false negatives | F1 |
|---|---|---|---|---|---|
| default 0.5 | 0.500 | 53,830 | 33 | 107 | 0.793 |
| **F1-optimal** | 0.391 | **47,890** | 39 | 95 | **0.807** |
| **cost-optimal** | 0.006 | **11,670** | 367 | 16 | 0.652 |

The F1-optimal rule has the **best F1 and the second-worst cost**. Optimising the metric almost everyone
reports costs **4.1 times** more than optimising the one the customer pays. That is the finding, and it
needs the published cost matrix to be sayable at all.

Reference point, not a like-for-like comparison: the IDA 2016 challenge winner scored 9,920 with 542 false
positives and 9 false negatives, under challenge conditions this run does not reproduce.

## The Component X lane: two ways to encode asymmetry, and why you must not use both

SCANIA Component X (DOI 10.5878/jvb5-d390, CC BY 4.0) is obtainable by anonymous direct download; the
exact commands are in the docs. All 11 files were fetched and the structure reproduced from the bytes:
**1,122,452 readouts x 107 columns**, 23,550 vehicles, and a censored count of **21,278** that matches
the descriptor's healthy-vehicle count exactly, leaving 2,272 repaired as declared.

Its graded 5x5 cost matrix prices **how late a miss was**: false alarms cost 7 to 10, misses cost 200 to
500 and rise the closer to failure they happen. That is the only public source in this product that
prices the question the product is about.

Measured on the validation split:

| model | decision rule | total cost | balanced accuracy | vehicles flagged |
|---|---|---|---|---|
| class-weighted | **argmax** | **38,494** | 0.250 | 2,678 |
| class-weighted | expected-cost | 49,566 | 0.200 | 5,046 (all of them) |
| unweighted | argmax | 48,592 | 0.232 | 200 |
| unweighted | expected-cost | 47,458 | 0.207 | 4,734 |
| any | never flag | 57,400 | 0.200 | 0 |

**The finding: the expected-cost decision is not uniformly better than argmax.** It helps on the
unweighted model (47,458 against 48,592) and badly hurts on the class-weighted one (49,566 against
38,494), where it degenerates to flagging every vehicle in the fleet.

Class weighting and a cost matrix are two different mechanisms for encoding the same asymmetry, and
applying both double-counts it. An expected-cost decision needs **calibrated** probabilities, and a
class-weighted model's probabilities are not calibrated. This is an easy and expensive mistake, and it
produces a decision rule that is defensible on paper and useless in practice.

### The honesty anchor

Best published balanced accuracy on this five-class problem is **0.2428**, against **0.20** for uniform
guessing (Dimidov, Jafarnejad and Frank, arXiv:2606.12486). This run independently lands at 0.250, in the
same place. **The signal here is roughly two points above chance**, methods separate on cost rather than
accuracy, and any presentation implying the problem is solved is contradicted by the best published
number. This product's best cost of 38,494 on validation sits inside the published test-split range of
37,733 to 49,671, which is indicative and not a like-for-like comparison.

### Prior art this lane cites rather than ignores

Carpentier, De Temmerman and Verbeke (IDA 2024, doi:10.1007/978-3-031-58553-1_21) also condition a Scania
model on context. Their full text was read: their "contextual" is a per-vehicle **cohort**, hierarchically
clustered and resolved at inference by specification. Theirs partitions the **fleet**; this product's
regime conditioning partitions the **timeline**. The two compose without interacting, so there is no
overlap, and this product does not claim that nobody has tried conditioning a Scania model on context.

## Onset-time error: a NULL result, and how the chance baseline produced it

The synthetic lane is the only one where the true onset exists, so onset error is measurable. Taking the
nearest changepoint is optimistic, so the **chance level for the same number of changepoints** is
computed beside it. That column is what makes this section honest, and what turns an apparent win into a
null.

The first run of this measurement, on a 20-unit fleet, gave the conditioned arm a skill of **2.40x** and
that number was published here. A 36-unit run reversed it. Rather than pick one, the experiment was
**repeated across five seeds at 36 units**, paired, which is what the question actually required:

| seed | raw error | raw cps | **raw skill** | conditioned error | cond. cps | **cond. skill** |
|---|---|---|---|---|---|---|
| 0 | 122 min | 2 | 1.94x | 52 min | 13 | 0.96x |
| 1 | 202 min | 3 | 0.94x | 55 min | 14 | 0.86x |
| 2 | 141 min | 2 | 1.67x | 52 min | 12 | 1.10x |
| 3 | 143 min | 3 | 1.24x | 34 min | 12 | 1.60x |
| 4 | 203 min | 3 | 0.87x | 30 min | 12 | 1.75x |
| | | | **1.33 +/- 0.47** | | | **1.26 +/- 0.40** |

**Paired difference (conditioned minus raw): -0.08 +/- 0.74. Conditioning is ahead in 2 of 5 seeds.**

That is a null, stated precisely rather than as an absence of evidence. Both arms sit a little above
chance with a spread that comfortably includes 1.0, and the difference between them is an order of
magnitude smaller than the seed-to-seed variation within either.

**Conclusion: regime conditioning does not improve onset LOCALISATION.** Note what the raw-error column
would have said on its own: the conditioned arm beats the raw arm on every single seed, by 2 to 7 times.
All of that is explained by producing 12 to 14 changepoints against 2 to 3, which is exactly what the
chance column prices in. The original 2.40x was a small-fleet artefact on top of a seed spread wide
enough to produce anything between 0.86 and 1.94.

This does **not** touch the headline: detection rate at a matched false-alarm budget is a different
measurement, on different data (see the C-MAPSS table above). Two sub-claims of the same product, one
supported and one null, measured by the same protocol.

## The ladder on the synthetic lane: conditioning never hurts, and sometimes transforms

Six rungs, both arms, all at the same false-alarm budget (all achieved 0 per truck-month), 36 trucks of
which 16 develop a fault at a known time:

| detector | raw detection | raw delay | conditioned detection | conditioned delay |
|---|---|---|---|---|
| Shewhart | 0.75 | 190 min | **1.00** | **86 min** |
| CUSUM | 1.00 | 119 min | 1.00 | **106 min** |
| EWMA | 1.00 | 113 min | 1.00 | **90 min** |
| Page-Hinkley | 1.00 | 198 min | 1.00 | **184 min** |
| PCA SPE | 0.75 | 210 min | 0.75 | **86 min** |
| **PCA T-squared** | **0.06** | 532 min | **1.00** | **150 min** |
| KSWIN | 0.06 | 159 min | **0.50** | **97 min** |
| BOCPD | **0.00** | never fires | **0.00** | never fires |
| ADWIN | **0.00** | never fires | **0.00** | never fires |

### Two rungs detect nothing, and the engine's own documentation predicted both

They are published as zeros rather than dropped from the table.

**BOCPD** assumes the model parameters before and after a changepoint are **independent**. That suits a
step change and suits a slow drift poorly: when the post-change state is nearly the pre-change state,
evidence for a changepoint at any particular instant stays weak no matter how far the drift eventually
travels. Every fault in this lane is a slow ramp over about a fifth of the record. The engine documents
this limitation and warns that "BOCPD is not automatically the best rung" for gradual onset; here it is
the worst.

**ADWIN** reports a small integer count of channels flagging, so its alarm-budget curve has only `d + 1`
points where the others have hundreds. At a budget of one false alarm per truck-month the only feasible
threshold is one that never fires. The engine documents exactly this and says `delta` should be swept
instead whenever ADWIN is compared against anything; putting it on a common budget is the wrong
instrument for it, and this row is what that looks like.

Both zeros are therefore coherence checks passing rather than surprises: a documented limitation showed
up where the documentation said it would.

Conditioning is never worse on either axis, and on Hotelling T-squared it is the difference between
detecting 6% of faults and detecting all of them. That is the expected direction: T-squared measures
position within the normal correlation structure, and on a load-varying machine the raw structure is
dominated by the duty cycle.

A **trivial baseline** is scored alongside, and it is deliberately generous: a fixed threshold on the one
channel each fault moves first, *told the answer*. It reaches 0.75 detection at 123 min, beaten by
Shewhart on residuals (1.00 at 86 min). So the lane is not trivially easy.

**Attribution is scored, not judged by eye**: does the method name a channel the fault was actually
injected into? Top-2 hit rate **0.44** over 16 faulty trucks, and it is uneven: tyre leak 4/4, brake drag
2/4, strut leak 1/4, cooling loss **0/4**. That is a weak result and it is published as one. Contribution
plots smear onto correlated channels, which is exactly what the engine's documentation warns about.

## Status

**v0.01.000, under construction.** Built and verified:

- The **C-MAPSS lane** and the controlled contrast above, baked to
  `data/artifacts/cmapss_regime_contrast.json` with bootstrap intervals over units and a budget sweep.
- The **APS cost lane**, baked to `data/artifacts/aps_cost.json` with the full cost curve.
- The **synthetic lane**: a physically grounded fleet with an emergent confound and a known onset time,
  the method ladder on both arms, onset error against chance, a deliberately generous trivial baseline,
  and scored attribution.

Not built: the SCANIA Component X lane (access is being verified) and the web surface. Neither is
represented here as done.

## Licence

MIT. See [LICENSE](LICENSE).
