// Experiments: the C-MAPSS contrast and the onset sweep, both rendered from their artifacts.

import { Callout, Cite, Equation, Refs, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
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
    { id: 'questions', label: es ? 'Las preguntas' : 'The questions',
      content: <PanelBoundary name="questions"><Questions es={es} /></PanelBoundary> },
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

// A suite is only as trustworthy as the questions it can be made to fail on. This tab separates them,
// transcribed from the lane's own docstring, with the null listed as a first-class member.
function Questions({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Cuatro preguntas, y una tiene respuesta nula' : 'Four questions, and one has a null answer'}</h2>
      <p>
        {es
          ? 'C-MAPSS es el único benchmark público, redistribuible y de corrida a falla cuyos '
            + 'subconjuntos difieren en EXACTAMENTE un factor que importa aquí: FD001 y FD003 corren una '
            + 'condición operativa, FD002 y FD004 corren seis. Eso convierte una afirmación que '
            + 'normalmente se asevera en un experimento controlado.'
          : 'C-MAPSS is the only public, redistributable, run-to-failure benchmark whose subsets differ '
            + 'in EXACTLY one factor that matters here: FD001 and FD003 run one operating condition, '
            + 'FD002 and FD004 run six. That turns a claim that is usually asserted into a controlled '
            + 'experiment.'}
        {' '}<Cite id="saxena2008" />
      </p>
      <ol>
        <li>
          <strong>{es ? '¿Qué cuesta la variación de régimen?' : 'What does regime variation cost?'}</strong>{' '}
          {es
            ? 'Detector idéntico, configuración idéntica, FD001 contra FD002. Cualquier diferencia son '
              + 'los seis regímenes, porque nada más cambió.'
            : 'Identical detector, identical settings, FD001 against FD002. Any difference is the six '
              + 'regimes, because nothing else changed.'}
        </li>
        <li>
          <strong>{es ? '¿Cuánto recupera el condicionamiento?' : 'How much does conditioning recover?'}</strong>{' '}
          {es
            ? 'El mismo detector sobre residuos intra-régimen de FD002.'
            : 'The same detector on within-regime residuals of FD002.'}
        </li>
        <li>
          <strong>{es ? '¿Cuál es el precio de que no te digan el régimen?' : 'What is the price of not being told the regime?'}</strong>{' '}
          {es
            ? 'C-MAPSS trae tres columnas de settings operativos, así que el régimen es observable. La '
              + 'telemetría real de camiones no. Se corren AMBAS rutas, observada y descubierta por '
              + 'clustering, y la brecha entre ellas se reporta, para que el benchmark no favorezca al '
              + 'método con una comodidad que no tendrá en terreno. Respuesta medida: la brecha es cero '
              + 'a tres decimales (0.954 contra 0.954).'
            : 'C-MAPSS ships three operational-setting columns, so the regime is observable. Real truck '
              + 'telemetry does not. BOTH routes run, observed and discovered by clustering, and the gap '
              + 'between them is reported, so the benchmark does not flatter the method through a '
              + 'convenience it will not have in the field. Measured answer: the gap is zero to three '
              + 'decimals (0.954 against 0.954).'}
        </li>
        <li>
          <strong>{es ? '¿El condicionamiento localiza mejor el inicio?' : 'Does conditioning localise the onset better?'}</strong>{' '}
          {es
            ? 'NO, de forma confiable. Esta es la pregunta con respuesta nula, y se embarca como '
              + 'miembro de primera clase en su propia pestaña en vez de desaparecer.'
            : 'NOT reliably. This is the question with the null answer, and it ships as a first-class '
              + 'member on its own tab rather than disappearing.'}
        </li>
      </ol>
      <Callout variant="honest" title={es ? 'La frontera de honestidad viaja con los números' : 'The honesty boundary travels with the numbers'}>
        {es
          ? 'C-MAPSS es un turbofán SIMULADO, no un camión. La afirmación que soporta es el MECANISMO '
            + '(la variación de régimen infla las falsas alarmas; condicionar por régimen remueve parte), '
            + 'que es general al dominio. No es una afirmación sobre camiones, y ninguna superficie de '
            + 'este producto puede presentarla como tal.'
          : 'C-MAPSS is a SIMULATED turbofan, not a truck. The claim it supports is the MECHANISM '
            + '(regime variation inflates false alarms; conditioning on regime removes some of it), '
            + 'which is domain-general. It is not a claim about trucks, and no surface of this product '
            + 'may present it as one.'}
      </Callout>

      <h2>{es ? 'Los datos, verificados en vez de asumidos' : 'The data, verified rather than assumed'}</h2>
      <p>
        {es
          ? 'Cada carril declara su estructura y el pipeline la AFIRMA al cargar, porque un subconjunto '
            + 'mal parseado en silencio dejaría cada número posterior luciendo razonable mientras el '
            + 'contraste completo pierde el sentido.'
          : 'Each lane declares its structure and the pipeline ASSERTS it at load, because a silently '
            + 'mis-parsed subset would leave every downstream number looking reasonable while the whole '
            + 'contrast stops meaning anything.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Carril' : 'Lane'}</th>
              <th>{es ? 'Estructura, verificada' : 'Structure, verified'}</th>
              <th>{es ? 'Redistribución' : 'Redistribution'}</th>
              <th>{es ? 'Estado en este horneado' : 'Status in this bake'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>C-MAPSS</td>
              <td>{es
                ? '4 subconjuntos x condiciones x modos de falla x unidades train/test, afirmados al cargar contra la tabla declarada (FD001 1x1x100/100 ... FD004 6x2x249/248)'
                : '4 subsets x conditions x fault modes x train/test units, asserted at load against the declared table (FD001 1x1x100/100 ... FD004 6x2x249/248)'}</td>
              <td>{es ? 'pública, redistribuible' : 'public, redistributable'}</td>
              <td>{es ? 'MEDIDO: mecanismo + contraste de detección' : 'MEASURED: mechanism + detection contrast'}</td>
            </tr>
            <tr>
              <td>SCANIA APS</td>
              <td>{es
                ? '170 columnas de features anonimizadas, subconjunto seleccionado por expertos, UNA instantánea por camión; la matriz de costos (10/500) y el puntaje del ganador IDA 2016 verificados PRIMARIOS en el archivo de descripción del propio dataset'
                : '170 anonymised feature columns, an expert-selected subset, ONE snapshot per truck; the cost matrix (10/500) and the IDA 2016 winner score PRIMARY-verified in the dataset\'s own description file'}</td>
              <td>{es ? 'pública (UCI)' : 'public (UCI)'}</td>
              <td>{es ? 'MEDIDO: solo carril de decisión (sin series de tiempo)' : 'MEASURED: decision lane only (no time series)'}</td>
            </tr>
            <tr>
              <td>Component X</td>
              <td>{es
                ? 'verificado contra los bytes descargados: 11 archivos, ~1.65 GB, descarga anónima; 1,122,452 lecturas x 107 columnas sobre 23,550 vehículos; 107 = 2 identificadores + 97 bins de histograma + 8 contadores'
                : 'verified against the downloaded bytes: 11 files, ~1.65 GB, anonymous download; 1,122,452 readouts x 107 columns over 23,550 vehicles; 107 = 2 identifiers + 97 histogram bins + 8 counters'}</td>
              <td>{es ? 'pública (SND, CC BY)' : 'public (SND, CC BY)'}</td>
              <td>{es ? 'MEDIDO: costo graduado 5x5 (histogramas, no canales continuos)' : 'MEASURED: graded 5x5 cost (histograms, not continuous channels)'}</td>
            </tr>
            <tr>
              <td>{es ? 'Sintético' : 'Synthetic'}</td>
              <td>{es
                ? 'flota de 36 unidades (20 sanas, 16 con falla), 45 ciclos, 12 canales, confundidor de régimen EMERGENTE del ciclo de acarreo; el instante real de inicio existe por construcción'
                : '36-unit fleet (20 healthy, 16 faulty), 45 cycles, 12 channels, regime confound EMERGENT from the haul cycle; the true onset instant exists by construction'}</td>
              <td>{es ? 'nuestro, MIT' : 'ours, MIT'}</td>
              <td>{es ? 'MEDIDO: escalera de 12 peldaños + curvas de presupuesto + error de inicio' : 'MEASURED: 12-rung ladder + budget curves + onset error'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Refs ids={['saxena2008', 'aps2016', 'componentx2024']} label={es ? 'Referencias' : 'References'} />
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
        {' '}<Cite id="page1954" />
      </p>
      <Equation
        tex={String.raw`S^{+}_{t,j} = \max\!\left(0,\; S^{+}_{t-1,j} + z_{t,j} - k\right), \qquad
          T_t = \max_j \max\!\left(S^{+}_{t,j},\, S^{-}_{t,j}\right)`}
        caption={es
          ? 'El estadístico que produce cada número de esta pestaña: acumuladores CUSUM bilaterales por '
            + 'canal sobre observaciones estandarizadas, reducidos por el máximo entre canales. La '
            + 'teoría completa por método vive en Metodología.'
          : 'The statistic behind every number on this tab: two-sided per-channel CUSUM accumulators on '
            + 'standardised observations, reduced by the maximum across channels. Full per-method theory '
            + 'lives on Methodology.'}
      />

      <ProtocolFigure es={es} />

      <p>
        {es
          ? 'El protocolo, comprimido: cada registro se parte en su propio reloj. [0, calib) es sano y '
            + 'COMPARTIDO: cada brazo recibe el mismo tramo y lo gasta como su método exige (el brazo de '
            + 'residuos invierte [0, fit) en el modelo de régimen; el crudo lo usa entero para el '
            + 'detector). [calib, fin] se puntúa. Nada posterior a calib informa ningún ajuste, INCLUIDA '
            + 'la selección de canales.'
          : 'The protocol, compressed: each record splits on its own clock. [0, calib) is healthy and '
            + 'SHARED: every arm gets the same stretch and spends it as its method requires (the residual '
            + 'arm spends [0, fit) on the regime model; the raw arm uses all of it for the detector). '
            + '[calib, end] is scored. Nothing after calib informs any fit, INCLUDING the channel '
            + 'selection.'}
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

      <p className="tv-cap">
        {es
          ? 'Dos lecturas finas de estas tablas. El retardo mediano se calcula SOLO sobre unidades '
            + 'detectadas, así que un retardo más corto en un brazo con menos detección condiciona sobre '
            + 'los sobrevivientes. Y un punto de operación único esconde si la ventaja sobrevive a '
            + 'cambiar el presupuesto: en el carril sintético la curva completa de presupuesto (seis '
            + 'presupuestos, ambos brazos, intervalos bootstrap sobre unidades) está horneada y se '
            + 'muestra en Benchmark; es lo que hace defendible el punto único que estas tablas citan. '
            + 'La frontera de honestidad de la pestaña Preguntas aplica a cada número de esta página: '
            + 'turbofanes simulados, el mecanismo es la afirmación, y la mitad de falsas alarmas no '
            + 'depende de la convención de inicio.'
          : 'Two fine readings of these tables. Median delay is computed over DETECTED units only, so a '
            + 'shorter delay on a lower-detection arm conditions on the survivors. And a single '
            + 'operating point hides whether the advantage survives changing the budget: on the '
            + 'synthetic lane the full budget curve (six budgets, both arms, bootstrap-over-units '
            + 'intervals) is baked and shown on Benchmark; it is what makes the single point these '
            + 'tables quote defensible. The honesty boundary from the Questions tab applies to every '
            + 'number on this page: simulated turbofans, the mechanism is the claim, and the '
            + 'false-alarm half does not depend on the onset convention.'}
      </p>
      <Refs ids={['saxena2008', 'page1954']} label={es ? 'Referencias' : 'References'} />
    </div>
  );
}

// The protocol as a picture, with the two forbidden paths this product actually walked and then
// corrected, struck out. Theme-aware: every stroke and fill reads a shell CSS variable.
function ProtocolFigure({ es }: { es: boolean }) {
  const fg = 'var(--color-fg)';
  const sub = 'var(--color-fg-subtle)';
  const line = 'var(--color-border)';
  const accent = 'var(--color-accent)';
  const bad = 'var(--color-danger, #b3392f)';
  return (
    <figure style={{ margin: '0.8rem 0' }}>
      <svg viewBox="0 0 640 218" role="img" style={{ width: '100%', maxWidth: 640, display: 'block' }}
        aria-label={es
          ? 'Protocolo de partición: ventanas de ajuste, calibración y puntaje, con las dos rutas prohibidas tachadas'
          : 'Split protocol: fit, calibration and scoring windows, with the two forbidden paths struck out'}>
        <title>{es ? 'El protocolo de partición' : 'The split protocol'}</title>
        {/* time axis */}
        <line x1="30" y1="180" x2="610" y2="180" stroke={line} strokeWidth="1" />
        <text x="30" y="196" fontSize="10" fill={sub}>0</text>
        <text x="250" y="196" fontSize="10" fill={sub}>fit</text>
        <text x="360" y="196" fontSize="10" fill={sub}>calib</text>
        <text x="585" y="196" fontSize="10" fill={sub}>{es ? 'fin' : 'end'}</text>
        {/* residual arm */}
        <text x="30" y="30" fontSize="11" fill={fg} fontWeight="600">{es ? 'brazo residuo' : 'residual arm'}</text>
        <rect x="30" y="38" width="220" height="26" fill={accent} opacity="0.25" stroke={line} />
        <text x="140" y="55" fontSize="10" fill={fg} textAnchor="middle">{es ? 'modelo de régimen + residuo' : 'regime + residual model'}</text>
        <rect x="250" y="38" width="110" height="26" fill={accent} opacity="0.45" stroke={line} />
        <text x="305" y="55" fontSize="10" fill={fg} textAnchor="middle">{es ? 'detector' : 'detector'}</text>
        <rect x="360" y="38" width="250" height="26" fill="none" stroke={fg} strokeDasharray="4 3" />
        <text x="485" y="55" fontSize="10" fill={fg} textAnchor="middle">{es ? 'PUNTUADO' : 'SCORED'}</text>
        {/* raw arm */}
        <text x="30" y="96" fontSize="11" fill={fg} fontWeight="600">{es ? 'brazo crudo' : 'raw arm'}</text>
        <rect x="30" y="104" width="330" height="26" fill={accent} opacity="0.45" stroke={line} />
        <text x="195" y="121" fontSize="10" fill={fg} textAnchor="middle">
          {es ? 'detector (TODO el tramo sano compartido)' : 'detector (ALL of the shared healthy stretch)'}
        </text>
        <rect x="360" y="104" width="250" height="26" fill="none" stroke={fg} strokeDasharray="4 3" />
        <text x="485" y="121" fontSize="10" fill={fg} textAnchor="middle">{es ? 'PUNTUADO' : 'SCORED'}</text>
        {/* forbidden paths, struck out */}
        <g>
          <line x1="485" y1="64" x2="305" y2="38" stroke={bad} strokeWidth="1.2" strokeDasharray="5 3" />
          <line x1="380" y1="44" x2="404" y2="60" stroke={bad} strokeWidth="2" />
          <line x1="404" y1="44" x2="380" y2="60" stroke={bad} strokeWidth="2" />
          <text x="470" y="78" fontSize="9" fill={bad} textAnchor="middle">
            {es ? 'umbral desde datos puntuados: PROHIBIDO (pasó, y se corrigió)' : 'threshold from scored data: FORBIDDEN (it happened, and was fixed)'}
          </text>
        </g>
        <g>
          <line x1="140" y1="130" x2="140" y2="152" stroke={bad} strokeWidth="1.2" strokeDasharray="5 3" />
          <line x1="130" y1="136" x2="150" y2="148" stroke={bad} strokeWidth="2" />
          <line x1="150" y1="136" x2="130" y2="148" stroke={bad} strokeWidth="2" />
          <text x="146" y="164" fontSize="9" fill={bad}>
            {es ? 'brazo crudo con un tercio de los datos sanos: PROHIBIDO (pasó, y se corrigió)' : 'raw arm on a third of the healthy data: FORBIDDEN (it happened, and was fixed)'}
          </text>
        </g>
      </svg>
      <figcaption className="tv-cap">
        {es
          ? 'Las dos rutas tachadas no son hipotéticas: una revisión adversarial encontró ambas. '
            + 'Igualar los datos sanos movió FD002 crudo de 0.046 a 0.161; y la ruta documentada de '
            + 'calibración resultó INUTILIZABLE para un estadístico acumulativo (esa ventana es donde '
            + 'un CUSUM recién se reinició a cero: un umbral tomado ahí sobrepasa el presupuesto por '
            + '16 a 146 veces), así que el umbral se ajusta en forma cruzada sobre unidades.'
          : 'The two struck-out paths are not hypothetical: an adversarial review found both. '
            + 'Equalising the healthy data moved FD002 raw from 0.046 to 0.161; and the documented '
            + 'calibration-window route proved UNUSABLE for a cumulative statistic (that window is '
            + 'where a CUSUM has just been reset to zero: a threshold taken there overshoots the '
            + 'budget by 16 to 146 times), so the threshold is cross-fitted over units instead.'}
      </figcaption>
    </figure>
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
            + 'sobre varias semillas, que es lo que la pregunta requería desde el principio. El '
            + 'estimador retrospectivo es PELT '
          : 'The first run of this measurement gave 2.40x in favour of conditioning and was published. The '
            + 'second reversed it. Rather than pick one, the experiment was repeated PAIRED across several '
            + 'seeds, which is what the question required from the start. The retrospective estimator is '
            + 'PELT '}
        <Cite id="killick2012" />
        {es
          ? ', y su métrica exige la columna de azar de abajo.'
          : ', and its metric demands the chance column below.'}
      </p>
      <Equation
        tex={String.raw`\mathrm{err} = \min_{c} \left| t_{c} - t_{\mathrm{onset}} \right|, \qquad
          \mathrm{chance} = \frac{S}{2\,(k+1)}, \qquad
          \mathrm{skill} = \frac{\operatorname{median}(\mathrm{chance})}{\operatorname{median}(\mathrm{err})}`}
        caption={es
          ? 'El error toma el punto de cambio MÁS CERCANO, que es optimista por construcción: una '
            + 'segmentación con k cortes sobre un lapso S cae cerca de cualquier inicio por suerte, a '
            + 'distancia esperada S/(2(k+1)). Habilidad 1.0 significa no mejor que esparcir la misma '
            + 'cantidad de cortes al azar. Sin esta columna, la tabla de abajo se leería como una '
            + 'victoria del brazo condicionado.'
          : 'The error takes the NEAREST changepoint, which is optimistic by construction: a '
            + 'segmentation with k cuts over a span S lands near any onset by luck, at expected '
            + 'distance S/(2(k+1)). Skill 1.0 means no better than scattering the same number of cuts '
            + 'at random. Without this column, the table below would read as a win for the conditioned '
            + 'arm.'}
      />

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
            + 'Todo eso se explica por producir una mediana de 11.5 a 14 puntos de cambio contra 2 a 3, que '
            + 'es exactamente lo que el nivel de azar cobra. Sin esa columna esto se habría publicado como '
            + 'una victoria.'
          : 'The conditioned arm beats the raw arm on EVERY seed by raw error, by 2 to 7 times. All of that '
            + 'is explained by producing a median of 11.5 to 14 changepoints against 2 to 3, which is '
            + 'exactly what the chance level prices in. Without that column this would have shipped as a '
            + 'win.'}
      </Callout>

      <ul className="tv-cap">
        {data.honest_limits.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <Refs ids={['killick2012']} label={es ? 'Referencias' : 'References'} />
    </div>
  );
}
