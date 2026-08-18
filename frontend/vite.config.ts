import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  base: '/', // served at the custom domain root (truckvitals.fasl-work.com)
  plugins: [react()],
  define: {
    // Cache-buster for data fetches. GitHub Pages serves artifacts through a CDN, so when an
    // artifact's SHAPE changes (budget_curves did), a returning visitor's cached copy silently
    // lacks the new sections while the page renders without error. Every getJSON appends
    // ?v=<version>, so a release is also a cache invalidation.
    __APP_VERSION__: JSON.stringify(pkg.version as string),
  },
});
