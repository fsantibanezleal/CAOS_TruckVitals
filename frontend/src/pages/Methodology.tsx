import { Callout, Cite, Equation, InlineMath, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import { useLang } from '../lib/i18n.ts';

export default function Methodology() {
  const es = useLang() === 'es';

  const tabs: TabDef[] = [
    { id: 'protocol', label: es ? 'El protocolo' : 'The protocol', content: <Protocol es={es} /> },
    { id: 'regimes', label: es ? 'Regímenes' : 'Regimes', content: <Regimes es={es} /> },
    { id: 'classical', label: es ? 'Clásicos' : 'Classical', content: <Classical es={es} /> },
    { id: 'multivariate', label: es ? 'Multivariado' : 'Multivariate', content: <Multivariate es={es} /> },
    { id: 'streaming', label: 'Streaming', content: <Streaming es={es} /> },
    { id: 'learned', label: es ? 'Aprendidos' : 'Learned', content: <Learned es={es} /> },
    { id: 'retrospective', label: es ? 'Retrospectivo' : 'Retrospective', content: <Retrospective es={es} /> },
    { id: 'metrics', label: es ? 'Métricas' : 'Metrics', content: <Metrics es={es} /> },
    { id: 'confounds', label: es ? 'Confundidores' : 'Confounds', content: <Confounds es={es} /> },
  ];

  return (
    <div className="page-body tv-prose">
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="lead">
        {es
          ? 'La comparación es fácil de hacer mal de maneras que se ven bien. Estas son las reglas que la '
            + 'hacen significar algo, y los confundidores que se encontraron y eliminaron al aplicarlas.'
          : 'The comparison is easy to get wrong in ways that look right. These are the rules that make it '
            + 'mean something, and the confounds that were found and removed while applying them.'}
      </p>
      <Tabs tabs={tabs} ariaLabel={es ? 'Metodología' : 'Methodology'} />
    </div>
  );
}

function Protocol({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Las cinco reglas' : 'The five rules'}</h2>

      <h3>{es ? '1. Los dos brazos son indistinguibles para el detector' : '1. The two arms are indistinguishable to the detector'}</h3>
      <p>
        {es
          ? 'El brazo crudo y el brazo de residuos se entregan al detector como el mismo tipo de objeto, '
            + 'con el mismo eje de tiempo y los mismos nombres de canal. El detector no puede saber cuál '
            + 'está mirando. Si pudiera, la comparación mediría la implementación y no el método.'
          : 'The raw arm and the residual arm are handed to the detector as the same kind of object, with '
            + 'the same time axis and the same channel names. The detector cannot tell which it is looking '
            + 'at. If it could, the comparison would be measuring the implementation rather than the method.'}
      </p>

      <h3>{es ? '2. Presupuesto de falsas alarmas igualado, no umbral igualado' : '2. Matched false-alarm budget, not matched threshold'}</h3>
      <p>
        {es
          ? 'Un residuo z-scoreado y un canal crudo en bar viven en escalas distintas, así que comparar al '
            + 'mismo umbral no compara nada. Cada brazo recibe el umbral que produce la MISMA tasa de falsas '
            + 'alarmas por unidad de tiempo, calibrada en una ventana de calibración separada, y las tasas '
            + 'de detección se comparan en ese punto.'
          : 'A z-scored residual and a raw channel in bar live on different scales, so comparing at the same '
            + 'threshold compares nothing. Each arm is given the threshold producing the SAME false-alarm '
            + 'rate per unit time, calibrated on a held-out calibration window, and detection rates are '
            + 'compared at that operating point.'}
      </p>

      <h3>{es ? '3. Las alarmas son EVENTOS, no muestras' : '3. Alarms are EVENTS, not samples'}</h3>
      <p>
        {es
          ? 'Un estadístico que pasa una hora sobre el umbral es UNA alarma que un operador atiende, no '
            + 'sesenta. Todas las tasas cuentan flancos de subida. Esto tiene una consecuencia que costó un '
            + 'defecto: la tasa contada por eventos NO es monótona en el umbral, así que la búsqueda del '
            + 'umbral que cumple un presupuesto debe descender desde el extremo que nunca dispara. La '
            + 'primera versión ascendía y seleccionaba un detector permanentemente en alarma, que produce '
            + 'exactamente un flanco de subida y por tanto una tasa aparentemente perfecta.'
          : 'A statistic that sits above the threshold for an hour is ONE alarm an operator responds to, not '
            + 'sixty. Every rate counts rising edges. This has a consequence that cost a defect: the '
            + 'event-counted rate is NOT monotone in the threshold, so the search for a threshold meeting a '
            + 'budget must descend from the never-fires end. The first version ascended and selected a '
            + 'permanently-alarming detector, which produces exactly one rising edge and therefore an '
            + 'apparently perfect rate.'}
      </p>

      <h3>{es ? '4. El bootstrap es sobre UNIDADES, no sobre muestras' : '4. Bootstrap over UNITS, not over samples'}</h3>
      <p>
        {es
          ? 'Las muestras dentro de una máquina están fuertemente autocorrelacionadas. Remuestrear muestras '
            + 'produce intervalos de confianza que se estrechan con la frecuencia de muestreo, lo que es una '
            + 'forma de fabricar significancia subiendo el sample rate. El remuestreo es sobre máquinas.'
          : 'Samples within one machine are heavily autocorrelated. Resampling samples produces confidence '
            + 'intervals that narrow with the sampling frequency, which is a way of manufacturing '
            + 'significance by turning up the sample rate. The resampling is over machines.'}
      </p>

      <h3>{es ? '5. Nada se ajusta sobre el registro que juzga' : '5. Nothing is fitted on the record it judges'}</h3>
      <p>
        {es
          ? 'El modelo de régimen y las estadísticas del residuo se ajustan en una ventana sana de línea '
            + 'base; el umbral se elige en una ventana de calibración posterior y disjunta; la detección se '
            + 'mide en lo que queda. El umbral es una cantidad de FLOTA. Un umbral por unidad se ajustaría '
            + 'al registro que evalúa, que es la forma más común en que este tipo de gráfico se favorece.'
          : 'The regime model and the residual statistics are fitted on a healthy baseline window; the '
            + 'threshold is chosen on a later, disjoint calibration window; detection is measured on what '
            + 'remains. The threshold is a FLEET quantity. A per-unit threshold would be fitted on the '
            + 'record it evaluates, which is the most common way this kind of chart flatters itself.'}
      </p>
    </div>
  );
}

function Regimes({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Cómo se define un régimen' : 'How a regime is defined'}</h2>
      <p>
        {es
          ? 'Un régimen se define SOLO por canales de contexto: carga útil, pendiente, velocidad. Nunca por '
            + 'los canales que se monitorean. Si el régimen se definiera con la temperatura de freno, y la '
            + 'falla es un freno rozando, la segmentación absorbería la falla y el residuo quedaría plano. '
            + 'Esa separación es lo que hace que la comparación no sea circular.'
          : 'A regime is defined ONLY by context channels: payload, grade, speed. Never by the channels '
            + 'being monitored. If the regime were defined using brake temperature, and the fault is a '
            + 'dragging brake, the segmentation would absorb the fault and the residual would go flat. That '
            + 'separation is what keeps the comparison from being circular.'}
      </p>

      <p>{es ? 'Tres formas de obtener la etiqueta de régimen, todas implementadas:' : 'Three ways to get the regime label, all implemented:'}</p>
      <ul>
        <li>
          <strong>observed</strong>{' '}
          {es
            ? 'la condición operativa viene declarada en el dato (C-MAPSS la trae). Es el límite superior: '
              + 'no hay error de agrupamiento.'
            : 'the operating condition is declared in the data (C-MAPSS ships it). This is the ceiling: '
              + 'there is no clustering error.'}
        </li>
        <li>
          <strong>clustered</strong>{' '}
          {es
            ? 'k-means sobre el contexto, con un radio de novedad: una muestra más lejos que el radio del '
              + 'centroide más cercano queda SIN ASIGNAR.'
            : 'k-means on the context, with a novelty radius: a sample further than the radius from the '
              + 'nearest centroid is left UNASSIGNED.'}
        </li>
        <li>
          <strong>regression</strong>{' '}
          {es
            ? 'se regresiona cada canal monitoreado sobre el contexto y se usa el residuo de la regresión. '
              + 'No hay etiquetas discretas, así que la cobertura es 1.00 por construcción.'
            : 'regress each monitored channel on the context and use the regression residual. There are no '
              + 'discrete labels, so coverage is 1.00 by construction.'}
        </li>
      </ul>

      <Equation
        tex={String.raw`r_t = \frac{x_t - \hat{\mu}_{k(t)}}{\hat{\sigma}_{k(t)}}, \qquad
          k(t) = \begin{cases} \arg\min_j \lVert c_t - \mu_j \rVert & \text{if } \min_j \lVert c_t - \mu_j\rVert \le \rho \\ -1 & \text{otherwise}\end{cases}`}
        caption={es
          ? 'El caso -1 no se rellena ni se ajusta al vecino más cercano. Queda como hueco.'
          : 'The -1 case is not filled and not snapped to the nearest neighbour. It stays a gap.'}
      />

      <Callout variant="honest" title={es ? 'Un defecto real, encontrado en datos reales' : 'A real defect, found on real data'}>
        {es
          ? 'C-MAPSS sensor_06 mantiene 21.61 durante toda una ventana de línea base y reporta una '
            + 'desviación estándar de 7.1e-15, en 43 de 100 unidades. Un paso de cuantización de 0.01 más '
            + 'adelante se convierte en un z-score de 1.4e12 y un CUSUM de 8.4e12. Como el estadístico '
            + 'multivariado es un máximo entre canales, UNA unidad fijaba el umbral de toda la flota y la '
            + 'tasa de detección caía de 0.79 a 0.07. Todos los escaladores se protegían con spread > 0, '
            + 'que un 7e-15 estrictamente positivo aprueba. Corregido en regimecpd 0.09.001 con un piso '
            + 'relativo a la magnitud del canal.'
          : 'C-MAPSS sensor_06 holds 21.61 across an entire baseline window and reports a standard '
            + 'deviation of 7.1e-15, on 43 of 100 units. A 0.01 quantisation step later becomes a z-score '
            + 'of 1.4e12 and a CUSUM of 8.4e12. Because the multivariate statistic is a maximum across '
            + 'channels, ONE unit set the threshold for the whole fleet and detection fell from 0.79 to '
            + '0.07. Every scaler guarded with spread > 0, which a strictly positive 7e-15 passes. Fixed in '
            + 'regimecpd 0.09.001 with a floor relative to the channel\'s own magnitude.'}
      </Callout>
    </div>
  );
}

function Metrics({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Métricas que significan algo' : 'Metrics that mean something'}</h2>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Métrica' : 'Metric'}</th>
              <th>{es ? 'Definición' : 'Definition'}</th>
              <th>{es ? 'Por qué esta y no otra' : 'Why this one'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'Tasa de detección' : 'Detection rate'}</td>
              <td>{es ? 'fracción de unidades con falla cuyo primer flanco de subida ocurre en o después del inicio' : 'fraction of faulty units whose first rising edge is at or after the onset'}</td>
              <td>{es ? 'una alarma antes del inicio no es una detección temprana, es una falsa alarma' : 'an alarm before the onset is not an early detection, it is a false alarm'}</td>
            </tr>
            <tr>
              <td>{es ? 'Falsas alarmas por unidad de tiempo' : 'False alarms per unit time'}</td>
              <td>{es ? 'flancos de subida durante exposición sana, por camión-mes' : 'rising edges during healthy exposure, per truck-month'}</td>
              <td>{es ? 'es lo que consume el tiempo de un operador; una tasa por muestra no' : 'this is what consumes an operator\'s time; a per-sample rate does not'}</td>
            </tr>
            <tr>
              <td>{es ? 'Retardo de detección' : 'Detection delay'}</td>
              <td>{es ? 'mediana de (primera alarma - inicio) sobre unidades detectadas' : 'median of (first alarm - onset) over detected units'}</td>
              <td>{es ? 'se reporta junto a la tasa de detección, nunca solo: detectar tarde el 100% y temprano el 5% no se comparan con un número' : 'reported beside the detection rate, never alone: detecting 100% late and 5% early are not one number'}</td>
            </tr>
            <tr>
              <td>{es ? 'Error de inicio vs azar' : 'Onset error vs chance'}</td>
              <td>{es ? 'error del punto de cambio más cercano, DIVIDIDO por el error de una segmentación con la misma cantidad de cortes al azar' : 'error of the nearest changepoint, DIVIDED by the error of a segmentation with the same number of cuts placed at random'}</td>
              <td>{es ? 'tomar el corte más cercano es optimista y mejora solo con hacer más cortes; el nivel de azar es lo que lo cobra' : 'taking the nearest cut is optimistic and improves by making more cuts; the chance level is what prices that in'}</td>
            </tr>
            <tr>
              <td>{es ? 'Curva de presupuesto' : 'Alarm-budget curve'}</td>
              <td>{es ? 'detección alcanzable a cada presupuesto de falsas alarmas' : 'reachable detection at each false-alarm budget'}</td>
              <td>{es ? 'un solo punto de operación esconde si la ventaja sobrevive a cambiar el presupuesto' : 'a single operating point hides whether the advantage survives changing the budget'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'La métrica que casi produce un resultado falso' : 'The metric that nearly produced a false result'}>
        {es
          ? 'El error de inicio sin nivel de azar habría mostrado al brazo condicionado entre 2 y 7 veces '
            + 'más preciso en CADA semilla. Corregido por azar, la diferencia pareada es -0.08 +/- 0.74. '
            + 'Toda la ventaja aparente se explica por producir una mediana de 11.5 a 14 puntos de cambio '
            + 'en vez de 2 a 3.'
          : 'Onset error without a chance level would have shown the conditioned arm 2 to 7 times more '
            + 'accurate on EVERY seed. Chance-corrected, the paired difference is -0.08 +/- 0.74. The entire '
            + 'apparent advantage is explained by producing a median of 11.5 to 14 changepoints against '
            + '2 to 3.'}
      </Callout>
    </div>
  );
}

