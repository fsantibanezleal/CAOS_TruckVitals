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

## The ladder on the synthetic lane: 12 rungs, and 2 of them say the opposite

Every rung the engine offers that produces a per-sample statistic, run on BOTH arms at the same
false-alarm budget, on a 36-truck synthetic fleet. PELT is absent on purpose: it is retrospective, and
putting it on an online detection metric would score a method that had already read the future.

| tier | rung | detection, raw | detection, residual | delay raw | delay residual |
|---|---|---|---|---|---|
| classical | shewhart | 0.75 | **1.00** | 190 | 86 |
| classical | cusum | 1.00 | 1.00 | 119 | 106 |
| classical | ewma | 1.00 | 1.00 | 113 | 90 |
| classical | page-hinkley | 1.00 | 1.00 | 199 | 184 |
| multivariate | pca-spe | 0.75 | 0.75 | 211 | 86 |
| multivariate | pca-t2 | 0.06 | **1.00** | 532 | 150 |
| SOTA | bocpd | 0.00 | 0.00 | never | never |
| SOTA | kswin | 0.06 | **0.50** | 159 | 97 |
| SOTA | adwin | 0.00 | **0.06** | never | 652 |
| **learned** | isolation-forest | **0.69** | 0.06 | 263 | 710 |
| **learned** | one-class-svm | **0.75** | 0.50 | 192 | 95 |
| **learned** | autoencoder | 0.75 | **1.00** | 174 | 90 |

**Conditioning helps 5 rungs, is neutral on 5, and HURTS 2.** Both of the two it hurts are learned
novelty models, and one of them badly: isolation forest goes from 0.69 to 0.06.

That is a counter-example to this product's own thesis and it is reported as one. A plausible mechanism,
stated as a hypothesis rather than a result: a novelty model learns the shape of normal, and on the raw
arm that shape is a handful of tight regime clusters, so anything off-cluster is easy to isolate.
Conditioning replaces those clusters with one roughly isotropic blob, and a moderate shift stays inside
it. The structure the residual removes is structure isolation forest was using.

What it is NOT: the unassigned-sample gap. That would be the obvious explanation, since these rungs stack
a 10-sample window and one unassigned sample drops the whole window. Regime coverage on this run is
**0.998**, so there are almost no gaps to blame. Checking that was the difference between an explanation
and a guess.

**Two rungs detect nothing at all**, on either arm, and are shown rather than dropped. Both failures are
predicted by the engine's own documentation: BOCPD's independent-parameters assumption suits step changes
rather than slow ramps, and ADWIN's statistic is an integer cut count, which offers only a handful of
distinct operating points on a matched-budget curve. A ladder that lists only the rungs that worked is a
leaderboard.

**The most dramatic win is pca-t2, 0.06 to 1.00.** Hotelling's T-squared measures movement inside the
retained subspace, and on raw haul-truck channels that subspace is dominated by the haul cycle, so the
fault is a small perturbation of a huge signal. Conditioned, the cycle is gone and the subspace is about
the fault.

## Status

**0.03.001, released 2026-08-18. Live at [truckvitals.fasl-work.com](https://truckvitals.fasl-work.com/).**

The study is also a published technical report: **Regime Conditioning Recovers Detection, Not
Localisation** (Zenodo, CC-BY-4.0). Cite the concept DOI
[10.5281/zenodo.22002431](https://doi.org/10.5281/zenodo.22002431); v1.0 is
[10.5281/zenodo.22002432](https://doi.org/10.5281/zenodo.22002432). Source, figures pipeline and
built PDF live under [`manuscripts/`](manuscripts/README.md); every number replays from the
committed artifacts.

All four lanes are baked and committed:

- The **C-MAPSS lane** and the controlled contrast above, baked to
  `data/artifacts/cmapss_regime_contrast.json` with bootstrap intervals over units and a budget sweep.
- The **APS cost lane**, baked to `data/artifacts/aps_cost.json` with the full cost curve.
- The **Component X lane**, baked to `data/artifacts/componentx.json`: all 11 files fetched, the
  structure reproduced from the bytes, and the argmax-versus-expected-cost finding above.
- The **synthetic lane**: a physically grounded fleet with an emergent confound and a known onset time,
  the method ladder on both arms, onset error against chance, a deliberately generous trivial baseline,
  and scored attribution.

What 0.02.000 and 0.03.000 shipped on top of the measurements (the CHANGELOG carries the split):

- **A live, parity-gated workbench.** The engine is ported to TypeScript (`frontend/src/engine/`) and
  every control on the App recomputes the whole pipeline in the browser. The port's right to exist is a
  fixture: `data-pipeline/run_parity.py` bakes inputs plus the Python engine's outputs, and
  `frontend/test/parity.test.ts` asserts in CI that the browser engine reproduces them.
- **The ladder completed at 12 rungs**, including the learned tier above. A rung whose optional backend
  is missing degrades to a NAMED skip recorded in the artifact, never a silently shorter table.
- **Baked budget curves**: every rung, both arms, six false-alarm budgets, bootstrap intervals over
  units, unreachable budgets as explicit cells. Rendered on the Benchmark page.
- **Focus routes** (ADR-0070): `/focus/<unitId>` for any of the 14 baked trucks, `/focus/live` for a
  configuration carried in the URL; 20 routes are prerendered so a shared link answers 200.
- **A nine-tab Methodology**, transcribed from engine-verified method dossiers.
- **Cache-busted data fetches** (`?v=APP_VERSION`), so a redeploy invalidates every visitor's copy of
  the artifacts instead of rendering silently incomplete from a stale CDN cache.

## Licence

MIT. See [LICENSE](LICENSE).
