// The BAKED alarm-budget curves: every rung of the ladder read off at every budget in the sweep, with a
// bootstrap interval over units, straight from the benchmark artifact.
//
// This is not the live curve on the Tool page. That one is computed in the browser from whatever fleet
// the controls describe; this one is the offline benchmark over the full synthetic fleet, and it is the
// evidence behind the single 1.0 operating point the ladder table quotes. A method that wins only at one
// budget has not won, and this is where that shows.

import { useMemo, useState } from 'react';
import type { SyntheticBenchmark } from '../lib/artifacts.ts';
import { n } from '../lib/useArtifact.ts';
import TraceChart from './TraceChart.tsx';
import { usePalette } from './theme.ts';

export default function BakedBudgetCurves({ data, es }: { data: SyntheticBenchmark; es: boolean }) {
  const curves = data.budget_curves ?? {};
  const detectors = Object.keys(curves);
  const [det, setDet] = useState(detectors.includes('cusum') ? 'cusum' : detectors[0]);
  const p = usePalette();

  const grid = data.budget_grid_per_truck_month ?? [];
  const sel = curves[det];

  const { x, series, rows } = useMemo(() => {
    if (!sel) return { x: [], series: [], rows: [] };
    // The x axis is the INDEX of the budget in the sweep, because the grid is log-spaced and a linear
    // axis would pile four of the six points into the left margin. The real budgets live in the table
    // below and in the series labels; nothing is read off the x axis itself.
    const xs = grid.map((_, i) => i);
    const pick = (arm: 'raw' | 'residual', f: (c: BudgetCell) => number | null) =>
      (sel[arm] ?? []).map((c) => (c.reachable ? f(c) : null));
    const s = [
      { label: es ? 'crudo' : 'raw', values: pick('raw', (c) => c.detection_rate), color: p.raw, width: 2 },
      { label: es ? 'residuo' : 'residual', values: pick('residual', (c) => c.detection_rate), color: p.residual, width: 2 },
      { label: es ? 'IC crudo' : 'raw CI', values: pick('raw', (c) => c.det_ci?.[0] ?? null), color: p.raw, width: 1, dash: true },
      { label: '', values: pick('raw', (c) => c.det_ci?.[1] ?? null), color: p.raw, width: 1, dash: true },
      { label: es ? 'IC residuo' : 'residual CI', values: pick('residual', (c) => c.det_ci?.[0] ?? null), color: p.residual, width: 1, dash: true },
      { label: '', values: pick('residual', (c) => c.det_ci?.[1] ?? null), color: p.residual, width: 1, dash: true },
    ];
    const r = grid.map((budget, i) => ({
      budget, raw: sel.raw?.[i], residual: sel.residual?.[i],
    }));
    return { x: xs, series: s, rows: r };
  }, [sel, grid, es, p.raw, p.residual]);

  if (!detectors.length || !grid.length) return null;

  return (
    <div>
      <h3>{es ? 'La curva de presupuesto, horneada' : 'The budget curve, baked'}</h3>
      <p>
        {es
          ? 'El punto de operación de 1.0 falsas alarmas por camión-mes que cita la tabla es un corte de '
            + 'estas curvas. Cada peldaño se lee en seis presupuestos, con un intervalo bootstrap sobre '
            + 'UNIDADES en la tasa de detección. Un presupuesto inalcanzable es una celda explícita, no '
            + 'un punto que falta.'
          : 'The 1.0 false-alarms-per-truck-month operating point the table quotes is one slice of these '
            + 'curves. Every rung is read off at six budgets, with a bootstrap-over-UNITS interval on the '
            + 'detection rate. An unreachable budget is an explicit cell, not a missing point.'}
      </p>
      <div className="tv-row" role="group" aria-label={es ? 'Detector' : 'Detector'}>
        {detectors.map((d) => (
          <button key={d} type="button" className={d === det ? 'chip on' : 'chip'}
            onClick={() => setDet(d)} aria-pressed={d === det}>
            {d}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <TraceChart
          t={x}
          series={series}
          height={260}
          yLabel={es ? 'tasa de detección' : 'detection rate'}
          xLabel={es
            ? 'presupuesto (indexado; los valores están en la tabla)'
            : 'budget (indexed; the values are in the table)'}
          ariaLabel={es
            ? `Curva de presupuesto de ${det}, ambos brazos con intervalos`
            : `Budget curve for ${det}, both arms with intervals`}
        />
      </div>
      <div className="tv-tablewrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>{es ? 'Presupuesto (FA/camión-mes)' : 'Budget (FA/truck-month)'}</th>
              <th>{es ? 'Detección, crudo' : 'Detection, raw'}</th>
              <th>{es ? 'IC 95%, crudo' : '95% CI, raw'}</th>
              <th>{es ? 'Detección, residuo' : 'Detection, residual'}</th>
              <th>{es ? 'IC 95%, residuo' : '95% CI, residual'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.budget} className={r.budget === 1.0 ? 'hl' : undefined}>
                <td>{r.budget}{r.budget === 1.0 ? (es ? ' (tabla)' : ' (table)') : ''}</td>
                <td>{cell(r.raw, es)}</td>
                <td>{ci(r.raw)}</td>
                <td>{cell(r.residual, es)}</td>
                <td>{ci(r.residual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tv-cap">
        {es
          ? 'Las líneas discontinuas son los límites del intervalo bootstrap (250 remuestreos de '
            + 'unidades). "inalcanzable" significa que ningún umbral produce esa tasa de falsas alarmas '
            + 'con el ciclo de trabajo sano bajo el tope.'
          : 'Dashed lines are the bootstrap interval bounds (250 unit resamples). "unreachable" means no '
            + 'threshold produces that false-alarm rate with healthy duty under the cap.'}
      </p>
    </div>
  );
}

interface BudgetCell {
  budget_per_truck_month: number;
  reachable: boolean;
  threshold: number | null;
  detection_rate: number | null;
  det_ci: [number, number] | null;
  fa_per_truck_month: number | null;
}

function cell(c: BudgetCell | undefined, es: boolean): string {
  if (!c) return '-';
  if (!c.reachable) return es ? 'inalcanzable' : 'unreachable';
  return n(c.detection_rate);
}

function ci(c: BudgetCell | undefined): string {
  if (!c || !c.reachable || !c.det_ci) return '-';
  return `[${n(c.det_ci[0])}, ${n(c.det_ci[1])}]`;
}
