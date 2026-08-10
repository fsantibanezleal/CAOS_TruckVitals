// The product's central chart: one truck's time axis, with the regime segmentation drawn UNDER the
// signal, the onset marked, the fleet threshold as a line, and every alarm as a tick.
//
// It is one component rather than three because the raw channel, the residual and the detector statistic
// must share an x-axis exactly. Reading "the residual crossed 40 minutes before the raw channel did"
// requires that the two are on the same axis, at the same zoom, with the same onset line, and any
// version of this built from separate charts eventually drifts.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { usePalette, type Palette } from './theme.ts';

export interface TraceBand {
  /** regime label per sample, aligned to `t`. -1 means unassigned and is drawn as a gap, never snapped. */
  regime: number[];
  t: number[];
}

export interface TraceSeries {
  label: string;
  values: (number | null)[];
  color: string;
  /** dashed, for a reference level rather than a measurement. */
  dash?: boolean;
  width?: number;
}

export interface TraceChartProps {
  t: number[];
  series: TraceSeries[];
  /** horizontal reference line (the fleet threshold). */
  threshold?: number | null;
  thresholdLabel?: string;
  /** vertical marker at the true onset. */
  onsetT?: number | null;
  /** vertical ticks where the detector raised an alarm. */
  alarmTimes?: number[];
  /** vertical marker where the baseline window ends and monitoring begins. */
  fitEndT?: number | null;
  bands?: TraceBand | null;
  height?: number;
  yLabel?: string;
  xLabel?: string;
  /** log-scale the y axis, for statistics that span orders of magnitude. */
  logY?: boolean;
  ariaLabel?: string;
}

/** Draw regime bands, the onset line, the fit boundary and alarm ticks beneath the series. */
function makeDrawHooks(props: TraceChartProps, p: Palette) {
  const { bands, onsetT, alarmTimes, fitEndT } = props;

  const drawBands = (u: uPlot) => {
    if (!bands || bands.regime.length === 0) return;
    const ctx = u.ctx;
    const { top, height } = u.bbox;
    ctx.save();
    let start = 0;
    const flush = (end: number) => {
      const label = bands.regime[start];
      if (label >= 0) {
        const x0 = u.valToPos(bands.t[start], 'x', true);
        const x1 = u.valToPos(bands.t[Math.min(end, bands.t.length - 1)], 'x', true);
        ctx.fillStyle = p.regimes[label % p.regimes.length];
        ctx.fillRect(x0, top, Math.max(1, x1 - x0), height);
      }
      start = end;
    };
    for (let i = 1; i < bands.regime.length; i++) {
      if (bands.regime[i] !== bands.regime[start]) flush(i);
    }
    flush(bands.regime.length - 1);
    ctx.restore();
  };

  const drawMarkers = (u: uPlot) => {
    const ctx = u.ctx;
    const { top, height, left, width } = u.bbox;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();

    if (alarmTimes && alarmTimes.length) {
      ctx.strokeStyle = p.alarm;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.85;
      for (const at of alarmTimes) {
        const x = Math.round(u.valToPos(at, 'x', true)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, top + height - 10);
        ctx.lineTo(x, top + height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (fitEndT != null) {
      const x = Math.round(u.valToPos(fitEndT, 'x', true)) + 0.5;
      ctx.strokeStyle = p.fgFaint;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (onsetT != null) {
      const x = Math.round(u.valToPos(onsetT, 'x', true)) + 0.5;
      ctx.strokeStyle = p.onset;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
    ctx.restore();
  };

  return { drawBands, drawMarkers };
}

export default function TraceChart(props: TraceChartProps) {
  const { t, series, threshold, height = 220, yLabel, xLabel, logY, ariaLabel } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [width, setWidth] = useState(0);
  const p = usePalette();

  // A callback ref would be needed if the host mounted async; here the host is always in the tree, but
  // the WIDTH is not known until layout, and uPlot with width 0 draws an empty canvas that never
  // recovers on its own. Measure first, construct only once there is a real width.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || width <= 0 || t.length === 0) return;

    const { drawBands, drawMarkers } = makeDrawHooks(props, p);
    const data: uPlot.AlignedData = [
      Float64Array.from(t),
      ...series.map((s) => Float64Array.from(s.values.map((v) => (v == null ? NaN : v)))),
    ];
    if (threshold != null && Number.isFinite(threshold)) {
      data.push(Float64Array.from(t.map(() => threshold)) as never);
    }

    const opts: uPlot.Options = {
      width,
      height,
      // The x scale is explicitly RANGED. Leaving it to uPlot's auto-range on a series that starts with
      // NaN produces an empty plot with correct-looking axes, which is the single most confusing way for
      // this chart to fail.
      scales: {
        x: { time: false, range: [t[0], t[t.length - 1]] },
        y: logY ? { distr: 3 } : {},
      },
      axes: [
        {
          label: xLabel, stroke: p.fgSubtle, grid: { stroke: p.grid, width: 1 },
          ticks: { stroke: p.grid }, labelSize: xLabel ? 30 : 0, font: '11px system-ui, sans-serif',
          labelFont: '12px system-ui, sans-serif',
        },
        {
          label: yLabel, stroke: p.fgSubtle, grid: { stroke: p.grid, width: 1 },
          ticks: { stroke: p.grid }, size: 58, font: '11px system-ui, sans-serif',
          labelFont: '12px system-ui, sans-serif',
        },
      ],
      legend: { show: true, live: true },
      cursor: { drag: { x: true, y: false }, focus: { prox: 24 } },
      series: [
        { label: xLabel || 'min' },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.color,
          width: s.width ?? 1.4,
          dash: s.dash ? [4, 3] : undefined,
          spanGaps: false,
          points: { show: false },
        })),
        ...(threshold != null && Number.isFinite(threshold)
          ? [{
            label: props.thresholdLabel || 'threshold',
            stroke: p.threshold,
            width: 1.2,
            dash: [5, 4],
            points: { show: false },
          }]
          : []),
      ],
      hooks: {
        drawClear: [drawBands],
        draw: [drawMarkers],
      },
    };

    const plot = new uPlot(opts, data, el);
    plotRef.current = plot;
    return () => { plot.destroy(); plotRef.current = null; };
    // p is in the deps so a theme flip rebuilds the plot with resolved colours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, t, series, threshold, logY, p]);

  return (
    <div
      ref={hostRef}
      className="tv-chart"
      role="img"
      aria-label={ariaLabel || yLabel || 'time series'}
      style={{ width: '100%', minHeight: height }}
    />
  );
}
