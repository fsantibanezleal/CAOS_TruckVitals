# 07 Deploy

Static GitHub Pages (ADR-0055), live at truckvitals.fasl-work.com. There is no backend at request time:
the SPA plus the committed artifacts under `data/artifacts/` are the whole deployment.

## The workflow verifies artifacts, it never regenerates them

`.github/workflows/deploy-pages.yml` runs on push to `main` (plus manual dispatch) and does three
things, in order:

1. **Verify the committed artifacts** (step "Verify the committed artifacts are present and
   browser-parseable"): `python scripts/check_artifacts.py`, stdlib only on purpose, run before
   anything is installed, so it cannot pass because a dependency happened to be importable. It checks
   the seven required artifacts exist, that every JSON file under `data/artifacts/` parses with the
   strictness a browser applies, and that the fleet index and the fleet trace files agree (see
   [08 Data contracts](08_data-contracts.md)).
2. **Build the SPA** (`cd frontend && npm ci && npm run build`). `npm run build` chains three stages
   declared in `frontend/package.json`:
   - `prebuild`: `copy-data.mjs` overlays `data/artifacts` into `frontend/public/data`. The canonical
     copies live in `data/artifacts` only; `public/` is a git-ignored build-time overlay, so there is
     one copy of every number in the repo and the site cannot drift from the pipeline by editing a
     second one. The script fails the build if any of its `REQUIRED` artifacts is missing, or if the
     fleet directory has an index but no truck traces: a page that silently shows nothing where a
     measured result belongs is worse than a broken build, because it ships looking finished.
   - `build`: `tsc --noEmit && vite build` into `frontend/dist`.
   - `postbuild`: `spa-404.mjs` then `prerender-routes.mjs` (next section).
3. **Upload `frontend/dist` and deploy** via `actions/deploy-pages`.

The workflow deliberately does NOT regenerate artifacts. The committed files are the reviewed evidence:
two lanes need datasets this repo does not redistribute (C-MAPSS, the SCANIA sets), so CI could not bake
them, and a deploy that rebaked its own numbers would ship output nobody audited. Baking is a human act
through the runners in `data-pipeline/` (see
[guides/01_precompute-pipeline.md](../guides/01_precompute-pipeline.md)); the deploy gate's job is to
refuse a site whose committed evidence is missing or malformed.

## Routes: real 200s, with a 404 fallback behind them

The app routes with the history API (BrowserRouter), so a hard navigation to `/methodology` or
`/focus/F000_strut_leak` asks Pages for a file that a plain SPA build does not contain. Two scripts
close that, in layers:

- `spa-404.mjs` copies the built `index.html` to `dist/404.html`. Pages then serves the SPA shell for
  any unknown path and the router renders the right view, but with an HTTP **404** status: a human sees
  the page, while a link unfurler, a crawler, an uptime check or a visual gate sees a broken URL.
- `prerender-routes.mjs` therefore materializes `<route>/index.html` for every KNOWN route, which Pages
  serves with a 200: five prose pages (`introduction`, `methodology`, `implementation`, `experiments`,
  `benchmark`), `focus/live`, and one `focus/<unitId>` per truck listed in `dist/data/fleet/index.json`,
  20 routes at the current 14-truck fleet. The truck ids come from the artifact the App itself reads,
  so a re-bake that changes the fleet gets shareable focus URLs with no edit here, and the script
  refuses to emit a partial route set if the index lists no trucks. The prose-page list is kept literal
  rather than parsed out of `main.tsx`, because a path prerendered without a matching route would
  answer 200 with an empty view, which is worse than a 404.

The 404 fallback stays as the safety net for anything unlisted. Shareable-by-URL focus routes are an
ADR-0070 requirement, which is why a 404 status on them counts as a real gap and not a cosmetic one.

## The cache-bust contract (since 0.02.000)

Every artifact fetch carries the app version: `getJSON` in `frontend/src/lib/artifacts.ts` appends
`?v=${__APP_VERSION__}`, and `frontend/vite.config.ts` defines `__APP_VERSION__` from
`frontend/package.json` at build time.

Why: Pages serves these JSON files through a CDN. When an artifact's SHAPE changes, a visitor with a
stale cached copy gets a successful fetch of the old file, the new code reads keys that are not there,
and panels render silently incomplete; nothing throws and nothing looks broken from the pipeline's
side. Before 0.02.000 the deploy notes claimed cache-busting that was never wired, and exactly this
failure shipped (recorded in `CHANGELOG.md` under 0.02.000, Fixed).

The contract this creates: **a release that changes any artifact's shape must ship a version bump**, in
`VERSION` and `frontend/package.json` together, because bumping the version is what invalidates every
visitor's copy.

## CI on every push

`.github/workflows/ci.yml` runs on `main`, `develop` and pull requests:

- `ruff check data-pipeline tests`, then `pytest` (the browser-JSON artifact gate plus the lane tests).
- **Engine parity** (step "Engine parity, browser lane against the Python engine"):
  `cd frontend && npm ci && npm test` runs `frontend/test/parity.test.ts` against the committed
  `data/artifacts/parity.json`, the fixture `data-pipeline/run_parity.py` bakes with input arrays plus
  the outputs the Python engine computed from them. This is the stage unique to this product: the live
  lane is a second implementation of the engine in TypeScript, two implementations of one method can
  disagree, and without this gate the App could show numbers the pipeline would not produce while both
  test suites stay green.
- **Pipeline smoke, sandboxed**: quick `run_synthetic_benchmark.py` and `run_fleet_traces.py` runs
  write to `${{ runner.temp }}/smoke` via `--output`, never to `data/artifacts`, so a smoke run cannot
  overwrite committed evidence.
- `scripts/check_artifacts.py`, the same gate the deploy workflow runs.
- A separate `guards` job: no tracked real `.env`, no venv or native/heavy binary, no raw-data file
  extensions, no leaked local machine paths, plus `check_template_residue.py` and
  `check_content_standards.py` (ADR-0067).

## Custom domain, and the dormant VPS path

Enable once per repo: Settings, Pages, Source = GitHub Actions. The custom domain is set via
`gh api PUT repos/<owner>/<repo>/pages -f cname=truckvitals.fasl-work.com`; committing a CNAME file
alone does not set the domain on Actions-based deploys, which is why none is tracked here. Operational
details live in [`deploy/pages.md`](../../deploy/pages.md).

The VPS path (`deploy/fasl-slug.service`, `deploy/domain.nginx`) is dormant. It activates only if a
backend appears (an ADR-0002 trigger), which this product does not have.
