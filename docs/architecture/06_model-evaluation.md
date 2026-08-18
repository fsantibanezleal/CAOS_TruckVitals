# 06 Model evaluation

How every reported number in this product is scored. The doctrine is one set of rules applied in three
places: the C-MAPSS lane (`data-pipeline/truckvitals/lanes/regime_experiment.py`), the synthetic lane
(`data-pipeline/truckvitals/lanes/synthetic_benchmark.py`), and the live browser lane
(`frontend/src/engine/metrics.ts`, a TypeScript port of `regimecpd`'s metrics held to the Python engine
by `frontend/test/parity.test.ts` in CI). Most of these rules were forced by a defect measured in this
repo rather than designed defensively in the abstract, and the measured cost is quoted where one exists.

## Alarms are events, not samples

A statistic sitting above the threshold for an hour is ONE alarm an operator answers, not sixty. Every
rate in this product counts **rising edges** of the above-threshold mask (`risingEdges` in
`metrics.ts`; a mask already true at sample 0 counts as an edge, because a record that opens
mid-excursion is an alarm the operator sees).

Two conventions follow from that and carry the meaning of every number:

- **An alarm before the onset is a false alarm, never an early detection.** Detection is the first
  rising edge at or after the onset. Scoring it the other way rewards a detector for firing constantly.
- **Rates pool events over exposure, not means over units.** The fleet false-alarm rate is total
  false-alarm events divided by total healthy exposure (`_pool` in `regime_experiment.py`), so a short
  record cannot weigh the same as a long one.

Event counting has a blind spot: it cannot tell a quiet detector from one pinned permanently above the
threshold, since both produce one edge. The **healthy duty** metric closes it: the fraction of healthy
SAMPLES above the threshold, computed with no onset labels.

Edge counting has also had a measured defect here: a NaN gap inside a sustained excursion was counted
as a SECOND alarm. The residual arm carries NaN by design, because a sample outside every regime seen in
the baseline is deliberately unassigned, so the bias fell on exactly the arm being argued for. Fixing it
in `regimecpd` 0.09.005 moved FD004 recovery from 0.70 to 0.90 and FD002 from 0.98 to 0.95, one
correction for and one against the previously published figure, which is what an unbiased fix looks
like (README, "These numbers moved once more").

## Matched budgets, and the non-monotonicity trap

Detector statistics live on incompatible scales (accumulated sigma, squared residual, normalised
distance), so no threshold value is comparable across arms. The operating point is instead a **rate**:
false alarms per 1000 cycles on C-MAPSS, per truck-month on the synthetic fleet (a sample is one minute;
`minutes_per_month = 43200.0` is stated in the artifact config rather than assumed). The threshold that
meets the budget is derived per arm by `threshold_for_budget`, never chosen by hand.

The trap: **the event-counted false-alarm rate is NOT monotone in the threshold.** At a very high
threshold nothing crosses. In the middle the statistic crosses repeatedly. At a very low threshold it
sits above the line for the whole record, which is ONE excursion and therefore a superb rate for a
detector that detects nothing. Qualifying thresholds live in pockets, so the search must scan the whole
candidate grid; a descend-until-violation search stops at the first pocket boundary. An earlier engine
version did exactly that, left 14 qualifying thresholds unreachable on C-MAPSS, and cost a six-condition
arm 0.046 detection against 0.276 available; the penalty fell almost entirely on the multi-condition
arms, which is the arm class the product's claim depends on. Fixed in `regimecpd` 0.09.003.

The degenerate always-on region is excluded by a duty cap (`MAX_HEALTHY_DUTY = 0.05` in `metrics.ts`):
a threshold qualifies only if healthy samples are above it at most 5% of the time. Choosing on duty is
legitimate where choosing on detection rate would not be, because duty needs no onset labels. Among
qualifying thresholds the most sensitive (lowest) is returned; if none qualifies the budget is
**unreachable** and the artifact records that as an explicit cell, never a missing row.

## Cross-fitted fleet thresholds

The threshold is a fitted quantity: it is chosen to satisfy the false-alarm constraint. Choosing it on
the same units whose false-alarm and detection rates are then reported is leakage, and this repo's first
version did exactly that while `score_arm` accepted a `calibration` argument it never read. An
adversarial review found it.

The fix (`score_arm` in `regime_experiment.py`): **stratified round-robin folds over units**, faulty and
healthy assigned separately, because a plain round robin can leave a fold with no healthy exposure, and
`threshold_for_budget` on such a fold has no false alarms to constrain it and returns the bottom of the
grid. Each fold's units are scored at a threshold fitted on the OTHER folds; only healthy exposure
informs the choice, so no onset label leaks in either direction. The fold assignment is deterministic,
so a re-bake reproduces the artifact. The artifact's `threshold` field is the median over fold
thresholds and is reported as such; the fleet score pools the per-unit scores computed at each fold's
own threshold (`_pool` exists because `rc.score_fleet` pools at a single threshold and cannot).

