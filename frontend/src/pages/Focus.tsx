// ADR-0070 focus route: one truck, one comparison, the stage owning the viewport.
//
// This renders OUTSIDE AppShell on purpose. The shell header and footer are about 150px of chrome, and
// on a focus route the instrument is required to hold at least 80% of the viewport, which that chrome
// makes arithmetically impossible. Everything needed to read the chart moves into one thin bar.

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadFleetIndex, loadFleetTrace, type FleetIndex, type FleetTrace } from '../lib/artifacts.ts';
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
  const [index, setIndex] = useState<FleetIndex | null>(null);
  const [trace, setTrace] = useState<FleetTrace | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const detector = params.get('det') || 'cusum';
  const view = params.get('view') || 'detector';

  useEffect(() => { loadFleetIndex().then(setIndex).catch((e) => setErr(String(e))); }, []);
  useEffect(() => {
    if (!unitId) return;
    loadFleetTrace(unitId).then(setTrace).catch((e) => setErr(String(e)));
  }, [unitId]);

  const channel = params.get('ch') || trace?.fault_channels[0] || 'strut_rl_bar';

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  if (err) return <div className="tv-focus"><div className="tv-err">{t('load_failed')} {err}</div></div>;
  if (!trace || !index) return <div className="tv-focus"><div className="tv-focus-stage">{t('loading')}...</div></div>;

  const d = trace.detectors[detector];
  const arms = armsForChannel(trace, channel);
  const faster = fasterArm(trace, detector);

  const rawSeries = view === 'detector'
    ? { label: `${detector}, ${t('arm_raw')}`, values: d.raw.statistic, color: p.raw }
    : { label: t('arm_raw'), values: arms.raw, color: p.raw };
  const resSeries = view === 'detector'
    ? { label: `${detector}, ${t('arm_residual')}`, values: d.residual.statistic, color: p.residual }
    : { label: t('arm_residual'), values: arms.residual, color: p.residual };

  return (
    <div className="tv-focus">
      <div className="tv-focus-bar">
        <Link className="chip" to={`/?truck=${unitId}`}>{t('back')}</Link>
        <strong>{unitId}</strong>
        <span className="tv-muted">{label(FAULT_LABEL, trace.fault_kind, lang)}</span>
        <select value={detector} onChange={(e) => set('det', e.target.value)} aria-label={t('detector')}>
          {index.config.detectors.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={view} onChange={(e) => set('view', e.target.value)} aria-label={t('statistic')}>
          <option value="detector">{t('statistic')}</option>
          <option value="signal">{t('channel')}</option>
        </select>
        {view === 'signal' && (
          <select value={channel} onChange={(e) => set('ch', e.target.value)} aria-label={t('channel')}>
            {index.config.monitored_channels.map((c) => (
              <option key={c} value={c}>{label(CHANNEL_LABEL, c, lang)}</option>
            ))}
          </select>
        )}
        <span className="spacer" />
        <span>
          {t('delay_raw')} <strong className={faster === 'raw' ? 'good' : undefined}>
            {trace.onset_t == null ? '-' : (delayOf(trace, detector, 'raw') == null ? t('no_detection') : `${fmt(delayOf(trace, detector, 'raw'))} min`)}
          </strong>
          {'  |  '}
          {t('delay_res')} <strong className={faster === 'residual' ? 'good' : undefined}>
            {trace.onset_t == null ? '-' : (delayOf(trace, detector, 'residual') == null ? t('no_detection') : `${fmt(delayOf(trace, detector, 'residual'))} min`)}
          </strong>
        </span>
      </div>

      <div className="tv-focus-stage">
        <TraceChart
          t={view === 'detector' ? trace.monitored.t : arms.t}
          series={[rawSeries]}
          threshold={view === 'detector' ? d.raw.threshold : null}
          thresholdLabel={t('threshold')}
          onsetT={trace.onset_t}
          alarmTimes={d.raw.alarm_times}
          bands={view === 'signal' ? { regime: trace.monitored.regime, t: trace.monitored.t } : null}
          height={260}
          yLabel={view === 'detector' ? t('statistic') : label(CHANNEL_LABEL, channel, lang)}
          ariaLabel="focus raw arm"
        />
        <TraceChart
          t={view === 'detector' ? trace.monitored.t : arms.t}
          series={[resSeries]}
          threshold={view === 'detector' ? d.residual.threshold : null}
          thresholdLabel={t('threshold')}
          onsetT={trace.onset_t}
          alarmTimes={d.residual.alarm_times}
          bands={view === 'signal' ? { regime: trace.monitored.regime, t: trace.monitored.t } : null}
          height={260}
          yLabel={view === 'detector' ? t('statistic') : `${label(CHANNEL_LABEL, channel, lang)}, z`}
          xLabel={t('min_since_start')}
          ariaLabel="focus residual arm"
        />
      </div>
    </div>
  );
}
