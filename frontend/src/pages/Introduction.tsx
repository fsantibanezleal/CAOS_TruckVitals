import { Callout, Cite, Equation } from '@fasl-work/caos-app-shell';
import { useLang } from '../lib/i18n.ts';
import { MechanismHeadline, OnsetNull } from '../viz/Headline.tsx';

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

      <p>{es ? 'La cadena que propone este producto:' : 'The chain this product proposes:'}</p>
      <pre style={{ overflowX: 'auto' }}><code>
        {es
          ? 'telemetría cruda -> SEGMENTACIÓN EN REGÍMENES -> residuo intra-régimen -> punto de cambio -> inicio'
          : 'raw telemetry -> REGIME SEGMENTATION -> within-regime residual -> change-point -> onset'}
      </code></pre>

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
            + 'histogramas por lectura, no canales continuos. Por eso la medición de error de inicio vive en '
            + 'el carril sintético: es el único lugar donde el instante real de inicio existe. Esa es una '
            + 'limitación del producto, no un detalle.'
          : 'No public, redistributable dataset of continuous haul-truck telemetry with labelled faults was '
            + 'found. Component X is real trucks but ships per-readout histograms rather than continuous '
            + 'channels. That is why the onset-error measurement lives on the synthetic lane: it is the only '
            + 'place the true onset instant exists. This is a limitation of the product, not a footnote.'}
      </Callout>
    </div>
  );
}