The obvious-looking alternative, taking the threshold from the healthy calibration window, is unusable
for a cumulative statistic: that window is the first cycles of the detector's own output, where a CUSUM
has just been reset to zero, and a threshold taken from it overshoots the budget by 16x to 146x.

## Intervals: bootstrap over units

Consecutive cycles of one machine are not independent observations, so every interval resamples
**units**, never samples. Two implementation points matter:

- What is resampled is the **cross-fitted per-unit scores**, not a re-score of resampled units at the
  median threshold. Re-scoring at a single threshold would report an interval for a quantity that was
  never computed.
- In `synthetic_benchmark.py` the bootstrap lambda binds the threshold as a default argument
  (`lambda o, th=th: ...`). A closure over the loop variable would read whatever the last iteration left
  behind, so every arm's interval would describe the last detector's threshold instead of its own.

The contrast artifact uses `n_boot = 300` (its `config`) with 2.5/97.5 percentile bounds; the synthetic
lane's intervals use 250 resamples.

## Chance-corrected onset skill

Onset localisation is scored as distance from the true onset to the NEAREST changepoint, and that metric
is optimistic by construction: a segmentation cut into fifty pieces lands near any onset by luck. So the
achieved error is read against the **chance level for the same changepoint count**: for k changepoints
over a span S, the expected distance from a uniformly placed onset to the nearest one is about
S / (2(k + 1)) (`_onset_estimation` in `synthetic_benchmark.py`). The reported skill is the median
chance error divided by the median achieved error; at or below 1, the segmentation locates the onset no
better than scattering the same number of changepoints at random.

This correction has a body count in this repo: a 2.40x onset-localisation advantage was published from
one perfectly reproducible run, and the chance baseline plus a seed sweep turned it into a null. The
conditioned arm beat the raw arm on raw error in every seed, and all of it was explained by producing
four times as many changepoints. `data-pipeline/run_onset_seeds.py` now sweeps five paired seeds and
bakes `onset_seed_sweep.json`, whose `verdict` field is the standing NULL: the paired difference in
chance-corrected skill (mean -0.08, sd 0.74) is smaller than the seed-to-seed spread within either arm
(raw 1.33 sd 0.47, residual 1.26 sd 0.40), and the conditioned arm is ahead in 2 of 5 seeds.

## Negative controls

- **The mechanism ratio must return exactly 1.00 on single-condition data**, because with one regime the
  pooled and within-regime denominators are the same quantity. It does, on FD001 and FD003
  (`cmapss_mechanism.json`). A value away from 1.00 there means the pipeline is broken, not a discovery.
- **A trivial baseline is scored alongside the ladder** (`_trivial_baseline` in
  `synthetic_benchmark.py`): a fixed threshold on the single channel each fault moves first, given the
  ground truth, deliberately generous because it is told where to look. If it matched the ladder, the
  synthetic lane would be too easy to be informative, and the artifact would say so
  (`trivial_baseline` in `synthetic_benchmark.json`; currently 0.75 detection at the 1.0 budget).
- The adversarial review additionally ran a **shuffled-context placebo** against the mechanism; the
  review record lives in the README's "What an adversarial review changed here" section.

## The budget sweep

One operating point is a choice; a curve is a measurement, and a method that wins only at one budget has
not won. So every rung of the 12-rung ladder is read off at every budget in `BUDGET_GRID` in
`synthetic_benchmark.py`, `(0.1, 0.25, 0.5, 1.0, 2.0, 4.0)` false alarms per truck-month, on both arms,
with a bootstrap-over-units interval on each detection rate. An unreachable budget is an explicit cell
with `reachable: false`, never an absent point: a curve with silently missing points reads as a curve
that was never swept there. The headline tables still quote the 1.0 point; the curve is what makes that
point defensible. The C-MAPSS analogue sweeps `[0.25, 0.5, 1.0, 2.0, 5.0, 10.0]` per 1000 cycles per
arm (`budget_curve` in `data-pipeline/run_cmapss_contrast.py`).

The baked curves ship in `synthetic_benchmark.json` under `budget_curves` (see
[08 Data contracts](08_data-contracts.md)) and render on the Benchmark page with a per-detector
selector.

## Where the doctrine is enforced

`tests/test_lanes.py` exercises the lanes, including the context/monitored channel disjointness the
protocol requires; `frontend/test/parity.test.ts`
asserts the browser lane's event counting, fleet scoring, `threshold_for_budget` and budget curve
reproduce the Python engine's numbers on the committed fixture, on every push (`ci.yml`, step "Engine
parity, browser lane against the Python engine").
