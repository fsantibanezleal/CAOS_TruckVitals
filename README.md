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

All arms at a **matched false-alarm budget** of about 1 per 1000 cycles, identical detector (CUSUM,
k = 0.5), identical fit and calibration windows, common informative channels only.

| pair | arm | detection rate | median delay |
|---|---|---|---|
| 1 fault mode | FD001 raw, **1 regime** | **0.96** | 59 |
| | FD002 raw, **6 regimes** | **0.05** | 122 |
| | FD002 regime-conditioned (observed) | **0.98** | 65 |
| | FD002 regime-conditioned (clustered) | **0.98** | 65 |
| 2 fault modes | FD003 raw, **1 regime** | **0.69** | 68 |
| | FD004 raw, **6 regimes** | **0.06** | 59 |
| | FD004 regime-conditioned (clustered) | **0.73** | 92 |
| | FD004 regime-conditioned (regression) | **0.88** | 54 |

Read the two things that matter:

**What regime variation costs.** Going from one operating condition to six, with everything else held
fixed, collapses detection from 0.96 to 0.05 and from 0.69 to 0.06. That is the confound this product
exists to address, measured.

**What conditioning recovers.** 0.05 back to 0.98, and 0.06 back to 0.88. On the two-fault-mode pair the
conditioned arm beats the single-regime control (0.88 against 0.69), because conditioning also removes
variation the control never had to deal with.

**The price of not being told the regime is small.** C-MAPSS ships its operating conditions as columns;
real truck telemetry does not. Discovering the regimes by clustering scores the same as being handed them
(0.98 against 0.98 on FD002), and a single-regime regression on the context outperforms both on FD004.

### The honesty boundary

C-MAPSS is a **simulated turbofan**, not a truck. The claim it supports is the MECHANISM, which is
domain-general: regime variation inflates false alarms and conditioning removes much of it. It is not a
claim about trucks, and nothing in this product presents it as one.

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

## Onset-time error, against a chance baseline

The synthetic lane is the only one where the true onset exists, so onset error is measurable. Taking the
nearest changepoint is optimistic, so the **chance level for the same number of changepoints** is reported
beside it, and that is the number to read:

| arm | onset error | chance level | skill | changepoints |
|---|---|---|---|---|
| raw channels | 131.0 min | 141.6 min | **1.08x** | 3.5 |
| regime-conditioned | 17.5 min | 42.0 min | **2.40x** | 14 |

Raw-channel onset estimation is **no better than scattering the same number of changepoints at random**.
Regime conditioning is 2.4 times better than chance. Without the chance column the residual arm would
appear 7.5 times more accurate, which would have been an artefact of it producing four times as many
changepoints.

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
