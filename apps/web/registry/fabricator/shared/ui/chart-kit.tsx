"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartTick } from "@/registry/bases/__base__/lib/chart-cartesian-model"
import {
  getCubicBezier,
  getSteppedIndex,
  getTooltipPosition,
  parseCssDuration,
  parseCubicBezier,
  type ChartConfig,
  type ChartPaint,
  type ChartPoint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "@/registry/bases/__base__/lib/chart-model"

// The parts every chart is drawn with: its measured plot, the motion it reads
// from the theme, the tooltip, the legend, the axes and gridlines, the
// keyboard inspector and the hidden data table. The geometry comes from the
// shared models in lib/, which React Native draws from too.

// --- Size ----------------------------------------------------------------------

/**
 * The plot's size and font size, measured. Charts draw nothing until both
 * are known, so the server renders an empty frame of the right height.
 */
function useChartSize<TElement extends HTMLElement>() {
  const ref = React.useRef<TElement>(null)
  const [measure, setMeasure] = React.useState<{
    size: ChartSize
    fontSize: number
  } | null>(null)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    // The observer reports the first size as soon as it starts observing.
    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect()
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize)
      setMeasure((current) =>
        current &&
        current.size.width === width &&
        current.size.height === height &&
        current.fontSize === fontSize
          ? current
          : { size: { width, height }, fontSize }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, size: measure?.size ?? null, fontSize: measure?.fontSize ?? 11 }
}

// --- Motion --------------------------------------------------------------------

type ChartMotionRole = "reveal" | "move"

type ChartTiming = { duration: number; easing: (progress: number) => number }

const EASE_FALLBACK = getCubicBezier([0.23, 1, 0.32, 1])

/**
 * A role's timing as the theme sets it on this element: `data-motion` on any
 * ancestor retimes it, `--motion-scale` stretches it, and Reduce Motion
 * turns it off.
 */
function readChartTiming(element: Element, role: ChartMotionRole): ChartTiming {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { duration: 0, easing: EASE_FALLBACK }
  }
  const style = getComputedStyle(element)
  // The minified stylesheet writes 250ms as .25s, so read the unit.
  const duration = parseCssDuration(style.getPropertyValue(`--motion-${role}`))
  const scale = Number.parseFloat(style.getPropertyValue("--motion-scale"))
  const curve = parseCubicBezier(
    style.getPropertyValue(
      role === "reveal" ? "--motion-ease-enter" : "--motion-ease-move"
    )
  )
  return {
    duration:
      (Number.isFinite(duration) ? duration : 0) *
      (Number.isFinite(scale) ? scale : 1),
    easing: curve ? getCubicBezier(curve) : EASE_FALLBACK,
  }
}

