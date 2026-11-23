"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  getRadialAnchor,
  getRadialArcPath,
  getRadialCenterFontSize,
  getRadialCenterText,
  getRadialChartModel,
  getRadialParts,
  getRadialRingAt,
  getRadialSeries,
  getRadialTable,
  getRadialTooltip,
  interpolateRadialRings,
  type RadialRing,
  type RadialShape,
} from "@/registry/bases/__base__/lib/chart-radial-model"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartDrawOrder,
  useChartLegendState,
  useChartPresence,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Progress of a few values against their target as concentric rings, the
// first row outermost: a faint track with the value swept over it, round
// capped, round a full circle or a half gauge. The arcs sweep from zero the
// first time the chart is on screen and turn to new values when the data
// changes; the ring under the pointer stays lit while the others fade back.

type RadialChartProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  /** The field naming each ring. */
  nameKey?: keyof TDatum & string
  /** The field holding each ring's value. */
  valueKey?: keyof TDatum & string
  /** One target for every ring. Without it or `maxKey`, the largest value. */
  max?: number
  /** The field holding each ring's own target. */
  maxKey?: keyof TDatum & string
  /** Labels and colours, keyed by the rings' names. */
  config?: ChartConfig
  /** The chart's accessible name. */
  label: string
  /** A full circle from 12 o'clock, or a half gauge from 9 to 3. */
  shape?: RadialShape
  /** What the centre shows; the first ring's share by default. */
  centerLabel?: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 240, height: 240 }
const NO_RINGS: RadialRing[] = []

function getRingId(ring: RadialRing) {
  return ring.id
}
const NO_CONFIG: ChartConfig = {}

function RadialChart<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  max,
  maxKey,
  config = NO_CONFIG,
  label,
  shape = "full",
  centerLabel,
  formatValue,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: RadialChartProps<TDatum>) {
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  const parts = React.useMemo(
    () => getRadialParts({ data, nameKey, valueKey, config }),
    [data, nameKey, valueKey, config]
  )
  const partConfig = React.useMemo(
    () =>
      Object.fromEntries(parts.map((part) => [part.id, { label: part.label }])),
    [parts]
  )
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(partConfig)

  const model = React.useMemo(
    () =>
      getRadialChartModel({
        data,
        nameKey,
        valueKey,
        max,
        maxKey,
        config,
        size: size ?? FALLBACK_SIZE,
        shape,
        hidden,
      }),
    [data, nameKey, valueKey, max, maxKey, config, size, shape, hidden]
  )
  // A new token whenever the data changes rather than the size: the rings
  // turn on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, nameKey, valueKey, max, maxKey, config, shape, hidden }),
    [data, nameKey, valueKey, max, maxKey, config, shape, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const tweenedRings = useChartTween(
    plotRef,
    size ? model.rings : NO_RINGS,
    interpolateRadialRings,
    animate ? dataVersion : null
  )
  const rings = useChartDrawOrder(tweenedRings, getRingId)

  const activeIndex =
    active !== null && active < model.rings.length ? active : null
  const highlighted =
    activeIndex === null ? spotlight : model.rings[activeIndex].id
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < model.rings.length
      ? shown.value
      : null
  const content =
    shownIndex === null
      ? null
      : getRadialTooltip(model, shownIndex, formatValue)
  const table = React.useMemo(
    () => getRadialTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    if (!onActiveChange) return
    const ring = next === null ? null : model.rings[next]
    const row = parts.find((part) => part.id === ring?.id)?.row
    onActiveChange(
      row === undefined ? null : { index: row, datum: data[row], key: ring?.id }
    )
  }

  const isEmpty = parts.length === 0
  const showLegend = legend ?? parts.length > 1
  // A ring as it is drawn now: tweened, and swept as far as the draw-in has
  // taken it. Null while it is leaving or not drawn.
  const getDrawnRing = (id: string | undefined) => {
    const position = rings.findIndex(
      (ring) => ring.id === id && !ring.isLeaving
    )
    const ring = rings[position]
    if (!ring) return null
    return {
      ...ring,
      share: ring.share * getStaggeredProgress(reveal, position, rings.length),
    }
  }
  // The centre counts with its ring's sweep, at the size of the final text
  // so the number doesn't change size while it counts.
  const targetText = getRadialCenterText(model)
  const drawnFirst = getDrawnRing(model.rings[0]?.id)
  const centerText =
    centerLabel ??
    (drawnFirst
      ? getRadialCenterText({ ...model, rings: [drawnFirst] })
      : targetText)
  const centerFontSize = getRadialCenterFontSize(
    model,
    centerLabel ?? targetText
  )
  // The tooltip points at the drawn ring, so it arrives with the arc.
  const drawnShown =
    shownIndex === null ? null : getDrawnRing(model.rings[shownIndex]?.id)
  const anchor =
    shownIndex === null
      ? null
      : drawnShown
        ? getRadialAnchor({ ...model, rings: [drawnShown] }, 0)
        : getRadialAnchor(model, shownIndex)
  const isHalf = shape === "half"

  return (
    <div
      data-slot="radial-chart"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-radial-chart flex flex-col items-center", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        data-shape={shape}
        className="cn-chart-plot cn-radial-chart-plot relative"
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            <g transform={`translate(${model.center.x} ${model.center.y})`}>
              {rings.map((ring, position) => {
                const amount = getStaggeredProgress(
                  reveal,
                  position,
                  rings.length
                )
                return (
                  <g
                    key={ring.id}
                    data-slot="radial-chart-ring"
                    data-active={ring.id === highlighted || undefined}
                    data-leaving={ring.isLeaving || undefined}
                    data-dimmed={
                      (!ring.isLeaving &&
                        highlighted !== null &&
                        ring.id !== highlighted) ||
                      undefined
                    }
                    className="cn-radial-chart-ring"
                  >
                    <path
                      data-slot="radial-chart-track"
                      className="cn-radial-chart-track"
                      d={getRadialArcPath(model, ring, 1)}
                    />
                    <path
                      data-slot="radial-chart-value"
                      d={getRadialArcPath(model, ring, ring.share * amount)}
                      fill={getChartColor(ring.paint)}
                    />
                  </g>
                )
              })}
            </g>
          </svg>
        )}
        {size && !isEmpty && centerText && (
          <div
            aria-hidden
            data-slot="radial-chart-center"
            data-shape={shape}
            className="cn-radial-chart-center pointer-events-none absolute text-center"
            style={{
              left: model.center.x,
              top: model.center.y,
              width: model.holeRadius * 1.6,
              fontSize: centerFontSize,
              transform: isHalf
                ? "translate(-50%, -100%)"
                : "translate(-50%, -50%)",
            }}
          >
            {centerText}
          </div>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip
            content={content}
            anchor={anchor}
            frame={size}
            leaving={shown.isLeaving}
          />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={model.rings.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getRadialRingAt(model, point)}
            valueText={
              activeIndex !== null && content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.value}, ${row.label}`)
                    .join(", ")}`
                : undefined
            }
          />
        )}
      </div>
      {showLegend && (
        <ChartLegend
          className="justify-center"
          series={getRadialSeries(model)}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { RadialChart, type RadialChartProps }
