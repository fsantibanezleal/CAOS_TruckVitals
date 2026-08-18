// Implementation: what runs, where it runs, and what was wrong with it before.

import { Callout, Cite, Equation, Refs, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import { loadFleetIndex } from '../lib/artifacts.ts';
import { useArtifact } from '../lib/useArtifact.ts';
import { useLang } from '../lib/i18n.ts';
import PanelBoundary from '../viz/PanelBoundary.tsx';

export default function Implementation() {
  const es = useLang() === 'es';
  const tabs: TabDef[] = [
    { id: 'stack', label: es ? 'El stack' : 'The stack', content: <PanelBoundary name="stack"><Stack es={es} /></PanelBoundary> },
    { id: 'engine', label: es ? 'El motor' : 'The engine', content: <PanelBoundary name="engine"><Engine es={es} /></PanelBoundary> },
    { id: 'parity', label: es ? 'Paridad' : 'Parity', content: <PanelBoundary name="parity"><Parity es={es} /></PanelBoundary> },
    { id: 'contract', label: es ? 'Contrato JSON' : 'JSON contract', content: <PanelBoundary name="contract"><Contract es={es} /></PanelBoundary> },
    { id: 'simulator', label: es ? 'Simulador' : 'Simulator', content: <PanelBoundary name="simulator"><Simulator es={es} /></PanelBoundary> },
    { id: 'defects', label: es ? 'Defectos' : 'Defects', content: <PanelBoundary name="defects"><Defects es={es} /></PanelBoundary> },
  ];
  return (
    <div className="page-body tv-prose">
      <h1>{es ? 'Implementación' : 'Implementation'}</h1>
      <p className="lead">
        {es
          ? 'El motor es un paquete publicado y separado; este repositorio es el producto que lo consume. '
            + 'Nada se calcula en el navegador: cada número se reproduce desde un artefacto versionado.'
          : 'The engine is a separate published package; this repository is the product that consumes it. '
            + 'Nothing is computed in the browser: every number is replayed from a committed artifact.'}
      </p>
      <Tabs tabs={tabs} ariaLabel={es ? 'Implementación' : 'Implementation'} />
    </div>
  );
}

function Stack({ es }: { es: boolean }) {
  const { data } = useArtifact(loadFleetIndex);
  return (
    <div className="tv-prose">
      <h3>{es ? 'Dos repositorios, una responsabilidad cada uno' : 'Two repositories, one responsibility each'}</h3>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Repositorio' : 'Repository'}</th>
              <th>{es ? 'Qué es' : 'What it is'}</th>
              <th>{es ? 'Qué contiene' : 'What it holds'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>regimecpd</code></td>
              <td>{es ? 'paquete PyPI, MIT' : 'PyPI package, MIT'}</td>
              <td>
                {es
                  ? 'regímenes, residuos, la escalera completa de detectores, métricas y conformal. '
                    + 'Reutilizable, sin nada específico de camiones.'
                  : 'regimes, residuals, the full detector ladder, metrics and conformal prediction. '
                    + 'Reusable, with nothing truck-specific in it.'}
              </td>
            </tr>
            <tr>
              <td><code>CAOS_TruckVitals</code></td>
              <td>{es ? 'el producto' : 'the product'}</td>
              <td>
                {es
                  ? 'los cuatro carriles de datos, la flota sintética, los artefactos horneados y este sitio. '
                    + 'NO declara paquete propio.'
                  : 'the four data lanes, the synthetic fleet, the baked artifacts and this site. It '
                    + 'declares NO package of its own.'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {es
          ? 'La separación no es cosmética: el motor se publica y se versiona por su cuenta, y este '
            + 'producto lo consume con una versión fijada. Un defecto encontrado aquí se corrige allá, se '
            + 'publica, y se vuelve a hornear con la versión nueva. Ese ciclo corrió SIETE veces mientras '
            + 'se construía este producto (0.09.001 a 0.09.007); la tabla de defectos de al lado los '
            + 'cuenta uno por uno.'
          : 'The split is not cosmetic: the engine is published and versioned on its own, and this product '
            + 'consumes it at a pinned version. A defect found here is fixed there, published, and re-baked '
            + 'against the new version. That cycle ran SEVEN times while this product was being built '
            + '(0.09.001 through 0.09.007); the Defects table next door counts them one by one.'}
      </p>
      {data && (
        <p className="tv-cap">
          {es
            ? 'Cada artefacto registra la versión que lo horneó. El benchmark sintético (escalera y '
              + 'curvas de presupuesto) corre regimecpd 0.09.006; las trazas de flota y los artefactos '
              + 'C-MAPSS corren '
            : 'Every artifact records the version that baked it. The synthetic benchmark (ladder and '
              + 'budget curves) runs regimecpd 0.09.006; the fleet traces and the C-MAPSS artifacts run '}
          <code>regimecpd {data.regimecpd_version}</code>{', Python '}{data.python}{', numpy '}{data.numpy}.
        </p>
      )}
    </div>
  );
}

function Engine({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h3>{es ? 'La escalera de métodos' : 'The method ladder'}</h3>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Nivel' : 'Tier'}</th>
              <th>{es ? 'Métodos' : 'Methods'}</th>
              <th>{es ? 'Fuente primaria' : 'Primary source'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'Clásico' : 'Classical'}</td>
              <td>Shewhart, CUSUM, EWMA, Page-Hinkley</td>
              <td><Cite id="shewhart1931" /> <Cite id="page1954" /> <Cite id="roberts1959" /> <Cite id="hinkley1971" /></td>
            </tr>
            <tr>
              <td>{es ? 'Multivariado' : 'Multivariate'}</td>
              <td>Hotelling T-squared, SPE/Q, {es ? 'gráficos de contribución' : 'contribution plots'}</td>
              <td><Cite id="hotelling1947" /> <Cite id="jackson1979" /> <Cite id="kourti1996" /> <Cite id="westerhuis2000" /> <Cite id="ku1995" /></td>
            </tr>
            <tr>
              <td>SOTA</td>
              <td>BOCPD, PELT, mSTAMP, ADWIN, KSWIN</td>
              <td><Cite id="adams2007" /> <Cite id="killick2012" /> <Cite id="yeh2017" /> <Cite id="bifet2007" /> <Cite id="raab2020" /></td>
            </tr>
            <tr>
              <td>{es ? 'Novedad' : 'Novelty'}</td>
              <td>Isolation Forest, One-Class SVM, {es ? 'autocodificador' : 'autoencoder'}</td>
              <td><Cite id="liu2008" /> <Cite id="scholkopf2001" /> <Cite id="sakurada2014" /></td>
            </tr>
            <tr>
              <td>{es ? 'Más allá' : 'Beyond'}</td>
              <td>{es ? 'conformal dividido y adaptativo' : 'split and adaptive conformal'}</td>
              <td><Cite id="vovk2005" /> <Cite id="gibbs2021" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>{es ? 'Lo que ESTE build pasa, contra los defaults del motor' : 'What THIS build passes, against the engine defaults'}</h3>
      <p>
        {es
          ? 'Varios peldaños corren con parámetros que DIFIEREN de los defaults del motor, y cualquier '
            + 'doc que cite "el default" los describiría mal. La teoría completa vive en Metodología; '
            + 'esto es lo que corre.'
          : 'Several rungs run with parameters that DIFFER from the engine defaults, and any doc '
            + 'quoting "the default" would misdescribe them. Full theory lives on Methodology; this is '
            + 'what runs.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Peldaño' : 'Rung'}</th>
              <th>{es ? 'Este build' : 'This build'}</th>
              <th>{es ? 'Default del motor' : 'Engine default'}</th>
              <th>{es ? 'Por qué' : 'Why'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>EWMA</td><td><code>lam=0.1</code></td><td><code>0.2</code></td>
              <td>{es
                ? 'memoria más larga; para un desplazamiento sostenido el estadístico estandarizado CRECE cuando lambda baja (la dirección corregida)'
                : 'longer memory; for a sustained shift the standardised statistic GROWS as lambda shrinks (the corrected direction claim)'}</td>
            </tr>
            <tr>
              <td>Page-Hinkley</td><td><code>delta=0.05</code></td><td><code>0.005</code></td>
              <td>{es
                ? 'diez veces el default; y NO es un método independiente de CUSUM (correlación sobre 0.98 a tolerancia igual)'
                : 'tenfold the default; and NOT independent of CUSUM (correlation above 0.98 at equal allowance)'}</td>
            </tr>
            <tr>
              <td>BOCPD</td><td><code>hazard=400, max_runs=200, warmup=40</code></td><td><code>250, 500, 20</code></td>
              <td>{es
                ? 'costo: el posterior exacto crece una hipótesis por muestra y con el default este peldaño dominaba el benchmark entero'
                : 'cost: the exact posterior grows one hypothesis per sample and at the default this rung dominated the whole benchmark'}</td>
            </tr>
            <tr>
              <td>KSWIN</td><td><code>window=240, recent=60</code></td><td><code>200, 50</code></td>
              <td>{es
                ? 'ventanas en minutos de operación; el alpha del constructor es INERTE en este build (el punto de operación lo pone la calibración)'
                : 'windows in operating minutes; the constructor alpha is INERT in this build (calibration sets the operating point)'}</td>
            </tr>
            <tr>
              <td>{es ? 'Autocodificador' : 'Autoencoder'}</td><td><code>epochs=60</code></td><td><code>200</code></td>
              <td>{es
                ? 'elección de build; si 60 converge para estos datos NO ESTÁ VERIFICADO (las filas del artefacto no llevan final_train_loss)'
                : 'a build choice; whether 60 is converged for this data is UNVERIFIED (the artifact rows do not carry final_train_loss)'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Equation
        tex={String.raw`\hat{\tau} = \arg\max_{\tau}\ \mathrm{sensitivity}(\tau)\quad\text{s.t.}\quad
          \mathrm{FA}_{\mathrm{events}}(\tau) \le \mathrm{budget}\ \ \wedge\ \ \mathrm{duty}_{\mathrm{healthy}}(\tau) \le 0.05`}
        caption={es
          ? 'La regla por la que corren TODAS las comparaciones: barrido de la grilla completa de '
            + 'umbrales, tasa de falsas alarmas contada por EVENTOS dentro del presupuesto, y un tope de '
            + 'ciclo de trabajo sano que excluye la región degenerada siempre-en-alarma SIN usar '
            + 'etiquetas de inicio. Los límites publicados de cada método (chi-cuadrado, '
            + 'Jackson-Mudholkar) se implementan y NO se usan para puntuar: dos métodos leídos en sus '
            + 'propios límites preferidos no dicen nada el uno del otro.'
          : 'The rule ALL comparisons run through: a whole-grid threshold scan, the EVENT-counted '
            + 'false-alarm rate inside the budget, and a healthy-duty cap that excludes the degenerate '
            + 'always-alarming region WITHOUT using onset labels. Each method\'s published limits '
            + '(chi-square, Jackson-Mudholkar) are implemented and NOT used for scoring: two methods '
            + 'read at their own preferred limits tell you nothing about each other.'}
      />

      <Callout variant="honest" title={es ? 'Dos alcances que los docs deben respetar' : 'Two scopes the docs must respect'}>
        {es
          ? 'PELT y mSTAMP son métodos del MOTOR y no producen filas en este horneado: ambos son '
            + 'retrospectivos (el perfil de mSTAMP se calcula contra coincidencias en cualquier parte '
            + 'del registro, incluidas las posteriores), y una métrica de detección en línea no debe '
            + 'puntuar jamás un método que ya leyó el futuro; PELT maneja en cambio la estimación '
            + 'retrospectiva de inicio. Y la calibración conformal es una CAPACIDAD del motor que este '
            + 'pipeline deliberadamente no usa: el presupuesto común se realiza por búsqueda directa de '
            + 'umbral, y atribuirlo a conformal sería una sobreafirmación. El propio motor marca la '
            + 'cita de Vovk como no verificada contra la fuente primaria.'
          : 'PELT and mSTAMP are ENGINE methods and produce no rows in this bake: both are '
            + 'retrospective (the mSTAMP profile is computed against matches anywhere in the record, '
            + 'including after the window), and an online detection metric must never score a method '
            + 'that has read the future; PELT instead drives the retrospective onset estimate. And '
            + 'conformal calibration is an engine CAPABILITY this pipeline deliberately does not use: '
            + 'the common budget is realised by direct threshold search, and attributing it to '
            + 'conformal would be an overclaim. The engine itself flags the Vovk citation as not '
            + 'verified against the primary source.'}
      </Callout>

      <Refs ids={['shewhart1931', 'page1954', 'roberts1959', 'hinkley1971', 'hotelling1947', 'jackson1979',
        'adams2007', 'killick2012', 'yeh2017', 'bifet2007', 'raab2020', 'liu2008', 'scholkopf2001',
        'sakurada2014', 'vovk2005', 'gibbs2021']} label={es ? 'Referencias' : 'References'} />

      <Callout variant="honest" title={es ? 'Los peldaños que casi no detectan' : 'The rungs that barely detect'}>
        {es
          ? 'BOCPD da 0.00 en AMBOS brazos del carril sintético, y ADWIN da 0.00 en crudo y 0.0625 (1 de '
            + '16, con 652 min de retardo) en residuos. Ambas debilidades están predichas por la propia '
            + 'documentación del motor: la hipótesis de parámetros independientes de BOCPD sirve para '
            + 'cambios abruptos, no para rampas lentas, y el estadístico entero de ADWIN deja solo d+1 '
            + 'puntos de operación donde otros peldaños ofrecen cientos. Se muestran en la tabla en vez '
            + 'de omitirse.'
          : 'BOCPD scores 0.00 on BOTH arms of the synthetic lane, and ADWIN scores 0.00 raw and 0.0625 '
            + '(1 of 16, at 652 min delay) on residuals. Both weaknesses are predicted by the engine\'s '
            + 'own documentation: BOCPD\'s independent-parameters assumption suits step changes rather '
            + 'than slow ramps, and ADWIN\'s integer statistic leaves only d+1 operating points where '
            + 'other rungs offer hundreds. They appear in the table rather than being dropped from it.'}
      </Callout>
    </div>
  );
}

// The product's most distinctive implementation mechanism: two engines, one truth. Transcribed from
// run_parity.py's own docstring and the findings record.
function Parity({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h3>{es ? 'Dos motores, una verdad' : 'Two engines, one truth'}</h3>
      <p>
        {es
          ? 'La App tiene un carril EN VIVO, y eso significa que existe una segunda implementación del '
            + 'motor, en TypeScript. Dos implementaciones del mismo método son dos cosas que pueden '
            + 'discrepar, y si discrepan, la App muestra números que el propio pipeline del producto no '
            + 'produciría, sin que ninguna de las dos suites de pruebas lo note. Por eso el motor del '
            + 'navegador está COMPUERTADO contra el de Python: run_parity.py hornea las entradas y las '
            + 'salidas que Python calcula de ellas, y la suite del frontend las recalcula en TypeScript '
            + 'y afirma la coincidencia, en CI, en cada push.'
          : 'The App has a LIVE lane, and that means a second implementation of the engine exists, in '
            + 'TypeScript. Two implementations of the same method are two things that can disagree, and '
            + 'if they do, the App shows numbers the product\'s own pipeline would not produce, with '
            + 'neither test suite noticing. So the browser engine is GATED against the Python one: '
            + 'run_parity.py bakes inputs and the outputs Python computes from them, and the frontend '
            + 'suite recomputes them in TypeScript and asserts the match, in CI, on every push.'}
      </p>
      <p>
        {es
          ? 'Qué se compara, porque es determinista dadas las entradas: el escalador de línea base, el '
            + 'estadístico de cada detector clásico, el residuo intra-régimen con etiquetas fijas, y '
            + 'cada métrica de flota (flancos de subida, falsas alarmas, detección, retardo, el umbral '
            + 'elegido para un presupuesto, la curva de presupuesto). Qué NO se compara bit a bit, '
            + 'deliberadamente: el SIMULADOR y la SEMILLA de k-means. numpy genera normales con un '
            + 'ziggurat sobre PCG64, y reproducir ese stream en el navegador significaría embarcar una '
            + 'reimplementación de las entrañas de numpy sin beneficio, así que el fixture lleva los '
            + 'ARREGLOS REALES en vez de una semilla, y k-means se verifica aparte, sobre centroides '
            + 'convergidos en clusters bien separados, donde el óptimo de Lloyd no depende de la '
            + 'inicialización.'
          : 'What is compared, because it is deterministic given the inputs: the baseline scaler, every '
            + 'classical detector statistic, the within-regime residual given fixed labels, and every '
            + 'fleet metric (rising edges, false alarms, detection, delay, the threshold chosen for a '
            + 'budget, the budget curve). What is deliberately NOT compared bit for bit: the SIMULATOR '
            + 'and the k-means SEEDING. numpy draws normals with a ziggurat over PCG64, and reproducing '
            + 'that stream in the browser would mean shipping a reimplementation of numpy\'s internals '
            + 'for no benefit, so the fixture carries the ACTUAL ARRAYS rather than a seed, and k-means '
            + 'is checked separately, on converged centroids over well-separated clusters, where '
            + 'Lloyd\'s optimum does not depend on the seeding.'}
      </p>
      <Callout variant="strong" title={es ? 'La compuerta se ganó el puesto de inmediato' : 'The gate earned its place immediately'}>
        {es
          ? 'La primera corrida de paridad encontró una divergencia real: la grilla de umbrales de '
            + 'TypeScript era lineal donde la de Python es por cuantiles, y seleccionaba un umbral '
            + 'distinto para el mismo presupuesto. La App habría mostrado curvas de presupuesto que el '
            + 'pipeline no reconocería, con ambas suites en verde. Ahora la coincidencia es exacta.'
          : 'The first parity run found a real divergence: the TypeScript threshold grid was linear '
            + 'where Python\'s is quantile-based, and it selected a different threshold for the same '
            + 'budget. The App would have shown budget curves the pipeline would not recognise, with '
            + 'both suites green. The match is now exact.'}
      </Callout>
      <p>
        {es
          ? 'La compuerta también DECIDE ALCANCE: la SVM de una clase no corre en vivo en el navegador, '
            + 'porque ajustarla ahí exigiría embarcar un solver SMO, y una aproximación sería una '
            + 'tercera implementación que esta compuerta no puede verificar. Un peldaño que no puede '
            + 'ser compuerteado no entra al carril en vivo.'
          : 'The gate also DECIDES SCOPE: the one-class SVM does not run live in the browser, because '
            + 'fitting it there would mean shipping an SMO solver, and an approximation would be a '
            + 'third implementation this gate cannot check. A rung that cannot be gated does not enter '
            + 'the live lane.'}
      </p>
    </div>
  );
}

// The strict-JSON contract that keeps the site able to read its own artifacts. Transcribed from
// truckvitals/jsonio.py.
function Contract({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h3>{es ? 'JSON estricto, porque el navegador lo es' : 'Strict JSON, because the browser is'}</h3>
      <p>
        {es
          ? 'json.dump de Python emite NaN e Infinity literales, que NO son JSON: todo navegador '
            + 'rechaza el documento completo. La falla es total y silenciosa desde el lado del '
            + 'pipeline: el archivo se escribe, las pruebas pasan, y el sitio que existe para mostrar '
            + 'ese artefacto no puede leerlo. Pasó de verdad: un regime_coverage legítimamente NaN en '
            + 'el brazo crudo dejó ilegible cmapss_regime_contrast.json, el artefacto principal.'
          : 'Python\'s json.dump emits bare NaN and Infinity literals, which are NOT JSON: every '
            + 'browser rejects the whole document. The failure is total and silent from the pipeline\'s '
            + 'side: the file writes, the tests pass, and the site that exists to display that artifact '
            + 'cannot read it. It really happened: a legitimately-NaN regime_coverage on the raw arm '
            + 'made cmapss_regime_contrast.json, the headline artifact, unparseable.'}
      </p>
      <p>
        {es
          ? 'El contrato, en truckvitals/jsonio.py: NaN se escribe como null, porque "no medido" es un '
            + 'valor que un lector debe ver. Un infinito LANZA una excepción, porque una métrica '
            + 'infinita es un bug en la métrica, no un valor faltante. Y loads_strict re-parsea cada '
            + 'archivo con la estrictez de un navegador ANTES de que llegue al disco, usando '
            + 'parse_constant, porque json.loads de Python acepta NaN alegremente y una verificación '
            + 'que acepta lo que el navegador rechaza es una verificación de nada. Eso es lo que la '
            + 'convierte en una compuerta real en vez de una tranquilizadora.'
          : 'The contract, in truckvitals/jsonio.py: NaN is written as null, because "not measured" is '
            + 'a value a reader must see. An infinity RAISES, because an infinite metric is a bug in '
            + 'the metric, not a missing value. And loads_strict re-parses every file with a browser\'s '
            + 'strictness BEFORE it reaches disk, using parse_constant, because Python\'s json.loads '
            + 'happily accepts NaN and a check that accepts what the browser rejects is a check of '
            + 'nothing. That is what makes this a real gate rather than a reassuring one.'}
      </p>
      <p className="tv-cap">
        {es
          ? 'CI verifica además que los siete artefactos existen, que cada JSON es parseable por '
            + 'navegador, y que las catorce trazas de camión son consistentes con su índice. Desde '
            + '0.02.000 cada fetch de datos lleva ?v=version: Pages sirve estos JSON por CDN, y un '
            + 'artefacto cuya FORMA cambió se renderiza silenciosamente incompleto desde una caché '
            + 'vieja.'
          : 'CI additionally checks that all seven artifacts exist, that every JSON is '
            + 'browser-parseable, and that the fourteen truck traces are consistent with their index. '
            + 'Since 0.02.000 every data fetch carries ?v=version: Pages serves these JSON files '
            + 'through a CDN, and an artifact whose SHAPE changed renders silently incomplete from a '
            + 'stale cache.'}
      </p>
    </div>
  );
}

// The synthetic fleet: the standing risk, the three guards, and the conventions. Transcribed from
// synthetic_benchmark.py's docstring and the findings record.
function Simulator({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <h3>{es ? 'Un carril sintético puede fabricar cualquier resultado' : 'A synthetic lane can fabricate any result'}</h3>
      <p>
        {es
          ? 'Ese es el riesgo permanente, y se maneja con tres guardias. Primero, el confundidor de '
            + 'régimen es EMERGENTE: los canales se calculan desde la física del ciclo de acarreo '
            + '(resistencia, presión de suspensión desde la carga útil, calentamiento de neumáticos '
            + 'estilo TKPH), no se decoran con un término con forma de régimen. Segundo, el MISMO '
            + 'protocolo del carril C-MAPSS corre aquí sin cambios: ajuste, calibración, puntaje, con '
            + 'ambos brazos leídos a un presupuesto común. Tercero, una línea base TRIVIAL se puntúa '
            + 'junto a la escalera: un umbral fijo sobre el único canal que cada falla mueve primero, '
            + 'A LA QUE SE LE DICE la respuesta. Si eso empata a los métodos sofisticados, el carril '
            + 'es demasiado fácil para ser informativo, y se reporta en vez de esconderse. Da 0.75 a '
            + '123 minutos, y dos peldaños aprendidos NO la vencen.'
          : 'That is the standing risk, and three guards handle it. First, the regime confound is '
            + 'EMERGENT: channels are computed from the haul cycle\'s physics (resistance, strut '
            + 'pressure from payload, TKPH-style tyre heating), not decorated with a regime-shaped '
            + 'term. Second, the SAME protocol as the C-MAPSS lane runs here unchanged: fit, calibrate, '
            + 'score, with both arms read at a common budget. Third, a TRIVIAL baseline is scored '
            + 'alongside the ladder: a fixed threshold on the single channel each fault moves first, '
            + 'TOLD the answer. If it matches the sophisticated methods, the lane is too easy to be '
            + 'informative, and that is reported rather than hidden. It scores 0.75 at 123 minutes, '
            + 'and two learned rungs do NOT beat it.'}
      </p>
      <p>
        {es
          ? 'FAULT_CHANNELS registra qué canal mueve primero cada falla inyectada. Es la VERDAD DE '
            + 'PUNTAJE de la atribución, nunca una pista entregada a ningún método: convierte "¿nombró '
            + 'el método el canal correcto?" en una pregunta puntuable. El resultado se publica como '
            + 'débil: tasa top-2 de 0.44, y 0 de 4 en pérdida de refrigeración.'
          : 'FAULT_CHANNELS records which channel each injected fault moves first. It is attribution\'s '
            + 'SCORING TRUTH, never a hint handed to any method: it turns "did the method name the '
            + 'right channel" into a scorable question. The result is published as weak: top-2 hit '
            + 'rate 0.44, and 0 of 4 on cooling loss.'}
      </p>
      <p className="tv-cap">
        {es
          ? 'Dos convenciones declaradas en vez de asumidas: una muestra es un minuto de operación y un '
            + 'mes son 43200 minutos, así que "1.0 falsas alarmas por camión-mes" tiene unidades '
            + 'exactas. Y la severidad por defecto de la App es 0.25, no 1.0: a severidad completa la '
            + 'fuga de suspensión es 9 bar contra 0.35 bar de ruido, y el instrumento sería una línea '
            + 'plana, verdadera e inútil como primera vista.'
          : 'Two conventions stated rather than assumed: one sample is one minute of operation and a '
            + 'month is 43200 minutes, so "1.0 false alarms per truck-month" has exact units. And the '
            + 'App\'s default severity is 0.25, not 1.0: at full severity the strut leak is 9 bar '
            + 'against 0.35 bar of noise, and the instrument would be a flat line, true and useless as '
            + 'a first view.'}
      </p>
    </div>
  );
}

function Defects({ es }: { es: boolean }) {
  return (
    <div className="tv-prose">
      <p>
        {es
          ? 'Esta página existe porque los defectos que importan no hacen que nada falle. Producen un '
            + 'número que un lector aceptaría. Cada uno de estos se encontró después de que la suite de '
            + 'pruebas estuviera verde, y cada uno favorecía el resultado.'
          : 'This page exists because the defects that matter do not make anything crash. They produce a '
            + 'number a reader would accept. Every one of these was found after the test suite was green, '
            + 'and every one flattered the result.'}
      </p>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Defecto' : 'Defect'}</th>
              <th>{es ? 'Efecto medido' : 'Measured effect'}</th>
              <th>{es ? 'Corregido en' : 'Fixed in'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'Un canal constante salvo ruido de coma flotante se estandarizaba por ese ruido' : 'A channel constant to within floating-point noise was standardised by that noise'}</td>
              <td>{es ? 'z-scores de 1e12; una unidad fijaba el umbral de toda la flota y la detección caía de 0.79 a 0.07' : 'z-scores of 1e12; one unit set the fleet threshold and detection fell from 0.79 to 0.07'}</td>
              <td><code>regimecpd 0.09.001</code></td>
            </tr>
            <tr>
              <td>{es ? 'El término armónico de ADWIN no coincidía ni con el paper ni con MOA, mientras la documentación afirmaba que sí' : "ADWIN's harmonic term matched neither the paper nor MOA, while the docs asserted it did"}</td>
              <td>{es ? 'un solo sample de retardo; el valor está en la reproducibilidad, no en el número' : 'one sample of delay; the value is in reproducibility, not in the number'}</td>
              <td><code>regimecpd 0.09.002</code></td>
            </tr>
            <tr>
              <td>{es ? 'La búsqueda de umbral se detenía en la primera violación del presupuesto y no veía los umbrales válidos por debajo' : 'The threshold search stopped at the first budget violation and could not see qualifying thresholds below it'}</td>
              <td>{es ? '14 umbrales válidos inalcanzables; 0.046 contra 0.276 disponible, y la penalización caía casi toda sobre el brazo multi-condición' : '14 qualifying thresholds unreachable; 0.046 against 0.276 available, with the penalty falling almost entirely on the multi-condition arm'}</td>
              <td><code>regimecpd 0.09.003</code></td>
            </tr>
            <tr>
              <td>{es ? 'El mismo agujero de escala degenerada, reabierto en la rama de residuo lineal' : 'The same degenerate-scale hole, reopened in the linear residual branch'}</td>
              <td>{es ? 'un canal muerto con residuo mediano 0.74 y máximo 5.0, que dominaba 552 de 1199 muestras' : 'a dead channel with median residual 0.74 and maximum 5.0, driving 552 of 1199 samples'}</td>
              <td><code>regimecpd 0.09.004</code></td>
            </tr>
            <tr>
              <td>{es ? 'El brazo crudo recibía un tercio de los datos sanos del brazo de residuos' : 'The raw arm was given a third of the residual arm\'s healthy data'}</td>
              <td>{es ? 'FD002 crudo 0.046 a 0.161; los brazos de una sola condición no cambiaron' : 'FD002 raw 0.046 to 0.161; the single-condition arms did not move'}</td>
              <td>{es ? 'este producto' : 'this product'}</td>
            </tr>
            <tr>
              <td>{es ? 'El umbral se elegía sobre los mismos datos que luego puntuaba' : 'The threshold was chosen on the data it then scored'}</td>
              <td>{es ? 'sin cambio en la conclusión, pero era una fuga real y la documentación afirmaba lo contrario' : 'no change in the conclusion, but a real leak, and the docs asserted the opposite'}</td>
              <td>{es ? 'este producto' : 'this product'}</td>
            </tr>
            <tr>
              <td>{es ? 'Los artefactos se escribían con NaN literal, que no es JSON válido' : 'Artifacts were written with a bare NaN, which is not valid JSON'}</td>
              <td>{es ? 'el sitio no podía leer su propio artefacto principal; el pipeline no notaba nada' : "the site could not parse its own headline artifact; the pipeline noticed nothing"}</td>
              <td>{es ? 'este producto' : 'this product'}</td>
            </tr>
            <tr>
              <td>{es ? 'Un hueco de NaN dentro de una excursión sostenida se contaba como una segunda alarma, sesgo que caía sobre el brazo de residuos por diseño (ese brazo lleva NaN para muestras fuera de régimen)' : 'A NaN gap inside one sustained excursion counted as a second alarm, a bias falling on the residual arm by design (that arm carries NaN for out-of-regime samples)'}</td>
              <td>{es ? 'cerca de 18x a 10 por ciento sin asignar; corregirlo movió la recuperación FD004 de 0.70 a 0.90 y FD002 de 0.98 a 0.95, que es cómo se ve una corrección SIN sesgo: un número subió y otro bajó' : 'about 18x at 10 percent unassigned; the fix moved FD004 recovery 0.70 to 0.90 and FD002 0.98 to 0.95, which is what an unbiased fix looks like: one number rose and one fell'}</td>
              <td><code>regimecpd 0.09.005</code></td>
            </tr>
            <tr>
              <td>{es ? 'Cuatro defectos más en la misma revisión: un inicio NaN puntuado como DETECCIÓN que borraba el retardo mediano de la flota; un radio de cluster degenerado que rechazaba su propio centro; PELT meanvar cortando sobre redondeo; mSTAMP decidiendo "plano" dos veces con dos estimadores distintos' : 'Four more defects in the same review: a NaN onset scored as a DETECTION that erased the fleet median delay; a degenerate cluster radius that rejected its own centre; PELT meanvar cutting on roundoff; mSTAMP deciding "flat" twice with two different estimators'}</td>
              <td>{es ? 'los cinco reproducidos contra una suite de 301 pruebas EN VERDE; y la primera corrección del defecto de SPE estuvo MAL (eliminaba las direcciones que SPE existe para vigilar) hasta que su propia prueba pareada la atrapó y la guardia se movió al límite' : 'all five reproduced against a GREEN 301-test suite; and the first fix for the SPE defect was WRONG (it dropped the directions SPE exists to watch) until its own paired test caught it and the guard moved to the limit'}</td>
              <td><code>regimecpd 0.09.005</code></td>
            </tr>
            <tr>
              <td>{es ? 'El piso de escala de los detectores de novedad referenciaba una media con signo, que un residuo centra en cero por construcción: el TERCER módulo con la misma clase de defecto, encontrada de a una' : 'The novelty detectors\' scale floor referenced a signed mean, which a residual centres at zero by construction: the THIRD module with the same defect class, found one at a time'}</td>
              <td>{es ? 'exactamente los peldaños que corren sobre el brazo de residuos; el horneado embarcado corre 0.09.006, así que las tablas publicadas incluyen la corrección. La lección registrada: una guardia compartida cuyo LLAMADOR elige la referencia será llamada mal en alguna parte' : 'exactly the rungs run on the residual arm; the shipped bake runs 0.09.006, so the published tables include the fix. The recorded lesson: a shared guard whose CALLER picks the reference will be called wrongly somewhere'}</td>
              <td><code>regimecpd 0.09.006</code></td>
            </tr>
            <tr>
              <td>{es ? 'El docstring de ADWIN mostró una cota mientras el código computaba otra, por cinco versiones: la corrección 0.09.002 actualizó el código y su comentario pero nunca el docstring' : 'The ADWIN docstring displayed one bound while the code computed another, for five releases: the 0.09.002 fix updated the code and its comment but never the docstring'}</td>
              <td>{es ? 'encontrado por la extracción ecuación-contra-código detrás de las páginas de métodos de este sitio; solo documentación, ninguna ruta de código cambió' : 'found by the equation-versus-code extraction behind this site\'s method pages; documentation only, no code path changed'}</td>
              <td><code>regimecpd 0.09.007</code></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout variant="honest" title={es ? 'Una prueba verde no es evidencia de lo que afirma' : 'A green test is not evidence of what it claims'}>
        {es
          ? 'La suite del motor pasaba 301 pruebas mientras cuatro de estos defectos estaban presentes. El '
            + 'comportamiento medido era CONSISTENTE con la fórmula equivocada en al menos un caso, así que '
            + 'no era evidencia de que fuera correcta. Las pruebas que ahora los cubren recalculan la '
            + 'fórmula desde la fuente primaria en vez de fijar un comportamiento.'
          : "The engine suite passed 301 tests while four of these defects were present. The measured "
            + 'behaviour was CONSISTENT with the wrong formula in at least one case, so it was no evidence '
            + 'the formula was right. The tests that now cover them recompute the closed form from the '
            + 'primary source rather than pinning a behaviour.'}
      </Callout>
      <Callout variant="honest" title={es ? 'El meta-defecto: una compuerta que nadie leía' : 'The meta-defect: a gate nobody was reading'}>
        {es
          ? 'La compuerta de coherencia de versiones del motor estuvo FALLANDO sin que se leyera desde '
            + '0.09.001: el archivo VERSION quedó cuatro versiones atrás mientras el CI lo señalaba en '
            + 'rojo en cada corrida. La compuerta tenía razón y nadie leía su salida. Volvió a '
            + 'dispararse en la publicación de 0.09.007, cuando el bump tocó tres de las cuatro '
            + 'ubicaciones de versión, y esa vez se leyó: minutos en vez de versiones.'
          : 'The engine\'s version-coherence gate had been FAILING unread since 0.09.001: the VERSION '
            + 'file sat four releases behind while CI flagged it red on every run. The gate was right '
            + 'and nobody was reading its output. It fired again on the 0.09.007 release, when the bump '
            + 'touched three of the four version locations, and that time it was read: minutes instead '
            + 'of releases.'}
      </Callout>
    </div>
  );
}