function animateProgress(
  timing: ChartTiming,
  onFrame: (progress: number) => void
) {
  if (timing.duration <= 0) {
    onFrame(1)
    return () => {}
  }
  let frame = 0
  const start = performance.now()
  const tick = (now: number) => {
    const linear = Math.min(1, (now - start) / timing.duration)
    onFrame(timing.easing(linear))
    if (linear < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

/**
 * The draw-in: 0 until the chart is first on screen, then 1 over the reveal
 * role's duration. Once per mount; 1 straight away when `enabled` is off.
 */
function useChartReveal(
  ref: React.RefObject<Element | null>,
  enabled: boolean
) {
  const [progress, setProgress] = React.useState(enabled ? 0 : 1)
  const hasStarted = React.useRef(!enabled)

  React.useEffect(() => {
    const element = ref.current
    if (!element || hasStarted.current) return
    let cancel = () => {}
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        hasStarted.current = true
        cancel = animateProgress(
          readChartTiming(element, "reveal"),
          setProgress
        )
      },
      { threshold: 0.25 }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancel()
    }
  }, [ref])

  return progress
}

/**
 * A value that morphs to each new target on the move role. `animateKey`
 * says when a change is the data's (morph) rather than the size's (jump);
 * `interpolate` returns null when two values can't morph, and the chart
 * jumps to the new one.
 */
function useChartTween<TValue>(
  ref: React.RefObject<Element | null>,
  target: TValue,
  interpolate: (from: TValue, to: TValue, progress: number) => TValue | null,
  animateKey: unknown
) {
  const [tween, setTween] = React.useState({
    from: target,
    to: target,
    key: animateKey,
    progress: 1,
    run: 0,
  })

  const blend = (from: TValue, to: TValue, progress: number) =>
    progress >= 1 ? to : (interpolate(from, to, progress) ?? to)

  if (tween.to !== target) {
    const isDataChange = tween.key !== animateKey
    setTween({
      from: isDataChange ? blend(tween.from, tween.to, tween.progress) : target,
      to: target,
      key: animateKey,
      progress: isDataChange ? 0 : 1,
      run: tween.run + (isDataChange ? 1 : 0),
    })
  }

  const { run } = tween
  React.useEffect(() => {
    const element = ref.current
    if (run === 0 || !element) return
    return animateProgress(readChartTiming(element, "move"), (progress) =>
      setTween((current) =>
        current.run === run ? { ...current, progress } : current
      )
    )
  }, [run, ref])

  return blend(tween.from, target, tween.progress)
}

// --- State ---------------------------------------------------------------------

/**
 * Which series the legend has hidden, and the one it spotlights. The last
 * visible series can't be hidden, so the chart never goes blank.
 */
function useChartLegendState(config: ChartConfig) {
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set())
  const [spotlight, setSpotlight] = React.useState<string | null>(null)
  const count = Object.keys(config).length

  const toggle = React.useCallback(
    (key: string) => {
      // A press ends the spotlight: a hidden series has nothing to light, and
      // the rest shouldn't stay dimmed until the pointer leaves.
      setSpotlight(null)
      setHidden((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else if (count - next.size > 1) next.add(key)
        return next
      })
    },
    [count]
  )

  return { hidden, toggle, spotlight, setSpotlight }
}

// --- Paint ---------------------------------------------------------------------

/** A paint as a CSS colour: a token through its variable. */
function getChartColor(paint: ChartPaint) {
  return "token" in paint ? `var(--${paint.token})` : paint.value
}

// --- SVG parts -----------------------------------------------------------------

function ChartGrid({
  ticks,
  orientation = "horizontal",
  start,
  end,
  className,
}: {
  ticks: readonly ChartTick[]
  /** Horizontal lines across a vertical chart; vertical for a horizontal one. */
  orientation?: "horizontal" | "vertical"
  start: number
  end: number
  className?: string
}) {
  return (
    <g data-slot="chart-grid" className={cn("cn-chart-grid", className)}>
      {ticks.map((tick) =>
        orientation === "horizontal" ? (
          <line
            key={tick.value}
            x1={start}
            x2={end}
            y1={Math.round(tick.position) + 0.5}
            y2={Math.round(tick.position) + 0.5}
          />
        ) : (
          <line
            key={tick.value}
            y1={start}
            y2={end}
            x1={Math.round(tick.position) + 0.5}
            x2={Math.round(tick.position) + 0.5}
          />
        )
      )}
    </g>
  )
}

/**
 * Labels along an axis. `side` is where they sit: `start` before the plot
 * (end-aligned), `bottom` under it (centred).
 */
function ChartAxis({
  ticks,
  side,
  offset,
  className,
}: {
  ticks: readonly { position: number; label: string }[]
  side: "start" | "bottom"
  /** The x the start labels end at, or the y the bottom labels sit on. */
  offset: number
  className?: string
}) {
  return (
    <g
      data-slot="chart-axis"
      className={cn("cn-chart-axis", className)}
      textAnchor={side === "start" ? "end" : "middle"}
    >
      {ticks.map((tick, index) =>
        side === "start" ? (
          <text
            key={`${tick.label}-${index}`}
            x={offset}
            y={tick.position}
            dominantBaseline="central"
          >
            {tick.label}
          </text>
        ) : (
          <text
            key={`${tick.label}-${index}`}
            x={tick.position}
            y={offset}
            dominantBaseline="hanging"
          >
            {tick.label}
          </text>
        )
      )}
    </g>
  )
}

/**
 * The vertical hairline that finds the inspected index. It mounts when a
 * mark is inspected and fades in, then glides from index to index: the group
 * moves, the line inside it fades.
 */
