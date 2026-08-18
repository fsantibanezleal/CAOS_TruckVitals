# 03 The gate

The archetype template this repo came from classified each case live-vs-replay through a measured
per-case gate. This product does not have that problem: everything canonical is precomputed, always,
and the one live surface is a TypeScript re-implementation of the engine. What needs gating instead is
different, and there are four real gates, each answering a specific way this product has failed or
could fail.

## Gate 1: engine parity, the live lane's licence to exist

The App recomputes in the browser (`frontend/src/engine/`), which means a second implementation of the
same method exists. Two implementations are two things that can disagree, and if they do, the App shows
numbers the product's own pipeline would not produce, while both test suites stay green.

**The fixture.** `data-pipeline/run_parity.py` bakes `data/artifacts/parity.json` (schema
`truckvitals.parity/v1`): one simulated faulty truck, the input arrays, and the outputs the Python
engine computes from them: the four classical detector statistics (Shewhart, CUSUM k=0.5, EWMA
lam=0.1, Page-Hinkley delta=0.05), and the fleet metrics on a synthetic statistic with a known shape
(false alarms as events and as a rate, detection rate, median delay, healthy duty at five probed
thresholds, and `threshold_for_budget` at four budgets).

**Arrays, not seeds.** The fixture carries the actual input arrays rather than a seed, because numpy
draws normals with a ziggurat over PCG64 and the browser engine cannot reproduce that stream without
shipping numpy's internals. For the same reason k-means seeding is not compared; the test instead
asserts the converged optimum on well-separated clusters, where Lloyd's algorithm does not depend on
where it started, plus the contract that an unseen context is labelled UNASSIGNED (-1, coverage 0)
rather than snapped to the nearest regime.

**The assertion.** `frontend/test/parity.test.ts` (run by `npm test`, `tsx --test`) recomputes
everything in TypeScript and asserts: schema string match; per-sample statistics within 1e-6 relative,
with a Python `null` (NaN) required to be non-finite in TS, not skipped; fleet metrics within 1e-9;
`threshold_for_budget` equal within 1e-6, and if a budget is unreachable in Python it must be `null` on
both sides; and the budget curve honest (an unreachable point has no threshold, a reachable point's
realised rate never exceeds its budget).

**Where it runs.** `.github/workflows/ci.yml`, step "Engine parity, browser lane against the Python
engine", on every push and PR. The failure modes it converts into red builds: a drifted TS port, and an
engine bump that changes any compared number while the fixture still carries the old ones. After a
`regimecpd` pin change, re-bake with `run_parity.py` and commit the result; the fixture's
`regimecpd_version` field records which engine release actually computed it.

## Gate 2: the artifact contract on disk

`scripts/check_artifacts.py` validates the pipeline-to-web contract. It is stdlib-only on purpose: the
deploy workflow runs it before installing anything, so it cannot pass because a dependency happened to
be importable. It catches three failure classes, all of which have actually happened in this repo:

1. A file the site requires is missing (seven required entries, from `cmapss_mechanism.json` to
   `fleet/index.json`). Absence would ship an empty panel that looks finished.
2. A file is not JSON a browser accepts. It parses every committed JSON with `parse_constant` rejecting
   NaN/Infinity, the strictness Python does not apply by default ([02](02_determinism-and-trace.md)).
3. The fleet index and the trace files disagree, in either direction: a listed unit with no file is a
   selector entry that 404s; a file no index entry reaches is dead payload; and `config.n_units_kept`
   must equal the number of listed units.

It runs twice per change: in `ci.yml` after the tests, and as the first step of
`deploy-pages.yml`, which verifies and then builds; the deploy never regenerates artifacts. The same
contract is enforced a third time at build: `frontend/copy-data.mjs` exits non-zero if a required
artifact or every truck trace is missing, so a build cannot succeed hollow.

## Gate 3: content and residue guards

The `guards` job in `ci.yml` fails the build on the regressions the product line forbids:

- Base integrity, by `git ls-files` and `git grep`: a tracked real `.env`, a tracked venv or native
  binary or heavy model blob, tracked raw-data formats (parquet/h5/npy and friends), or a leaked local
  machine path.
- `scripts/check_template_residue.py`: an instantiated product must not still ship the template's
  example pipeline. It scans tracked paths (the example package directory, the template's baked example
  cases, `*.ts.txt` scaffolds) and unambiguous content tokens (the template's chart component name, its
  example case ids, its import forms; the exact list is the `FORBIDDEN_CONTENT` tuple in the script,
  not repeated here because the guard scans this file too), with a repo-local allowlist for false
  positives. Known limit, recorded because it happened:
  the token list is deliberately unambiguous, so template PROSE in docs can survive it; the pre-rewrite
  versions of the pages in this directory did exactly that.
- `scripts/check_content_standards.py`: no em-dash (U+2014, U+2015) and no emoji (U+1F000..U+1FAFF,
  U+FE0F) anywhere in tracked text, per ADR-0067.

## Gate 4: the deployed site, rendered and measured

A 200 from the live URL is not evidence the page renders. A uPlot chart whose stroke resolves to an
undefined CSS variable renders axes, grid, legend and an invisible series; a chart whose x-scale never
ranged renders an empty plot with correct-looking axes. Neither throws.

So at deploy time, Playwright gates run against `https://truckvitals.fasl-work.com` from the private
management repo's toolbox (they need the deployed site and a real browser, which is why they do not
live in this repo's CI). What they assert:

- **Subject first.** The gate confirms the server it reached is actually TruckVitals (title and header)
  before asserting anything. A gate that does not verify its own subject reports the health of whatever
  answered the port.
- **Canvas ink, both themes.** Canvas pixels are sampled and ink of a non-background colour must
  actually be present on every page and App tab, in light and dark.
- **Layout by measurement.** The ADR-0071 floor is measured on the canvases themselves, not their host
  divs; the footer must be reachable; the idle page must be at rest (no rebuild loop while nobody
  interacts).
- **Methodology depth.** KaTeX must render at visible size on the method tabs in both themes, the 12
  detector chips must exist, the baked budget-curve canvas must hold ink, and the Spanish content must
  actually render (the shell stores language in localStorage `caos.lang`; there is no `?lang=` query to
  fake it with).
- **Focus routes.** The ADR-0070 routes are driven, baked (`/focus/<unitId>`) and live (`/focus/live`).

## What no gate certifies

Ink presence is not chart correctness, and no automated pass here judges whether a rendered figure is
right or readable. That judgement is a manual screenshot review, and treating a green gate as a
substitute for it is how this class of product ships wrong-looking pages with perfect CI.
