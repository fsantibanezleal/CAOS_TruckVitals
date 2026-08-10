// ADR-0058: the in-app Architecture modal. Five tabs, each pairing one hand-authored themed SVG with a
// bilingual explanation. The SVGs live under public/svg/ and are fetched and INLINED by the shell, which
// is what lets them use the shell's CSS variables and repaint with the theme; an <img> could not.

import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  title_en: 'Architecture, and how the numbers get here',
  title_es: 'Arquitectura, y cómo llegan aquí los números',
  tabs: [
    {
      id: 'what',
      en: 'What this is',
      es: 'Qué es esto',
      svg: 'svg/tech/01-the-idea.svg',
      body_en:
        'TruckVitals asks one question: is this sensor value anomalous FOR THE OPERATING REGIME the '
        + 'machine is in right now?\n\n'
        + 'A haul truck loaded on a ramp and the same truck empty on the return are two different '
        + 'machines as far as a change detector is concerned. Strut pressure, brake temperature and fuel '
        + 'rate all move with payload and grade, and none of that movement is a fault. Raise the '
        + 'threshold until the haul cycle stops raising alarms and the fault is under the threshold too.\n\n'
        + 'So the pipeline segments the timeline into regimes learned from CONTEXT channels (payload, '
        + 'grade, speed), takes the residual within each regime, and runs the detector on that. The '
        + 'context channels are never among the monitored ones, which is what stops the segmentation '
        + 'absorbing the fault it is supposed to expose.',
      body_es:
        'TruckVitals hace una sola pregunta: ¿este valor de sensor es anómalo PARA EL RÉGIMEN OPERATIVO '
        + 'en el que está la máquina ahora?\n\n'
        + 'Un camión cargado subiendo una rampa y el mismo camión vacío bajando son dos máquinas distintas '
        + 'desde el punto de vista de un detector de cambios. La presión de suspensión, la temperatura de '
        + 'freno y el consumo se mueven con la carga y la pendiente, y nada de eso es una falla. Si se '
        + 'sube el umbral hasta que el ciclo deje de disparar alarmas, la falla también queda debajo.\n\n'
        + 'Por eso el pipeline segmenta la línea de tiempo en regímenes aprendidos de canales de CONTEXTO '
        + '(carga, pendiente, velocidad), toma el residuo dentro de cada régimen y corre el detector sobre '
        + 'eso. Los canales de contexto nunca están entre los monitoreados, y eso es lo que impide que la '
        + 'segmentación absorba la falla que debe exponer.',
    },
    {
      id: 'lanes',
      en: 'The four lanes',
      es: 'Los cuatro carriles',
      svg: 'svg/tech/02-lanes.svg',
      body_en:
        'Four data lanes, each supporting a different claim and each with a declared limit.\n\n'
        + 'NASA C-MAPSS is the controlled experiment: its subsets differ in exactly the factor under test, '
        + 'one operating condition against six, with the fault mode held fixed. Nobody here chose that '
        + 'structure.\n\n'
        + 'SCANIA APS carries a published cost matrix, verified in the dataset\'s own description file: a '
        + 'miss costs 50 times a false alarm. SCANIA Component X is 23,550 real vehicles with a graded 5x5 '
        + 'cost matrix, but it ships per-readout histograms rather than continuous channels, so it cannot '
        + 'support an onset story.\n\n'
        + 'The synthetic haul-truck fleet is the only lane where the true onset instant exists, which is '
        + 'why the onset measurement lives there. No public, redistributable dataset of continuous '
        + 'haul-truck telemetry with labelled faults was found. That is a limitation of the product.',
      body_es:
        'Cuatro carriles de datos, cada uno sosteniendo una afirmación distinta y cada uno con un límite '
        + 'declarado.\n\n'
        + 'NASA C-MAPSS es el experimento controlado: sus subconjuntos difieren exactamente en el factor '
        + 'bajo estudio, una condición operativa contra seis, con el modo de falla fijo. Nadie aquí eligió '
        + 'esa estructura.\n\n'
        + 'SCANIA APS trae una matriz de costos publicada, verificada en el archivo de descripción del '
        + 'propio conjunto: un fallo no detectado cuesta 50 veces una falsa alarma. SCANIA Component X son '
        + '23,550 vehículos reales con una matriz graduada de 5x5, pero entrega histogramas por lectura y '
        + 'no canales continuos, así que no puede sostener una historia de inicio.\n\n'
        + 'La flota sintética de camiones es el único carril donde el instante real de inicio existe, y por '
        + 'eso la medición de inicio vive ahí. No se encontró ningún conjunto público y redistribuible de '
        + 'telemetría continua de camiones con fallas etiquetadas. Eso es una limitación del producto.',
    },
    {
      id: 'flow',
      en: 'How the site runs',
      es: 'Cómo corre el sitio',
      svg: 'svg/tech/03-web-flow.svg',
      body_en:
        'Nothing is computed in the browser. The Python pipeline in this repository runs offline, writes '
        + 'JSON artifacts into data/artifacts, and the build overlays them into the site. Every number on '
        + 'every page is read from one of those files.\n\n'
        + 'That is deliberate: a number typed into a page is a number that can disagree with the pipeline '
        + 'and still render. An earlier version of this site asserted its headline as literals in prose, '
        + 'and when an adversarial review moved those numbers the prose kept claiming the old ones.\n\n'
        + 'The App fetches one truck at a time. The index is about a kilobyte, so the selector paints '
        + 'immediately, and a truck record is fetched only when it is selected.',
      body_es:
        'Nada se calcula en el navegador. El pipeline de Python de este repositorio corre sin conexión, '
        + 'escribe artefactos JSON en data/artifacts, y la compilación los superpone al sitio. Cada número '
        + 'de cada página se lee de uno de esos archivos.\n\n'
        + 'Es deliberado: un número escrito a mano en una página es un número que puede contradecir al '
        + 'pipeline y aun así renderizarse. Una versión anterior de este sitio afirmaba su resultado '
        + 'principal como literales en la prosa, y cuando una revisión adversarial movió esos números la '
        + 'prosa siguió afirmando los viejos.\n\n'
        + 'La App descarga un camión a la vez. El índice pesa alrededor de un kilobyte, así que el selector '
        + 'aparece de inmediato, y el registro de un camión se descarga solo cuando se selecciona.',
    },
    {
      id: 'science',
      en: 'The protocol',
      es: 'El protocolo',
      svg: 'svg/tech/04-the-protocol.svg',
      body_en:
        'The comparison is easy to get wrong in ways that look right, so the protocol is fixed in code.\n\n'
        + 'Both arms are handed to the detector as the same kind of object, so it cannot tell them apart. '
        + 'Each arm gets the threshold producing the same false-alarm rate, not the same threshold value, '
        + 'because a z-scored residual and a raw channel in bar are not on the same scale. Alarms are '
        + 'counted as EVENTS, not samples: a statistic above the line for an hour is one alarm an operator '
        + 'answers, not sixty. The bootstrap resamples UNITS, never samples, because consecutive cycles of '
        + 'one machine are not independent.\n\n'
        + 'And nothing is fitted on the record it judges. Both arms consume the same healthy stretch, '
        + 'thresholds are cross-fitted across units, and channel selection reads the baseline window only. '
        + 'Three of those four guarantees were added after an adversarial review found they were claimed '
        + 'but not implemented.',
      body_es:
        'La comparación es fácil de hacer mal de maneras que se ven bien, así que el protocolo está fijado '
        + 'en el código.\n\n'
        + 'Ambos brazos se entregan al detector como el mismo tipo de objeto, así que no puede '
        + 'distinguirlos. Cada brazo recibe el umbral que produce la misma tasa de falsas alarmas, no el '
        + 'mismo valor de umbral, porque un residuo en z y un canal crudo en bar no están en la misma '
        + 'escala. Las alarmas se cuentan como EVENTOS, no como muestras: un estadístico sobre la línea '
        + 'durante una hora es una alarma que un operador atiende, no sesenta. El bootstrap remuestrea '
        + 'UNIDADES, nunca muestras, porque los ciclos consecutivos de una máquina no son independientes.\n\n'
        + 'Y nada se ajusta sobre el registro que juzga. Ambos brazos consumen la misma ventana sana, los '
        + 'umbrales se eligen por validación cruzada entre unidades, y la selección de canales lee solo la '
        + 'ventana de línea base. Tres de esas cuatro garantías se agregaron después de que una revisión '
        + 'adversarial encontrara que se afirmaban sin estar implementadas.',
    },
    {
      id: 'honesty',
      en: 'What was wrong',
      es: 'Qué estaba mal',
      svg: 'svg/tech/05-what-was-wrong.svg',
      body_en:
        'This product shipped numbers that were wrong, and the corrections are part of it rather than '
        + 'edits to it.\n\n'
        + 'A review commissioned to refute the headline confirmed the MECHANISM through eight attacks, '
        + 'including a shuffled-context placebo, and broke three of the four published figures. The raw '
        + 'arm had been given a third of the healthy data. The threshold had been chosen on the data it '
        + 'scored. The threshold search could not see past a local budget violation, and the penalty fell '
        + 'almost entirely on the arm the claim was about. And the number carrying the recovery claim came '
        + 'from an arm with no regime segmentation in it at all.\n\n'
        + 'Separately, an onset-localisation result of 2.40x was published from a single run; repeating it '
        + 'across seeds turned it into a null. And the false-alarm-reduction claim was withdrawn entirely, '
        + 'because neither lane demonstrates it.\n\n'
        + 'The headline is now an effect size with no detector in it, so no threshold rule or alarm '
        + 'convention can move it, and the single-condition subsets act as a negative control returning '
        + 'exactly 1.00.',
      body_es:
        'Este producto publicó números equivocados, y las correcciones son parte de él en vez de ediciones '
        + 'sobre él.\n\n'
        + 'Una revisión encargada para refutar el resultado principal confirmó el MECANISMO a través de '
        + 'ocho ataques, incluido un placebo de contexto barajado, y rompió tres de las cuatro cifras '
        + 'publicadas. Al brazo crudo se le había dado un tercio de los datos sanos. El umbral se elegía '
        + 'sobre los datos que luego puntuaba. La búsqueda de umbral no podía ver más allá de una '
        + 'violación local del presupuesto, y la penalización caía casi toda sobre el brazo del que trataba '
        + 'la afirmación. Y el número que sostenía la recuperación venía de un brazo sin ninguna '
        + 'segmentación por régimen.\n\n'
        + 'Aparte, un resultado de localización de inicio de 2.40x se publicó desde una sola corrida; '
        + 'repetirlo sobre varias semillas lo convirtió en un nulo. Y la afirmación de reducción de falsas '
        + 'alarmas se retiró por completo, porque ningún carril la demuestra.\n\n'
        + 'El resultado principal es ahora un tamaño de efecto sin detector, así que ninguna regla de '
        + 'umbral ni convención de alarma puede moverlo, y los subconjuntos de una sola condición actúan '
        + 'como control negativo devolviendo exactamente 1.00.',
    },
  ],
};
