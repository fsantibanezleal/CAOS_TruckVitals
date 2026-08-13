// The BAKED fleet: the 14-truck run the committed artifacts were measured on.
//
// The rest of the App is live, which makes it explorable and makes every number depend on the knobs.
// This tab is the anchor: a fixed fleet, computed by the Python pipeline, committed to the repo, and
// identical for every reader. Without it "live" would mean "unreproducible".

import { useEffect, useState } from 'react';
import { loadFleetIndex, loadFleetTrace, type FleetIndex, type FleetTrace } from '../lib/artifacts.ts';
import { FAULT_LABEL, label, useLang, useT } from '../lib/i18n.ts';
import { delayOf, fasterArm, fmt } from '../lib/trace.ts';

export default function FleetPanel() {
  const t = useT();
  const lang = useLang();
  const [index, setIndex] = useState<FleetIndex | null>(null);
  const [rows, setRows] = useState<Record<string, FleetTrace>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFleetIndex()
      .then((ix) => {
        if (cancelled) return;
        setIndex(ix);
        return Promise.all(ix.units.map((u) =>
          loadFleetTrace(u.unit_id).then((tr) => [u.unit_id, tr] as const)));
      })
      .then((pairs) => { if (pairs && !cancelled) setRows(Object.fromEntries(pairs)); })
      .catch((e) => { if (!cancelled) setErr(String(e)); });
    return () => { cancelled = true; };
  }, []);

  if (err) return <div className="tv-err">{t('load_failed')} {err}</div>;
  if (!index) return <div className="tv-cap">{t('loading')}...</div>;

  const dets = index.config.detectors;
  return (
    <div className="tv-stage">
      <dl className="tv-readout">
        <div>
          <dt>{lang === 'es' ? 'Flota horneada' : 'Baked fleet'}</dt>
          <dd>{index.config.n_units_kept} {lang === 'es' ? 'camiones' : 'trucks'}</dd>
        </div>
        <div>
          <dt>{lang === 'es' ? 'Presupuesto' : 'Budget'}</dt>
          <dd>{index.config.budget_per_truck_month} FA / {lang === 'es' ? 'camión-mes' : 'truck-month'}</dd>
        </div>
        <div>
          <dt>{lang === 'es' ? 'Motor' : 'Engine'}</dt>
          <dd>regimecpd {index.regimecpd_version}</dd>
        </div>
        <div className="tv-keynote">
          {lang === 'es'
            ? 'Esta pestaña NO es en vivo: es la corrida fija que produjo los artefactos versionados, '
              + 'idéntica para todo lector. Es el ancla de reproducibilidad del resto de la App.'
            : 'This tab is NOT live: it is the fixed run that produced the committed artifacts, identical '
              + 'for every reader. It is what anchors the rest of the App to something reproducible.'}
        </div>
      </dl>

      <div className="tv-tablewrap" style={{ overflowY: 'auto' }}>
        <table className="tv-table">
          <thead>
            <tr>
              <th>{t('truck')}</th>
              <th>{t('fault_kind')}</th>
              {dets.map((d) => <th key={d} colSpan={2}>{d}</th>)}
            </tr>
            <tr>
              <th /><th />
              {dets.flatMap((d) => [
                <th key={`${d}-r`} style={{ fontWeight: 400 }}>raw</th>,
                <th key={`${d}-s`} style={{ fontWeight: 400 }}>res</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {index.units.map((u) => {
              const tr = rows[u.unit_id];
              return (
                <tr key={u.unit_id}>
                  <td>{u.unit_id}</td>
                  <td>{label(FAULT_LABEL, u.fault_kind, lang)}</td>
                  {dets.flatMap((d) => {
                    if (!tr) return [<td key={`${d}r`}>-</td>, <td key={`${d}s`}>-</td>];
                    const faster = fasterArm(tr, d);
                    const cell = (arm: 'raw' | 'residual', key: string) => (
                      <td key={key} className={faster === arm ? 'win' : undefined}>
                        {u.onset_t == null ? '-' : fmt(delayOf(tr, d, arm), 0, 'never')}
                      </td>
                    );
                    return [cell('raw', `${d}r`), cell('residual', `${d}s`)];
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
            + 'rápido, "never" significa que el detector nunca disparó tras el inicio a ese umbral. Los '
            + 'camiones sanos no tienen inicio: existen para medir la tasa de falsas alarmas. El '
            + 'condicionamiento NO gana en todas partes, y eso se muestra en vez de esconderse.'
          : 'Detection delay in minutes after the true onset; lower is better, green marks the faster arm, '
            + '"never" means the detector never fired after the onset at that threshold. Healthy trucks '
            + 'have no onset: they exist to measure the false-alarm rate. Conditioning does NOT win '
            + 'everywhere, and that is shown rather than hidden.'}
      </div>
    </div>
  );
}
