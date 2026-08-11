# Deploy TruckVitals.
#
# There is nothing to run. The deploy class is `github-pages`: pushing to `main` triggers
# .github/workflows/deploy-pages.yml, which verifies the committed artifacts, builds the SPA and
# publishes it to https://truckvitals.fasl-work.com/ (custom domain, CNAME to fsantibanezleal.github.io).
#
# This file exists only to say that, because a previous version of it deployed to a VPS. That was a
# unilateral change of the target the plan specified, made because the CNAME did not exist yet. The
# record now exists and the planned deploy is restored.
#
# To verify a deploy:
#   gh run list --repo fsantibanezleal/CAOS_TruckVitals --workflow "Deploy Pages" --limit 1
#   curl -s -o /dev/null -w "%{http_code}" https://truckvitals.fasl-work.com/
#
# To verify it RENDERS (a 200 is not evidence the page works), from the CAOS_MANAGE repo:
#   $env:TV_BASE = "https://truckvitals.fasl-work.com"
#   node tools/visual-verify/_tv-gate.mjs

Write-Host "TruckVitals deploys from GitHub Actions on push to main. Nothing to run here."
Write-Host "See .github/workflows/deploy-pages.yml"
