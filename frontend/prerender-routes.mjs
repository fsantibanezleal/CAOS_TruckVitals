// Materialize a REAL page for every routed URL, so GitHub Pages answers 200 instead of 404.
//
// WHY. `spa-404.mjs` copies index.html to 404.html, which makes deep links WORK in a browser: Pages
// serves the shell and the router renders the right view. But it serves it with an HTTP **404** status.
// A human sees the page; a link unfurler, a crawler, an uptime check or a visual gate sees a broken URL.
// The focus route exists to be shareable (ADR-0070), so a 404 on `/focus/<unit>` is a real gap against
// that requirement rather than a cosmetic one.
//
// FIX. Pages serves `<path>/index.html` for `<path>` with a 200. The route set is small and fully known
// at build time: five prose pages plus one focus route per truck in the fleet index. The 404.html
// fallback stays as the safety net for anything unlisted.
//
// Root-absolute asset paths (vite base '/') resolve from any depth, so a straight copy is correct.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const index = resolve(dist, 'index.html');
if (!existsSync(index)) {
  console.error('[prerender] dist/index.html not found, run after `vite build`');
  process.exit(1);
}

// Kept as a literal list rather than parsed out of main.tsx: a path appearing here without a matching
// <Route> would answer 200 with an empty view, which is worse than a 404.
const PAGES = ['introduction', 'methodology', 'implementation', 'experiments', 'benchmark'];

// Truck ids come from the artifact the App itself reads, so a re-bake that changes the fleet gets
// shareable focus URLs for free and this file cannot drift from the selector.
const indexJson = resolve(dist, 'data/fleet/index.json');
if (!existsSync(indexJson)) {
  console.error('[prerender] dist/data/fleet/index.json missing; copy-data.mjs did not run');
  process.exit(1);
}
const units = JSON.parse(readFileSync(indexJson, 'utf8')).units.map((u) => u.unit_id);
if (units.length === 0) {
  console.error('[prerender] the fleet index lists no trucks; refusing to emit a partial route set');
  process.exit(1);
}

const routes = [...PAGES, ...units.map((u) => `focus/${u}`)];
for (const route of routes) {
  const dir = resolve(dist, route);
  mkdirSync(dir, { recursive: true });
  copyFileSync(index, resolve(dir, 'index.html'));
}
console.log(`[prerender] ${routes.length} routes materialized (${PAGES.length} pages, ${units.length} trucks)`);
