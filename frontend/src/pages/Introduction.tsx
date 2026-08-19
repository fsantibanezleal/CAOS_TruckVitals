import { Callout, Cite, Equation, Refs } from '@fasl-work/caos-app-shell';
import { useLang } from '../lib/i18n.ts';
import { MechanismHeadline, OnsetNull } from '../viz/Headline.tsx';

// The pipeline as a picture rather than an ASCII string. Theme-aware: every colour reads a shell CSS
// variable. The dead-end branch is the design decision the whole product leans on: an unassigned
// sample STAYS unassigned, it is never snapped to the nearest regime.
function PipelineFigure({ es }: { es: boolean }) {
  const fg = 'var(--color-fg)';
  const sub = 'var(--color-fg-subtle)';
  const line = 'var(--color-border)';
  const accent = 'var(--color-accent)';
  const stages: [string, string][] = es
    ? [['telemetría', 'cruda'], ['etiqueta de', 'régimen'], ['residuo', 'intra-régimen'], ['estadístico', 'del detector'], ['alarma', '(evento)'], ['inicio', '']]
    : [['raw', 'telemetry'], ['regime', 'label'], ['within-regime', 'residual'], ['detector', 'statistic'], ['alarm', '(event)'], ['onset', '']];
  return (
    <figure style={{ margin: '0.8rem 0' }}>
      <svg viewBox="0 0 660 150" role="img" style={{ width: '100%', maxWidth: 660, display: 'block' }}
        aria-label={es ? 'La cadena del producto, con la rama sin asignar como callejón sin salida' : 'The product chain, with the unassigned branch as a dead end'}>
        <title>{es ? 'La cadena' : 'The chain'}</title>
        {stages.map(([a, b], i) => (
          <g key={a}>
            <rect x={10 + i * 108} y={30} width={96} height={40} rx={6}
              fill={i === 1 || i === 2 ? accent : 'none'} opacity={i === 1 || i === 2 ? 0.28 : 1}
              stroke={i === 1 || i === 2 ? accent : line} strokeWidth={1.2} />
            <text x={58 + i * 108} y={b ? 47 : 54} fontSize="10.5" fill={fg} textAnchor="middle">{a}</text>
            {b && <text x={58 + i * 108} y={60} fontSize="10.5" fill={fg} textAnchor="middle">{b}</text>}
            {i < 5 && <path d={`M ${106 + i * 108} 50 l 10 0`} stroke={fg} strokeWidth={1.4} />}
            {i < 5 && <path d={`M ${112 + i * 108} 46 l 5 4 l -5 4`} fill="none" stroke={fg} strokeWidth={1.4} />}
          </g>
        ))}
        <text x={334} y={20} fontSize="9.5" fill={sub} textAnchor="middle">
          {es ? 'los dos brazos salen de la MISMA llamada; el detector no puede distinguirlos' : 'both arms come from the SAME call; the detector cannot tell them apart'}
        </text>
        {/* the unassigned dead end */}
        <path d="M 172 70 l 0 28" stroke={sub} strokeWidth={1.2} strokeDasharray="4 3" />
        <path d="M 168 92 l 4 6 l 4 -6" fill="none" stroke={sub} strokeWidth={1.2} />
        <rect x={116} y={100} width={112} height={30} rx={6} fill="none" stroke={sub} strokeDasharray="4 3" />
        <text x={172} y={113} fontSize="9.5" fill={sub} textAnchor="middle">{es ? 'fuera de todo régimen:' : 'outside every regime:'}</text>
        <text x={172} y={124} fontSize="9.5" fill={sub} textAnchor="middle">{es ? 'SIN ASIGNAR (NaN), nunca forzado' : 'UNASSIGNED (NaN), never snapped'}</text>
        <text x={480} y={92} fontSize="9.5" fill={sub} textAnchor="middle">
          {es ? 'el umbral es de FLOTA, calibrado a presupuesto igualado' : 'the threshold is a FLEET quantity, budget-matched'}
        </text>
      </svg>
      <figcaption className="tv-cap">
        {es
          ? 'La rama punteada es la decisión de diseño de la que cuelga todo: una muestra fuera de todo '
            + 'régimen visto queda SIN ASIGNAR y se convierte en NaN, nunca se fuerza al régimen más '
            + 'cercano, porque forzarla es exactamente cómo un detector se convence de que una condición '
            + 'operativa nueva es una falla.'
          : 'The dashed branch is the design decision everything hangs from: a sample outside every seen '
            + 'regime stays UNASSIGNED and becomes NaN, never snapped to the nearest regime, because '
            + 'snapping is exactly how a detector talks itself into calling a new operating condition a '
            + 'fault.'}
      </figcaption>
    </figure>
  );
}

