// The App: a LIVE workbench. Every control recomputes the whole pipeline in the browser.
//
// It used to be a replay viewer over precooked traces: you could pick a truck and a detector, and
// nothing else moved. Now the truck is simulated here, segmented here, residualised here and scored
// here, so severity, onset, the number of regimes, each detector's own parameters and the false-alarm
// budget are all knobs rather than captions. The engine doing that work is gated against the Python
// engine by `test/parity.test.ts`, so a live number is the same number the pipeline would bake.
//
// The baked fleet is still here, under Fleet: it is the 14-truck run the artifacts were measured on, and
// it is what anchors the live lane to something reproducible.

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Callout, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import {
  DETECTOR_LADDER, DETECTOR_NOTES, type DetectorName,
} from '../engine/detectors.ts';
import { FAULT_KINDS, MONITORED_CHANNELS, type Channel, type FaultKind } from '../engine/haulcycle.ts';
import { MINUTES_PER_MONTH, runLive, type LiveResult } from '../engine/live.ts';
import { CHANNEL_LABEL, FAULT_LABEL, label, useLang, useT } from '../lib/i18n.ts';
import { fmt } from '../lib/trace.ts';
import TraceChart from '../viz/TraceChart.tsx';
import BudgetCurve from '../viz/BudgetCurve.tsx';
import RegimeStrip from '../viz/RegimeStrip.tsx';
import Attribution from '../viz/Attribution.tsx';
import FleetPanel from '../viz/FleetPanel.tsx';
import PanelBoundary from '../viz/PanelBoundary.tsx';
import { usePalette } from '../viz/theme.ts';
import { useChromeHeight } from '../lib/chrome.ts';

interface Knobs {
  faultKind: FaultKind;
  severity: number;
  onsetFraction: number;
  nCycles: number;
  seed: number;
  nRegimes: number;
  noveltyFactor: number;
  detector: DetectorName;
  k: number;
  lam: number;
  budgetPerMonth: number;
  channel: Channel;
}

const DEFAULT_KNOBS: Knobs = {
  faultKind: 'strut_leak',
  // 0.25, not 1.0. At full severity the strut leak is 9 bar against 0.35 bar of noise, so BOTH arms
  // detect every truck at every budget and the instrument shows a flat line: true, and useless as a
  // first view. At 0.25 the raw arm never detects at any budget and the conditioned arm detects all of
  // them, which is the product's claim rather than an assertion about it. Raise it and both detect,
  // with the conditioned arm roughly twice as fast.
  severity: 0.25,
  onsetFraction: 0.55,
  nCycles: 24,
  seed: 1,
  nRegimes: 6,
  noveltyFactor: 1.5,
  detector: 'cusum',
  k: 0.5,
  lam: 0.1,
  budgetPerMonth: 1.0,
  channel: 'strut_rl_bar',
};

