# Deploy TruckVitals to the Hetzner prod box as a static site (deploy class: vps-static).
#
#   $env:TV_SSH_KEY = "<vault>/credentials/general/ssh/hetzner_fasl_prod"
#   ./scripts/deploy.ps1
#
# Why the VPS and not GitHub Pages, which this repo is otherwise a candidate for: the domain
# `truckvitals.fasl-work.com` resolves through the `*.fasl-work.com` wildcard A record to the VPS.
# Serving it from Pages needs an EXPLICIT CNAME record that overrides that wildcard, and the DNS
# provider for fasl-work.com is not recorded in the vault and has no stored credentials. The VPS route
# needs no DNS change at all, so it is the one that can actually ship. If the CNAME is ever added, the
# Pages workflow in git history is one revert away.

$ErrorActionPreference = "Stop"

$Key = $env:TV_SSH_KEY
if (-not $Key) { throw "Set TV_SSH_KEY to the hetzner_fasl_prod private key in the vault" }

$Host_ = "root@91.99.199.70"
$Domain = "truckvitals.fasl-work.com"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Verifying the committed artifacts before anything is uploaded"
& python "$Root/scripts/check_artifacts.py"
if ($LASTEXITCODE -ne 0) { throw "artifact check failed; refusing to deploy stale or unparseable data" }

Write-Host "==> Building the SPA"
Push-Location "$Root/frontend"
try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
} finally { Pop-Location }

Write-Host "==> Uploading dist/ to /var/www/$Domain"
# Streamed as a tarball: one connection, and the remote side clears the old tree in the same command so
# a half-uploaded deploy cannot leave a mixture of two builds behind.
$remote = "mkdir -p /var/www/$Domain && rm -rf /var/www/$Domain/* && tar -C /var/www/$Domain -xzf -"
& tar -C "$Root/frontend/dist" -czf - . | & ssh -i $Key -o StrictHostKeyChecking=no $Host_ $remote
if ($LASTEXITCODE -ne 0) { throw "upload failed" }

Write-Host "==> Reloading nginx"
& ssh -i $Key -o StrictHostKeyChecking=no $Host_ "nginx -t && systemctl reload nginx"

Write-Host "==> Verifying the live site"
foreach ($p in @("/", "/experiments", "/focus/F000_strut_leak", "/data/fleet/index.json")) {
    $code = (& curl -s -o /dev/null -w "%{http_code}" -m 20 -L "https://$Domain$p")
    Write-Host ("    {0,-34} {1}" -f $p, $code)
    if ($code -ne "200") { throw "$p returned $code" }
}
Write-Host "==> Live at https://$Domain/"
