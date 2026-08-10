// Experiments: the C-MAPSS contrast and the onset sweep, both rendered from their artifacts.

import { Callout, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import { loadCmapss, loadOnsetSweep, type CmapssContrast, type OnsetSeedSweep } from '../lib/artifacts.ts';
import { n, useArtifact } from '../lib/useArtifact.ts';
import { useLang } from '../lib/i18n.ts';
import { MechanismHeadline } from '../viz/Headline.tsx';
import PanelBoundary from '../viz/PanelBoundary.tsx';

interface PairArm {
  subset: string; arm: string; n_conditions: number; n_units_scored: number; n_faulty: number;
  threshold: number | null; detection_rate: number; median_delay_cycles: number | null;
  false_alarms_per_1000_cycles: number; regime_coverage: number | null;
  dropped: Record<string, number>;
}

export default function Experiments() {
  const es = useLang() === 'es';
  const tabs: TabDef[] = [
    { id: 'mechanism', label: es ? 'Mecanismo' : 'Mechanism',
      content: <PanelBoundary name="mechanism"><div className="tv-prose"><MechanismHeadline es={es} /></div></PanelBoundary> },
    { id: 'detection', label: es ? 'Detección' : 'Detection',
      content: <PanelBoundary name="detection"><Detection es={es} /></PanelBoundary> },
    { id: 'onset', label: es ? 'Inicio (nulo)' : 'Onset (null)',
      content: <PanelBoundary name="onset"><Onset es={es} /></PanelBoundary> },
  ];
  return (
    <div className="page-body tv-prose">
      <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
      <p className="lead">
        {es
          ? 'Tres mediciones sobre los mismos datos, ordenadas de la que depende de menos decisiones a la '
            + 'que depende de más. La primera no tiene detector; la última es un resultado nulo.'
          : 'Three measurements on the same data, ordered from the one that depends on fewest choices to '
            + 'the one that depends on most. The first has no detector in it; the last is a null result.'}
      </p>
      <Tabs tabs={tabs} ariaLabel={es ? 'Experimentos' : 'Experiments'} />
    </div>
  );
}

function Detection({ es }: { es: boolean }) {
  const { data, error } = useArtifact<CmapssContrast>(loadCmapss);
  if (error) return <div className="tv-err">{error}</div>;
  if (!data) return <p className="tv-muted">{es ? 'Cargando...' : 'Loading...'}</p>;

  const pairs = (data.pairs as unknown as Array<{
    single_condition: string; multi_condition: string; fault_modes: number;
    n_channels: number; arms: PairArm[]; contrast: Record<string, unknown>;
  }>) || [];

  return (
    <div className="tv-prose">
      <p>
        {es
          ? 'Mismo detector (CUSUM, k = 0.5), mismos datos sanos por brazo, umbrales elegidos por '
            + 'validación cruzada sobre unidades, solo los canales informativos comunes a ambos '
            + 'subconjuntos. Cada número aquí depende del detector, de la regla de umbral y del '
            + 'presupuesto, a diferencia de la pestaña Mecanismo.'
          : 'Same detector (CUSUM, k = 0.5), same healthy data per arm, thresholds cross-fitted over '
            + 'units, only the informative channels common to both subsets. Every number here depends on '
            + 'the detector, the threshold rule and the budget, unlike the Mechanism tab.'}
      </p>

      {pairs.map((pair) => (
        <div key={pair.multi_condition}>
          <h3>
            {pair.single_condition} {es ? 'contra' : 'against'} {pair.multi_condition}
            {' '}<span className="tv-muted">
              ({pair.fault_modes} {es ? 'modo(s) de falla' : 'fault mode(s)'}, {pair.n_channels}{' '}
              {es ? 'canales comunes' : 'common channels'})
            </span>
          </h3>
          <div className="tv-tablewrap">
            <table className="tv-table">
              <thead>
                <tr>
                  <th>{es ? 'Subconjunto' : 'Subset'}</th>
                  <th>{es ? 'Brazo' : 'Arm'}</th>
                  <th>{es ? 'Regímenes' : 'Regimes'}</th>
                  <th>{es ? 'Unidades' : 'Units'}</th>
                  <th>{es ? 'FA / 1000' : 'FA / 1000'}</th>
                  <th>{es ? 'Detección' : 'Detection'}</th>
                  <th>{es ? 'Retardo' : 'Delay'}</th>
                  <th>{es ? 'Cobertura' : 'Coverage'}</th>
                </tr>
              </thead>
              <tbody>
                {pair.arms.map((a) => {
                  const isRegime = a.arm === 'residual-observed' || a.arm === 'residual-clustered';
                  return (
                    <tr key={`${a.subset}-${a.arm}`} className={isRegime ? 'hl' : undefined}>
                      <td>{a.subset}</td>
                      <td>{a.arm}</td>
                      <td>{a.n_conditions}</td>
                      <td>{a.n_units_scored}</td>
                      <td>{n(a.false_alarms_per_1000_cycles)}</td>
                      <td><strong>{n(a.detection_rate)}</strong></td>
                      <td>{a.median_delay_cycles == null ? '-' : n(a.median_delay_cycles, 0)}</td>
                      <td>{a.regime_coverage == null ? '-' : n(a.regime_coverage)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Callout variant="honest" title={es ? 'Un brazo que NO condiciona por régimen' : 'One arm does NOT condition on a regime'}>
        {es
          ? 'context-regression-global usa n_regimes=1: una sola regresión global de cada sensor sobre el '
            + 'contexto, sin ninguna segmentación. Está aquí porque es una línea base útil, y está separada '
            + 'porque una versión anterior de este producto atribuyó su resultado al "condicionamiento por '
            + 'régimen" cuando no hay régimen en él. El bloque de contraste del artefacto se calcula solo '
            + 'desde los brazos elegibles, y cita el PEOR de los dos, no el mejor.'
          : 'context-regression-global uses n_regimes=1: a single global regression of each sensor on the '
            + 'context, with no segmentation at all. It is here because it is a useful baseline, and it is '
            + 'kept separate because an earlier version of this product attributed its result to "regime '
            + 'conditioning" when there is no regime in it. The artifact\'s contrast block is computed from '
            + 'the eligible arms only, and quotes the WORSE of the two rather than the better.'}
      </Callout>

      <Callout variant="honest" title={es ? 'Ninguna afirmación sobre falsas alarmas' : 'No false-alarm claim'}>
        {es
          ? 'Este producto NO afirma reducir falsas alarmas. C-MAPSS mide detección a un presupuesto FIJO '
            + 'de falsas alarmas, y en el carril sintético el brazo crudo gana esa métrica. La afirmación '
            + 'se retiró.'
          : 'This product does NOT claim to reduce false alarms. C-MAPSS measures detection at a FIXED '
            + 'false-alarm budget, and on the synthetic lane the raw arm wins that metric outright. The '
            + 'claim was withdrawn.'}
      </Callout>
    </div>
  );
}

function Onset({ es }: { es: boolean }) {
  const { data, error } = useArtifact<OnsetSeedSweep>(loadOnsetSweep);
  if (error) return <div className="tv-err">{error}</div>;
  if (!data) return <p className="tv-muted">{es ? 'Cargando...' : 'Loading...'}</p>;
  const s = data.skill_summary;

  return (
    <div className="tv-prose">
      <p>
        {es
          ? 'La primera corrida de esta medición dio 2.40x a favor del condicionamiento y fue publicada. '
            + 'La segunda la invirtió. En vez de elegir una, el experimento se repitió de forma PAREADA '
            + 'sobre varias semillas, que es lo que la pregunta requería desde el principio.'
          : 'The first run of this measurement gave 2.40x in favour of conditioning and was published. The '
            + 'second reversed it. Rather than pick one, the experiment was repeated PAIRED across several '
            + 'seeds, which is what the question required from the start.'}
      </p>

      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Semilla' : 'Seed'}</th>
              <th>{es ? 'Error crudo' : 'Raw error'}</th>
              <th>{es ? 'Cortes' : 'Cuts'}</th>
              <th>{es ? 'Habilidad cruda' : 'Raw skill'}</th>
              <th>{es ? 'Error residuo' : 'Residual error'}</th>
              <th>{es ? 'Cortes' : 'Cuts'}</th>
              <th>{es ? 'Habilidad residuo' : 'Residual skill'}</th>
            </tr>
          </thead>
          <tbody>
            {data.per_seed.map((r) => (
              <tr key={r.seed}>
                <td>{r.seed}</td>
                <td>{n(r.raw.onset_error_min, 0)} min</td>
                <td>{n(r.raw.changepoints, 0)}</td>
                <td className={r.raw.skill_vs_chance > r.residual.skill_vs_chance ? 'win' : undefined}>
                  {n(r.raw.skill_vs_chance)}x
                </td>
                <td>{n(r.residual.onset_error_min, 0)} min</td>
                <td>{n(r.residual.changepoints, 0)}</td>
                <td className={r.residual.skill_vs_chance > r.raw.skill_vs_chance ? 'win' : undefined}>
                  {n(r.residual.skill_vs_chance)}x
                </td>
              </tr>
            ))}
            <tr className="hl">
              <td><strong>{es ? 'media' : 'mean'}</strong></td>
              <td colSpan={2} />
              <td><strong>{n(s.raw.mean)} +/- {n(s.raw.sd)}</strong></td>
              <td colSpan={2} />
              <td><strong>{n(s.residual.mean)} +/- {n(s.residual.sd)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tv-null">
        <p>
          <strong>
            {es ? 'Diferencia pareada (residuo menos crudo): ' : 'Paired difference (conditioned minus raw): '}
            {s.paired_difference.mean >= 0 ? '+' : ''}{n(s.paired_difference.mean)} +/- {n(s.paired_difference.sd)}.
            {es ? ' El condicionamiento gana en ' : ' Conditioning is ahead in '}
            {s.residual_ahead_in_seeds} / {data.per_seed.length} {es ? 'semillas.' : 'seeds.'}
          </strong>
        </p>
        <p>{data.verdict}</p>
      </div>

      <Callout variant="honest" title={es ? 'Lo que diría la columna de error sola' : 'What the error column alone would say'}>
        {es
          ? 'El brazo condicionado gana al crudo en TODAS las semillas por error bruto, entre 2 y 7 veces. '
            + 'Todo eso se explica por producir 12 a 14 puntos de cambio contra 2 a 3, que es exactamente lo '
            + 'que el nivel de azar cobra. Sin esa columna esto se habría publicado como una victoria.'
          : 'The conditioned arm beats the raw arm on EVERY seed by raw error, by 2 to 7 times. All of that '
            + 'is explained by producing 12 to 14 changepoints against 2 to 3, which is exactly what the '
            + 'chance level prices in. Without that column this would have shipped as a win.'}
      </Callout>

      <ul className="tv-cap">
        {data.honest_limits.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}
