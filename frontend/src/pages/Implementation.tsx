// Implementation: what runs, where it runs, and what was wrong with it before.

import { Callout, Cite, Tabs, type TabDef } from '@fasl-work/caos-app-shell';
import { loadFleetIndex } from '../lib/artifacts.ts';
import { useArtifact } from '../lib/useArtifact.ts';
import { useLang } from '../lib/i18n.ts';
import PanelBoundary from '../viz/PanelBoundary.tsx';

export default function Implementation() {
  const es = useLang() === 'es';
  const tabs: TabDef[] = [
    { id: 'stack', label: es ? 'El stack' : 'The stack', content: <PanelBoundary name="stack"><Stack es={es} /></PanelBoundary> },
    { id: 'engine', label: es ? 'El motor' : 'The engine', content: <PanelBoundary name="engine"><Engine es={es} /></PanelBoundary> },
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
            + 'publica, y se vuelve a hornear con la versión nueva. Eso pasó tres veces mientras se '
            + 'construía este producto.'
          : 'The split is not cosmetic: the engine is published and versioned on its own, and this product '
            + 'consumes it at a pinned version. A defect found here is fixed there, published, and re-baked '
            + 'against the new version. That happened three times while this product was being built.'}
      </p>
      {data && (
        <p className="tv-cap">
          {es ? 'Los artefactos de este sitio se hornearon con ' : 'This site\'s artifacts were baked with '}
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
              <td><Cite id="liu2008" /> <Cite id="scholkopf2001" /></td>
            </tr>
            <tr>
              <td>{es ? 'Más allá' : 'Beyond'}</td>
              <td>{es ? 'conformal dividido y adaptativo' : 'split and adaptive conformal'}</td>
              <td><Cite id="vovk2005" /> <Cite id="gibbs2021" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'Dos peldaños no detectan nada' : 'Two rungs detect nothing'}>
        {es
          ? 'BOCPD y ADWIN dan 0.00 en ambos brazos del carril sintético, y ambos fallos están predichos '
            + 'por la propia documentación del motor: la hipótesis de parámetros independientes de BOCPD '
            + 'sirve para cambios abruptos, no para rampas lentas, y el estadístico entero de ADWIN deja '
            + 'solo d+1 puntos de presupuesto. Se muestran en la tabla en vez de omitirse.'
          : 'BOCPD and ADWIN score 0.00 on both arms of the synthetic lane, and both failures are predicted '
            + "by the engine's own documentation: BOCPD's independent-parameters assumption suits step "
            + "changes rather than slow ramps, and ADWIN's integer statistic leaves only d+1 budget points. "
            + 'They appear in the table rather than being dropped from it.'}
      </Callout>
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
    </div>
  );
}
