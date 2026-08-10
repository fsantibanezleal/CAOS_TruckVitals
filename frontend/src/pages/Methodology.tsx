import { Callout, Cite, Equation, InlineMath, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import { useLang } from '../lib/i18n.ts';

export default function Methodology() {
  const es = useLang() === 'es';

  const tabs: TabDef[] = [
    { id: 'protocol', label: es ? 'El protocolo' : 'The protocol', content: <Protocol es={es} /> },
    { id: 'regimes', label: es ? 'Regímenes y residuos' : 'Regimes and residuals', content: <Regimes es={es} /> },
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
            + 'más preciso en CADA semilla. Corregido por azar, la diferencia pareada es -0.08 +/- 0.66. '
            + 'Toda la ventaja aparente se explica por producir 12-14 puntos de cambio en vez de 2-3.'
          : 'Onset error without a chance level would have shown the conditioned arm 2 to 7 times more '
            + 'accurate on EVERY seed. Chance-corrected, the paired difference is -0.08 +/- 0.66. The entire '
            + 'apparent advantage is explained by producing 12 to 14 changepoints instead of 2 to 3.'}
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