function Confounds({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Confundidores encontrados y eliminados' : 'Confounds found and removed'}</h2>
      <p>
        {es
          ? 'El resultado principal compara FD001 (una condición operativa) con FD002 (seis). Dos cosas '
            + 'además del régimen difieren entre esos subconjuntos, y ambas fueron eliminadas antes de '
            + 'reportar nada.'
          : 'The headline compares FD001 (one operating condition) with FD002 (six). Two things besides the '
            + 'regime differ between those subsets, and both were removed before anything was reported.'}
      </p>

      <h3>{es ? 'Confundidor 1: cantidad de canales' : 'Confound 1: channel count'}</h3>
      <p>
        {es
          ? 'FD002 tiene 21 sensores informativos contra 15 de FD001, y los de FD001 son un subconjunto '
            + 'estricto. Como el estadístico es un máximo entre canales, más canales suben la tasa de falsas '
            + 'alarmas por sí solos, lo que confundiría "más regímenes" con "más canales". El contraste '
            + 'corre sobre el conjunto COMÚN.'
          : 'FD002 has 21 informative sensors against FD001\'s 15, and FD001\'s are a strict subset. Because '
            + 'the statistic is a maximum across channels, more channels raise the false-alarm rate on their '
            + 'own, which would confound "more regimes" with "more channels". The contrast runs on the '
            + 'COMMON set.'}
      </p>

      <h3>{es ? 'Confundidor 2: selección de unidades' : 'Confound 2: unit selection'}</h3>
      <p>
        {es
          ? 'Las ventanas de ajuste y calibración eran fracciones del largo del registro. Como las unidades '
            + 'de C-MAPSS tienen largos muy distintos, eso descartaba unidades de forma sistemáticamente '
            + 'distinta en cada subconjunto: 38 de 100 en uno y 30 de 100 en el otro. Ahora son conteos '
            + 'ABSOLUTOS de ciclos, y las unidades descartadas se cuentan dentro del artefacto.'
          : 'The fit and calibration windows were fractions of the record length. Because C-MAPSS units have '
            + 'very different lengths, that dropped units differently in each subset: 38 of 100 in one and '
            + '30 of 100 in the other. They are now ABSOLUTE cycle counts, and the dropped units are counted '
            + 'into the artifact.'}
      </p>

      <h3>{es ? 'Novedad: qué es nuevo y qué no' : 'Novelty: what is new and what is not'}</h3>
      <p>
        {es
          ? 'Carpentier et al. '
          : 'Carpentier et al. '}
        <Cite id="carpentier2024" />
        {es
          ? ' ya modelan camiones Scania de forma "contextual". Se leyó el texto completo antes de hacer '
            + 'cualquier afirmación de novedad. Su contexto es una COHORTE por vehículo: se agrupa la flota '
            + 'jerárquicamente y se entrena un modelo por grupo, asignado una vez por vehículo según su '
            + 'especificación. No hay segmentación temporal, ni etiqueta de régimen por instante, ni canal '
            + 'de residuo. Lo suyo particiona la FLOTA; esto particiona la LÍNEA DE TIEMPO. Las dos cosas '
            + 'componen sin interactuar.'
          : ' already model Scania trucks "contextually". Their full text was read before any novelty claim '
            + 'was made. Their context is a per-vehicle COHORT: the fleet is hierarchically clustered and '
            + 'one model is trained per cluster, assigned once per vehicle by specification. There is no '
            + 'time segmentation, no per-timestep regime label and no residual channel. Theirs partitions '
            + 'the FLEET; this partitions the TIMELINE. The two compose without interacting.'}
      </p>

      <p className="tv-cap">
        {es ? 'Base clásica y SOTA: ' : 'Classical and SOTA basis: '}
        <Cite id="page1954" />, <Cite id="roberts1959" />, <Cite id="shewhart1931" />,{' '}
        <Cite id="hotelling1947" />, <Cite id="hinkley1971" />, <Cite id="jackson1979" />,{' '}
        <Cite id="kourti1996" />, <Cite id="westerhuis2000" />, <Cite id="ku1995" />,{' '}
        <Cite id="adams2007" />, <Cite id="killick2012" />, <Cite id="bifet2007" />,{' '}
        <Cite id="raab2020" />, <Cite id="yeh2017" />, <Cite id="liu2008" />,{' '}
        <Cite id="scholkopf2001" />, <Cite id="vovk2005" />, <Cite id="gibbs2021" />.{' '}
        <InlineMath tex={String.raw`\;`} />
      </p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// The five method-tier tabs below are TRANSCRIBED from the engine-verified dossiers in the plan
// state (methods/, 2026-08-17), not written from memory. Every equation is the implementation's
// form, not the paper's, and every divergence between the two is stated. Bake numbers quote the
// committed artifact (seed 0, 36 units, 16 faulty, budget 1.0 false alarm per truck-month).
// ------------------------------------------------------------------------------------------------

function Classical({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Los cuatro peldaños clásicos' : 'The four classical rungs'}</h2>
      <p>
        {es
          ? 'Shewhart, CUSUM, EWMA y Page-Hinkley comparten toda su maquinaria de entrada, y esa '
            + 'maquinaria decide más de lo que decide cualquiera de los cuatro. Cada canal se '
            + 'estandariza contra su propia línea base sana; cada detector corre por canal; el '
            + 'estadístico reportado es el MÁXIMO entre canales, nunca el promedio, porque promediar '
            + 'diluye una falla de un canal por la cantidad de canales y la evidencia de un inicio '
            + 'suele ser un canal moviéndose. El umbral no vive en ningún detector: lo aplica la capa '
            + 'de calibración contra un presupuesto de falsas alarmas declarado, así que los cuatro '
            + 'peldaños se leen sobre la misma curva de presupuesto.'
          : 'Shewhart, CUSUM, EWMA and Page-Hinkley share all of their input machinery, and that '
            + 'machinery decides more than any of the four does. Each channel is standardised against '
            + 'its own healthy baseline; each detector runs per channel; the reported statistic is the '
            + 'MAXIMUM across channels, never the mean, because averaging dilutes a one-channel fault '
            + 'by the channel count and onset evidence is usually one channel moving. The threshold '
            + 'lives in no detector: the calibration layer applies it against a declared false-alarm '
            + 'budget, so all four rungs sit on the same budget curve.'}
      </p>
      <Equation
        tex={String.raw`z_{t,j} = \frac{x_{t,j} - \mu_j}{s_j}, \qquad
          s_j = \begin{cases}\sigma_j & \sigma_j > \max(10^{-12},\ 10^{-8}\,|\mu_j|)\\ 1 & \text{otherwise}\end{cases}`}
        caption={es
          ? 'El piso relativo no está en ningún paper. Existe porque un canal de C-MAPSS constante '
            + 'salvo ruido de coma flotante (sigma 7.1e-15) pasó el guardia spread > 0, convirtió un '
            + 'paso de cuantización de 0.01 en un z-score de 1.4e12, y la detección de la flota cayó '
            + 'de 0.79 a 0.07. Un canal degenerado queda en unidades crudas con divisor 1.'
          : 'The relative floor is in no paper. It exists because a C-MAPSS channel constant to within '
            + 'floating-point noise (sigma 7.1e-15) passed the spread > 0 guard, turned a 0.01 '
            + 'quantisation step into a z-score of 1.4e12, and fleet detection fell from 0.79 to 0.07. '
            + 'A degenerate channel stays in raw units with divisor 1.'}
      />
      <p>
        {es
          ? 'La política de NaN es uniforme: una muestra NaN deja cada recursión intacta y emite NaN '
            + 'en ese índice. Tratar NaN como cero inyectaría una observación bajo control fabricada '
            + 'dentro del acumulador.'
          : 'The NaN policy is uniform: a NaN sample leaves every recursion untouched and emits NaN at '
            + 'that index. Treating NaN as zero would feed a fabricated in-control observation into '
            + 'the accumulator.'}
      </p>

      <h3>Shewhart <Cite id="shewhart1931" /></h3>
      <p>
        {es
          ? 'Sin memoria: un umbral fijo sobre la desviación absoluta estandarizada de cada '
            + 'observación individual. Funciona porque bajo la distribución de la línea base un |z| '
            + 'grande es raro; falla en desplazamientos pequeños y persistentes porque ninguna muestra '
            + 'individual cruza. Su segunda debilidad es la tesis entera de este producto: en una '
            + 'máquina de carga variable la distribución bajo control es una MEZCLA de regímenes, y un '
            + 'solo par (mu, sigma) no ajusta a ninguno.'
          : 'Memoryless: a fixed threshold on the standardised absolute deviation of each single '
            + 'observation. It works because under the baseline distribution a large |z| is rare; it '
            + 'fails on small persistent shifts because no single sample crosses. Its second weakness '
            + 'is this product\'s entire thesis: on a load-varying machine the in-control distribution '
            + 'is a MIXTURE over regimes, and one (mu, sigma) pair fits none of them.'}
      </p>
      <Equation
        tex={String.raw`T_t = \max_j \left| z_{t,j} \right|`}
        caption={es
          ? 'La forma de Shewhart (1931) son pares de límites de control sobre medias de subgrupos; '
            + 'esta es una carta de individuos, bilateral por el valor absoluto, con el umbral '
            + 'externalizado. En el horneado, el brazo crudo detecta 0.75 con retardo 190 min y el '
            + 'residuo 1.00 con 86 min, el mejor retardo del nivel clásico. El umbral crudo calibrado '
            + 'cayó en 3.03: la búsqueda de presupuesto redescubrió sola el límite 3-sigma de los '
            + 'libros.'
          : 'Shewhart (1931) is pairs of control limits on subgroup means; this is an individuals '
            + 'chart, two-sided via the absolute value, threshold externalised. In the bake, the raw '
            + 'arm detects 0.75 at 190 min delay and the residual arm 1.00 at 86 min, the best delay '
            + 'of the classical tier. The calibrated raw threshold landed at 3.03: the budget search '
            + 'independently rediscovered the textbook 3-sigma limit.'}
      />

      <h3>CUSUM <Cite id="page1954" /></h3>
      <p>
        {es
          ? 'Dos acumuladores por canal suman la desviación estandarizada menos una tolerancia k y se '
            + 'reinician en cero. El reinicio ES el mecanismo: sin él, la suma es un paseo aleatorio '
            + 'sin deriva que cruza cualquier umbral solo con ruido, así que una suma acumulada simple '
            + 'no es un detector. Contra un desplazamiento persistente mayor que k, la suma crece '
            + 'aproximadamente a (delta - k) por muestra: lo que Shewhart nunca ve, CUSUM lo acumula '
            + 'linealmente.'
          : 'Two accumulators per channel add the standardised deviation minus an allowance k and '
            + 'reset at zero. The reset IS the mechanism: without it the sum is a zero-drift random '
            + 'walk that crosses any threshold on noise alone, so a plain cumulative sum is not a '
            + 'detector. Against a persistent shift larger than k the sum grows at about (delta - k) '
            + 'per sample: what Shewhart never sees, CUSUM accumulates linearly.'}
      </p>
      <Equation
        tex={String.raw`S^{+}_{t,j} = \max\!\left(0,\; S^{+}_{t-1,j} + z_{t,j} - k\right), \qquad
          S^{-}_{t,j} = \max\!\left(0,\; S^{-}_{t-1,j} - z_{t,j} - k\right), \qquad
          T_t = \max_j \max\!\left(S^{+}_{t,j},\, S^{-}_{t,j}\right)`}
        caption={es
          ? 'La escalera pasa k = 0.5 (el default del motor), apuntando a un desplazamiento de un '
            + 'sigma. El intervalo de decisión h de Page queda externalizado. Horneado: 1.00 en ambos '
            + 'brazos; el condicionamiento compra 13.5 min de retardo mediano (119 contra 105.5).'
          : 'The ladder passes k = 0.5 (the engine default), targeting a one-sigma shift. Page\'s '
            + 'decision interval h is externalised. Bake: 1.00 on both arms; conditioning buys 13.5 '
            + 'min of median delay (119 against 105.5).'}
      />
      <p>
        {es
          ? 'CUSUM expuso el mismo defecto dos veces: primero el piso degenerado de arriba (un canal '
            + 'de sigma 7e-15 acumulado hasta 8.4e12 en datos sanos), y de nuevo en 0.09.004 cuando la '
            + 'rama de residuo lineal entregaba al piso relativo una media que el intercepto fuerza a '
            + 'cero, dejando pasar un canal muerto que dominó 552 de 1199 muestras de un registro '
            + 'completamente sano.'
          : 'CUSUM exposed the same defect twice: first the degenerate floor above (a 7e-15-sigma '
            + 'channel accumulated to 8.4e12 on healthy data), and again in 0.09.004 when the linear '
            + 'residual branch handed the relative floor a mean the intercept forces to zero, letting '
            + 'a dead channel through to drive 552 of 1199 samples on a fully healthy record.'}
      </p>

      <h3>EWMA <Cite id="roberts1959" /></h3>
      <p>
        {es
          ? 'Un promedio móvil con pesos geométricos, normalizado por la desviación EXACTA y variable '
            + 'en el tiempo del suavizador, no por su asíntota. La forma asintótica sobreestima la '
            + 'dispersión de las primeras muestras, así que una carta que la usa desde el inicio tiene '
            + 'una zona muerta al comienzo de cada registro; en una flota con registros cortos y '
            + 'reinicios frecuentes esa zona muerta es pérdida de detección real.'
          : 'A moving average with geometric weights, normalised by the smoother\'s EXACT time-varying '
            + 'standard deviation rather than its asymptote. The asymptotic form overstates the spread '
            + 'of early samples, so a chart using it from the start has a dead zone at the beginning '
            + 'of every record; on a fleet with short records and frequent restarts that dead zone is '
            + 'a real detection loss.'}
      </p>
      <Equation
        tex={String.raw`w_{t,j} = \lambda z_{t,j} + (1-\lambda) w_{t-1,j}, \qquad
          \sigma_{w,j}^2(n_{t,j}) = \frac{\lambda}{2-\lambda}\left[1 - (1-\lambda)^{2 n_{t,j}}\right], \qquad
          T_t = \max_j \frac{|w_{t,j}|}{\sigma_{w,j}(n_{t,j})}`}
        caption={es
          ? 'Divergencia deliberada de todo libro de texto: el exponente es n, la cantidad de '
            + 'observaciones FINITAS que ese canal realmente vio, no el índice de reloj t. Un canal '
            + 'que estuvo en NaN un tramo vio genuinamente menos observaciones y su límite de control '
            + 'debe reflejarlo. Horneado: 1.00 en ambos brazos, 113 min crudo y 90 min residuo.'
          : 'A deliberate divergence from every textbook: the exponent is n, the count of FINITE '
            + 'observations that channel actually saw, not the wall-clock index t. A channel that was '
            + 'NaN for a stretch genuinely saw fewer observations and its control limit must reflect '
            + 'that. Bake: 1.00 on both arms, 113 min raw and 90 min residual.'}
      />
      <p>
        {es
          ? 'La escalera pasa lambda = 0.1, memoria más larga que el default 0.2 del motor. Una '
            + 'afirmación que el autor escribió y tuvo que corregir: "lambda pequeño reacciona más '
            + 'lento" es cierta del valor suavizado CRUDO y falsa del estadístico estandarizado. Para '
            + 'un desplazamiento sostenido z el estadístico tiende a |z| dividido por la raíz de '
            + 'lambda/(2-lambda), que CRECE cuando lambda baja. El costo real de lambda pequeño es la '
            + 'memoria: convierte un pico aislado en una excursión larga, lo que interactúa con las '
            + 'falsas alarmas contadas por eventos. El límite exacto variable no está en Roberts '
            + '(1959); su fuente canónica (Lucas y Saccucci 1990) no está en el registro de citas y '
            + 'se nombra aquí sin verificar contra la fuente primaria.'
          : 'The ladder passes lambda = 0.1, longer memory than the engine default 0.2. A claim the '
            + 'author wrote and had to correct: "small lambda reacts more slowly" is true of the RAW '
            + 'smoothed value and false of the standardised statistic. For a sustained shift z the '
            + 'statistic approaches |z| over the square root of lambda/(2-lambda), which GROWS as '
            + 'lambda shrinks. Small lambda\'s real cost is memory: it turns an isolated spike into a '
            + 'long excursion, which interacts with event-counted false alarms. The exact time-varying '
            + 'limit is not in Roberts (1959); its canonical source (Lucas and Saccucci 1990) is not '
            + 'in the citation registry and is named here unverified against the primary source.'}
      </p>

      <h3>Page-Hinkley <Cite id="page1954" /> <Cite id="hinkley1971" /></h3>
      <p>
        {es
          ? 'Por canal: acumular la desviación estandarizada menos una deriva permitida delta, seguir '
            + 'el mínimo corrido de esa suma, y reportar cuánto subió la suma sobre su propio mínimo. '
            + 'Bajo control la suma deriva hacia abajo a tasa delta y la brecha queda pequeña; tras un '
            + 'desplazamiento mayor que delta la brecha crece linealmente. La forma espejada captura '
            + 'los desplazamientos hacia abajo.'
          : 'Per channel: accumulate the standardised deviation minus an allowed drift delta, track '
            + 'the running minimum of that sum, and report how far the sum has risen above its own '
            + 'minimum. In control the sum drifts down at rate delta and the gap stays small; after a '
            + 'shift larger than delta the gap grows linearly. The mirrored form catches downward '
            + 'shifts.'}
      </p>
      <Equation
        tex={String.raw`m^{+}_{t,j} = m^{+}_{t-1,j} + z_{t,j} - \delta, \qquad
          M^{+}_{t,j} = \min\!\left(M^{+}_{t-1,j},\, m^{+}_{t,j}\right), \qquad
          \mathrm{PH}^{+}_{t,j} = m^{+}_{t,j} - M^{+}_{t,j}`}
        caption={es
          ? 'La escalera pasa delta = 0.05, diez veces el default del motor. Horneado: 1.00 en ambos '
            + 'brazos pero los PEORES retardos del nivel (198.5 y 183.5 min contra 119 y 105.5 de '
            + 'CUSUM al mismo presupuesto).'
          : 'The ladder passes delta = 0.05, ten times the engine default. Bake: 1.00 on both arms but '
            + 'the WORST delays of the tier (198.5 and 183.5 min against CUSUM\'s 119 and 105.5 at the '
            + 'same budget).'}
      />
      <Callout variant="honest" title={es ? 'No es un cuarto método independiente' : 'Not an independent fourth method'}>
        {es
          ? 'Page-Hinkley es una variante de CUSUM de la misma construcción de 1954: la recursión con '
            + 'reinicio en cero y la forma de mínimo corrido son el mismo estadístico cuando delta '
            + 'es igual a k, y la suite del motor fija correlación sobre 0.98 a tolerancia igual. '
            + 'Contarlos como dos líneas base vencidas inflaría cualquier afirmación del tipo '
            + '"vencimos a N métodos". Además, el propio motor declara que la referencia exacta de '
            + 'Hinkley no fue verificada contra la fuente primaria: la implementación sigue la '
            + 'formulación estándar, no la notación de un paper específico.'
          : 'Page-Hinkley is a CUSUM variant from the same 1954 construction: the reset-at-zero '
            + 'recursion and the running-minimum form are the same statistic when delta equals k, and '
            + 'the engine suite pins correlation above 0.98 at equal allowance. Counting them as two '
            + 'beaten baselines would inflate any "we beat N methods" claim. The engine also states '
            + 'plainly that the exact Hinkley reference was not verified against the primary source: '
            + 'the implementation follows the standard formulation, not a specific paper\'s notation.'}
      </Callout>
    </div>
  );
}

function Multivariate({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Un modelo PCA, dos estadísticos opuestos' : 'One PCA model, two opposite statistics'}</h2>
      <p>
        {es
          ? 'T-cuadrado y SPE son dos vistas del MISMO objeto ajustado: un PCA sobre datos '
            + 'autoescalados de la línea base sana (SVD de los datos centrados, no eigendescomposición '
            + 'de la covarianza, por condicionamiento numérico), reteniendo las componentes que '
            + 'explican el 95 por ciento de la varianza. T-cuadrado vive DENTRO del subespacio '
            + 'retenido: máquina en un lugar inusual a lo largo de direcciones en que normalmente '
            + 'varía. SPE vive FUERA: la norma al cuadrado de lo que el modelo no puede reconstruir, '
            + 'una relación entre canales que se rompió. Capturan fallas genuinamente distintas, '
            + 'ninguno subsume al otro, y reportar solo uno es el error común que el propio módulo '
            + 'del motor señala.'
          : 'T-squared and SPE are two views of the SAME fitted object: a PCA on autoscaled healthy '
            + 'baseline data (SVD of the centred data, not an eigendecomposition of the covariance, '
            + 'for numerical conditioning), retaining the components explaining 95 percent of the '
            + 'variance. T-squared lives INSIDE the retained subspace: the machine in an unusual place '
            + 'along directions it normally varies in. SPE lives OUTSIDE: the squared norm of what the '
            + 'model cannot reconstruct, a between-channel relationship that broke. They catch '
            + 'genuinely different faults, neither subsumes the other, and reporting only one is the '
            + 'common mistake the engine\'s own module calls out.'}
      </p>
      <Equation
        tex={String.raw`T^2_t = \sum_{i=1}^{a} \frac{t_{t,i}^2}{\lambda_i}, \qquad
          \mathbf{t}_t = P^{\top} z_t, \qquad
          \mathrm{SPE}_t = \lVert z_t - P P^{\top} z_t \rVert^2`}
        caption={es
          ? 'Ambos sobre la muestra autoescalada z, no sobre x cruda: los estadísticos están en '
            + 'unidades autoescaladas y los umbrales no se transfieren entre ajustes. Esta es la '
            + 'variante de subespacio PCA, no la forma de covarianza completa de Hotelling (1947); '
            + 'la restricción al subespacio es práctica estándar de MSPC y a la vez una divergencia '
            + 'declarada de la fuente primaria.'
          : 'Both on the autoscaled sample z, not on raw x: the statistics are in autoscaled units and '
            + 'thresholds do not transfer between fits. This is the PCA-subspace variant, not '
            + 'Hotelling\'s (1947) full-covariance form; the subspace restriction is standard MSPC '
            + 'practice and also a stated divergence from the primary source.'}
      />
      <p>
        {es
          ? 'Guardias del motor que ningún paper tiene: componentes retenidas con eigenvalor bajo '
            + 'max(total, 1) por 1e-12 se degradan al subespacio residual, porque dividir por un '
            + 'eigenvalor numéricamente cero convertiría ruido de redondeo en un estadístico no '
            + 'acotado; y el piso relativo de escala degenerada del nivel clásico aplica igual aquí.'
          : 'Engine guards no paper has: retained components with eigenvalue at or below max(total, 1) '
            + 'times 1e-12 are demoted into the residual subspace, because dividing by a numerically '
            + 'zero eigenvalue would turn rounding noise into an unbounded statistic; and the '
            + 'classical tier\'s degenerate-scale relative floor applies here identically.'}
      </p>

      <h3>{es ? 'El resultado más grande de la escalera' : 'The largest result on the ladder'}</h3>
      <p>
        {es
          ? 'T-cuadrado crudo detecta 1 de 16 camiones con falla (0.0625, retardo 532 min). El MISMO '
            + 'estadístico sobre residuos intra-régimen detecta 16 de 16 con retardo 149.5 min: el '
            + 'mayor efecto de condicionamiento de toda la escalera, y es el mecanismo hecho visible. '
            + 'En el brazo crudo el subespacio retenido de un camión está dominado por el ciclo de '
            + 'acarreo (cargado contra vacío), así que una falla que mueve la máquina DENTRO de esa '
            + 'estructura es indistinguible de un cambio de carga normal. El condicionamiento remueve '
            + 'el ciclo de la estructura de correlación. SPE, en cambio, queda en 0.75 en AMBOS '
            + 'brazos: el cuarto de fallas que no detecta nunca rompe la estructura de correlación a '
            + 'esta severidad. Su ganancia es el retardo: de 210.5 a 86 min, 2.4 veces.'
          : 'Raw T-squared detects 1 of 16 faulty trucks (0.0625, delay 532 min). The SAME statistic '
            + 'on within-regime residuals detects 16 of 16 at 149.5 min: the single largest '
            + 'conditioning effect on the ladder, and it is the mechanism made visible. On the raw arm '
            + 'a haul truck\'s retained subspace is dominated by the duty cycle (loaded versus empty), '
            + 'so a fault that moves the machine WITHIN that structure is indistinguishable from a '
            + 'normal load change. Conditioning removes the cycle from the correlation structure. SPE, '
            + 'by contrast, sits at 0.75 on BOTH arms: the quarter of faults it misses never breaks '
            + 'the correlation structure at this severity. Its gain is delay: 210.5 down to 86 min, '
            + '2.4 times.'}
      </p>

      <h3>{es ? 'Los límites publicados se implementan y NO se usan' : 'The published limits are implemented and NOT used'}</h3>
      <p>
        {es
          ? 'El motor implementa el límite chi-cuadrado de T-cuadrado (vía la transformación de '
            + 'Wilson-Hilferty, porque el paquete es numpy puro y rechaza scipy por un cuantil) y el '
            + 'límite de Jackson-Mudholkar para SPE '
          : 'The engine implements the chi-square T-squared limit (via the Wilson-Hilferty '
            + 'transformation, because the package is numpy-only and refuses scipy for one quantile) '
            + 'and the Jackson-Mudholkar SPE limit '}
        <Cite id="jackson1979" />
        {es
          ? ' porque son la contribución publicada de las fuentes primarias y permiten verificar la '
            + 'implementación contra una propiedad declarada. NINGUNA comparación del producto los '
            + 'usa: todas corren por calibración empírica al mismo presupuesto de falsas alarmas, '
            + 'porque dos métodos leídos en sus propios límites preferidos no dicen nada el uno del '
            + 'otro. El límite chi-cuadrado además asume covarianza conocida (la forma F es el '
            + 'enunciado estricto con covarianza estimada) y normalidad multivariada de la línea '
            + 'base, y el código nombra ambas aproximaciones en vez de esconderlas.'
          : ' because they are the published contribution of the primary sources and let the '
            + 'implementation be checked against a stated property. NO product comparison uses them: '
            + 'all run through empirical calibration at the same false-alarm budget, because two '
            + 'methods read at their own preferred limits tell you nothing about each other. The '
            + 'chi-square limit additionally assumes a known covariance (the F-form is the strict '
            + 'statement with an estimated one) and multivariate normality of the baseline, and the '
            + 'code names both approximations rather than hiding them.'}
      </p>
      <Equation
        tex={String.raw`Q_\alpha = \theta_1 \left[ \frac{c_\alpha \sqrt{2\theta_2 h_0^2}}{\theta_1}
          + 1 + \frac{\theta_2 h_0 (h_0 - 1)}{\theta_1^2} \right]^{1/h_0}, \qquad
          \theta_i = \sum_{j > a} \lambda_j^i, \qquad
          h_0 = 1 - \frac{2\theta_1\theta_3}{3\theta_2^2}`}
        caption={es
          ? 'Jackson-Mudholkar (1979), con tres guardias que el paper no tiene; la tercera es la '
            + 'historia del defecto D4 de abajo.'
          : 'Jackson-Mudholkar (1979), with three guards the paper does not have; the third is the D4 '
            + 'defect story below.'}
      />

      <Callout variant="honest" title={es ? 'D4: una corrección que estuvo mal hasta que su propia prueba la atrapó' : 'D4: a fix that was wrong until its own test caught it'}>
        {es
          ? 'El defecto: cuando un canal es combinación lineal exacta de los otros, su eigenvalor '
            + 'residual es redondeo (~1e-30). SPE devolvía redondeo y su límite se escalaba al mismo '
            + 'redondeo, así que la carta parecía calibrada mientras no medía nada, contra una suite '
            + 'de 301 pruebas en verde. La PRIMERA corrección eliminó las direcciones de varianza '
            + 'cero del propio SPE, y eso DESTRUYE el estadístico: una ruptura de una relación lineal '
            + 'exacta cae completa en una de esas direcciones, que es exactamente lo que SPE existe '
            + 'para capturar. La prueba pareada "todavía captura una ruptura real" falló, y la '
            + 'guardia se movió al LÍMITE, donde estaba el defecto real: spe_limit devuelve NaN '
            + 'cuando el subespacio residual es redondeo, porque NaN dice "indefinido", que quien '
            + 'llama puede ver, y un número diminuto dice "calibrado", que es una mentira.'
          : 'The defect: when a channel is an exact linear combination of the others, its residual '
            + 'eigenvalue is roundoff (~1e-30). SPE returned roundoff and its limit scaled itself to '
            + 'the same roundoff, so the chart looked calibrated while measuring nothing, against a '
            + 'GREEN 301-test suite. The FIRST fix dropped the zero-variance directions from SPE '
            + 'itself, and that DESTROYS the statistic: a break in an exact linear relationship lands '
            + 'entirely in one of those directions, which is exactly what SPE exists to catch. The '
            + 'paired "does it still catch a real break" test failed, and the guard moved to the '
            + 'LIMIT, where the actual defect was: spe_limit returns NaN when the residual subspace is '
            + 'roundoff, because NaN says "undefined", which a caller can see, and a tiny number says '
            + '"calibrated", which is a lie.'}
      </Callout>

      <p>
        {es
          ? 'Atribución: las contribuciones de SPE descomponen el estadístico exactamente; las de '
            + 'T-cuadrado usan la forma de Kourti-MacGregor '
          : 'Attribution: SPE contributions decompose the statistic exactly; T-squared contributions '
            + 'use the Kourti-MacGregor form '}
        <Cite id="kourti1996" />
        {es
          ? ' con un valor absoluto agregado (divergencia de la forma publicada con signo, porque las '
            + 'contribuciones con signo pueden cancelarse entre componentes y reportar como no '
            + 'involucrada a una variable que sí carga). Ambas se difuminan sobre canales '
            + 'correlacionados '
          : ' with an added absolute value (a divergence from the signed published form, because '
            + 'signed contributions can cancel across components and report a carrying variable as '
            + 'uninvolved). Both smear onto correlated channels '}
        <Cite id="westerhuis2000" />
        {es
          ? ': acotan un conjunto de candidatos, nunca identifican una causa. La atribución medida '
            + 'del horneado se publica como débil: tasa top-2 de 0.44, y 0 de 4 en pérdida de '
            + 'refrigeración.'
          : ': they narrow a candidate set, never identify a cause. The bake\'s scored attribution is '
            + 'published as weak: top-2 hit rate 0.44, and 0 of 4 on cooling loss.'}
      </p>
    </div>
  );
}

function Streaming({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Tres peldaños de streaming, tres preguntas distintas' : 'Three streaming rungs, three different questions'}</h2>
      <p>
        {es
          ? 'BOCPD pregunta "¿cuánto tiempo llevamos desde el último cambio?", ADWIN pregunta "¿alguna '
            + 'partición de la ventana reciente separa dos medias?", KSWIN pregunta "¿la distribución '
            + 'completa de los últimos minutos sigue siendo la de antes?". Los tres corren en línea '
            + 'con estado constante o acotado, y los tres exponen fallas de lectura distintas que '
            + 'este motor documenta y fija con pruebas.'
          : 'BOCPD asks "how long since the last change?", ADWIN asks "does any split of the recent '
            + 'window separate two means?", KSWIN asks "is the full distribution of the last minutes '
            + 'still the old one?". All three run online with constant or bounded state, and all three '
            + 'expose distinct reading traps this engine documents and pins with tests.'}
      </p>

      <h3>BOCPD <Cite id="adams2007" /></h3>
      <p>
        {es
          ? 'Mantiene un posterior exacto sobre la longitud de corrida r (muestras desde el último '
            + 'cambio) por paso de mensajes: cada hipótesis se puntúa con la probabilidad predictiva '
            + 'de la observación nueva bajo sus estadísticos suficientes acumulados, y luego crece en '
            + 'uno o muere en una corrida nueva. El modelo de observación es Normal-Inverse-Gamma por '
            + 'canal, cuya predictiva conjugada es una t de Student: las colas pesadas importan '
            + 'mecánicamente, porque una corrida con dos observaciones tiene una predictiva ancha y '
            + 'una muestra rara no aniquila la hipótesis de corrida larga, que es exactamente la '
            + 'falla que produce una varianza gaussiana enchufada.'
          : 'It maintains an exact posterior over the run length r (samples since the last change) by '
            + 'message passing: each hypothesis is scored by the predictive probability of the new '
            + 'observation under its accumulated sufficient statistics, then either grows by one or '
            + 'dies into a fresh run. The observation model is a per-channel Normal-Inverse-Gamma '
            + 'whose conjugate predictive is a Student-t: the heavier tails matter mechanically, '
            + 'because a run with two observations behind it has a wide predictive and one unusual '
            + 'sample does not annihilate the long-run hypothesis, which is exactly the failure a '
            + 'plug-in Gaussian variance produces.'}
      </p>
      <Equation
        tex={String.raw`\tilde p(r_t = r+1) = p(r_{t-1} = r)\,\pi_t^{(r)}\,(1 - H), \qquad
          \tilde p(r_t = 0) = \sum_r p(r_{t-1} = r)\,\pi_t^{(r)}\,H, \qquad H = \frac{1}{\lambda}`}
        caption={es
          ? 'La recursión, con renormalización por paso para que la evidencia sea exacta. La '
            + 'escalera pasa hazard_rate 400, warmup 40, max_runs 200.'
          : 'The recursion, renormalised each step so the evidence stays exact. The ladder passes '
            + 'hazard_rate 400, warmup 40, max_runs 200.'}
      />
      <Equation
        tex={String.raw`S_t = p(r_t \le 5 \mid x_{1:t}) \qquad \text{because} \qquad
          p(r_t = 0 \mid x_{1:t}) = \frac{\sum_r p\,\pi\,H}{\sum_r p\,\pi} \equiv H`}
        caption={es
          ? 'La trampa que este motor documenta y fija con una prueba: bajo hazard constante, el '
            + '"probabilidad de punto de cambio" de los libros es idénticamente el hazard, en cada '
            + 'paso, sobre cualquier dato, porque ambas ramas pesan la misma predictiva y el hazard '
            + 'se factoriza. El estadístico emitido es la masa posterior de corrida CORTA (r <= 5), '
            + 'que sí colapsa tras un cambio. El estadístico "changepoint" se conserva en el motor, '
            + 'deliberadamente inútil, con una prueba que afirma que es igual al hazard exactamente.'
          : 'The trap this engine documents and pins with a test: under a constant hazard, the '
            + 'textbook "changepoint probability" is identically the hazard, at every step, on any '
            + 'data, because both recursion branches weight the same predictive and the hazard '
            + 'factors out. The emitted statistic is the SHORT-run posterior mass (r <= 5), which '
            + 'does collapse after a change. The "changepoint" statistic is kept in the engine, '
            + 'deliberately useless, with a test asserting it equals the hazard exactly.'}
      />
      <p>
        {es
          ? 'Horneado: 0.00 en ambos brazos, y ambos ceros están predichos por la propia '
            + 'documentación del motor: la hipótesis de parámetros independientes antes y después '
            + 'del cambio sirve para inicios abruptos; sobre degradaciones graduales reporta un '
            + 'posterior difuso en vez de estar silenciosamente equivocado (esa lectura del cero es '
            + 'interpretación, no un hecho medido del artefacto). Tres defectos reales se '
            + 'encontraron y fijaron aquí: el estadístico plano en el hazard; parámetros NIG leídos '
            + 'por posición del arreglo tras la poda (síntoma indistinguible del primero; ahora la '
            + 'longitud de corrida se sigue explícitamente); y sin calentamiento cada detección caía '
            + 'en la muestra cero porque p(r <= w) es estructuralmente 1 mientras t <= w.'
          : 'Bake: 0.00 on both arms, and both zeros are predicted by the engine\'s own '
            + 'documentation: the independent-parameters assumption suits abrupt onsets; on gradual '
            + 'degradations it reports a diffuse posterior rather than being quietly wrong (that '
            + 'reading of the zero is interpretation, not a measured artifact fact). Three real '
            + 'defects were found and fixed here: the statistic flat at the hazard; NIG parameters '
            + 'read by array position after pruning (symptom indistinguishable from the first; run '
            + 'lengths are now tracked explicitly); and without a warm-up every detection landed on '
            + 'sample zero because p(r <= w) is structurally 1 while t <= w.'}
      </p>

      <h3>ADWIN <Cite id="bifet2007" /></h3>
      <p>
        {es
          ? 'Una ventana creciente de valores recientes; en cada paso pregunta si ALGUNA partición la '
            + 'divide en dos sub-ventanas cuyas medias difieren más que una cota estilo '
            + 'Hoeffding-Bernstein; si sí, descarta la parte VIEJA y marca un cambio. No lleva línea '
            + 'base fija: compara el pasado reciente contra el menos reciente y luego acepta el nuevo '
            + 'normal, lo que es exactamente correcto para una reparación y exactamente incorrecto '
            + 'para una falla permanente. Por eso corre junto a la familia de cartas de control, no '
            + 'en su lugar, y el desacuerdo entre ambas familias es informativo, no un bug.'
          : 'A growing window of recent values; at every step it asks whether ANY split divides it '
            + 'into two sub-windows whose means differ by more than a Hoeffding-Bernstein style '
            + 'bound; if so, the OLDER part is dropped and a change is flagged. It carries no fixed '
            + 'baseline: it compares the recent past against the less recent past and then accepts '
            + 'the new normal, which is exactly right for a repair and exactly wrong for a permanent '
            + 'fault. That is why it runs beside the control-chart family rather than replacing it, '
            + 'and disagreement between the two families is informative rather than a bug.'}
      </p>
      <Equation
        tex={String.raw`\epsilon_{\mathrm{cut}} = \sqrt{\frac{2}{m}\,\hat\sigma_W^2\,\ln\frac{2}{\delta'}}
          + \frac{2}{3m}\,\ln\frac{2}{\delta'}, \qquad
          m = \frac{1}{\frac{1}{n_0} + \frac{1}{n_1}}, \qquad \delta' = \frac{\delta}{n}`}
        caption={es
          ? 'La media armónica m es la forma corregida en 0.09.002, que coincide con la Sección 3.2 '
            + 'del paper al pie de la letra; antes el código usaba 1/(n0-1) + 1/(n1-1), que no '
            + 'coincidía ni con el paper ni con MOA y hacía al detector más callado que su propia '
            + 'garantía (costo medido: una muestra de retardo mediano, de 8 a 7 sobre 20 semillas). '
            + 'delta/n en vez del delta/ln(n) práctico del paper es deliberado: el paper licencia la '
            + 'forma laxa porque ADWIN2 revisa O(log n) sub-ventanas por paso, pero esta clase es el '
            + 'ADWIN DIRECTO, que revisa las O(n) particiones, así que la cota de unión debe cubrir '
            + 'n hipótesis.'
          : 'The harmonic mean m is the 0.09.002-corrected form, matching the paper\'s Section 3.2 '
            + 'verbatim; the code previously used 1/(n0-1) + 1/(n1-1), which matched neither the '
            + 'paper nor MOA and made the detector quieter than its own stated guarantee (measured '
            + 'cost: one sample of median delay, 8 to 7 over 20 seeds). delta/n instead of the '
            + 'paper\'s practical delta/ln(n) is deliberate: the paper licenses the looser form '
            + 'because ADWIN2 checks O(log n) sub-windows per step, but this class is the DIRECT '
            + 'ADWIN, which checks all O(n) splits, so the union bound must cover n hypotheses.'}
      />
      <p>
        {es
          ? 'La envoltura multivariada corre un ADWIN independiente por canal y emite el CONTEO de '
            + 'canales marcando un corte en el mismo minuto. Eso deja un estadístico entero con solo '
            + 'd + 1 = 10 puntos de operación donde otros peldaños ofrecen cientos: el motor declara '
            + 'que eso lo hace mal candidato para la curva de presupuesto y que delta debería '
            + 'barrerse al compararlo. El horneado igual lo pone en el presupuesto común, así que sus '
            + 'filas SUBESTIMAN lo que un barrido de delta mostraría: crudo 0.00 (el umbral '
            + 'seleccionado exigía más de 7 de 9 canales cortando a la vez, y nunca pasó), residuo '
            + '0.0625 con retardo 652 min.'
          : 'The multivariate wrapper runs one independent ADWIN per channel and emits the COUNT of '
            + 'channels flagging a cut on the same minute. That leaves an integer statistic with only '
            + 'd + 1 = 10 operating points where other rungs offer hundreds: the engine states this '
            + 'makes ADWIN a poor fit for the budget curve and that delta should be swept when '
            + 'comparing it. The bake nevertheless places it on the common budget, so its rows '
            + 'UNDERSTATE what a delta sweep might show: raw 0.00 (the selected threshold required '
            + 'more than 7 of 9 channels cutting on the same minute, and nothing ever did), residual '
            + '0.0625 at 652 min delay.'}
      </p>
      <Callout variant="honest" title={es ? 'Un defecto de documentación encontrado al escribir ESTA página' : 'A documentation defect found while writing THIS page'}>
        {es
          ? 'La extracción verificada contra el código que produjo esta página encontró que el '
            + 'docstring de la clase ADWIN del motor todavía muestra el término armónico ANTERIOR a '
            + 'la corrección 0.09.002, mientras el código implementa la forma del paper. El commit '
            + 'que corrigió el código y su comentario no tocó la ecuación del docstring. Es el mismo '
            + 'patrón "código documentado contra código que corre" que este producto ya pagó dos '
            + 'veces. Corregido en regimecpd 0.09.007, una versión solo de documentación.'
          : 'The code-verified extraction behind this page found that the engine\'s ADWIN class '
            + 'docstring still displayed the harmonic term from BEFORE the 0.09.002 fix, while the '
            + 'code implements the paper\'s form. The commit that fixed the code and its comment did '
            + 'not touch the docstring equation. It is the same "documented code versus running code" '
            + 'pattern this product has already paid for twice. Fixed in regimecpd 0.09.007, a '
            + 'documentation-only release.'}
      </Callout>

      <h3>KSWIN <Cite id="raab2020" /></h3>
      <p>
        {es
          ? 'Un buffer deslizante por canal: las 60 muestras más nuevas son la muestra de prueba y '
            + 'las 180 anteriores el reservorio de referencia. En cada paso, el estadístico de '
            + 'Kolmogorov-Smirnov de dos muestras: la mayor brecha absoluta entre las dos '
            + 'distribuciones empíricas. Donde ADWIN vigila la media, KSWIN compara distribuciones '
            + 'completas: una falla mecánica en desarrollo que cambia dispersión o forma antes de '
            + 'mover un promedio es exactamente lo que D ve y una carta centrada en la media no.'
          : 'A sliding buffer per channel: the newest 60 samples are the test sample and the '
            + 'preceding 180 the reference reservoir. At each step, the two-sample '
            + 'Kolmogorov-Smirnov statistic: the largest absolute gap between the two empirical '
            + 'CDFs. Where ADWIN watches the mean, KSWIN compares whole distributions: a developing '
            + 'mechanical fault that changes spread or shape before it moves an average is exactly '
            + 'what D sees and a mean-centred chart does not.'}
      </p>
      <Equation
        tex={String.raw`D = \max_{x}\, \lvert \hat F_{\mathrm{ref}}(x) - \hat F_{\mathrm{rec}}(x) \rvert, \qquad
          p = 2 \sum_{j=1}^{\infty} (-1)^{j-1} e^{-2 j^2 \lambda^2}, \qquad
          \lambda = \Big(\sqrt{n_e} + 0.12 + \tfrac{0.11}{\sqrt{n_e}}\Big) D`}
        caption={es
          ? 'El estadístico emitido es la DISTANCIA máxima entre canales, no el p-value: la '
            + 'distancia crece con la anomalía y vive en [0, 1], mientras el p-value satura en el '
            + 'extremo interesante. Los p-values por canal viajan en meta. El alpha del constructor '
            + 'se valida y NO se usa en ninguna parte de este build: el punto de operación lo pone '
            + 'la capa de calibración.'
          : 'The emitted statistic is the maximum DISTANCE across channels, not the p-value: the '
            + 'distance grows with anomaly and lives in [0, 1], while the p-value saturates at the '
            + 'interesting end. Per-channel p-values travel in meta. The constructor\'s alpha is '
            + 'validated and used NOWHERE in this build: the calibration layer sets the operating '
            + 'point.'}
      />
      <p>
        {es
          ? 'Horneado: el más fuerte de los tres peldaños de streaming. Sobre residuos detecta 8 de '
            + '16 con retardo mediano 97 min a cero falsas alarmas medidas, contra 1 de 16 a 159 min '
            + 'sobre canales crudos: detección 8 veces mejor a umbral comparable. Dos honestidades '
            + 'que deben viajar con la cita: el propio motor marca la referencia KSWIN como NO '
            + 'verificada contra la fuente primaria (la implementación sigue la formulación '
            + 'estándar, con partición deslizante determinista en vez del reservorio muestreado de '
            + 'algunas formulaciones); y con ventanas de 180 y 60, D está cuantizado con resolución '
            + 'limitada por 1/60, que es donde caen los umbrales del horneado (0.639, 0.683).'
          : 'Bake: the strongest of the three streaming rungs. On residuals it detects 8 of 16 at 97 '
            + 'min median delay and zero measured false alarms, against 1 of 16 at 159 min on raw '
            + 'channels: detection 8 times better at a comparable threshold. Two honesty notes that '
            + 'must travel with the citation: the engine itself flags the KSWIN reference as NOT '
            + 'verified against the primary source (the implementation follows the standard '
            + 'formulation, with a deterministic sliding split rather than the sampled reservoir of '
            + 'some formulations); and with windows of 180 and 60, D is quantised with resolution '
            + 'limited by 1/60, which is where the bake thresholds (0.639, 0.683) sit.'}
      </p>
    </div>
  );
}

function Learned({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Tres modelos de novedad, y dos contradicen la tesis' : 'Three novelty models, and two contradict the thesis'}</h2>
      <p>
        {es
          ? 'Estos peldaños no prueban una hipótesis sobre un cambio: aprenden un modelo de lo NORMAL '
            + 'desde la línea base sana y puntúan cuán lejos queda cada muestra. Es la forma correcta '
            + 'para este dominio, porque una flota tiene miles de años-máquina sanos y un puñado de '
            + 'fallas etiquetadas, así que un método que necesita etiquetas de falla casi no tiene con '
            + 'qué entrenar. Los tres comparten el contrato de features del motor: cada canal '
            + 'estandarizado contra la línea base, y 10 muestras consecutivas apiladas en un vector de '
            + '90 dimensiones, con el puntaje puesto en la ÚLTIMA muestra de la ventana, el primer '
            + 'instante en que la evidencia existe.'
          : 'These rungs do not test a hypothesis about a change: they learn a model of NORMAL from '
            + 'the healthy baseline and score how far each sample sits from it. That is the right '
            + 'shape for this domain, because a fleet has thousands of healthy machine-years and a '
            + 'handful of labelled failures, so a method that needs fault labels has almost nothing to '
            + 'train on. All three share the engine\'s feature contract: each channel standardised '
            + 'against the baseline, and 10 consecutive samples stacked into one 90-dimensional '
            + 'vector, with the score placed at the window\'s LAST sample, the earliest moment the '
            + 'evidence exists.'}
      </p>
      <Equation
        tex={String.raw`s_j = \begin{cases}\sigma_j & \sigma_j > \max\!\left(10^{-12},\ 10^{-8}\,\overline{|x_j|}\right)\\
          1 & \text{otherwise}\end{cases}, \qquad
          \mathbf{f}_t = \left[\, z_{t-9,\cdot}\;\; \cdots\;\; z_{t,\cdot} \,\right] \in \mathbb{R}^{90}`}
        caption={es
          ? 'El piso de escala usa la media ABSOLUTA del canal como referencia, nunca la media con '
            + 'signo: estos detectores corren sobre el brazo de residuos, cuyos canales están '
            + 'centrados en cero por construcción, y una media con signo colapsa el piso relativo y '
            + 'deja pasar un canal muerto. Ese fue el defecto corregido en 0.09.006, el TERCER módulo '
            + 'con la misma falla, encontrada de a una. El horneado publicado corre 0.09.006, así que '
            + 'incluye ambos arreglos de escala.'
          : 'The scale floor uses the channel\'s mean ABSOLUTE value as its reference, never the '
            + 'signed mean: these detectors run on the residual arm, whose channels are centred on '
            + 'zero by construction, and a signed mean collapses the relative floor and lets a dead '
            + 'channel through. That was the defect fixed in 0.09.006, the THIRD module with the same '
            + 'flaw, found one at a time. The published bake runs 0.09.006, so it includes both scale '
            + 'fixes.'}
      />
      <p>
        {es
          ? 'Dos contratos más, compartidos: los puntajes de scikit-learn crecen hacia lo NORMAL, y '
            + 'el motor invierte el signo exactamente una vez, dentro de detect, con una prueba de '
            + 'orientación por modelo, porque una inversión omitida produce un detector cuya curva de '
            + 'presupuesto parece un método débil plausible y no un error. Y los backends opcionales '
            + 'se importan de forma diferida DENTRO de fit, así que un peldaño cuyo backend falta se '
            + 'salta con nombre y motivo en el artefacto (skipped_rungs) en vez de botar el horneado '
            + 'o desaparecer de la tabla; la sonda tiene que AJUSTAR, no solo construir, porque '
            + 'construir uno funciona en una máquina que no puede correrlo.'
          : 'Two more shared contracts: scikit-learn scores grow toward NORMAL, and the engine flips '
            + 'the sign exactly once, inside detect, with a per-model orientation test, because a '
            + 'missed flip produces a detector whose budget curve looks like a plausible weak method '
            + 'rather than an error. And optional backends import lazily INSIDE fit, so a rung whose '
            + 'backend is missing is skipped with a name and reason in the artifact (skipped_rungs) '
            + 'instead of taking the bake down or vanishing from the table; the probe has to FIT, not '
            + 'just construct, because constructing one succeeds on a machine that cannot run it.'}
      </p>

      <h3>Isolation Forest <Cite id="liu2008" /></h3>
      <p>
        {es
          ? 'Aísla vectores por particiones aleatorias alineadas a los ejes: una muestra en una región '
            + 'rala del espacio necesita pocas particiones para quedar sola, así que su camino '
            + 'esperado sobre un bosque de árboles aleatorios es corto. Sin supuesto distribucional, '
            + 'tiempo lineal, y sus puntajes NO son probabilidades calibradas. En el brazo crudo de un '
            + 'camión funciona porque la operación sana ocupa unos pocos grupos densos (acarreo '
            + 'cargado, retorno vacío, carga, descarga) y una falla empuja trayectorias fuera de esos '
            + 'grupos, a territorio ralo.'
          : 'It isolates vectors by random axis-aligned splits: a sample in a sparse region of the '
            + 'space needs few splits to end up alone, so its expected path length over a forest of '
            + 'random trees is short. No distributional assumption, linear time, and its scores are '
            + 'NOT calibrated probabilities. On a truck\'s raw arm it works because healthy operation '
            + 'occupies a few dense clusters (loaded haul, empty return, loading, dumping) and a fault '
            + 'pushes trajectories off those clusters into sparse territory.'}
      </p>
      <Equation
        tex={String.raw`s(\mathbf{f}, \psi) = 2^{-\,\mathbb{E}[h(\mathbf{f})] / c(\psi)}, \qquad
          S_t = -\,\texttt{score\_samples}(\mathbf{f}_t) = s(\mathbf{f}_t, \psi) \in (0, 1)`}
        caption={es
          ? 'La escalera pasa window=10, n_estimators=200, seed=0. Horneado: crudo 0.6875 con 263 '
            + 'min; residuo 0.0625 con 710 min. La fila más contraria a la tesis de toda la '
            + 'escalera, y además el brazo crudo queda DEBAJO de la línea base trivial (0.75 a 123 '
            + 'min, a la que se le dijo dónde mirar): en este carril el bosque de aislamiento no se '
            + 'gana el puesto en ningún brazo.'
          : 'The ladder passes window=10, n_estimators=200, seed=0. Bake: raw 0.6875 at 263 min; '
            + 'residual 0.0625 at 710 min. The strongest counter-thesis row on the whole ladder, and '
            + 'the raw arm additionally sits BELOW the trivial baseline (0.75 at 123 min, which was '
            + 'told where to look): on this lane the isolation forest never earns its keep on either '
            + 'arm.'}
      />

      <h3>One-Class SVM <Cite id="scholkopf2001" /></h3>
      <p>
        {es
          ? 'Una frontera de margen máximo en el espacio del kernel RBF que encierra la mayoría de '
            + 'las ventanas sanas, con nu presupuestando la fracción que queda fuera (aquí nu=0.05). '
            + 'El estadístico es el margen con signo negado: cuán FUERA de la región de soporte '
            + 'aprendida queda una ventana. El paper decide por el SIGNO de la función de decisión; '
            + 'este build entrega el margen continuo y deja el punto de operación al presupuesto de '
            + 'flota.'
          : 'A maximum-margin boundary in RBF kernel space enclosing most of the healthy windows, '
            + 'with nu budgeting the fraction allowed outside (here nu=0.05). The statistic is the '
            + 'negated signed margin: how far OUTSIDE the learned support region a window sits. The '
            + 'paper decides by the SIGN of the decision function; this build ships the continuous '
            + 'margin and leaves the operating point to the fleet budget.'}
      </p>
      <Equation
        tex={String.raw`S_t = \rho - \sum_i \alpha_i\, K(\mathbf{f}_i, \mathbf{f}_t), \qquad
          K(\mathbf{a}, \mathbf{b}) = e^{-\gamma \lVert \mathbf{a} - \mathbf{b} \rVert^2}, \qquad
          \gamma = \tfrac{1}{90\cdot\operatorname{Var}(F)}`}
        caption={es
          ? 'Horneado: crudo 0.75 con 192 min; residuo 0.50 con 95 min. El retardo residuo se lee '
            + 'con cuidado: la mediana se calcula SOLO sobre unidades detectadas, así que "el residuo '
            + 'es más rápido" condiciona sobre las 8 de 16 fallas que ese brazo aún captura. En la '
            + 'tasa de detección, el número que un planificador paga, el condicionamiento LO '
            + 'PERJUDICA: de 0.75 a 0.50.'
          : 'Bake: raw 0.75 at 192 min; residual 0.50 at 95 min. Read the residual delay with care: '
            + 'the median is computed over DETECTED units only, so "residual is faster" conditions on '
            + 'the 8 of 16 faults that arm still catches. On detection rate, the number a planner '
            + 'pays for, conditioning HURTS this rung: 0.75 down to 0.50.'}
      />
      <p>
        {es
          ? 'Tres honestidades: el brazo crudo empata la línea base trivial (0.75) pero más lento '
            + '(192 contra 123 min); el propio motor marca la cita de Scholkopf como NO abierta '
            + 'contra la fuente primaria en el pase de investigación; y este peldaño NO corre en '
            + 'vivo en el navegador, porque ajustarlo ahí exigiría embarcar un solver SMO, y una '
            + 'aproximación sería una tercera implementación que la compuerta de paridad '
            + 'Python-TypeScript no puede verificar.'
          : 'Three honesty notes: the raw arm ties the trivial baseline (0.75) but slower (192 '
            + 'against 123 min); the engine itself flags the Scholkopf citation as NOT opened against '
            + 'the primary source during its research pass; and this rung does NOT run live in the '
            + 'browser, because fitting it there would mean shipping an SMO solver, and an '
            + 'approximation would be a third implementation the Python-TypeScript parity gate '
            + 'cannot check.'}
      </p>

      <h3>{es ? 'Autocodificador' : 'Autoencoder'} <Cite id="sakurada2014" /></h3>
      <p>
        {es
          ? 'Una red densa entrenada para reproducir ventanas sanas a través de un cuello de botella; '
            + 'el estadístico es el error cuadrático medio de reconstrucción por ventana. El cuello '
            + 'obliga a la red a aprender la estructura de correlación de la operación normal: una '
            + 'ventana que la respeta se reconstruye bien, una que la rompe no. Es el análogo '
            + 'aprendido del estadístico SPE, con una variedad no lineal en lugar de un subespacio '
            + 'lineal, y el motor exige el único parámetro arquitectónico que importa: un cuello al '
            + 'menos tan ancho como la entrada aprende la identidad, reconstruye fallas perfectamente '
            + 'y nunca dispara, así que fit lo rechaza con un error.'
          : 'A dense network trained to reproduce healthy windows through a bottleneck; the statistic '
            + 'is per-window mean squared reconstruction error. The bottleneck forces the network to '
            + 'learn the correlation structure of normal operation: a window that respects it '
            + 'reconstructs well, one that breaks it does not. It is the learned analogue of the SPE '
            + 'statistic, with a nonlinear manifold in place of a linear subspace, and the engine '
            + 'enforces the one architectural choice that matters: a bottleneck at least as wide as '
            + 'the input learns the identity, reconstructs faults perfectly and never fires, so fit '
            + 'rejects it with an error.'}
      </p>
      <Equation
        tex={String.raw`E_t = \frac{1}{90} \left\lVert g_\theta(\mathbf{f}_t) - \mathbf{f}_t \right\rVert_2^2, \qquad
          90 \xrightarrow{\;\mathrm{ReLU}\;} 32 \xrightarrow{\;\mathrm{lin}\;} 8 \xrightarrow{\;\mathrm{ReLU}\;} 32
          \xrightarrow{\;\mathrm{lin}\;} 90`}
        caption={es
          ? 'La arquitectura como está construida, no como la dibujaría un libro: la capa de código '
            + 'es LINEAL (sin ReLU tras el cuello) y la salida es LINEAL (el objetivo está '
            + 'estandarizado, con signo y sin cota). Como dos mapas lineales consecutivos componen, '
            + 'el par 32-8-32 actúa como UN mapa lineal de rango 8 entre las dos ReLU: el cuello es '
            + 'una restricción de rango, no un código no lineal. Si esa ReLU faltante es deliberada '
            + 'no está documentado en el código: se declara como NO VERIFICADO y la arquitectura '
            + 'como está.'
          : 'The architecture as built, not as a textbook would draw it: the code layer is LINEAR '
            + '(no ReLU after the bottleneck) and the output is LINEAR (the target is standardised, '
            + 'signed and unbounded). Because two consecutive linear maps compose, the 32-8-32 pair '
            + 'acts as ONE rank-8 linear map between the two ReLUs: the bottleneck is a rank '
            + 'constraint, not a nonlinear code. Whether the missing bottleneck ReLU is deliberate is '
            + 'not documented in the code: it is declared UNVERIFIED and the architecture stated as '
            + 'it is.'}
      />
      <p>
        {es
          ? 'Horneado: el ÚNICO peldaño aprendido donde el condicionamiento ayuda, y ayuda en ambos '
            + 'ejes: crudo 0.75 con 174 min, residuo 1.00 con 90 min, y es el único aprendido que '
            + 'vence a la línea base trivial. La escalera pasa epochs=60 contra el default 200 del '
            + 'motor; si 60 converge para estos datos no está registrado en el artefacto (el meta '
            + 'final_train_loss existe en el motor para verificar exactamente eso, pero las filas no '
            + 'lo llevan): NO VERIFICADO. Una versión pequeña de este modelo SÍ corre en vivo en el '
            + 'navegador, entrenada por camión sobre su propio tramo sano, con la compuerta de '
            + 'paridad vigilando.'
          : 'Bake: the ONLY learned rung where conditioning helps, and it helps on both axes: raw '
            + '0.75 at 174 min, residual 1.00 at 90 min, and it is the only learned rung that beats '
            + 'the trivial baseline outright. The ladder passes epochs=60 against the engine default '
            + '200; whether 60 is converged for this data is not recorded in the artifact (the '
            + 'final_train_loss meta exists in the engine to check exactly that, but the rows do not '
            + 'carry it): UNVERIFIED. A small version of this model DOES run live in the browser, '
            + 'trained per truck on its own healthy stretch, with the parity gate watching.'}
      </p>

      <Callout variant="strong" title={es ? 'El hallazgo transversal, con su explicación obvia descartada por medición' : 'The cross-cutting finding, its obvious explanation ruled out by measurement'}>
        {es
          ? 'Sobre los 12 peldaños del horneado, el condicionamiento mejora la detección en 5, es '
            + 'neutro en 5 (tres peldaños acumulativos ya en el techo, SPE sin cambio en 0.75 en ambos '
            + 'brazos, y BOCPD en cero en ambos), y PERJUDICA 2. Los dos '
            + 'perjudicados son modelos de novedad con forma de frontera. La explicación obvia sería '
            + 'el hueco de muestras sin asignar (una muestra NaN destruye toda ventana de 10 que la '
            + 'contiene), pero la cobertura de régimen es 0.998 en las tres filas aprendidas: no hay '
            + 'huecos que culpar. La hipótesis sobreviviente, etiquetada como hipótesis: un modelo de '
            + 'novedad aprende la FORMA de lo normal; en el brazo crudo esa forma son unos pocos '
            + 'grupos de régimen compactos y todo lo fuera de grupo es fácil de aislar; el '
            + 'condicionamiento los reemplaza por una sola nube casi isotrópica y un desplazamiento '
            + 'moderado queda adentro. El autocodificador escapa porque su estadístico es error de '
            + 'reconstrucción a través de un mapa de rango limitado: una falla que rompe la '
            + 'estructura de correlación produce error sin importar cuán isotrópica se vea la nube '
            + 'sana, la misma razón por la que SPE (su análogo lineal declarado) da 0.75 en ambos '
            + 'brazos mientras T-cuadrado, un estadístico de posición como los dos peldaños '
            + 'perjudicados, colapsa en crudo y se recupera en residuo. La oración honesta: el '
            + 'condicionamiento por régimen ayuda a los detectores que miden posición o acumulan '
            + 'evidencia, y puede perjudicar activamente a los que puntúan aislamiento de la nube '
            + 'sana, en este carril, a esta severidad.'
          : 'Across the bake\'s 12 rungs, conditioning improves detection on 5, is neutral on 5 '
            + '(three cumulative rungs already at ceiling, SPE unchanged at 0.75 on both arms, and BOCPD '
            + 'at zero on both), and HURTS 2. Both hurt rungs are '
            + 'boundary-shaped novelty models. The obvious explanation would be the unassigned-sample '
            + 'gap (one NaN sample destroys every 10-sample window containing it), but regime '
            + 'coverage is 0.998 on all three learned rows: there are no gaps to blame. The surviving '
            + 'hypothesis, labelled as one: a novelty model learns the SHAPE of normal; on the raw '
            + 'arm that shape is a few tight regime clusters and anything off-cluster is easy to '
            + 'isolate; conditioning replaces them with one roughly isotropic blob and a moderate '
            + 'shift stays inside. The autoencoder escapes because its statistic is reconstruction '
            + 'error through a rank-limited map: a fault that breaks correlation structure produces '
            + 'error regardless of how isotropic the healthy cloud looks, the same reason SPE (its '
            + 'stated linear analogue) sits at 0.75 on both arms while T-squared, a '
            + 'position-in-distribution statistic like the two hurt rungs, collapses on raw and '
            + 'recovers on residual. The honest sentence: regime conditioning helps detectors that '
            + 'measure position or accumulate evidence, and can actively hurt detectors that score '
            + 'isolation from the healthy cloud, on this lane, at this severity.'}
      </Callout>
    </div>
  );
}

function Retrospective({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h2>{es ? 'Lo que mira hacia atrás no puntúa detección en línea' : 'What looks backward must not score online detection'}</h2>
      <p>
        {es
          ? 'Dos métodos del motor están EXCLUIDOS de la escalera en línea por la misma razón: una '
            + 'métrica de detección en línea no debe puntuar jamás un método que ya leyó el futuro. '
            + 'PELT es retrospectivo por construcción. mSTAMP lo es de la manera que importa: el '
            + 'valor de su perfil en una ventana se calcula contra coincidencias en CUALQUIER parte '
            + 'del registro, incluidas las posteriores, aunque su salida PAREZCA un estadístico por '
            + 'muestra.'
          : 'Two engine methods are EXCLUDED from the online ladder for the same reason: an online '
            + 'detection metric must never score a method that has already read the future. PELT is '
            + 'retrospective by construction. mSTAMP is retrospective in the way that matters: its '
            + 'profile value at a window is computed against matches ANYWHERE in the record, '
            + 'including after it, even though its output LOOKS like a per-sample statistic.'}
      </p>

      <h3>PELT <Cite id="killick2012" /></h3>
      <p>
        {es
          ? 'Responde otra pregunta: no "¿algo está cambiando ahora?" sino "mirando el registro '
            + 'completo, ¿cuándo ocurrieron los cambios?". Minimiza un costo total sobre todas las '
            + 'segmentaciones: cada segmento paga un costo de ajuste y cada punto de cambio adicional '
            + 'una penalización beta. La partición óptima lo resuelve exacto por programación '
            + 'dinámica en O(n al cuadrado); PELT agrega una regla de poda que descarta '
            + 'permanentemente candidatos que ya no pueden ser óptimos, llevando el tiempo esperado '
            + 'a lineal con la respuesta EXACTA, no aproximada. El motor trata la exactitud como '
            + 'afirmación comprobable: conserva la versión cuadrática sin poda solo para que la '
            + 'suite afirme que ambas devuelven segmentaciones idénticas, porque un bug de poda '
            + 'produce puntos levemente distintos que se leen como diferencia de ajuste y no como '
            + 'error.'
          : 'It answers a different question: not "is something changing now" but "looking back over '
            + 'the whole record, when did the changes happen". It minimises a total cost over all '
            + 'segmentations: each segment pays a goodness-of-fit cost and each additional '
            + 'changepoint a penalty beta. Optimal partitioning solves this exactly by dynamic '
            + 'programming in O(n squared); PELT adds a pruning rule that permanently discards '
            + 'candidates that can never again be optimal, bringing expected time to linear with the '
            + 'answer EXACT, not approximate. The engine treats exactness as a testable claim: it '
            + 'keeps the unpruned quadratic version solely so the suite can assert both return '
            + 'identical segmentations, because a pruning bug produces slightly different '
            + 'changepoints that read as a tuning difference rather than an error.'}
      </p>
      <Equation
        tex={String.raw`\min \sum_{i=1}^{m+1} \mathcal{C}\!\left(y_{\tau_{i-1}+1:\tau_i}\right) + \beta m,
          \qquad F(\tau) + \mathcal{C}\!\left(y_{\tau+1:t}\right) > F(t) \Rightarrow \tau \text{ discarded}`}
        caption={es
          ? 'El producto usa el costo "mean" (varianza fijada en la estimación del registro '
            + 'completo): las fallas sintéticas son cambios de nivel, y el costo "meanvar" explica '
            + 'felizmente un cambio de nivel como cambio de varianza, una forma real de obtener una '
            + 'segmentación que ajusta bien y no significa nada. Penalización BIC por defecto, que '
            + 'no sabe nada de la máquina: un doc que afirme que el CONTEO de puntos de cambio '
            + 'significa algo físico sobreafirmaría.'
          : 'The product uses the "mean" cost (variance held at the whole-record estimate): the '
            + 'synthetic faults are level shifts, and the "meanvar" cost happily explains a level '
            + 'shift as a variance change, a real way to get a segmentation that fits well and means '
            + 'nothing. Default BIC penalty, which knows nothing about the machine: a doc claiming '
            + 'the changepoint COUNT means something physical would overclaim.'}
      />
      <p>
        {es
          ? 'Su papel en el producto es la estimación retrospectiva de inicio, y el horneado es la '
            + 'columna de azar funcionando como se diseñó: el brazo crudo localiza el inicio con '
            + 'error mediano 121.5 min contra un nivel de azar de 236.2 para sus 2 puntos de cambio '
            + '(habilidad 1.94x, localización genuina). El brazo residuo muestra error 52.5 min, que '
            + 'SIN la columna de azar parecería una victoria; pero sobre-segmenta (mediana 13 puntos '
            + 'de cambio), su nivel de azar es 50.6 min, y su habilidad 0.96: no localiza mejor que '
            + 'esparcir la misma cantidad de cortes al azar. Los docs de este producto no deben citar '
            + 'jamás "52.5 min en el brazo residuo" como victoria. El defecto corregido aquí: el '
            + 'costo meanvar fijaba la varianza con un piso ABSOLUTO, y un canal constante salvo '
            + 'redondeo producía diferencias de costo enormes y arbitrarias que el segmentador '
            + 'explicaba cortando; la corrección es un piso RELATIVO escalado por la varianza del '
            + 'propio canal en el registro completo.'
          : 'Its role in the product is retrospective onset estimation, and the bake is the chance '
            + 'column working as designed: the raw arm locates the onset with median error 121.5 min '
            + 'against a 236.2 min chance level for its 2 changepoints (skill 1.94x, genuine '
            + 'localisation). The residual arm shows 52.5 min error, which WITHOUT the chance column '
            + 'would look like a win; but it over-segments (median 13 changepoints), its chance level '
            + 'is 50.6 min, and its skill is 0.96: it locates no better than scattering the same '
            + 'number of cuts at random. This product\'s docs must never quote "52.5 min on the '
            + 'residual arm" as a win. The defect fixed here: the meanvar cost floored variance with '
            + 'an ABSOLUTE constant, and a channel constant to within roundoff produced huge '
            + 'arbitrary cost differences the segmenter explained by cutting; the fix is a RELATIVE '
            + 'floor scaled by the channel\'s own whole-record variance.'}
      </p>

      <h3>mSTAMP <Cite id="yeh2017" /></h3>
      <p>
        {es
          ? 'Para cada subsecuencia de largo m, el perfil de matriz registra la distancia euclidiana '
            + 'z-normalizada a su vecino más cercano en otra parte de la serie; un valor GRANDE es un '
            + 'discord: "nada más en este registro se parece a esto", que es lo que la detección de '
            + 'inicio quiere, sin etiquetas ni entrenamiento. La generalización ingenua a d '
            + 'dimensiones (sumar sobre todos los canales) falla porque un patrón que vive en 3 de '
            + '12 canales queda ahogado por los 9 que llevan ruido; mSTAMP ordena las distancias por '
            + 'dimensión de forma ascendente y toma la media corrida, entregando el mejor-k para '
            + 'TODO k en una pasada.'
          : 'For every subsequence of length m, the matrix profile records the z-normalised '
            + 'Euclidean distance to its nearest neighbour elsewhere in the series; a LARGE value is '
            + 'a discord: "nothing else in this record looks like this", which is what onset '
            + 'detection wants, with no labels and no training. The naive d-dimensional '
            + 'generalisation (summing over all channels) fails because a pattern living in 3 of 12 '
            + 'channels is swamped by the 9 carrying noise; mSTAMP sorts the per-dimension distances '
            + 'ascending and takes a running mean, yielding the best-k answer for EVERY k in one '
            + 'pass.'}
      </p>
      <Equation
        tex={String.raw`D_k(i,j) = \frac{1}{k} \sum_{l=1}^{k}
          \operatorname{sort}_l\!\left( \tilde{d}_1(i,j), \dots, \tilde{d}_d(i,j) \right), \qquad
          P_k(i) = \min_{|i-j| > \lceil m e \rceil} D_k(i,j)`}
        caption={es
          ? 'Distancias por MASS (producto punto deslizante vía FFT), correlación recortada a '
            + '[-1, 1], piso de planitud RELATIVO a la dispersión de la propia serie (el defecto '
            + 'corregido: dos estimadores distintos del mismo sigma comparados contra una constante '
            + 'absoluta hacían la decisión de planitud dependiente del redondeo y de las unidades).'
          : 'Distances via MASS (FFT sliding dot product), correlation clipped to [-1, 1], flatness '
            + 'floor RELATIVE to the series\' own spread (the fixed defect: two different estimators '
            + 'of the same sigma compared against one absolute constant made the flatness decision '
            + 'rounding- and unit-dependent).'}
      />
      <Callout variant="honest" title={es ? 'mSTAMP no corrió en este horneado, y su atribución obvia está mal' : 'mSTAMP did not run in this bake, and its obvious attribution is wrong'}>
        {es
          ? 'Verificado de tres maneras: no está en la escalera declarada del artefacto, no hay '
            + 'importaciones en el pipeline del producto, y cero filas lo mencionan. Todo '
            + 'comportamiento descrito aquí está verificado a nivel de motor, nunca contra este '
            + 'artefacto. Y la trampa que el motor fija con una prueba: el subconjunto k de mSTAMP '
            + 'responde una pregunta de MOTIVOS y es activamente incorrecto como atribución de '
            + 'anomalía, porque selecciona los k canales con las distancias MENORES. Medido en un '
            + 'registro de cuatro canales con el discord plantado en b y d, el subconjunto k=2 '
            + 'devuelve {a, c}, los dos canales todavía sanos, junto a un pico de discord '
            + 'perfectamente correcto. El motor embarca la atribución correcta por separado: la '
            + 'distancia por canal en el vecino más cercano de dimensión completa. Y una corrección '
            + 'al folclore, medida: "sin zona de exclusión el perfil colapsa a cero" es medible y '
            + 'falsa para esta clase de datos (0.87 a 0.91 del valor con zona, saturando a las '
            + 'cuatro muestras); el parámetro que importa es el LARGO de ventana, elegido desde la '
            + 'física, jamás barrido buscando la mejor respuesta.'
          : 'Verified three ways: it is not in the artifact\'s declared ladder, there are no imports '
            + 'in the product pipeline, and zero rows mention it. Every behaviour described here is '
            + 'engine-verified, never read off this artifact. And the trap the engine pins with a '
            + 'test: mSTAMP\'s k-subset answers a MOTIF question and is actively wrong as anomaly '
            + 'attribution, because it selects the k channels with the SMALLEST distances. Measured '
            + 'on a four-channel record with the discord planted in b and d, the k=2 subset returns '
            + '{a, c}, the two still-healthy channels, beside a perfectly correct discord peak. The '
            + 'engine ships the correct attribution separately: the per-channel distance at the '
            + 'full-dimensional nearest neighbour. Plus one measured folklore correction: "without '
            + 'an exclusion zone the profile collapses to zero" is measurably false for this data '
            + 'class (0.87 to 0.91 of the zoned value, saturating by four samples); the parameter '
            + 'that matters is the WINDOW length, chosen from the physics, never swept for the '
            + 'best-looking answer.'}
      </Callout>

      <h3>{es ? 'Conformal: capacidad del motor, no camino del horneado' : 'Conformal: engine capability, not the bake\'s path'}</h3>
      <p>
        {es
          ? 'El motor incluye calibración conformal dividida y adaptativa '
          : 'The engine ships split and adaptive conformal calibration '}
        <Cite id="vovk2005" /> <Cite id="gibbs2021" />
        {es
          ? ', y este producto NO la usa: el presupuesto común del benchmark se realiza por búsqueda '
            + 'directa de umbral (threshold_for_budget) sobre el estadístico de cada detector, y '
            + 'ningún p-value conformal entra al artefacto. Atribuir el presupuesto fijo a conformal '
            + 'sería una sobreafirmación, y esta página existe para no hacerla. Dos hechos del motor '
            + 'que sí valen: el nivel adaptativo deliberadamente NO se recorta en [0, 1], porque la '
            + 'excursión negativa es la DEUDA que la recursión salda antes de volver a disparar (con '
            + 'el recorte, un detector saturado realiza sobre 10 por ciento contra un objetivo de 1; '
            + 'sin recorte, dentro de 0.5); y el supuesto de intercambiabilidad es FALSO en '
            + 'telemetría de flota, cosa que el motor declara, reportando tasas realizadas contra '
            + 'nominales en vez de pedir prestada la garantía. El propio motor marca la cita de Vovk '
            + 'como no abierta contra la fuente primaria.'
          : ', and this product does NOT use it: the benchmark\'s common budget is realised by '
            + 'direct threshold search (threshold_for_budget) on each detector\'s own statistic, and '
            + 'no conformal p-value enters the artifact. Attributing the fixed budget to conformal '
            + 'would be an overclaim, and this page exists not to make it. Two engine facts that do '
            + 'stand: the adaptive level is deliberately NOT clipped to [0, 1], because the negative '
            + 'excursion is the DEBT the recursion works off before firing again (clipped, a '
            + 'saturated detector realises above 10 percent against a 1 percent target; unclipped, '
            + 'within 0.5); and the exchangeability assumption is FALSE on fleet telemetry, which '
            + 'the engine says out loud, reporting realised against nominal rates instead of '
            + 'borrowing the guarantee. The engine itself flags the Vovk citation as not opened '
            + 'against the primary source.'}
      </p>
    </div>
  );
}
