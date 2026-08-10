// uPlot needs REAL colour strings, not CSS variables.
//
// A stroke of `var(--color-accent)` makes uPlot draw nothing at all: it hands the string straight to the
// canvas 2D context, which cannot resolve custom properties and silently discards the paint. The chart
// renders, the axes render, the legend renders, and the series is invisible. A build gate never sees it
// because nothing throws. This module resolves the shell's tokens to computed values instead, and
// re-resolves them when the theme changes so the canvas repaints in the new palette.

import { useEffect, useState } from 'react';

export interface Palette {
  fg: string;
  fgSubtle: string;
  fgFaint: string;
  border: string;
  surface: string;
  accent: string;
  /** raw arm, residual arm, threshold, onset, alarm */
  raw: string;
  residual: string;
  threshold: string;
  onset: string;
  alarm: string;
  /** regime band fills, cycled by regime index */
  regimes: string[];
  grid: string;
}

function readVar(cs: CSSStyleDeclaration, name: string, fallback: string): string {
  const v = cs.getPropertyValue(name).trim();
  return v || fallback;
}

export function readPalette(): Palette {
  if (typeof window === 'undefined') return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const dark = (document.documentElement.getAttribute('data-theme') || '') === 'dark'
    || document.documentElement.classList.contains('dark');
  return {
    fg: readVar(cs, '--color-fg', dark ? '#e8eaed' : '#1a1c1e'),
    fgSubtle: readVar(cs, '--color-fg-subtle', dark ? '#a8adb4' : '#4a4f55'),
    fgFaint: readVar(cs, '--color-fg-faint', dark ? '#767b82' : '#767b82'),
    border: readVar(cs, '--color-border', dark ? '#2c3034' : '#dfe1e5'),
    surface: readVar(cs, '--color-surface', dark ? '#16181a' : '#ffffff'),
    accent: readVar(cs, '--color-accent', '#2f6fed'),
    // The two arms are the product's central comparison, so they get the two most separable hues and
    // keep them on every chart. A reader should never have to check a legend to know which arm is which.
    raw: dark ? '#8ea0b8' : '#5a6b82',
    residual: dark ? '#4da3ff' : '#1f6feb',
    threshold: dark ? '#f0883e' : '#bc4c00',
    onset: dark ? '#f85149' : '#cf222e',
    alarm: dark ? '#d29922' : '#9a6700',
    regimes: dark
      ? ['#1e2a38', '#20302a', '#332532', '#2e2a1c', '#1c2f33', '#2a2438']
      : ['#eaf1fb', '#eaf6ee', '#fbeef6', '#fbf5e6', '#e9f5f7', '#f0edfa'],
    grid: dark ? '#24282c' : '#eceef1',
  };
}

const FALLBACK: Palette = {
  fg: '#1a1c1e', fgSubtle: '#4a4f55', fgFaint: '#767b82', border: '#dfe1e5', surface: '#ffffff',
  accent: '#2f6fed', raw: '#5a6b82', residual: '#1f6feb', threshold: '#bc4c00', onset: '#cf222e',
  alarm: '#9a6700', regimes: ['#eaf1fb', '#eaf6ee', '#fbeef6', '#fbf5e6', '#e9f5f7', '#f0edfa'],
  grid: '#eceef1',
};

/** Re-reads the palette whenever the shell flips the theme, so canvases repaint with the page. */
export function usePalette(): Palette {
  const [palette, setPalette] = useState<Palette>(() => readPalette());
  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => { obs.disconnect(); mq.removeEventListener('change', update); };
  }, []);
  return palette;
}
