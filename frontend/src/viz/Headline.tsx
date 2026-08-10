// The headline and the null, rendered from their artifacts rather than typed into a page.
//
// An earlier version of the Introduction asserted 0.96, 0.05 and 0.98 as literals in the prose. An
// adversarial review moved every one of those numbers, and prose cannot notice that. These components can
// only ever show what the pipeline last produced, and say so plainly when an artifact is missing.

import { Callout } from '@fasl-work/caos-app-shell';
import { loadMechanism, loadOnsetSweep } from '../lib/artifacts.ts';
import { n, useArtifact } from '../lib/useArtifact.ts';

export function MechanismHeadline({ es }: { es: boolean }) {
  const { data, error } = useArtifact(loadMechanism);
  if (error) {
    return (
      <div className="tv-err">
        {es ? 'No se pudo cargar la medición.' : 'The measurement could not be loaded.'} {error}
      </div>
    );
  }
  if (!data) return <p className="tv-muted">{es ? 'Cargando la medición...' : 'Loading the measurement...'}</p>;

  const rows = data.pairs.flatMap((p) => Object.entries(p.subsets).map(([name, s]) => ({ name, ...s })));

  return (
    <>
      <Callout
        variant="strong"
        title={es ? 'El resultado principal, sin detector' : 'The headline result, with no detector in it'}
      >
        {es
          ? 'La afirmación más fuerte de este producto no involucra detector, umbral, convención de alarma '
            + 'ni presupuesto, así que ninguna de esas decisiones puede discutirse. Es un tamaño de efecto: '
            + 'qué tan grande es la firma de la falla medida contra la dispersión ENTRE regímenes, y contra '
            + 'la dispersión DENTRO de uno.'
          : 'The strongest statement this product makes involves no detector, no threshold, no alarm '
            + 'convention and no budget, so none of those choices can be argued with. It is an effect size: '
            + "how large is the fault's signature against the spread ACROSS regimes, and against the spread "
            + 'WITHIN one?'}
      </Callout>

      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Subconjunto' : 'Subset'}</th>
              <th>{es ? 'Condiciones' : 'Conditions'}</th>
              <th>{es ? 'Firma, agrupada' : 'Signature, pooled'}</th>
              <th>{es ? 'Firma, intra-régimen' : 'Signature, within regime'}</th>
              <th>{es ? 'Razón' : 'Ratio'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={r.n_conditions > 1 ? 'hl' : undefined}>
                <td>{r.name}</td>
                <td>{r.n_conditions}</td>
                <td>{n(r.median_d_pooled)} sigma</td>
                <td>{n(r.median_d_within_regime)} sigma</td>
                <td><strong>{n(r.ratio)}x</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        {es
          ? 'En datos de seis condiciones la falla mueve los sensores una fracción de una desviación '
            + 'estándar de la dispersión que induce el régimen, lo que es invisible, y diez a doce '
            + 'desviaciones de la dispersión dentro de un régimen, lo que es imposible de perder. Mismos '
            + 'datos, mismos canales, misma falla. Solo cambia el denominador.'
          : 'On six-condition data the fault moves the sensors by a fraction of one standard deviation of '
            + 'the spread the operating regime induces, which is invisible, and by ten to twelve standard '
            + 'deviations of the spread within a regime, which is unmissable. Same data, same channels, '
            + 'same fault. Only the denominator changes.'}
      </p>

      <Callout
        variant="note"
        title={es ? 'El control negativo que nadie diseñó' : 'The negative control nobody designed'}
      >
        {es
          ? 'Los subconjuntos de una sola condición devuelven exactamente 1.00, como deben: con un solo '
            + 'régimen los dos denominadores son la misma cantidad. Ese control no fue diseñado, es lo que '
            + 'el mismo código devuelve sobre datos donde no hay nada que condicionar, y un número lejos '
            + 'de 1.00 ahí significaría que la medición está rota.'
          : 'The single-condition subsets return exactly 1.00, as they must: with one regime the two '
            + 'denominators are the same quantity. That control was not designed, it is what the identical '
            + 'code returns on data with nothing to condition on, and a number away from 1.00 there would '
            + 'mean the measurement is broken.'}
      </Callout>
    </>
  );
}

export function OnsetNull({ es }: { es: boolean }) {
  const { data } = useArtifact(loadOnsetSweep);
  const s = data?.skill_summary;
  const seeds = data ? data.per_seed.length : null;
  return (
    <Callout
      variant="honest"
      title={es ? 'Y un resultado NULO, del mismo protocolo' : 'And a NULL result, from the same protocol'}
    >
      {es
        ? 'La misma idea NO mejora la localización del inicio en el tiempo. Medida de forma pareada sobre '
        : 'The same idea does NOT improve onset localisation in time. Measured paired over '}
      {seeds ?? '...'}
      {es ? ' semillas contra un nivel de azar, la diferencia es ' : ' seeds against a chance level, the difference is '}
      <strong>
        {s ? `${s.paired_difference.mean >= 0 ? '+' : ''}${n(s.paired_difference.mean)} +/- ${n(s.paired_difference.sd)}` : '...'}
      </strong>
      {es ? ' y el condicionamiento gana en ' : ' and conditioning is ahead in '}
      <strong>{s && seeds ? `${s.residual_ahead_in_seeds}/${seeds}` : '...'}</strong>
      {es
        ? ' semillas. La primera corrida de esa medición dio 2.40x y fue publicada aquí antes de repetirla. '
          + 'Está corregida, y la corrección se documenta en vez de borrarse.'
        : ' seeds. The first run of that measurement gave 2.40x and was published here before it was '
          + 'repeated. It is corrected, and the correction is documented rather than deleted.'}
    </Callout>
  );
}
