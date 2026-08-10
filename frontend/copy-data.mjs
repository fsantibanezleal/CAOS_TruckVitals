// Prebuild: overlay the committed artifacts (../data/artifacts) into the SPA's public/ so the static
// site loads exactly the numbers the pipeline baked. Canonical copies live in ../data/artifacts; public/
// is a build-time overlay and is git-ignored, so there is one copy of every number in the repo and the
// site cannot drift from the pipeline by editing a second one.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');
const artifacts = join(ROOT, 'data', 'artifacts');

const REQUIRED = [
  'cmapss_regime_contrast.json',
  'aps_cost.json',
  'componentx.json',
  'synthetic_benchmark.json',
  'onset_seed_sweep.json',
  'fleet/index.json',
];

if (!existsSync(artifacts)) {
  console.error('[copy-data] no data/artifacts, run the data-pipeline runners first');
  process.exit(1);
}

mkdirSync(join(PUB, 'data'), { recursive: true });
cpSync(artifacts, join(PUB, 'data'), { recursive: true });

// A missing artifact must fail the BUILD, not render as an empty panel. A page that silently shows
// nothing where a measured result belongs is worse than a broken build: it ships looking finished.
const missing = REQUIRED.filter((f) => !existsSync(join(PUB, 'data', f)));
if (missing.length) {
  console.error(`[copy-data] MISSING required artifacts: ${missing.join(', ')}`);
  process.exit(1);
}

const fleetDir = join(PUB, 'data', 'fleet');
const trucks = readdirSync(fleetDir).filter((f) => f.endsWith('.json') && f !== 'index.json');
if (trucks.length === 0) {
  console.error('[copy-data] data/fleet has an index but no truck traces');
  process.exit(1);
}
const kb = trucks.reduce((a, f) => a + statSync(join(fleetDir, f)).size, 0) / 1024;
console.log(`[copy-data] data/artifacts -> public/data (${REQUIRED.length} artifacts, ` +
  `${trucks.length} truck traces, ${kb.toFixed(0)} kB; fetched one at a time)`);
