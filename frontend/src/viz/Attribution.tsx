// Which channel is carrying the alarm, scored against the channel the fault actually lives in.
//
// The synthetic lane knows the answer by construction, so this is one of the few places in predictive
// maintenance where attribution can be MARKED rather than admired. The ranking is by each channel's own
// statistic in the window after the onset, relative to its own healthy level, so a channel with a big
// scale cannot win by units alone.
//
// Contributions SMEAR. A shift in one variable spreads into the others through their correlations, so
// this ranks suspects; it does not diagnose. Westerhuis et al. (2000) treat that properly, and the
// caption says so rather than letting a green tick imply more than it should.

import { useMemo } from 'react';
import type { DetectorName } from '../engine/detectors.ts';
import type { LiveResult } from '../engine/live.ts';
import { CHANNEL_LABEL, label, useLang } from '../lib/i18n.ts';
import { fmt } from '../lib/trace.ts';
import { usePalette } from './theme.ts';

interface Row {
  channel: string;
  raw: number;
  residual: number;
  isTruth: boolean;
}

function rank(per: Record<string, Float64Array>, t: Float64Array, onset: number | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, series] of Object.entries(per)) {
    let healthy = 0;
    let nH = 0;
    let faulty = 0;
    let nF = 0;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (!Number.isFinite(v)) continue;
      if (onset === null || t[i] < onset) { healthy += v; nH++; } else { faulty += v; nF++; }
    }
    const h = nH ? healthy / nH : 0;
    const f = nF ? faulty / nF : 0;
    // Rise over the channel's own healthy level, so a channel with a large scale cannot win on units.
    out[name] = h > 1e-9 ? f / h : f;
  }
  return out;
}

export default function Attribution({ r, detector }: { r: LiveResult; detector: DetectorName }) {
  const lang = useLang();
  const p = usePalette();

  const rows: Row[] = useMemo(() => {
    const rawScore = rank(r.raw.detection.perChannel, r.raw.detection.t, r.truck.onsetT);
    const resScore = rank(r.residualArm.detection.perChannel, r.residualArm.detection.t, r.truck.onsetT);
    const truth = new Set(r.truck.faultChannels as string[]);
    return Object.keys(rawScore)
      .map((c) => ({ channel: c, raw: rawScore[c], residual: resScore[c] ?? NaN, isTruth: truth.has(c) }))
      .sort((a, b) => (b.residual || 0) - (a.residual || 0));
  }, [r]);

  const top = (key: 'raw' | 'residual') =>
    rows.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 2).map((x) => x.channel);
  const rawTop = top('raw');
  const resTop = top('residual');
  const truth = r.truck.faultChannels as string[];
  const hit = (t2: string[]) => truth.length > 0 && truth.some((c) => t2.includes(c));

  const max = Math.max(1, ...rows.map((x) => Math.max(x.raw || 0, x.residual || 0)));

  return (
    <div className="tv-stage">
      <dl className="tv-readout">
        <div>
          <dt>{lang === 'es' ? 'Falla (verdad)' : 'Fault (truth)'}</dt>
          <dd>{truth.length ? truth.map((c) => label(CHANNEL_LABEL, c, lang)).join(', ')
            : (lang === 'es' ? 'sano' : 'healthy')}</dd>
        </div>
        <div>
          <dt>{lang === 'es' ? 'Top-2 crudo acierta' : 'Raw top-2 hits'}</dt>
          <dd className={hit(rawTop) ? 'good' : 'bad'}>{truth.length ? (hit(rawTop) ? 'yes' : 'no') : '-'}</dd>
        </div>
        <div>
          <dt>{lang === 'es' ? 'Top-2 residuo acierta' : 'Residual top-2 hits'}</dt>
          <dd className={hit(resTop) ? 'good' : 'bad'}>{truth.length ? (hit(resTop) ? 'yes' : 'no') : '-'}</dd>
        </div>
        <div>
          <dt>{lang === 'es' ? 'Detector' : 'Detector'}</dt>
          <dd>{detector}</dd>
        </div>
      </dl>

      <div className="tv-tablewrap" style={{ overflowY: 'auto' }}>
        <table className="tv-table">
          <thead>
            <tr>
              <th>{lang === 'es' ? 'Canal' : 'Channel'}</th>
              <th style={{ width: '32%' }}>{lang === 'es' ? 'Crudo' : 'Raw'}</th>
              <th style={{ width: '32%' }}>{lang === 'es' ? 'Residuo' : 'Residual'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.channel} className={row.isTruth ? 'hl' : undefined}>
                <td>
                  {label(CHANNEL_LABEL, row.channel, lang)}
                  {row.isTruth && <strong title={lang === 'es' ? 'canal de la falla' : 'the fault channel'}> *</strong>}
                </td>
                <td>
                  <Bar value={row.raw} max={max} color={p.raw} />
                </td>
                <td>
                  <Bar value={row.residual} max={max} color={p.residual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tv-cap">
        {lang === 'es'
          ? 'Cada barra es cuánto sube el estadístico de ese canal después del inicio, relativo a su propio '
            + 'nivel sano. Las contribuciones se DIFUMINAN entre canales correlacionados, así que esto '
            + 'ordena sospechosos y no diagnostica. El asterisco es el canal donde la falla vive por '
            + 'construcción, que es lo que permite marcar el acierto en vez de admirarlo.'
          : "Each bar is how much that channel's statistic rises after the onset, relative to its own "
            + 'healthy level. Contributions SMEAR across correlated channels, so this ranks suspects and '
            + 'does not diagnose. The asterisk is the channel the fault lives in by construction, which is '
            + 'what lets the hit be marked rather than admired.'}
      </div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="tv-bar" title={fmt(value, 2)}>
      <span className="tv-bar-fill" style={{ width: `${pct}%`, background: color }} />
      <span className="tv-bar-num">{fmt(value, 2)}x</span>
    </span>
  );
}
