import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Truck } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './truckvitals.css';
import { CITATIONS } from './data/citations.ts';
import { architecture } from './architecture.ts';
import pkg from '../package.json';
import Tool from './pages/Tool.tsx';
import Focus from './pages/Focus.tsx';
import Introduction from './pages/Introduction.tsx';
import Methodology from './pages/Methodology.tsx';
import Implementation from './pages/Implementation.tsx';
import Experiments from './pages/Experiments.tsx';
import Benchmark from './pages/Benchmark.tsx';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'TruckVitals', mark: <Truck size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introducción' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/implementation', en: 'Implementation', es: 'Implementación' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_TruckVitals' },
  version: pkg.version, // single source: frontend/package.json, so the footer cannot drift
  architecture,
  footer: {
    provenance: {
      en: 'Engine: regimecpd (PyPI, MIT). Data: NASA C-MAPSS, SCANIA APS and Component X (CC BY 4.0), '
        + 'and a synthetic haul-truck fleet (MIT).',
      es: 'Motor: regimecpd (PyPI, MIT). Datos: NASA C-MAPSS, SCANIA APS y Component X (CC BY 4.0), '
        + 'y una flota sintética de camiones (MIT).',
    },
    disclaimer: {
      en: 'Every number is replayed from a committed artifact. The haul-truck fleet is SYNTHETIC.',
      es: 'Cada número se reproduce desde un artefacto versionado. La flota de camiones es SINTÉTICA.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <Routes>
          {/* ADR-0070: the focus route renders OUTSIDE AppShell on purpose. The shell header and footer
              are exactly the chrome that stops the stage owning the viewport, and the focus view's whole
              point is that it does. */}
          <Route path="/focus/:unitId" element={<Focus />} />
          <Route path="*" element={
            <AppShell config={config}>
              <Routes>
                <Route path="/" element={<Tool />} />
                <Route path="/introduction" element={<Introduction />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/implementation" element={<Implementation />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/benchmark" element={<Benchmark />} />
                <Route path="*" element={<Tool />} />
              </Routes>
            </AppShell>
          } />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
