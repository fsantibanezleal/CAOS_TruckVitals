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
  /** Grow to fill the height its container gives it, instead of using a fixed `height`.
   *  A fixed height is why an earlier version of the App left the instrument at 16.5% of the viewport
   *  while the stage around it sat empty; ADR-0071 requires at least 50%. */
  fill?: boolean;
  yLabel?: string;
  xLabel?: string;
  /** log-scale the y axis, for statistics that span orders of magnitude. */
  logY?: boolean;
  ariaLabel?: string;
  /** Live cursor readout. Called with the hovered x and one value per series, or nulls on leave.
   *  uPlot's own legend block is 28px per chart and this product stacks two of them, so on a 900px
   *  viewport it cost the instrument 56px, which is the difference between 44% and 49% of the screen.
   *  The values are not dropped, they move into the panel's readout strip, which was already there. */
  onCursor?: (x: number | null, values: (number | null)[]) => void;
}

/** Draw regime bands, the onset line, the fit boundary and alarm ticks beneath the series. */
function makeDrawHooks(props: TraceChartProps, p: Palette) {
  const { bands, onsetT, alarmTimes, fitEndT } = props;

  const drawBands = (u: uPlot) => {
    if (!bands || bands.regime.length === 0) return;
    const ctx = u.ctx;
    const { top, height } = u.bbox;
    ctx.save();
    // The regimes alternate several times per haul cycle, so at full opacity the bands read as heavy
    // striping that competes with the signal instead of sitting behind it. They are CONTEXT: enough to
    // see where the boundaries fall, never enough to fight the line.
    ctx.globalAlpha = 0.55;
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
  const { t, series, threshold, height = 220, fill = false, yLabel, xLabel, logY, ariaLabel } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  // The cursor callback lives in a ref so it is NOT a construction dependency. As a dependency it made
  // every mouse move rebuild the plot: the callback sets state, the re-render produces a fresh `series`
  // array, and the effect tears the chart down and builds it again, tens of times a second. The symptom
  // was a page that stopped responding to clicks entirely.
  const cursorRef = useRef(props.onCursor);
  cursorRef.current = props.onCursor;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const p = usePalette();

  // A callback ref would be needed if the host mounted async; here the host is always in the tree, but
  // the WIDTH is not known until layout, and uPlot with width 0 draws an empty canvas that never
  // recovers on its own. Measure first, construct only once there is a real width.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // Only publish a size that actually CHANGED. A fresh object on every observer callback re-renders
    // every consumer, and because this component resizes its own canvas in response, the two chase each
    // other: 3796 DOM mutations per second at rest, and a page that never became stable enough to accept
    // a click. Playwright reported that as a click timeout, not as a performance problem.
    const read = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
    };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    const width = size.w;
    // In fill mode the host is a flex child with no intrinsic height, so its measured height IS the
    // instruction. A floor keeps a transiently-collapsed container from constructing a 0-height canvas
    // that never recovers.
    // uPlot's `height` is the CANVAS height and does not include the legend it renders below it, so in
    // fill mode the legend used to overflow the host and land on the x-axis label below.
    //
    // The height is NOT taken from `size.h` here. During the mount of a freshly activated tab panel that
    // read is unreliable: the first chart measured 147 and the second 0, so both fell back to a 100px
    // floor inside a 282px host and the instrument was a third of what the layout had given it. A gate
    // that measured the HOST rather than the canvas reported that as a pass. Construction now uses a
    // provisional height and a separate effect keeps the real size in sync with the observed box.
    const drawHeight = fill ? 200 : height;
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
      height: drawHeight,
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
      legend: { show: false },
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
        setCursor: [(u: uPlot) => {
          const cb = cursorRef.current;
          if (!cb) return;
          const i = u.cursor.idx;
          if (i == null) { cb(null, []); return; }
          const vals = series.map((_, k) => {
            const v = (u.data[k + 1] as ArrayLike<number>)[i];
            return Number.isFinite(v) ? v : null;
          });
          cb(u.data[0][i] as number, vals);
        }],
      },
    };

    const plot = new uPlot(opts, data, el);
    plotRef.current = plot;
    return () => { plot.destroy(); plotRef.current = null; };
    // p is in the deps so a theme flip rebuilds the plot with resolved colours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, height, fill, t, series, threshold, logY, p]);

  // Keep the canvas filling its host.
  //
  // This reads the LIVE DOM rather than the observed size state, and re-checks on the next frame. The
  // state-only version left every canvas at its floor inside a host three times taller: the observer's
  // first report is taken while a freshly activated tab panel is still settling, and because the host's
  // height never changes afterwards no second report ever arrives to correct it. Reading the element at
  // effect time, then again a frame later, is correct whenever the observer is right and also when it
  // is early.
  useEffect(() => {
    if (!fill) return;
    let raf = 0;
    const sync = () => {
      const plot = plotRef.current;
      const el = hostRef.current;
      if (!plot || !el) return;
      const legend = el.querySelector<HTMLElement>('.u-legend');
      const legendH = legend ? legend.getBoundingClientRect().height : 0;
      const w = Math.round(el.clientWidth);
      const target = Math.max(80, Math.round(el.clientHeight - legendH));
      if (w > 0 && (Math.abs(plot.height - target) > 2 || Math.abs(plot.width - w) > 2)) {
        plot.setSize({ width: w, height: target });
      }
    };
    sync();
    raf = requestAnimationFrame(() => { sync(); raf = requestAnimationFrame(sync); });
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h, fill, t, series]);

  return (
    <div
      ref={hostRef}
      className="tv-chart"
      role="img"
      aria-label={ariaLabel || yLabel || 'time series'}
      style={fill ? { width: '100%', flex: '1 1 0', minHeight: 120 } : { width: '100%', minHeight: height }}
    />
  );
}