export default function Tool() {
  useChromeHeight();
  const t = useT();
  const lang = useLang();
  const [knobs, setKnobs] = useState<Knobs>(DEFAULT_KNOBS);
  // The rail holds four groups of controls and cannot show them all at once without going 309px past
  // its own height. ADR-0071 rule 6: split the content, never scroll it, because a control below the
  // fold is a control the reader does not know exists.
  const [section, setSection] = useState<'truck' | 'regime' | 'detector' | 'view'>('truck');
  const [result, setResult] = useState<LiveResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // The knobs are deferred so dragging a slider stays responsive: React keeps painting the old result
  // while the new one computes, instead of blocking every frame on a full re-run.
  const settled = useDeferredValue(knobs);

  const set = useCallback(<K extends keyof Knobs>(key: K, value: Knobs[K]) => {
    setKnobs((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    // Yield a frame first so the control that triggered this can repaint before the work starts.
    const id = window.setTimeout(() => {
      try {
        const r = runLive({
          detector: settled.detector,
          budgetPerMonth: settled.budgetPerMonth,
          sim: {
            faultKind: settled.faultKind,
            severity: settled.severity,
            onsetFraction: settled.onsetFraction,
            nCycles: settled.nCycles,
            seed: settled.seed,
          },
          regime: { nRegimes: settled.nRegimes, noveltyFactor: settled.noveltyFactor },
          params: { k: settled.k, lam: settled.lam },
        });
        if (!cancelled) { setResult(r); setErr(null); }
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [settled]);

  const channels = useMemo(() => MONITORED_CHANNELS, []);

  const tabs: TabDef[] = useMemo(() => {
    if (!result) return [];
    return [
      { id: 'signal', label: t('tab_signal'),
        content: <PanelBoundary name="signal">
          <SignalPanel r={result} channel={knobs.channel} />
        </PanelBoundary> },
      { id: 'detector', label: t('tab_detector'),
        content: <PanelBoundary name="detector">
          <DetectorPanel r={result} detector={knobs.detector} />
        </PanelBoundary> },
      { id: 'budget', label: lang === 'es' ? 'Presupuesto' : 'Budget',
        content: <PanelBoundary name="budget"><BudgetPanel r={result} /></PanelBoundary> },
      { id: 'regimes', label: t('tab_regimes'),
        content: <PanelBoundary name="regimes"><RegimesPanel r={result} /></PanelBoundary> },
      { id: 'attribution', label: lang === 'es' ? 'Atribución' : 'Attribution',
        content: <PanelBoundary name="attribution">
          <Attribution r={result} detector={knobs.detector} />
        </PanelBoundary> },
      { id: 'fleet', label: t('tab_fleet'),
        content: <PanelBoundary name="fleet"><FleetPanel /></PanelBoundary> },
    ];
  }, [result, knobs.channel, knobs.detector, lang, t]);

  return (
    <div className="page-body wide">
      <div className="tv-layout">
        <aside className="tv-side">
          <div className="tv-railnav" role="tablist" aria-label={lang === 'es' ? 'Controles' : 'Controls'}>
            {([
              ['truck', lang === 'es' ? 'Camión' : 'Truck'],
              ['regime', lang === 'es' ? 'Régimen' : 'Regime'],
              ['detector', lang === 'es' ? 'Detector' : 'Detector'],
              ['view', lang === 'es' ? 'Vista' : 'View'],
            ] as const).map(([id, text]) => (
              <button key={id} role="tab" aria-selected={section === id}
                className={`chip${section === id ? ' on' : ''}`} onClick={() => setSection(id)}>
                {text}
              </button>
            ))}
          </div>

          {section === 'truck' && (
          <div className="tv-card">
            <div className="tv-card-t">
              {lang === 'es' ? 'Camión en vivo' : 'Live truck'}
              {busy && <span className="tv-busy" aria-live="polite"> ...</span>}
            </div>
            <Select label={t('fault_kind')} value={knobs.faultKind}
              onChange={(v) => set('faultKind', v as FaultKind)}
              options={FAULT_KINDS.map((k) => [k, label(FAULT_LABEL, k, lang)])} />
            <Range label={lang === 'es' ? 'Severidad' : 'Severity'} value={knobs.severity}
              min={0.1} max={2} step={0.05} onChange={(v) => set('severity', v)}
              format={(v) => `${v.toFixed(2)}x`}
              disabled={knobs.faultKind === 'none'} />
            <Range label={lang === 'es' ? 'Inicio (fracción del registro)' : 'Onset (fraction of record)'}
              value={knobs.onsetFraction} min={0.25} max={0.8} step={0.01}
              onChange={(v) => set('onsetFraction', v)} format={(v) => v.toFixed(2)}
              disabled={knobs.faultKind === 'none'} />
            <Range label={lang === 'es' ? 'Ciclos de acarreo' : 'Haul cycles'} value={knobs.nCycles}
              min={10} max={45} step={1} onChange={(v) => set('nCycles', Math.round(v))}
              format={(v) => `${v.toFixed(0)}`} />
            <Range label={lang === 'es' ? 'Semilla' : 'Seed'} value={knobs.seed}
              min={1} max={40} step={1} onChange={(v) => set('seed', Math.round(v))}
              format={(v) => v.toFixed(0)} />
          </div>
          )}

          {section === 'regime' && (
          <div className="tv-card">
            <div className="tv-card-t">{lang === 'es' ? 'Régimen' : 'Regime'}</div>
            <Range label={lang === 'es' ? 'Regímenes (k)' : 'Regimes (k)'} value={knobs.nRegimes}
              min={1} max={10} step={1} onChange={(v) => set('nRegimes', Math.round(v))}
              format={(v) => v.toFixed(0)} />
            <Range label={lang === 'es' ? 'Radio de novedad' : 'Novelty radius'} value={knobs.noveltyFactor}
              min={0.5} max={4} step={0.1} onChange={(v) => set('noveltyFactor', v)}
              format={(v) => `${v.toFixed(1)}x`} />
            {result && (
              <div className="tv-cap">
                {lang === 'es' ? 'Cobertura' : 'Coverage'}{' '}
                <strong>{(result.labels.coverage * 100).toFixed(0)}%</strong>
                {' ; '}
                {lang === 'es' ? 'acuerdo con la verdad' : 'agreement with truth'}{' '}
                <strong>{fmt(result.regimeAgreement, 2)}</strong>
              </div>
            )}
          </div>
          )}

          {section === 'detector' && (
          <div className="tv-card">
            <div className="tv-card-t">{t('detector')}</div>
            <Select label={t('detector')} value={knobs.detector}
              onChange={(v) => set('detector', v as DetectorName)}
              options={DETECTOR_LADDER.map((d) => [d, `${d}  (${DETECTOR_NOTES[d].tier})`])} />
            {knobs.detector === 'cusum' && (
              <Range label="k (slack)" value={knobs.k} min={0} max={2} step={0.05}
                onChange={(v) => set('k', v)} format={(v) => v.toFixed(2)} />
            )}
            {knobs.detector === 'ewma' && (
              <Range label="lambda" value={knobs.lam} min={0.02} max={0.9} step={0.02}
                onChange={(v) => set('lam', v)} format={(v) => v.toFixed(2)} />
            )}
            <Range label={lang === 'es' ? 'Presupuesto (FA / camión-mes)' : 'Budget (FA / truck-month)'}
              value={knobs.budgetPerMonth} min={0.1} max={10} step={0.1}
              onChange={(v) => set('budgetPerMonth', v)} format={(v) => v.toFixed(1)} />
            <div className="tv-cap tv-muted">{DETECTOR_NOTES[knobs.detector].note}</div>
          </div>
          )}

          {section === 'view' && (
          <div className="tv-card">
            <div className="tv-card-t">{t('channel')}</div>
            <Select label={t('channel')} value={knobs.channel}
              onChange={(v) => set('channel', v as Channel)}
              options={channels.map((c) => [c, label(CHANNEL_LABEL, c, lang)
                + (result?.truck.faultChannels.includes(c) ? ' *' : '')])} />
            <div className="tv-row" style={{ marginTop: '0.4rem' }}>
              <button className="chip" onClick={() => setKnobs(DEFAULT_KNOBS)}>
                {lang === 'es' ? 'Restablecer' : 'Reset'}
              </button>
              <Link className="chip" to="/focus/live">{t('focus')}</Link>
            </div>
          </div>
          )}
        </aside>

        <main className="tv-main">
          {err ? (
            <div className="tv-err">
              <strong>{t('load_failed')}</strong>
              <div className="tv-muted" style={{ marginTop: '0.35rem', fontFamily: 'monospace' }}>{err}</div>
              <div className="tv-cap" style={{ marginTop: '0.5rem' }}>
                {lang === 'es'
                  ? 'Con k alto y pocos ciclos, ningún régimen alcanza el mínimo de muestras para ajustar '
                    + 'un residuo. Baje k o suba los ciclos.'
                  : 'With a high k and few cycles, no regime reaches the minimum sample count needed to fit '
                    + 'a residual. Lower k or raise the cycle count.'}
              </div>
            </div>
          ) : !result ? (
            <div className="tv-cap">{t('loading')}...</div>
          ) : (
            <Tabs tabs={tabs} ariaLabel={t('truck')} />
          )}
        </main>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- controls */

function Range({ label: lbl, value, min, max, step, onChange, format, disabled }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string; disabled?: boolean;
}) {
  return (
    <label className="tv-ctl" aria-disabled={disabled}>
      <span>{lbl} <strong className="tv-knobval">{format(value)}</strong></span>
      <input className="range" type="range" min={min} max={max} step={step} value={value}
        disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Select({ label: lbl, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="tv-ctl">
      <span>{lbl}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={lbl}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

/* ----------------------------------------------------------------------- panels */

function Readout({ r, note }: { r: LiveResult; note?: string }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const healthy = r.truck.onsetT === null;
  const fa = (a: 'raw' | 'residualArm') => r[a].fleet?.falseAlarmsPerUnitTime;
  return (
    <dl className="tv-readout">
      <div>
        <dt>{t('delay_raw')}</dt>
        <dd className={r.faster === 'raw' ? 'good' : undefined}>
          {healthy ? '-' : r.raw.delayMin === null ? t('no_detection') : `${fmt(r.raw.delayMin)} ${t('minutes')}`}
        </dd>
      </div>
      <div>
        <dt>{t('delay_res')}</dt>
        <dd className={r.faster === 'residual' ? 'good' : undefined}>
          {healthy ? '-' : r.residualArm.delayMin === null ? t('no_detection')
            : `${fmt(r.residualArm.delayMin)} ${t('minutes')}`}
        </dd>
      </div>
      <div>
        <dt>{t('false_alarms')}</dt>
        <dd>{r.raw.falseAlarmsBeforeOnset} / {r.residualArm.falseAlarmsBeforeOnset}</dd>
      </div>
      <div>
        <dt>{lang === 'es' ? 'FA realizadas / mes' : 'realised FA / month'}</dt>
        <dd>
          {fmt((fa('raw') ?? NaN) * MINUTES_PER_MONTH, 2)} / {fmt((fa('residualArm') ?? NaN) * MINUTES_PER_MONTH, 2)}
        </dd>
      </div>
      <div>
        <dt>{t('coverage')}</dt>
        <dd>{(r.labels.coverage * 100).toFixed(0)}%</dd>
      </div>
      <div className="tv-keys">
        <span><i style={{ borderTopColor: p.onset, borderTopWidth: 2 }} />{t('onset')}</span>
        <span><i style={{ borderTopColor: p.threshold, borderTopStyle: 'dashed' }} />{t('threshold')}</span>
        <span><i style={{ borderTopColor: p.alarm, borderTopWidth: 2 }} />{t('alarms')}</span>
        <span><i className="band" style={{ background: p.regimes[1] }} />{t('regime_band')}</span>
      </div>
      {note && <div className="tv-keynote" title={note}>{note}</div>}
      <div>
        <dt>{lang === 'es' ? 'calculado en' : 'computed in'}</dt>
        <dd>{Math.round(r.timings.simulateMs + r.timings.segmentMs + r.timings.detectMs + r.timings.scoreMs)} ms</dd>
      </div>
    </dl>
  );
}

function SignalPanel({ r, channel }: { r: LiveResult; channel: Channel }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const raw = useMemo(() => Array.from(r.truck.x[channel].slice(r.fitEnd)), [r, channel]);
  const res = useMemo(() => Array.from(r.residual[channel] ?? []), [r, channel]);
  const bands = useMemo(() => ({ regime: Array.from(r.labels.labels), t: Array.from(r.monitoredT) }),
    [r]);
  const rawSeries = useMemo(() => [{ label: t('arm_raw'), values: raw, color: p.raw, width: 1.2 }],
    [raw, p.raw, t]);
  const resSeries = useMemo(() => [{ label: t('arm_residual'), values: res, color: p.residual, width: 1.2 }],
    [res, p.residual, t]);
  return (
    <div className="tv-stage">
      <Readout r={r} note={lang === 'es'
        ? 'Arriba el canal crudo, abajo el residuo dentro del régimen. Las bandas son regímenes aprendidos del ciclo.'
        : 'Raw channel above, within-regime residual below. The bands are regimes learned from the cycle.'} />
      <TraceChart t={Array.from(r.monitoredT)} series={rawSeries} onsetT={r.truck.onsetT}
        alarmTimes={r.raw.alarmTimes} bands={bands} fill
        yLabel={label(CHANNEL_LABEL, channel, lang)} ariaLabel={`raw ${channel}`} />
      <TraceChart t={Array.from(r.monitoredT)} series={resSeries} onsetT={r.truck.onsetT}
        alarmTimes={r.residualArm.alarmTimes} bands={bands} fill
        yLabel={`${label(CHANNEL_LABEL, channel, lang)}, z`} xLabel={t('min_since_start')}
        ariaLabel={`residual ${channel}`} />
    </div>
  );
}

function DetectorPanel({ r, detector }: { r: LiveResult; detector: DetectorName }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const rawSeries = useMemo(() => [{
    label: `${detector}, ${t('arm_raw')}`, values: Array.from(r.raw.detection.statistic), color: p.raw,
  }], [r, detector, p.raw, t]);
  const resSeries = useMemo(() => [{
    label: `${detector}, ${t('arm_residual')}`, values: Array.from(r.residualArm.detection.statistic),
    color: p.residual,
  }], [r, detector, p.residual, t]);
  return (
    <div className="tv-stage">
      <Readout r={r} note={lang === 'es'
        ? 'El umbral es el de FLOTA al presupuesto elegido, calibrado sobre camiones sanos simulados junto a este.'
        : 'The threshold is the FLEET threshold at the chosen budget, calibrated on healthy trucks simulated alongside this one.'} />
      <TraceChart t={Array.from(r.raw.detection.t)} series={rawSeries}
        threshold={r.raw.threshold} thresholdLabel={t('threshold')} onsetT={r.truck.onsetT}
        alarmTimes={r.raw.alarmTimes} fill yLabel={t('statistic')} ariaLabel={`${detector} raw`} />
      <TraceChart t={Array.from(r.residualArm.detection.t)} series={resSeries}
        threshold={r.residualArm.threshold} thresholdLabel={t('threshold')} onsetT={r.truck.onsetT}
        alarmTimes={r.residualArm.alarmTimes} fill yLabel={t('statistic')}
        xLabel={t('min_since_start')} ariaLabel={`${detector} residual`} />
    </div>
  );
}

function BudgetPanel({ r }: { r: LiveResult }) {
  const lang = useLang();
  return (
    <div className="tv-stage">
      <Readout r={r} />
      <BudgetCurve r={r} />
      <Callout variant="honest" title={lang === 'es' ? 'Un punto es una elección; una curva es una medición'
        : 'One point is a choice; a curve is a measurement'}>
        {lang === 'es'
          ? 'Un método que gana solo a un presupuesto no ha ganado, así que la comparación se lee a lo '
            + 'largo de toda la curva. En la severidad por defecto (0.25) el brazo crudo no detecta a '
            + 'NINGÚN presupuesto y el condicionado detecta todo: esa separación es la afirmación central '
            + 'del producto, en el carril SINTÉTICO donde la falla está construida para confundirse con el '
            + 'régimen. Suba la severidad y ambos detectan, con el condicionado unas dos veces más rápido. '
            + '"Inalcanzable" significa que ningún umbral cumple ese presupuesto, que es un resultado real '
            + 'y no un cero.'
          : 'A method that wins only at one budget has not won, so the comparison is read across the whole '
            + 'curve. At the default severity (0.25) the raw arm detects at NO budget and the conditioned '
            + 'arm detects every truck: that separation is the central claim, on the SYNTHETIC '
            + 'lane where the fault is built to be confusable with the regime. Raise the severity and both '
            + 'detect, with the conditioned arm roughly twice as fast. "Unreachable" means no threshold '
            + 'meets that budget at all, which is a real outcome rather than a zero.'}
      </Callout>
    </div>
  );
}

function RegimesPanel({ r }: { r: LiveResult }) {
  const lang = useLang();
  const p = usePalette();
  const t = useT();
  const ctx: Channel[] = ['payload_t', 'grade_pct', 'speed_kmh'];
  return (
    <div className="tv-stage">
      <Readout r={r} />
      <RegimeStrip r={r} />
      {ctx.map((c) => {
        const values = Array.from(r.truck.x[c].slice(r.fitEnd));
        return (
          <TraceChart key={c} t={Array.from(r.monitoredT)}
            series={[{ label: label(CHANNEL_LABEL, c, lang), values, color: p.accent, width: 1.1 }]}
            bands={{ regime: Array.from(r.labels.labels), t: Array.from(r.monitoredT) }}
            onsetT={r.truck.onsetT} height={120} yLabel={label(CHANNEL_LABEL, c, lang)}
            xLabel={c === 'speed_kmh' ? t('min_since_start') : undefined} ariaLabel={`context ${c}`} />
        );
      })}
      <div className="tv-cap">
        {lang === 'es'
          ? 'Estos tres canales definen el régimen y NUNCA se monitorean. Si el régimen se definiera con '
            + 'un canal monitoreado, la segmentación absorbería la falla y el residuo quedaría plano.'
          : 'These three channels define the regime and are NEVER monitored. If a regime were defined using '
            + 'a monitored channel, the segmentation would absorb the fault and the residual would go flat.'}
      </div>
    </div>
  );
}
