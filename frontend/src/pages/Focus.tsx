// ADR-0070 focus route: one truck, one comparison, the stage owning the viewport.
//
// This renders OUTSIDE AppShell on purpose. The shell header and footer are about 150px of chrome, and a
// focus route is required to give the instrument at least 80% of the viewport, which that chrome makes
// arithmetically impossible. Everything needed to read the chart moves into one thin bar.
//
// Two sources, one view. `/focus/live` re-runs the live engine from the URL, so a link carries the whole
// configuration and lands the reader on exactly what the sender was looking at. `/focus/<unitId>` opens a
// truck from the committed 14-truck fleet, which is the reproducible anchor.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { loadFleetIndex, loadFleetTrace, type FleetIndex, type FleetTrace } from '../lib/artifacts.ts';
import { DETECTOR_LADDER, type DetectorName } from '../engine/detectors.ts';
import { FAULT_KINDS, MONITORED_CHANNELS, type Channel, type FaultKind } from '../engine/haulcycle.ts';
import { runLive, type LiveResult } from '../engine/live.ts';
import { CHANNEL_LABEL, FAULT_LABEL, label, useLang, useT } from '../lib/i18n.ts';
import { armsForChannel, delayOf, fasterArm, fmt } from '../lib/trace.ts';
import TraceChart from '../viz/TraceChart.tsx';
import { usePalette } from '../viz/theme.ts';

