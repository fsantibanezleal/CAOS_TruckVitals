// The alarm-budget curve: detection rate against the false-alarm budget, both arms on one axis.
//
// This is the comparison instrument. Two methods reported at their own preferred operating points say
// nothing; the same two read off at a FIXED false-alarm rate say everything. A method that wins only at
// one budget has not won, and this is where that shows.

import { useMemo } from 'react';
import type { LiveResult } from '../engine/live.ts';
import { useLang, useT } from '../lib/i18n.ts';
import { fmt } from '../lib/trace.ts';
import TraceChart from './TraceChart.tsx';
import { usePalette } from './theme.ts';

export default function BudgetCurve({ r }: { r: LiveResult }) {
  const t = useT();
  const lang = useLang();
  const p = usePalette();

  const { budgets, rawDet, resDet, rows } = useMemo(() => {
    const b = r.budgetCurve.raw.map((x) => x.budget);
    return {
      budgets: b,
      // An unreachable budget is a REAL outcome, not a zero: no threshold meets it at all. It is drawn
      // as a gap so the eye does not read "this method detects nothing here".
      rawDet: r.budgetCurve.raw.map((x) => (x.reachable ? x.detectionRate : null)),
      resDet: r.budgetCurve.residual.map((x) => (x.reachable ? x.detectionRate : null)),
      rows: b.map((budget, i) => ({
        budget,
        raw: r.budgetCurve.raw[i],
        res: r.budgetCurve.residual[i],
      })),
    };
  }, [r]);

  const series = useMemo(() => ([
    { label: t('arm_raw'), values: rawDet, color: p.raw, width: 2 },
    { label: t('arm_residual'), values: resDet, color: p.residual, width: 2 },
  ]), [rawDet, resDet, p.raw, p.residual, t]);

  return (
    <>
      <TraceChart
        t={budgets}
        series={series}
        fill
        yLabel={lang === 'es' ? 'tasa de detección' : 'detection rate'}
        xLabel={lang === 'es' ? 'presupuesto (falsas alarmas por camión-mes)' : 'budget (false alarms per truck-month)'}
        ariaLabel="alarm budget curve"
      />
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{lang === 'es' ? 'Presupuesto' : 'Budget'}</th>
              <th>{lang === 'es' ? 'Detección, crudo' : 'Detection, raw'}</th>
              <th>{lang === 'es' ? 'Realizado' : 'Realised'}</th>
              <th>{lang === 'es' ? 'Detección, residuo' : 'Detection, residual'}</th>
              <th>{lang === 'es' ? 'Realizado' : 'Realised'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ budget, raw, res }) => (
              <tr key={budget}>
                <td>{fmt(budget, 2)}</td>
                <td className={raw.reachable && res.reachable && raw.detectionRate > res.detectionRate ? 'win' : undefined}>
                  {raw.reachable ? fmt(raw.detectionRate, 2) : (lang === 'es' ? 'inalcanzable' : 'unreachable')}
                </td>
                <td className="tv-muted">{raw.reachable ? fmt(raw.realised, 2) : '-'}</td>
                <td className={raw.reachable && res.reachable && res.detectionRate > raw.detectionRate ? 'win' : undefined}>
                  {res.reachable ? fmt(res.detectionRate, 2) : (lang === 'es' ? 'inalcanzable' : 'unreachable')}
                </td>
                <td className="tv-muted">{res.reachable ? fmt(res.realised, 2) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tv-cap">
        {lang === 'es'
          ? 'La columna "realizado" es la tasa que el umbral elegido consigue de verdad. Nunca excede el '
            + 'presupuesto: esa es la regla del umbral, y es lo que hace comparables a los dos brazos.'
          : 'The "realised" column is the rate the chosen threshold actually achieves. It never exceeds the '
            + 'budget: that is the threshold rule, and it is what makes the two arms comparable at all.'}
      </div>
    </>
  );
}