function ChartCrosshair({
  x,
  top,
  bottom,
  className,
}: {
  x: number
  top: number
  bottom: number
  className?: string
}) {
  return (
    <g
      data-slot="chart-crosshair"
      className={cn("cn-chart-crosshair", className)}
      style={{ transform: `translateX(${Math.round(x) + 0.5}px)` }}
    >
      <line
        className="cn-chart-crosshair-line"
        x1={0}
        x2={0}
        y1={top}
        y2={bottom}
      />
    </g>
  )
}

/** A series' dot at the inspected index, ringed in the surface. */
function ChartDot({
  point,
  color,
  className,
}: {
  point: ChartPoint
  color: string
  className?: string
}) {
  return (
    <g
      data-slot="chart-dot"
      className={cn("cn-chart-dot", className)}
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      <circle className="cn-chart-dot-mark" r={4} cx={0} cy={0} fill={color} />
    </g>
  )
}

/**
 * The category under the pointer on bar charts: a faint wash behind its
 * bars that glides to the next category, Fluid Hover's highlight for charts.
 */
function ChartBand({
  rect,
  className,
}: {
  rect: { x: number; y: number; width: number; height: number }
  className?: string
}) {
  return (
    <g
      data-slot="chart-band"
      className={cn("cn-chart-band", className)}
      style={{ transform: `translate(${rect.x}px, ${rect.y}px)` }}
    >
      <rect
        className="cn-chart-band-mark"
        width={rect.width}
        height={rect.height}
        rx={6}
      />
    </g>
  )
}

// --- Tooltip -------------------------------------------------------------------

/**
 * The readout for the inspected mark: its title, then a row per series with
 * the value first in weight. It is placed before its first paint, fades in,
 * and from the next frame on glides with the highlight.
 */