export default function Focus() {
  const { unitId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const isLive = unitId === 'live';

  const detector = (params.get('det') || 'cusum') as DetectorName;
  const view = params.get('view') || 'detector';
  const faultKind = (params.get('fault') || 'strut_leak') as FaultKind;
  const severity = Number(params.get('sev') || 0.25);
  const seed = Number(params.get('seed') || 1);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  /* ------------------------------------------------------------------ live */
  const live: LiveResult | null = useMemo(() => {
    if (!isLive) return null;
    try {
      return runLive({ detector, sim: { faultKind, severity, seed, nCycles: 24 } });
    } catch {
      return null;
    }
  }, [isLive, detector, faultKind, severity, seed]);

  /* ----------------------------------------------------------------- baked */
  const [index, setIndex] = useState<FleetIndex | null>(null);
  const [trace, setTrace] = useState<FleetTrace | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (isLive) return;
    loadFleetIndex().then(setIndex).catch((e) => setErr(String(e)));
    loadFleetTrace(unitId).then(setTrace).catch((e) => setErr(String(e)));
  }, [isLive, unitId]);

  if (err) return <div className="tv-focus"><div className="tv-err">{t('load_failed')} {err}</div></div>;
  if (isLive && !live) {
    return (
      <div className="tv-focus">
        <div className="tv-focus-stage">
          <div className="tv-err">
            {lang === 'es'
              ? 'Esta configuración no deja ningún régimen con muestras suficientes para ajustar un residuo.'
              : 'This configuration leaves no regime with enough samples to fit a residual.'}
          </div>
        </div>
      </div>
    );
  }
  if (!isLive && (!trace || !index)) {
    return <div className="tv-focus"><div className="tv-focus-stage">{t('loading')}...</div></div>;
  }

  const channel = (params.get('ch')
    || (isLive ? live!.truck.faultChannels[0] : trace!.fault_channels[0])
    || 'strut_rl_bar') as Channel;

  // One shape for both sources, so the chart below does not care where the numbers came from.
  const shown = isLive
    ? {
      faultKind: live!.truck.faultKind as string,
      onsetT: live!.truck.onsetT,
      detT: Array.from(live!.raw.detection.t),
      rawStat: Array.from(live!.raw.detection.statistic),
      resStat: Array.from(live!.residualArm.detection.statistic),
      rawTh: live!.raw.threshold,
      resTh: live!.residualArm.threshold,
      rawAlarms: live!.raw.alarmTimes,
      resAlarms: live!.residualArm.alarmTimes,
      sigT: Array.from(live!.monitoredT),
      rawSig: Array.from(live!.truck.x[channel].slice(live!.fitEnd)),
      resSig: Array.from(live!.residual[channel] ?? []),
      bands: { regime: Array.from(live!.labels.labels), t: Array.from(live!.monitoredT) },
      rawDelay: live!.raw.delayMin,
      resDelay: live!.residualArm.delayMin,
      faster: live!.faster,
    }
    : (() => {
      const d = trace!.detectors[detector] ?? trace!.detectors.cusum;
      const arms = armsForChannel(trace!, channel);
      return {
        faultKind: trace!.fault_kind,
        onsetT: trace!.onset_t,
        detT: trace!.monitored.t,
        rawStat: d.raw.statistic as (number | null)[],
        resStat: d.residual.statistic as (number | null)[],
        rawTh: d.raw.threshold,
        resTh: d.residual.threshold,
        rawAlarms: d.raw.alarm_times,
        resAlarms: d.residual.alarm_times,
        sigT: arms.t,
        rawSig: arms.raw,
        resSig: arms.residual,
        bands: { regime: trace!.monitored.regime, t: trace!.monitored.t },
        rawDelay: delayOf(trace!, detector, 'raw'),
        resDelay: delayOf(trace!, detector, 'residual'),
        faster: fasterArm(trace!, detector),
      };
    })();

  const detectors = isLive ? DETECTOR_LADDER : (index?.config.detectors ?? ['cusum']);
  const channels = isLive ? MONITORED_CHANNELS : (index?.config.monitored_channels ?? []);

  return (
    <div className="tv-focus">
      <div className="tv-focus-bar">
        <Link className="chip" to={isLive ? '/' : `/?truck=${unitId}`}>{t('back')}</Link>
        <strong>{isLive ? (lang === 'es' ? 'en vivo' : 'live') : unitId}</strong>
        <span className="tv-muted">{label(FAULT_LABEL, shown.faultKind, lang)}</span>

        <select value={detector} onChange={(e) => set('det', e.target.value)} aria-label={t('detector')}>
          {detectors.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={view} onChange={(e) => set('view', e.target.value)} aria-label={t('statistic')}>
          <option value="detector">{t('statistic')}</option>
          <option value="signal">{t('channel')}</option>
        </select>
        {view === 'signal' && (
          <select value={channel} onChange={(e) => set('ch', e.target.value)} aria-label={t('channel')}>
            {channels.map((c) => <option key={c} value={c}>{label(CHANNEL_LABEL, c, lang)}</option>)}
          </select>
        )}
        {isLive && (
          <>
            <select value={faultKind} onChange={(e) => set('fault', e.target.value)}
              aria-label={t('fault_kind')}>
              {FAULT_KINDS.map((k) => <option key={k} value={k}>{label(FAULT_LABEL, k, lang)}</option>)}
            </select>
            <label className="tv-focus-knob">
              {lang === 'es' ? 'sev' : 'sev'}
              <input className="range" type="range" min={0.1} max={2} step={0.05} value={severity}
                onChange={(e) => set('sev', e.target.value)} aria-label="severity" />
              <strong>{severity.toFixed(2)}x</strong>
            </label>
          </>
        )}

        <span className="spacer" />
        <span>
          {t('delay_raw')}{' '}
          <strong className={shown.faster === 'raw' ? 'good' : undefined}>
            {shown.onsetT === null ? '-' : shown.rawDelay === null ? t('no_detection') : `${fmt(shown.rawDelay)} min`}
          </strong>
          {'  |  '}
          {t('delay_res')}{' '}
          <strong className={shown.faster === 'residual' ? 'good' : undefined}>
            {shown.onsetT === null ? '-' : shown.resDelay === null ? t('no_detection') : `${fmt(shown.resDelay)} min`}
          </strong>
        </span>
      </div>

      <div className="tv-focus-stage">
        <TraceChart
          t={view === 'detector' ? shown.detT : shown.sigT}
          series={[{
            label: view === 'detector' ? `${detector}, ${t('arm_raw')}` : t('arm_raw'),
            values: view === 'detector' ? shown.rawStat : shown.rawSig,
            color: p.raw,
          }]}
          threshold={view === 'detector' ? shown.rawTh : null}
          thresholdLabel={t('threshold')}
          onsetT={shown.onsetT}
          alarmTimes={shown.rawAlarms}
          bands={view === 'signal' ? shown.bands : null}
          fill
          yLabel={view === 'detector' ? t('statistic') : label(CHANNEL_LABEL, channel, lang)}
          ariaLabel="focus raw arm"
        />
        <TraceChart
          t={view === 'detector' ? shown.detT : shown.sigT}
          series={[{
            label: view === 'detector' ? `${detector}, ${t('arm_residual')}` : t('arm_residual'),
            values: view === 'detector' ? shown.resStat : shown.resSig,
            color: p.residual,
          }]}
          threshold={view === 'detector' ? shown.resTh : null}
          thresholdLabel={t('threshold')}
          onsetT={shown.onsetT}
          alarmTimes={shown.resAlarms}
          bands={view === 'signal' ? shown.bands : null}
          fill
          yLabel={view === 'detector' ? t('statistic') : `${label(CHANNEL_LABEL, channel, lang)}, z`}
          xLabel={t('min_since_start')}
          ariaLabel="focus residual arm"
        />
      </div>
    </div>
  );
}
