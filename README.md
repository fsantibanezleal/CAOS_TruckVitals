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
| **Cost** | SCANIA APS, UCI, DOI [10.24432/C51S51](https://doi.org/10.24432/C51S51) | CC BY 4.0 | a published cost matrix (**FP 10, FN 500**) and a published leaderboard | time series: one aggregated snapshot per truck |
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

## Status

**v0.01.000, under construction.** What exists and is verified:

- The C-MAPSS lane and the controlled contrast above, baked to
  `data/artifacts/cmapss_regime_contrast.json` with bootstrap intervals over units and a budget sweep.
- The physically grounded synthetic fleet generator, with an emergent confound and a known onset time.

Not yet built: the SCANIA Component X and APS lanes, the full benchmark matrix, and the web surface.
Those are tracked in the plan and are not represented here as done.

## Licence

MIT. See [LICENSE](LICENSE).
