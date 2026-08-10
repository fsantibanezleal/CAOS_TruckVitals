// The App: one truck, the whole pipeline, sample by sample.
//
// Every tab reacts to the truck selector, because a tab that ignores it is a slide rather than a view.
// The comparison the product exists to make is on screen at all times: the same detector, on the raw
// channel and on the within-regime residual, against the same fleet threshold and the same true onset.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Callout, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import {
  loadFleetIndex, loadFleetTrace, type FleetIndex, type FleetTrace,
} from '../lib/artifacts.ts';
import { CHANNEL_LABEL, FAULT_LABEL, label, useLang, useT } from '../lib/i18n.ts';
import {
  armsForChannel, delayOf, falseAlarmsBeforeOnset, fasterArm, fmt, regimeOccupancy,
} from '../lib/trace.ts';
import TraceChart from '../viz/TraceChart.tsx';
import { usePalette } from '../viz/theme.ts';
import PanelBoundary from '../viz/PanelBoundary.tsx';

export default function Tool() {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const [index, setIndex] = useState<FleetIndex | null>(null);
  const [unitId, setUnitId] = useState<string>('');
  const [trace, setTrace] = useState<FleetTrace | null>(null);
  const [detector, setDetector] = useState('cusum');
  const [channel, setChannel] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadFleetIndex()
      .then((ix) => {
        setIndex(ix);
        const url = new URLSearchParams(window.location.search).get('truck');
        const first = ix.units.find((u) => u.unit_id === url) || ix.units.find((u) => u.onset_t != null) || ix.units[0];
        setUnitId(first.unit_id);
        setDetector(ix.config.detectors[0]);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    if (!unitId) return;
    setTrace(null);
    loadFleetTrace(unitId)
      .then((tr) => {
        setTrace(tr);
        // Default to the channel the fault actually expresses itself in. Landing on an arbitrary channel
        // would show a reader a flat line on their first look at a truck that is visibly failing.
        setChannel((c) => (c && tr.channels[c] ? c : (tr.fault_channels[0] || 'strut_rl_bar')));
        const u = new URL(window.location.href);
        u.searchParams.set('truck', unitId);
        window.history.replaceState({}, '', u);
      })
      .catch((e) => setErr(String(e)));
  }, [unitId]);

  const row = index?.units.find((u) => u.unit_id === unitId);

  // Four tabs, one row, under the ADR-0071 bound of about six peers. Each is a genuine view of the same
  // truck rather than a meta-view of the product: the signal, the detector on it, the regimes that
  // define the residual, and the fleet the threshold was calibrated on.
  const tabs: TabDef[] = useMemo(() => {
    if (!trace) return [];
    return [
      { id: 'signal', label: t('tab_signal'),
        content: <PanelBoundary name="signal"><SignalPanel trace={trace} channel={channel} detector={detector} /></PanelBoundary> },
      { id: 'detector', label: t('tab_detector'),
        content: <PanelBoundary name="detector"><DetectorPanel trace={trace} detector={detector} /></PanelBoundary> },
      { id: 'regimes', label: t('tab_regimes'),
        content: <PanelBoundary name="regimes"><RegimesPanel trace={trace} palette={p} /></PanelBoundary> },
      { id: 'fleet', label: t('tab_fleet'),
        content: index
          ? <PanelBoundary name="fleet"><FleetPanel index={index} current={unitId} onSelect={setUnitId} /></PanelBoundary>
          : null },
    ];
  }, [trace, channel, detector, index, unitId, p, t]);

  if (err) {
    return (
      <div className="page-body">
        <div className="tv-err">
          <strong>{t('load_failed')}</strong>
          <div className="tv-muted" style={{ marginTop: '0.35rem', fontFamily: 'monospace' }}>{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body wide">
      <div className="tv-layout">
        <aside className="tv-side">
          <div className="tv-card">
            <div className="tv-card-t">{t('truck')}</div>
            <label className="tv-ctl">
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                aria-label={t('truck')}
              >
                {index && (
                  <>
                    <optgroup label={t('faulty')}>
                      {index.units.filter((u) => u.onset_t != null).map((u) => (
                        <option key={u.unit_id} value={u.unit_id}>
                          {u.unit_id} ({label(FAULT_LABEL, u.fault_kind, lang)})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('healthy')}>
                      {index.units.filter((u) => u.onset_t == null).map((u) => (
                        <option key={u.unit_id} value={u.unit_id}>{u.unit_id}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </label>
            {row && (
              <div className="tv-cap">
                {t('fault_kind')}: <strong>{label(FAULT_LABEL, row.fault_kind, lang)}</strong>
                {row.onset_t != null && <> ; {t('onset')} {fmt(row.onset_t)} {t('minutes')}</>}
              </div>
            )}
            {unitId && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link className="chip" to={`/focus/${unitId}`}>{t('focus')}</Link>
              </div>
            )}
          </div>

          <div className="tv-card">
            <div className="tv-card-t">{t('detector')}</div>
            <div className="tv-row">
              {index?.config.detectors.map((d) => (
                <button
                  key={d}
                  className={`chip${d === detector ? ' on' : ''}`}
                  onClick={() => setDetector(d)}
                  aria-pressed={d === detector}
                >{d}</button>
              ))}
            </div>
          </div>

          <div className="tv-card">
            <div className="tv-card-t">{t('channel')}</div>
            <label className="tv-ctl">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label={t('channel')}>
                {index?.config.monitored_channels.map((c) => (
                  <option key={c} value={c}>
                    {label(CHANNEL_LABEL, c, lang)}
                    {trace?.fault_channels.includes(c) ? ' *' : ''}
                  </option>
                ))}
              </select>
            </label>
            {trace && trace.fault_channels.length > 0 && (
              <div className="tv-cap tv-muted">
                * {lang === 'es'
                  ? 'canal donde la falla se expresa por construcción'
                  : 'the channel the fault expresses itself in, by construction'}
              </div>
            )}
          </div>
        </aside>

        <main className="tv-main">
          {!trace ? (
            <div className="tv-cap">{t('loading')}...</div>
          ) : (
            <Tabs tabs={tabs} ariaLabel={t('truck')} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Signal */

function SignalPanel({ trace, channel, detector }: { trace: FleetTrace; channel: string; detector: string }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const arms = useMemo(() => armsForChannel(trace, channel), [trace, channel]);
  const bands = { regime: trace.monitored.regime, t: trace.monitored.t };
  const d = trace.detectors[detector];

  return (
    <div className="tv-stage">
      <Readout trace={trace} detector={detector} />
      <TraceChart
        t={arms.t}
        series={[{ label: t('arm_raw'), values: arms.raw, color: p.raw, width: 1.2 }]}
        onsetT={trace.onset_t}
        alarmTimes={d?.raw.alarm_times}
        bands={bands}
        height={190}
        yLabel={label(CHANNEL_LABEL, channel, lang)}
        ariaLabel={`raw ${channel}`}
      />
      <TraceChart
        t={arms.t}
        series={[{ label: t('arm_residual'), values: arms.residual, color: p.residual, width: 1.2 }]}
        onsetT={trace.onset_t}
        alarmTimes={d?.residual.alarm_times}
        bands={bands}
        height={190}
        yLabel={`${label(CHANNEL_LABEL, channel, lang)}, z`}
        xLabel={t('min_since_start')}
        ariaLabel={`residual ${channel}`}
      />
      <MarkerKey />
      <div className="tv-cap">
        {lang === 'es'
          ? 'Arriba el canal crudo; abajo el residuo dentro del régimen. Las bandas de color son los regímenes '
            + 'aprendidos del ciclo de acarreo, no etiquetas inyectadas: el mismo camión cargado subiendo y '
            + 'vacío bajando son dos regímenes distintos, y la mayor parte de lo que se mueve en el canal '
            + 'crudo es ese ciclo, no la falla.'
          : 'The raw channel above, the within-regime residual below. The coloured bands are the regimes '
            + 'learned from the haul cycle rather than injected labels: the same truck loaded on a ramp and '
            + 'empty on the return is two regimes, and most of what moves in the raw channel is that cycle, '
            + 'not the fault.'}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Detector */

function DetectorPanel({ trace, detector }: { trace: FleetTrace; detector: string }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();
  const d = trace.detectors[detector];
  if (!d) return <div className="tv-cap">{t('load_failed')}</div>;

  return (
    <div className="tv-stage">
      <Readout trace={trace} detector={detector} />
      <TraceChart
        t={trace.monitored.t}
        series={[{ label: `${detector}, ${t('arm_raw')}`, values: d.raw.statistic, color: p.raw }]}
        threshold={d.raw.threshold}
        thresholdLabel={t('threshold')}
        onsetT={trace.onset_t}
        alarmTimes={d.raw.alarm_times}
        height={190}
        yLabel={t('statistic')}
        ariaLabel={`${detector} raw statistic`}
      />
      <TraceChart
        t={trace.monitored.t}
        series={[{ label: `${detector}, ${t('arm_residual')}`, values: d.residual.statistic, color: p.residual }]}
        threshold={d.residual.threshold}
        thresholdLabel={t('threshold')}
        onsetT={trace.onset_t}
        alarmTimes={d.residual.alarm_times}
        height={190}
        yLabel={t('statistic')}
        xLabel={t('min_since_start')}
        ariaLabel={`${detector} residual statistic`}
      />
      <MarkerKey />
      <Callout variant="honest">
        {lang === 'es'
          ? 'El umbral dibujado es el umbral de FLOTA al presupuesto compartido de falsas alarmas, no un '
            + 'umbral ajustado a este camión. Un umbral por camión se ajustaría al mismo registro que juzga, '
            + 'que es la forma más común en que este tipo de gráfico se favorece a sí mismo.'
          : 'The threshold drawn is the FLEET threshold at the shared false-alarm budget, not a threshold '
            + 'fitted to this truck. A per-truck threshold would be fitted on the very record it is judging, '
            + 'which is the most common way this kind of chart flatters itself.'}
      </Callout>
    </div>
  );
}

/* ----------------------------------------------------------------- Regimes */

function RegimesPanel({ trace, palette }: { trace: FleetTrace; palette: ReturnType<typeof usePalette> }) {
  const lang = useLang();
  const occ = useMemo(() => regimeOccupancy(trace.monitored.regime), [trace]);
  const keys = [...occ.keys()].sort((a, b) => a - b);
  const contextChannels = ['payload_t', 'grade_pct', 'speed_kmh'];
  const arms = contextChannels.map((c) => ({ c, arm: armsForChannel(trace, c) }));

  return (
    <div className="tv-stage">
      <div className="tv-readout">
        {keys.map((k) => (
          <div key={k}>
            <dt>{k < 0 ? (lang === 'es' ? 'sin asignar' : 'unassigned') : `${lang === 'es' ? 'régimen' : 'regime'} ${k}`}</dt>
            <dd>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 6,
                background: k < 0 ? 'transparent' : palette.regimes[k % palette.regimes.length],
                border: `1px solid ${palette.border}`,
              }} />
              {(occ.get(k)! * 100).toFixed(1)}%
            </dd>
          </div>
        ))}
      </div>
      {arms.map(({ c, arm }) => (
        <TraceChart
          key={c}
          t={arm.t}
          series={[{ label: label(CHANNEL_LABEL, c, lang), values: arm.raw, color: palette.accent, width: 1.1 }]}
          bands={{ regime: trace.monitored.regime, t: trace.monitored.t }}
          onsetT={trace.onset_t}
          height={140}
          yLabel={label(CHANNEL_LABEL, c, lang)}
          xLabel={c === 'speed_kmh' ? (lang === 'es' ? 'minutos' : 'minutes') : undefined}
          ariaLabel={`context ${c}`}
        />
      ))}
      <div className="tv-cap">
        {lang === 'es'
          ? 'Estos tres canales de contexto (carga, pendiente, velocidad) son los que definen el régimen. '
            + 'No se monitorean para detectar fallas: se usan para preguntar "¿comparado con qué?" antes de '
            + 'decidir si un valor es anómalo. La cobertura de este camión es '
          : 'These three context channels (payload, grade, speed) are what define the regime. They are not '
            + 'monitored for faults: they are used to ask "compared with what?" before deciding whether a '
            + 'value is anomalous. This truck\'s coverage is '}
        <strong>{(trace.monitored.regime_coverage * 100).toFixed(0)}%</strong>
        {lang === 'es'
          ? ', la fracción del tiempo monitoreado que cae en un régimen visto en la línea base. El resto queda sin asignar y nunca se fuerza al régimen más cercano.'
          : ', the fraction of monitored time falling in a regime seen during the baseline. The rest stays unassigned and is never snapped to the nearest regime.'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Fleet */

function FleetPanel({ index, current, onSelect }: {
  index: FleetIndex; current: string; onSelect: (id: string) => void;
}) {
  const lang = useLang();
  const t = useT();
  const [rows, setRows] = useState<Record<string, FleetTrace>>({});

  // The fleet table needs every truck's delays, so it fetches them all. Deliberately only on this tab:
  // the other three need one truck, and making the first paint wait on fourteen records would be paying
  // the cost of this tab on every visit.
  useEffect(() => {
    let cancelled = false;
    Promise.all(index.units.map((u) => loadFleetTrace(u.unit_id).then((tr) => [u.unit_id, tr] as const)))
      .then((pairs) => { if (!cancelled) setRows(Object.fromEntries(pairs)); })
      .catch(() => { /* the per-row cells fall back to a dash */ });
    return () => { cancelled = true; };
  }, [index]);

  const dets = index.config.detectors;
  return (
    <div className="tv-stage">
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{t('truck')}</th>
              <th>{t('fault_kind')}</th>
              {dets.map((d) => <th key={d} colSpan={2}>{d}</th>)}
            </tr>
            <tr>
              <th /><th />
              {dets.map((d) => (
                <>
                  <th key={`${d}-r`} style={{ fontWeight: 400 }}>raw</th>
                  <th key={`${d}-s`} style={{ fontWeight: 400 }}>res</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {index.units.map((u) => {
              const tr = rows[u.unit_id];
              return (
                <tr
                  key={u.unit_id}
                  className={u.unit_id === current ? 'hl' : undefined}
                  onClick={() => onSelect(u.unit_id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{u.unit_id}</td>
                  <td>{label(FAULT_LABEL, u.fault_kind, lang)}</td>
                  {dets.map((d) => {
                    if (!tr) return <><td key={`${d}r`}>-</td><td key={`${d}s`}>-</td></>;
                    const r = delayOf(tr, d, 'raw');
                    const s = delayOf(tr, d, 'residual');
                    const faster = fasterArm(tr, d);
                    return (
                      <>
                        <td key={`${d}r`} className={faster === 'raw' ? 'win' : undefined}>
                          {u.onset_t == null ? '-' : fmt(r, 0, 'never')}
                        </td>
                        <td key={`${d}s`} className={faster === 'residual' ? 'win' : undefined}>
                          {u.onset_t == null ? '-' : fmt(s, 0, 'never')}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tv-cap">
        {lang === 'es'
          ? 'Retardo de detección en minutos tras el inicio real; menor es mejor, verde marca el brazo más '
            + 'rápido y "never" significa que el detector nunca disparó despues del inicio con ese umbral. '
            + 'Los camiones sanos no tienen inicio, asi que no pueden ser detectados: existen para medir la '
            + 'tasa de falsas alarmas. Note que el condicionamiento no gana siempre.'
          : 'Detection delay in minutes after the true onset; lower is better, green marks the faster arm, '
            + 'and "never" means the detector never fired after the onset at that threshold. Healthy trucks '
            + 'have no onset and so cannot be detected: they exist to measure the false-alarm rate. Note '
            + 'that conditioning does not win everywhere.'}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- shared pieces */

function Readout({ trace, detector }: { trace: FleetTrace; detector: string }) {
  const t = useT();
  const lang = useLang();
  const r = delayOf(trace, detector, 'raw');
  const s = delayOf(trace, detector, 'residual');
  const faster = fasterArm(trace, detector);
  const healthy = trace.onset_t == null;

  return (
    <dl className="tv-readout">
      <div>
        <dt>{t('delay_raw')}</dt>
        <dd className={faster === 'raw' ? 'good' : undefined}>
          {healthy ? '-' : (r == null ? t('no_detection') : `${fmt(r)} ${t('minutes')}`)}
        </dd>
      </div>
      <div>
        <dt>{t('delay_res')}</dt>
        <dd className={faster === 'residual' ? 'good' : undefined}>
          {healthy ? '-' : (s == null ? t('no_detection') : `${fmt(s)} ${t('minutes')}`)}
        </dd>
      </div>
      <div>
        <dt>{t('which_faster')}</dt>
        <dd>{healthy ? t('no_fault') : (faster == null ? t('tie') : t(faster === 'raw' ? 'arm_raw' : 'arm_residual'))}</dd>
      </div>
      <div>
        <dt>{t('false_alarms')} ({lang === 'es' ? 'crudo / residuo' : 'raw / residual'})</dt>
        <dd>
          {falseAlarmsBeforeOnset(trace, detector, 'raw')} / {falseAlarmsBeforeOnset(trace, detector, 'residual')}
        </dd>
      </div>
      <div>
        <dt>{t('coverage')}</dt>
        <dd>{(trace.monitored.regime_coverage * 100).toFixed(0)}%</dd>
      </div>
    </dl>
  );
}

function MarkerKey() {
  const t = useT();
  const p = usePalette();
  return (
    <div className="tv-keys">
      <span><i style={{ borderTopColor: p.onset, borderTopWidth: 2 }} />{t('onset')}</span>
      <span><i style={{ borderTopColor: p.threshold, borderTopStyle: 'dashed' }} />{t('threshold')}</span>
      <span><i style={{ borderTopColor: p.alarm, borderTopWidth: 2 }} />{t('alarms')}</span>
      <span><i className="band" style={{ background: p.regimes[1] }} />{t('regime_band')}</span>
    </div>
  );
}