export default function Introduction() {
  const es = useLang() === 'es';
  return (
    <div className="page-body tv-prose">
      <h1>TruckVitals</h1>
      <p className="lead">
        {es
          ? 'Detección de inicio de falla en telemetría de flotas de camiones mineros, construida sobre la '
            + 'única idea que la hace difícil: un camión cargado subiendo una rampa y el mismo camión vacío '
            + 'bajando no son la misma máquina desde el punto de vista de un detector.'
          : 'Onset detection on haul-truck fleet telemetry, built on the one idea that makes it hard: a '
            + 'loaded truck climbing a ramp and the same truck empty on the way down are not the same '
            + 'machine as far as a detector is concerned.'}
      </p>

      <h2>{es ? 'El problema' : 'The problem'}</h2>
      <p>
        {es
          ? 'Un detector de cambios sobre telemetría cruda de un camión minero pasa casi todo su tiempo '
            + 'detectando el ciclo de acarreo. La presión de suspensión salta cuando se carga la tolva. La '
            + 'temperatura de freno sube en cada bajada. El consumo de combustible sigue la pendiente. Nada '
            + 'de eso es una falla, y todo eso es un cambio real y grande en la señal. Si se ajusta el '
            + 'umbral hasta que el ciclo deje de disparar alarmas, la falla que se quería detectar queda '
            + 'debajo del umbral.'
          : 'A change detector on raw haul-truck telemetry spends almost all of its time detecting the haul '
            + 'cycle. Strut pressure jumps when the tray is loaded. Brake temperature climbs on every '
            + 'descent. Fuel rate tracks the grade. None of that is a fault, and all of it is a large, real '
            + 'change in the signal. Raise the threshold until the cycle stops raising alarms and the fault '
            + 'you wanted is under the threshold too.'}
      </p>

      <p>
        {es
          ? 'El problema además cuesta dinero de forma asimétrica, y los dos conjuntos de datos reales de '
            + 'este producto lo tienen tarifado: en SCANIA APS un camión con falla no detectado cuesta 50 '
            + 'veces una falsa alarma (500 contra 10), y Component X tarifica CUÁN TARDE fue la pérdida '
            + 'con una matriz graduada de 5x5. Sobre APS, optimizar la métrica que casi todos reportan '
            + '(F1) selecciona una decisión 4.1 veces más cara que optimizar la que el operador paga.'
          : 'The problem also costs money asymmetrically, and this product\'s two real datasets have it '
            + 'priced: on SCANIA APS a missed faulty truck costs 50 times a false alarm (500 against 10), '
            + 'and Component X prices HOW LATE a miss was with a graded 5x5 matrix. On APS, optimising '
            + 'the metric almost everyone reports (F1) selects a decision 4.1 times more expensive than '
            + 'optimising the one the operator pays.'}
        {' '}<Cite id="aps2016" /> <Cite id="componentx2024" />
      </p>

      <p>{es ? 'La cadena que propone este producto:' : 'The chain this product proposes:'}</p>
      <PipelineFigure es={es} />

      <p>
        {es
          ? 'En vez de preguntar "¿este valor es anómalo?", se pregunta "¿este valor es anómalo PARA ESTE '
            + 'régimen?". El régimen se aprende del contexto (carga útil, pendiente, velocidad), no de los '
            + 'canales que se monitorean, y el residuo se calcula dentro del régimen.'
          : 'Instead of asking "is this value anomalous?", ask "is this value anomalous FOR THIS REGIME?". '
            + 'The regime is learned from context (payload, grade, speed) rather than from the monitored '
            + 'channels, and the residual is taken within the regime.'}
      </p>

      <Equation
        tex={String.raw`r_t \;=\; \frac{x_t - \hat{\mu}_{k(t)}}{\hat{\sigma}_{k(t)}}, \qquad k(t) = \text{regime at } t`}
        caption={es
          ? 'Símbolos: x_t la muestra del canal monitoreado; k(t) el régimen en t, aprendido SOLO de '
            + 'los canales de contexto; mu y sigma la media y dispersión sanas de ESE régimen, con un '
            + 'piso de degeneración relativo (sigma solo cuenta si supera max(1e-12, 1e-8 por la '
            + 'magnitud del canal), si no el divisor es 1, porque estandarizar un canal muerto por su '
            + 'propio ruido de redondeo fabricó una vez z-scores de 1e12); k(t) = -1 es el caso SIN '
            + 'ASIGNAR y produce NaN.'
          : 'Symbols: x_t the monitored channel sample; k(t) the regime at t, learned ONLY from context '
            + 'channels; mu and sigma the healthy mean and spread of THAT regime, with a relative '
            + 'degeneracy floor (sigma only counts above max(1e-12, 1e-8 times the channel\'s own '
            + 'magnitude), else the divisor is 1, because standardising a dead channel by its own '
            + 'rounding noise once fabricated z-scores of 1e12); k(t) = -1 is the UNASSIGNED case and '
            + 'yields NaN.'}
      />

      <p>
        {es
          ? 'con la media y la desviación estimadas SOLO en la ventana sana de línea base de ese mismo '
            + 'camión, y con '
          : 'with the mean and spread estimated ONLY on that truck\'s own healthy baseline window, and with '}
        <code>k(t) = -1</code>
        {es
          ? ' cuando la muestra cae fuera de todo régimen visto. Ese caso queda SIN ASIGNAR y nunca se '
            + 'fuerza al régimen más cercano, porque forzarlo es exactamente cómo un detector se convence '
            + 'de que una condición nueva es una falla.'
          : ' when a sample falls outside every regime seen. That case is left UNASSIGNED and never snapped '
            + 'to the nearest regime, because snapping it is exactly how a detector talks itself into '
            + 'calling a new operating condition a fault.'}
      </p>

      <h2>{es ? 'Por qué el mecanismo debería funcionar, medido sin detector' : 'Why the mechanism should work, measured with no detector'}</h2>
      <p>
        {es
          ? 'La afirmación se reduce a una oración: la firma de la falla es pequeña comparada con la '
            + 'dispersión que induce el régimen operativo, y grande comparada con la dispersión DENTRO '
            + 'de un régimen. Eso es una afirmación de tamaño de efecto, y no necesita detector alguno.'
          : 'The claim reduces to one sentence: the fault\'s signature is small compared with the spread '
            + 'the operating regime induces, and large compared with the spread WITHIN a regime. That is '
            + 'a statement about effect size, and it needs no detector at all.'}
      </p>
      <Equation
        tex={String.raw`d_{\mathrm{pooled}} = \frac{\left|\bar{x}_{\mathrm{fault}} - \bar{x}_{\mathrm{healthy}}\right|}{\hat{\sigma}_{\mathrm{healthy,\ pooled}}}, \qquad
          d_{\mathrm{regime}} = \frac{\left|\bar{x}_{\mathrm{fault}} - \bar{x}_{\mathrm{healthy}}\right|}{\hat{\sigma}_{\mathrm{healthy,\ within}}}`}
        caption={es
          ? 'Si el régimen es lo que infla el denominador, la razón d_regime/d_pooled es grande en una '
            + 'flota multi-condición y EXACTAMENTE 1 en una de condición única, donde los dos '
            + 'denominadores coinciden por construcción. Los subconjuntos de condición única son por lo '
            + 'tanto un control negativo que nadie diseñó: son lo que este mismo código devuelve sobre '
            + 'datos sin nada que condicionar.'
          : 'If the regime is what inflates the denominator, the ratio d_regime/d_pooled is large on a '
            + 'multi-condition fleet and EXACTLY 1 on a single-condition one, where the two denominators '
            + 'coincide by construction. The single-condition subsets are therefore a negative control '
            + 'nobody designed: they are what this same code returns on data with nothing to condition '
            + 'on.'}
      />
      <p>
        {es
          ? 'Dos decisiones honestas dentro de esa medición. Los denominadores se estiman sobre la '
            + 'FLOTA, no por unidad: una primera versión los estimaba de la ventana sana de cada unidad, '
            + 'que en C-MAPSS deja regímenes con 1, 3 u 11 muestras, y una desviación estándar de 11 '
            + 'muestras de un canal que apenas se mueve es casi cero, así que esa versión reportó una '
            + 'razón mediana de 2113, que no es una medición de nada. Y los canales BLOQUEADOS por '
            + 'régimen (exactamente constantes dentro de una condición, variando solo porque la '
            + 'condición varía) son la forma más pura del efecto bajo estudio y a la vez indefinidos '
            + 'como razón: dividir por su dispersión reportaría un infinito disfrazado de hallazgo, así '
            + 'que se excluyen de la razón y se CUENTAN, y el conteo es un resultado por derecho propio.'
          : 'Two honest decisions inside that measurement. The denominators are estimated across the '
            + 'FLEET, not per unit: a first version estimated them from each unit\'s own healthy window, '
            + 'which on C-MAPSS leaves regimes holding 1, 3 or 11 samples, and a standard deviation from '
            + '11 samples of a channel that barely moves is nearly zero, so that version reported a '
            + 'median ratio of 2113, which is not a measurement of anything. And regime-LOCKED channels '
            + '(exactly constant within a condition, varying only because the condition varies) are the '
            + 'purest form of the effect under study and also undefined as a ratio: dividing by their '
            + 'spread would report an infinity dressed as a finding, so they are excluded from the ratio '
            + 'and COUNTED, and the count is a result in its own right.'}
      </p>

      <h2>{es ? 'La afirmación central es una MEDICIÓN, no una idea' : 'The central claim is a MEASUREMENT, not an idea'}</h2>
      <p>
        {es
          ? 'La idea de arriba es plausible y sería fácil venderla sin evidencia. Este producto existe para '
            + 'medirla: el MISMO detector, con el MISMO presupuesto de falsas alarmas, sobre canales crudos '
            + 'y sobre residuos intra-régimen, y la diferencia entre ambos. Si esa comparación no muestra '
            + 'una ganancia real, ESE es el resultado y se publica como tal.'
          : 'The idea above is plausible and would be easy to sell without evidence. This product exists to '
            + 'measure it: the SAME detector, at the SAME false-alarm budget, on raw channels and on '
            + 'within-regime residuals, and the difference between the two. If that comparison shows no '
            + 'real gain, THAT is the finding and it ships as such.'}
      </p>

      <MechanismHeadline es={es} />

      <OnsetNull es={es} />

      <h2>{es ? 'El producto, de punta a punta' : 'The product, end to end'}</h2>
      <ol>
        <li>
          {es
            ? 'Segmentar el contexto en regímenes, declarados (C-MAPSS los trae) o descubiertos '
              + '(k-means con radio de novedad: más lejos que el radio del centroide más cercano queda '
              + 'SIN ASIGNAR).'
            : 'Segment the context into regimes, declared (C-MAPSS ships them) or discovered (k-means '
              + 'with a novelty radius: further than the radius from the nearest centroid stays '
              + 'UNASSIGNED).'}
        </li>
        <li>
          {es
            ? 'Residualizar dentro del régimen; lo no asignado se vuelve NaN, nunca un relleno del '
              + 'régimen más cercano.'
            : 'Residualise within the regime; the unassigned becomes NaN, never a nearest-regime fill.'}
        </li>
        <li>
          {es
            ? 'Correr el detector IDÉNTICO sobre ambos brazos: los dos salen de la misma llamada y el '
              + 'detector no puede distinguirlos.'
            : 'Run the IDENTICAL detector on both arms: both come from the same call and the detector '
              + 'cannot tell them apart.'}
        </li>
        <li>
          {es
            ? 'Calibrar UN umbral de flota por brazo a un presupuesto declarado de falsas alarmas (una '
              + 'muestra es un minuto; un mes son 43200 minutos; la conversión se declara en vez de '
              + 'asumirse).'
            : 'Calibrate ONE fleet threshold per arm at a stated false-alarm budget (one sample is one '
              + 'minute; a month is 43200 minutes; the conversion is stated rather than assumed).'}
        </li>
        <li>
          {es
            ? 'Puntuar detección, retardo y falsas alarmas contando EVENTOS, con bootstrap sobre '
              + 'UNIDADES, nunca sobre muestras.'
            : 'Score detection, delay and false alarms counting EVENTS, with a bootstrap over UNITS, '
              + 'never over samples.'}
        </li>
        <li>
          {es
            ? 'Mantener el carril sintético honesto con tres guardias: confundidor EMERGENTE del ciclo '
              + 'de acarreo, el MISMO protocolo que C-MAPSS, y una línea base trivial puntuada al lado.'
            : 'Keep the synthetic lane honest with three guards: a confound EMERGENT from the haul '
              + 'cycle, the SAME protocol as C-MAPSS, and a trivial baseline scored alongside.'}
        </li>
      </ol>

      <h2>{es ? 'Dónde se para esto en el arte previo' : 'Where this stands in prior art'}</h2>
      <p>
        {es
          ? 'Tres anclas, todas leídas antes de afirmar nada. Hendrickx et al. detectan una máquina con '
            + 'falla comparándola contra el RESTO DE LA FLOTA: ese es el eje de flota, ortogonal al eje '
            + 'de régimen de este producto (un camión contra sí mismo dentro de un contexto operativo '
            + 'igualado); componen sin competir, y la combinación de dos vías es la celda interesante. '
          : 'Three anchors, all read before claiming anything. Hendrickx et al. detect a faulty machine '
            + 'by comparing it against the REST OF THE FLEET: that is the fleet axis, orthogonal to this '
            + 'product\'s regime axis (a truck against itself within a matched operating context); they '
            + 'compose without competing, and the two-way combination is the interesting cell. '}
        <Cite id="hendrickx2020" />
        {es
          ? ' Carpentier et al. modelan camiones "contextualmente", pero su contexto es una COHORTE por '
            + 'vehículo asignada una vez por especificación: lo suyo particiona la FLOTA, esto '
            + 'particiona la LÍNEA DE TIEMPO. '
          : ' Carpentier et al. model trucks "contextually", but their context is a per-vehicle COHORT '
            + 'assigned once by specification: theirs partitions the FLEET, this partitions the '
            + 'TIMELINE. '}
        <Cite id="carpentier2024" />
        {es
          ? ' Y el mejor resultado publicado sobre Component X nombra en su propia sección de '
            + 'limitaciones exactamente la brecha que este producto ataca: su solución "no considera la '
            + 'naturaleza dinámica de las flotas y sus condiciones operativas". Esa concesión, de '
            + 'quienes sostienen el récord, es la cita de motivación más fuerte disponible. '
          : ' And the best published result on Component X names, in its own limitations section, '
            + 'exactly the gap this product attacks: their solution "doesn\'t account for the dynamic '
            + 'nature of the fleets and their operating conditions". That concession, from the people '
            + 'holding the record, is the strongest motivation citation available. '}
        <Cite id="dimidov2026" />
      </p>

      <h2>{es ? 'Qué es real y qué es sintético' : 'What is real and what is synthetic'}</h2>
      <p>
        {es
          ? 'Cuatro carriles de datos, con límites distintos y declarados. Tres son públicos y reales; el '
            + 'cuarto es una flota sintética con base física, etiquetada como sintética en todas partes.'
          : 'Four data lanes, with different and declared limits. Three are public and real; the fourth is '
            + 'a physically grounded synthetic fleet, labelled synthetic everywhere.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Carril' : 'Lane'}</th>
              <th>{es ? 'Fuente' : 'Source'}</th>
              <th>{es ? 'Qué soporta' : 'What it supports'}</th>
              <th>{es ? 'Qué NO soporta' : 'What it does NOT support'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'Contraste de regímenes' : 'Regime contrast'}</td>
              <td>NASA C-MAPSS <Cite id="saxena2008" /></td>
              <td>{es ? 'el experimento controlado: 1 condición vs 6' : 'the controlled experiment: 1 condition vs 6'}</td>
              <td>{es ? 'camiones. Son turbofanes' : 'trucks. These are turbofans'}</td>
            </tr>
            <tr>
              <td>{es ? 'Costo asimétrico' : 'Asymmetric cost'}</td>
              <td>SCANIA APS <Cite id="aps2016" /></td>
              <td>{es ? 'decisión bajo costo real (FP 10, FN 500)' : 'decision under a real cost (FP 10, FN 500)'}</td>
              <td>{es ? 'series de tiempo: es una instantánea por vehículo' : 'time series: it is one snapshot per vehicle'}</td>
            </tr>
            <tr>
              <td>{es ? 'Ventana de falla' : 'Failure window'}</td>
              <td>SCANIA Component X <Cite id="componentx2024" /></td>
              <td>{es ? 'predicción de ventana en 23,550 vehículos reales' : 'window prediction over 23,550 real vehicles'}</td>
              <td>{es ? 'canales continuos: son histogramas y contadores' : 'continuous channels: these are histograms and counters'}</td>
            </tr>
            <tr>
              <td>{es ? 'Sintético' : 'Synthetic'}</td>
              <td>{es ? 'nuestro, con base física' : 'ours, physically grounded'}</td>
              <td>{es ? 'error de inicio contra una verdad que existe por construcción' : 'onset error against a truth that exists by construction'}</td>
              <td>{es ? 'cualquier cosa sobre camiones reales' : 'anything about real trucks'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'El carril que no existe' : 'The lane that does not exist'}>
        {es
          ? 'No se encontró ningún conjunto de datos público y redistribuible de telemetría continua de '
            + 'camiones mineros con fallas etiquetadas. Component X es de camiones reales pero entrega '
            + 'histogramas por lectura, no canales continuos. El casi-acierto también merece nombre: '
            + 'EngineAD (25 camiones comerciales, 13 sensores de motor a 1 Hz por seis meses) falla por '
            + 'dos lados, acceso "a pedido" en vez de descarga abierta, y una publicación transformada '
            + 'por PCA a 8 componentes anónimas, explícitamente para impedir la reconstrucción, lo que '
            + 'DESTRUYE la identidad física del canal: una atribución sobre componentes anónimas '
            + 'responde "se movió PC3", que ningún planificador de mantenimiento puede accionar. Por '
            + 'eso la medición de error de inicio vive en el carril sintético: es el único lugar donde '
            + 'el instante real de inicio existe. Esa es una limitación del producto, no un detalle.'
          : 'No public, redistributable dataset of continuous haul-truck telemetry with labelled faults '
            + 'was found. Component X is real trucks but ships per-readout histograms rather than '
            + 'continuous channels. The near-miss deserves naming too: EngineAD (25 commercial trucks, '
            + '13 engine sensors at 1 Hz over six months) fails on two counts, access "upon request" '
            + 'rather than an open download, and a release PCA-transformed to 8 anonymous components, '
            + 'explicitly to prevent reconstruction, which DESTROYS physical channel identity: '
            + 'attribution on anonymous components answers "PC3 moved", which no maintenance planner '
            + 'can act on. That is why the onset-error measurement lives on the synthetic lane: it is '
            + 'the only place the true onset instant exists. This is a limitation of the product, not a '
            + 'footnote.'}
      </Callout>
      <h2>{es ? 'El informe técnico' : 'The technical report'}</h2>
      <p>
        {es
          ? 'Este estudio está publicado como informe técnico con DOI permanente: '
          : 'This study is published as a technical report with a permanent DOI: '}
        <em>{es
          ? 'Regime Conditioning Recovers Detection, Not Localisation: An Honest Benchmark for Fault '
            + 'Onset on Load-Varying Fleet Telemetry'
          : 'Regime Conditioning Recovers Detection, Not Localisation: An Honest Benchmark for Fault '
            + 'Onset on Load-Varying Fleet Telemetry'}</em>
        {es ? ' (Zenodo, CC-BY-4.0, 2026). Citar el DOI de concepto ' : ' (Zenodo, CC-BY-4.0, 2026). Cite the concept DOI '}
        <a href="https://doi.org/10.5281/zenodo.22002431" target="_blank" rel="noreferrer">10.5281/zenodo.22002431</a>
        {es ? '; la v1.0 es ' : '; v1.0 is '}
        <a href="https://doi.org/10.5281/zenodo.22002432" target="_blank" rel="noreferrer">10.5281/zenodo.22002432</a>.
        {es
          ? ' Las tres figuras del informe se regeneran desde los mismos artefactos que renderizan '
            + 'estas páginas (manuscripts/ en el repositorio), y su apéndice es el registro de '
            + 'defectos: la misma tabla de la pestaña Defectos de Implementación.'
          : ' The report\'s three figures regenerate from the same artifacts these pages render '
            + '(manuscripts/ in the repository), and its appendix is the defect record: the same table '
            + 'as Implementation\'s Defects tab.'}
      </p>
      <Refs ids={['saxena2008', 'aps2016', 'componentx2024', 'hendrickx2020', 'carpentier2024', 'dimidov2026']}
        label={es ? 'Referencias' : 'References'} />
    </div>
  );
}
