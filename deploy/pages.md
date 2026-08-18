# Deploy, GitHub Pages (default, static)

The default deploy for this product (ADR-0055 Pages-first): the SPA plus the committed artifacts are
served statically; there is **no backend** at request time. The workflow
`.github/workflows/deploy-pages.yml`, on push to `main`:

1. **verifies the committed artifacts** with `python scripts/check_artifacts.py` (stdlib only, before
   anything is installed): presence of the required artifacts, browser-strict JSON parseability of every
   file under `data/artifacts/`, and fleet index consistency. The workflow never regenerates artifacts;
   baking is done offline through the `data-pipeline/` runners and the results are committed;
2. builds the frontend (`cd frontend && npm ci && npm run build`; the `prebuild` hook runs
   `copy-data.mjs`, which overlays `data/artifacts` into the git-ignored `frontend/public/data` and
   fails the build on a missing required artifact; the `postbuild` hook runs `spa-404.mjs` and
   `prerender-routes.mjs`);
3. uploads `frontend/dist` and deploys to Pages.

Full mechanics, including the prerendered route set and the `?v=APP_VERSION` cache-bust contract:
[`docs/architecture/07_deploy.md`](../docs/architecture/07_deploy.md).

Enable once per product: repo **Settings, Pages, Source = GitHub Actions**. Custom domain: set via
`gh api PUT repos/<owner>/<repo>/pages -f cname=<sub>.fasl-work.com` (the CNAME file alone does not set
the domain on Actions deploys, see the CAOS_MANAGE reference note).

The VPS path (the systemd/nginx templates here) stays **dormant** unless a backend is activated
(ADR-0002).
