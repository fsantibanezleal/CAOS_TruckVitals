// Benchmark: the full detector ladder on the synthetic lane, and the two real SCANIA cost lanes.
//
// One rung (BOCPD) detects nothing on either arm and ADWIN barely detects on one. They are shown rather
// than dropped: a ladder that only lists the rungs that worked is a leaderboard, and the reason each one
// struggles is stated in the artifact by the engine's own documentation.

import { Callout, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import {
  loadAps, loadComponentX, loadSynthetic,
  type ApsCost, type ComponentX, type SyntheticBenchmark,
} from '../lib/artifacts.ts';
import { n, useArtifact } from '../lib/useArtifact.ts';
import { useLang } from '../lib/i18n.ts';
import BakedBudgetCurves from '../viz/BakedBudgetCurves.tsx';
import PanelBoundary from '../viz/PanelBoundary.tsx';

export default function Benchmark() {
  const es = useLang() === 'es';
  const tabs: TabDef[] = [
    { id: 'ladder', label: es ? 'Escalera' : 'Ladder', content: <PanelBoundary name="ladder"><Ladder es={es} /></PanelBoundary> },
    { id: 'aps', label: 'SCANIA APS', content: <PanelBoundary name="aps"><Aps es={es} /></PanelBoundary> },
    { id: 'cx', label: 'Component X', content: <PanelBoundary name="cx"><Cx es={es} /></PanelBoundary> },
  ];
  return (
    <div className="page-body tv-prose">
      <h1>Benchmark</h1>
      <p className="lead">
        {es
          ? 'La escalera completa de detectores sobre la flota sintética, y las dos decisiones de costo '
            + 'sobre datos reales de SCANIA. Dos de los tres resultados de esta página no son sobre '
            + 'regímenes en absoluto.'
          : 'The full detector ladder on the synthetic fleet, and the two cost decisions on real SCANIA '
            + 'data. Two of the three findings on this page are not about regimes at all.'}
      </p>
      <Tabs tabs={tabs} ariaLabel="Benchmark" />
    </div>
  );
}

function Ladder({ es }: { es: boolean }) {
  const { data, error } = useArtifact<SyntheticBenchmark>(loadSynthetic);
  if (error) return <div className="tv-err">{error}</div>;
  if (!data) return <p className="tv-muted">{es ? 'Cargando...' : 'Loading...'}</p>;

  const detectors = [...new Set(data.arms.map((a) => a.detector))];
  const byKey = new Map(data.arms.map((a) => [`${a.detector}:${a.arm}`, a]));
  const TIER: Record<string, string> = {
    shewhart: 'classical', cusum: 'classical', ewma: 'classical', 'page-hinkley': 'classical',
    'pca-spe': 'multivariate', 'pca-t2': 'multivariate',
    bocpd: 'sota', kswin: 'sota', adwin: 'sota',
    'isolation-forest': 'learned', 'one-class-svm': 'learned', autoencoder: 'learned',
  };
  const helped = detectors.filter((d) => {
    const r = byKey.get(`${d}:raw`);
    const s = byKey.get(`${d}:residual`);
    return r && s && s.detection_rate > r.detection_rate + 0.01;
  });
  const hurt = detectors.filter((d) => {
    const r = byKey.get(`${d}:raw`);
    const s = byKey.get(`${d}:residual`);
    return r && s && r.detection_rate > s.detection_rate + 0.01;
  });

  return (
    <div className="tv-prose">
      <p>
        {es
          ? 'Cada peldaño corre sobre AMBOS brazos, con el mismo presupuesto de falsas alarmas por '
            + 'camión-mes. PELT y mSTAMP no aparecen, por la misma razón: son retrospectivos (el perfil '
            + 'de mSTAMP se calcula contra coincidencias en cualquier parte del registro, incluidas las '
            + 'posteriores), y ponerlos en una métrica de detección en línea puntuaría métodos que ya '
            + 'leyeron el futuro.'
          : 'Every rung runs on BOTH arms, at the same false-alarm budget per truck-month. PELT and mSTAMP '
            + 'are absent, for the same reason: both are retrospective (the mSTAMP profile is computed '
            + 'against matches anywhere in the record, including after the window), and putting them on an '
            + 'online detection metric would score methods that had already read the future.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Nivel' : 'Tier'}</th>
              <th>{es ? 'Detector' : 'Detector'}</th>
              <th>{es ? 'Detección, crudo' : 'Detection, raw'}</th>
              <th>{es ? 'Detección, residuo' : 'Detection, residual'}</th>
              <th>{es ? 'Retardo, crudo' : 'Delay, raw'}</th>
              <th>{es ? 'Retardo, residuo' : 'Delay, residual'}</th>
              <th>{es ? 'FA/mes, crudo' : 'FA/month, raw'}</th>
              <th>{es ? 'FA/mes, residuo' : 'FA/month, residual'}</th>
            </tr>
          </thead>
          <tbody>
            {detectors.map((d) => {
              const raw = byKey.get(`${d}:raw`);
              const res = byKey.get(`${d}:residual`);
              const dead = (raw?.detection_rate ?? 0) === 0 && (res?.detection_rate ?? 0) === 0;
              return (
                <tr key={d} className={TIER[d] === 'learned' ? 'hl' : undefined}>
                  <td className="tv-muted">{TIER[d] ?? '-'}</td>
                  <td>{d}{dead ? ' *' : ''}</td>
                  <td className={(raw?.detection_rate ?? 0) > (res?.detection_rate ?? 0) ? 'win' : undefined}>
                    {n(raw?.detection_rate)}
                  </td>
                  <td className={(res?.detection_rate ?? 0) > (raw?.detection_rate ?? 0) ? 'win' : undefined}>
                    {n(res?.detection_rate)}
                  </td>
                  <td>{raw?.median_delay_min == null ? '-' : n(raw.median_delay_min, 0)}</td>
                  <td>{res?.median_delay_min == null ? '-' : n(res.median_delay_min, 0)}</td>
                  <td>{n(raw?.fa_per_truck_month, 3)}</td>
                  <td>{n(res?.fa_per_truck_month, 3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tv-cap">
        * {es
          ? 'no detecta nada en ninguno de los dos brazos. Se muestra igual: una escalera que solo lista '
            + 'los peldaños que funcionaron es una tabla de posiciones. El motivo de cada fallo está '
            + 'documentado por el propio motor.'
          : 'detects nothing on either arm. Shown anyway: a ladder that lists only the rungs that worked '
            + 'is a leaderboard. The reason for each failure is documented by the engine itself.'}
        {data.ladder_declared && data.ladder_run && (
          <>
            {' '}{es ? 'Escalera: ' : 'Ladder: '}
            <strong>{data.ladder_run.length}</strong>
            {es ? ' de ' : ' of '}
            <strong>{data.ladder_declared.length}</strong>
            {es ? ' peldaños ejecutados.' : ' rungs run.'}
          </>
        )}
      </p>

      {data.skipped_rungs && Object.keys(data.skipped_rungs).length > 0 && (
        <Callout variant="honest" title={es ? 'Peldaños NO ejecutados' : 'Rungs that did NOT run'}>
          {es
            ? 'Declarados en la escalera pero no ejecutados en este horneado, porque un backend opcional '
              + 'no estaba instalado. Se listan en vez de desaparecer: una tabla más corta se lee como una '
              + 'escalera que nunca los tuvo.'
            : 'Declared in the ladder but not run in this bake, because an optional backend was not '
              + 'installed. Listed rather than dropped: a shorter table reads as a ladder that never had '
              + 'them.'}
          <ul>
            {Object.entries(data.skipped_rungs).map(([rung, why]) => (
              <li key={rung}><strong>{rung}</strong>: {String(why).split(/\r?\n/)[0]}</li>
            ))}
          </ul>
        </Callout>
      )}

      <BakedBudgetCurves data={data} es={es} />

      <Callout variant="strong" title={es
        ? `El condicionamiento ayuda en ${helped.length}, perjudica en ${hurt.length}`
        : `Conditioning helps ${helped.length} rungs and HURTS ${hurt.length}`}>
        {es
          ? 'Y los que perjudica son modelos APRENDIDOS de novedad: '
          : 'And the ones it hurts are LEARNED novelty models: '}
        <strong>{hurt.join(', ') || '-'}</strong>.
        {es
          ? ' Eso es un contraejemplo a la tesis de este producto y se reporta como tal. Hipótesis, no '
            + 'resultado: un modelo de novedad aprende la FORMA de lo normal, y en el brazo crudo esa forma '
            + 'son unos pocos grupos compactos de régimen, así que cualquier cosa fuera de un grupo es fácil '
            + 'de aislar. El condicionamiento reemplaza esos grupos por una sola nube isotrópica, y un '
            + 'desplazamiento moderado se queda dentro. La estructura que el residuo elimina es la que el '
            + 'bosque de aislamiento estaba usando.'
          : ' That is a counter-example to the central thesis here and it is reported as one. A '
            + 'hypothesis, not a result: a novelty model learns the SHAPE of normal, and on the raw arm '
            + 'that shape is a handful of tight regime clusters, so anything off-cluster is easy to '
            + 'isolate. Conditioning replaces them with one roughly isotropic blob and a moderate shift '
            + 'stays inside it. The structure the residual removes is structure isolation forest was '
            + 'using.'}
      </Callout>

      <Callout variant="honest" title={es ? 'Lo que NO lo explica' : 'What does NOT explain it'}>
        {es
          ? 'La explicación obvia sería el hueco de muestras sin asignar: estos peldaños apilan una ventana '
            + 'de 10 muestras y una sola muestra sin asignar descarta la ventana entera. La cobertura de '
            + 'régimen en esta corrida es 0.998, así que casi no hay huecos que culpar. Comprobarlo fue la '
            + 'diferencia entre una explicación y una suposición.'
          : 'The obvious explanation would be the unassigned-sample gap: these rungs stack a 10-sample '
            + 'window and one unassigned sample drops the whole window. Regime coverage on this run is '
            + '0.998, so there are almost no gaps to blame. Checking that was the difference between an '
            + 'explanation and a guess.'}
      </Callout>

      <Callout variant="honest" title={es ? 'Ninguna afirmación sobre falsas alarmas' : 'No false-alarm claim'}>
        {es
          ? 'En este carril el brazo crudo alcanza la mejor tasa de falsas alarmas. Por eso este producto '
            + 'no afirma reducir falsas alarmas en ninguna parte.'
          : 'On this lane the raw arm reaches the better false-alarm rate. That is why this product makes '
            + 'no false-alarm-reduction claim anywhere.'}
      </Callout>

      <ul className="tv-cap">{data.honest_limits.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

function Aps({ es }: { es: boolean }) {
  const { data, error } = useArtifact<ApsCost>(loadAps);
  if (error) return <div className="tv-err">{error}</div>;
  if (!data) return <p className="tv-muted">{es ? 'Cargando...' : 'Loading...'}</p>;
  const cm = data.cost_matrix as unknown as { false_positive: number; false_negative: number; ratio: number; source: string };
  const rows = Object.entries(data.results as unknown as Record<string, {
    threshold: number; total_cost: number; false_positives: number; false_negatives: number; f1: number;
  }>);
  const best = Math.min(...rows.map(([, r]) => r.total_cost));
  const bestF1 = Math.max(...rows.map(([, r]) => r.f1));

  return (
    <div className="tv-prose">
      <p>
        {es
          ? 'El costo de un fallo no detectado es 50 veces el de una falsa alarma, y eso no es una '
            + 'suposición: viene en el archivo de descripción del propio conjunto de datos.'
          : "A miss costs 50 times a false alarm, and that is not an assumption: it ships in the dataset's "
            + 'own description file.'}
        {' '}<span className="tv-muted">FP {cm?.false_positive}, FN {cm?.false_negative} ({cm?.source})</span>
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Regla de decisión' : 'Decision rule'}</th>
              <th>{es ? 'Costo total' : 'Total cost'}</th>
              <th>FP</th><th>FN</th><th>F1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, r]) => (
              <tr key={k} className={r.total_cost === best ? 'hl' : undefined}>
                <td>{k}</td>
                <td className={r.total_cost === best ? 'win' : undefined}>{r.total_cost.toLocaleString('en-US')}</td>
                <td>{r.false_positives}</td>
                <td>{r.false_negatives}</td>
                <td className={r.f1 === bestF1 ? 'lose' : undefined}>{n(r.f1, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout variant="strong" title={es ? 'La métrica que casi todos reportan elige la decisión más cara' : 'The metric almost everyone reports selects the more expensive decision'}>
        {es
          ? 'La regla que maximiza F1 tiene el MEJOR F1 y el segundo peor costo. Optimizar la métrica que '
            + 'casi todo el mundo reporta cuesta unas 4 veces más que optimizar la que el cliente paga. '
            + 'Ese es el hallazgo de este carril, y no tiene nada que ver con regímenes.'
          : 'The F1-optimal rule has the BEST F1 and the second-worst cost. Optimising the metric almost '
            + 'everyone reports costs about 4 times more than optimising the one the customer pays. That '
            + 'is this lane\'s finding, and it has nothing to do with regimes.'}
      </Callout>
      <ul className="tv-cap">{data.honest_limits.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

function Cx({ es }: { es: boolean }) {
  const { data, error } = useArtifact<ComponentX>(loadComponentX);
  if (error) return <div className="tv-err">{error}</div>;
  if (!data) return <p className="tv-muted">{es ? 'Cargando...' : 'Loading...'}</p>;
  const rows = Object.entries(data.results).sort((a, b) => a[1].total_cost - b[1].total_cost);

  return (
    <div className="tv-prose">
      <p>
        {es
          ? '23,550 vehículos reales de SCANIA, predicción de ventana de falla en 5 clases bajo una matriz '
            + 'de costos graduada de 5x5. Este carril NO soporta nada sobre canales continuos: son '
            + 'histogramas por lectura y contadores acumulativos.'
          : '23,550 real SCANIA vehicles, 5-class failure-window prediction under a graded 5x5 cost matrix. '
            + 'This lane supports NOTHING about continuous channels: these are per-readout histograms and '
            + 'accumulative counters.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Modelo' : 'Model'}</th>
              <th>{es ? 'Decisión' : 'Decision'}</th>
              <th>{es ? 'Costo' : 'Cost'}</th>
              <th>{es ? 'Exactitud balanceada' : 'Balanced accuracy'}</th>
              <th>{es ? 'Marcados' : 'Flagged'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, r], i) => (
              <tr key={k} className={i === 0 ? 'hl' : undefined}>
                <td>{r.class_weight}</td>
                <td>{r.decision}</td>
                <td className={i === 0 ? 'win' : undefined}>{r.total_cost.toLocaleString('en-US')}</td>
                <td>{n(r.balanced_accuracy, 3)}</td>
                <td>{r.n_flagged_nonzero.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout variant="strong" title={es ? 'Dos formas de codificar la asimetría, y no se deben usar ambas' : 'Two ways to encode asymmetry, and you must not use both'}>
        {es
          ? 'Minimizar el costo esperado AYUDA en el modelo sin ponderar y PERJUDICA mucho en el ponderado, '
            + 'donde degenera a marcar todos los vehículos. La ponderación de clases y una matriz de costos '
            + 'codifican la misma asimetría por dos mecanismos distintos, y aplicar ambos la cuenta dos '
            + 'veces. Una decisión por costo esperado necesita probabilidades CALIBRADAS, y las de un '
            + 'modelo ponderado no lo están.'
          : 'Minimising expected cost HELPS on the unweighted model and badly HURTS on the class-weighted '
            + 'one, where it degenerates to flagging every vehicle. Class weighting and a cost matrix '
            + 'encode the same asymmetry by two different mechanisms, and applying both double-counts it. '
            + 'An expected-cost decision needs CALIBRATED probabilities, and a class-weighted model\'s are '
            + 'not.'}
      </Callout>
      <p className="tv-cap">
        {es ? 'Mejor exactitud balanceada publicada: ' : 'Best published balanced accuracy: '}
        {data.best_published_balanced_accuracy.value}{' '}
        {es ? 'contra un azar de ' : 'against a chance level of '}
        {data.best_published_balanced_accuracy.chance_level} ({data.best_published_balanced_accuracy.source}).
      </p>
      <ul className="tv-cap">{data.honest_limits.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}
