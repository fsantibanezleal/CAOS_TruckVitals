// The regime segmentation itself: what was discovered, against what a perfect segmenter would recover.
//
// Two strips on one time axis. The top is the discovered label per sample; the bottom is the truth the
// simulator knows by construction (loaded/empty crossed with down/flat/up). Agreement is scored by the
// adjusted Rand index, which is chance-corrected: two random labelings of the same data score 0, not
// something that looks like partial credit.

import { useEffect, useRef, useState } from 'react';
import type { LiveResult } from '../engine/live.ts';
import { useLang } from '../lib/i18n.ts';
import { fmt } from '../lib/trace.ts';
import { usePalette } from './theme.ts';

export default function RegimeStrip({ r }: { r: LiveResult }) {
  const lang = useLang();
  const p = usePalette();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const read = () => setW((prev) => (Math.abs(prev - el.clientWidth) < 1 ? prev : el.clientWidth));
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || w <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const h = 96;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = r.labels.labels.length;
    const strip = (labels: ArrayLike<number>, top: number, height: number) => {
      for (let i = 0; i < n; i++) {
        const x0 = (i / n) * w;
        const x1 = ((i + 1) / n) * w;
        const lab = labels[i];
        // -1 is UNASSIGNED and is drawn as a gap, never as a colour: a sample outside every regime the
        // baseline saw is a case the method declines, and painting it would hide that.
        if (lab < 0) continue;
        ctx.fillStyle = p.regimes[lab % p.regimes.length];
        ctx.fillRect(x0, top, Math.max(1, x1 - x0), height);
      }
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, top + 0.5, w - 1, height - 1);
    };

    strip(r.labels.labels, 6, 34);
    strip(r.trueRegimeLabels, 56, 34);

    if (r.truck.onsetT !== null) {
      const t0 = r.monitoredT[0];
      const t1 = r.monitoredT[r.monitoredT.length - 1];
      const frac = (r.truck.onsetT - t0) / Math.max(t1 - t0, 1);
      if (frac >= 0 && frac <= 1) {
        ctx.strokeStyle = p.onset;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(frac * w, 0);
        ctx.lineTo(frac * w, h);
        ctx.stroke();
      }
    }
  }, [w, r, p]);

  const unassigned = 1 - r.labels.coverage;

  return (
    <div>
      <div ref={hostRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} role="img" aria-label="regime segmentation against ground truth" />
      </div>
      <div className="tv-keys" style={{ marginTop: '0.3rem' }}>
        <span><strong>{lang === 'es' ? 'arriba' : 'top'}</strong>: {lang === 'es' ? 'descubierto' : 'discovered'}</span>
        <span><strong>{lang === 'es' ? 'abajo' : 'bottom'}</strong>: {lang === 'es' ? 'verdad' : 'ground truth'}</span>
        <span>{lang === 'es' ? 'acuerdo (Rand ajustado)' : 'agreement (adjusted Rand)'}:{' '}
          <strong>{fmt(r.regimeAgreement, 2)}</strong></span>
        <span>{lang === 'es' ? 'sin asignar' : 'unassigned'}: <strong>{(unassigned * 100).toFixed(1)}%</strong></span>
      </div>
      <div className="tv-cap">
        {lang === 'es'
          ? 'El índice de Rand ajustado está corregido por azar: dos etiquetados aleatorios dan 0, no un '
            + 'crédito parcial engañoso. Los huecos blancos son muestras SIN ASIGNAR, fuera de todo régimen '
            + 'visto en la línea base. Suba el radio de novedad y desaparecen, pero entonces el método deja '
            + 'de declarar lo que no conoce.'
          : 'The adjusted Rand index is chance-corrected: two random labelings score 0 rather than '
            + 'misleading partial credit. The white gaps are UNASSIGNED samples, outside every regime the '
            + 'baseline saw. Raise the novelty radius and they disappear, but then the method stops '
            + 'declaring what it does not know.'}
      </div>
    </div>
  );
}