function ChartTooltip({
  content,
  anchor,
  frame,
  side = "end",
  className,
}: {
  content: ChartTooltipContent
  anchor: ChartPoint
  frame: ChartSize
  side?: "end" | "top"
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<ChartSize | null>(null)
  const [isGliding, setIsGliding] = React.useState(false)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () =>
      setSize((current) =>
        current?.width === element.offsetWidth &&
        current.height === element.offsetHeight
          ? current
          : { width: element.offsetWidth, height: element.offsetHeight }
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const frame = requestAnimationFrame(() => setIsGliding(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const position = size
    ? getTooltipPosition({ anchor, frame, tooltip: size, side })
    : anchor

  return (
    <div
      ref={ref}
      data-slot="chart-tooltip"
      data-placed={size !== null || undefined}
      data-gliding={isGliding || undefined}
      aria-hidden
      className={cn(
        "cn-chart-tooltip-positioner pointer-events-none absolute top-0 left-0 z-10",
        className
      )}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        data-slot="chart-tooltip-content"
        className="cn-chart-tooltip-content"
      >
        <div data-slot="chart-tooltip-title" className="cn-chart-tooltip-title">
          {content.title}
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center">
          {content.rows.map((row) => (
            <div
              key={row.key}
              data-slot="chart-tooltip-row"
              className="cn-chart-tooltip-row col-span-3 grid grid-cols-subgrid items-center"
            >
              <span
                data-slot="chart-tooltip-key"
                data-dashed={row.dashed || undefined}
                className="cn-chart-tooltip-key"
                style={{ color: getChartColor(row.paint) }}
              />
              <span
                data-slot="chart-tooltip-label"
                className="cn-chart-tooltip-label truncate"
              >
                {row.label}
              </span>
              <span
                data-slot="chart-tooltip-value"
                className="cn-chart-tooltip-value"
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {content.note && (
          <div data-slot="chart-tooltip-note" className="cn-chart-tooltip-note">
            {content.note}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Legend --------------------------------------------------------------------

/**
 * A toggle per series: pressing hides or shows it, pointing at it
 * spotlights it. Each key mirrors the series' mark: a line for lines, a
 * square for areas and bars.
 */
function ChartLegend({
  series,
  hidden,
  onToggle,
  onSpotlight,
  shape = "square",
  className,
}: {
  series: readonly ChartSeries[]
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
  shape?: "line" | "square"
  className?: string
}) {
  return (
    <ul
      data-slot="chart-legend"
      aria-label="Series"
      className={cn("cn-chart-legend flex flex-wrap items-center", className)}
      onPointerLeave={() => onSpotlight(null)}
    >
      {series.map((item) => {
        const isHidden = hidden.has(item.key)
        return (
          <li key={item.key} className="flex">
            <button
              type="button"
              data-slot="chart-legend-item"
              aria-pressed={!isHidden}
              data-hidden={isHidden || undefined}
              className="cn-chart-legend-item inline-flex items-center outline-none select-none"
              onClick={() => onToggle(item.key)}
              onPointerEnter={() => onSpotlight(isHidden ? null : item.key)}
              onFocus={() => onSpotlight(isHidden ? null : item.key)}
              onBlur={() => onSpotlight(null)}
            >
              <span
                data-slot="chart-legend-key"
                data-shape={shape}
                data-dashed={item.dashed || undefined}
                className="cn-chart-legend-key"
                style={{ color: getChartColor(item.paint) }}
              />
              {item.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// --- Inspector -----------------------------------------------------------------

/**
 * The keyboard's and the pointer's way into the marks: a slider over the
 * plot. The pointer picks the nearest mark, arrows step, Home and End jump,
 * and the value text reads what the tooltip shows. `getStep` replaces the
 * steps for charts laid out in two dimensions, such as a grid of days.
 */
function ChartInspector({
  label,
  count,
  active,
  onActiveChange,
  getIndexAt,
  getStep = getSteppedIndex,
  valueText,
  className,
}: {
  label: string
  count: number
  active: number | null
  onActiveChange: (index: number | null) => void
  getIndexAt: (point: ChartPoint) => number
  /** Where a key moves the inspected mark, or null for keys that don't. */
  getStep?: (current: number, key: string, count: number) => number | null
  valueText?: string
  className?: string
}) {
  const isFocused = React.useRef(false)

  const fromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const index = getIndexAt({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    })
    onActiveChange(index < 0 ? null : index)
  }

  return (
    <div
      role="slider"
      tabIndex={count > 0 ? 0 : -1}
      data-slot="chart-inspector"
      aria-label={`${label}: inspect values`}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, count - 1)}
      aria-valuenow={active ?? 0}
      aria-valuetext={valueText}
      aria-orientation="horizontal"
      className={cn(
        "cn-chart-inspector absolute inset-0 touch-pan-y outline-none",
        className
      )}
      onPointerMove={fromPointer}
      onPointerDown={fromPointer}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !isFocused.current) {
          onActiveChange(null)
        }
      }}
      onKeyDown={(event) => {
        const next = getStep(active ?? -1, event.key, count)
        if (next === null) {
          if (event.key === "Escape") onActiveChange(null)
          return
        }
        event.preventDefault()
        onActiveChange(next)
      }}
      onFocus={() => {
        isFocused.current = true
      }}
      onBlur={() => {
        isFocused.current = false
        onActiveChange(null)
      }}
    />
  )
}

// --- Table ---------------------------------------------------------------------

/** Every value as a table, for screen readers. */
function ChartDataTable({
  label,
  table,
  className,
}: {
  label: string
  table: ChartTableData
  className?: string
}) {
  return (
    <table data-slot="chart-table" className={cn("sr-only", className)}>
      <caption>{label}</caption>
      <thead>
        <tr>
          <td />
          {table.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={`${row.header}-${index}`}>
            <th scope="row">{row.header}</th>
            {row.cells.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** What a chart shows with no data: the `empty` content, or a quiet line. */
function ChartEmpty({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="chart-empty"
      className={cn(
        "cn-chart-empty absolute inset-0 flex items-center justify-center",
        className
      )}
    >
      {children ?? "No data"}
    </div>
  )
}

export type {
  ChartActive,
  ChartColor,
  ChartConfig,
  ChartDatum,
  ChartSeriesConfig,
} from "@/registry/bases/__base__/lib/chart-model"

export {
  ChartAxis,
  ChartBand,
  ChartCrosshair,
  ChartDataTable,
  ChartDot,
  ChartEmpty,
  ChartGrid,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
}
