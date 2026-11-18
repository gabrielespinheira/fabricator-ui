"use client"

import * as React from "react"
import { cn } from "cn"

import { CHART_LABEL_GAP } from "@/registry/bases/__base__/lib/chart-cartesian-model"
import {
  getAreaPath,
  getLineChartModel,
  getLinePath,
  getLineTable,
  getLineTooltip,
  interpolateLineSeries,
  type ChartCurve,
  type ChartStack,
  type LineSeriesGeometry,
} from "@/registry/bases/__base__/lib/chart-line-model"
import {
  getChartSeries,
  getNearestIndex,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartAxis,
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
} from "@/registry/bases/__base__/ui/chart-kit"

// The plot Area Chart and Line Chart share: gridlines and axes, a line per
// series (with a fading wash under it for areas), the crosshair, dots and
// tooltip at the inspected index, the legend and the hidden table. Lines
// reveal from the start edge the first time the chart is on screen and morph
// point by point when the data, the stacking or the visible series change.

type ChartLinePlotProps<TDatum extends ChartDatum> = {
  variant: "area" | "line"
  data: readonly TDatum[]
  config: ChartConfig
  /** The field each datum is placed by along the index axis. */
  index: keyof TDatum & string
  /** The chart's accessible name. */
  label: string
  curve?: ChartCurve
  stack?: ChartStack
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
  plotClassName?: string
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 240 }
const NO_SERIES: LineSeriesGeometry[] = []

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}

function ChartLinePlot<TDatum extends ChartDatum>({
  variant,
  data,
  config,
  index,
  label,
  curve = "smooth",
  stack = "none",
  formatValue,
  formatIndex,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  plotClassName,
  ...props
}: ChartLinePlotProps<TDatum>) {
  const id = toSvgId(React.useId())
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const model = React.useMemo(
    () =>
      getLineChartModel({
        data,
        config,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        stack,
        hidden,
        formatIndex,
      }),
    [data, config, index, size, fontSize, stack, hidden, formatIndex]
  )
  // A new token whenever the data changes rather than the size: the series
  // morph on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, config, stack, hidden }),
    [data, config, stack, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const series = useChartTween(
    plotRef,
    size ? model.series : NO_SERIES,
    interpolateLineSeries,
    animate ? dataVersion : null
  )

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getLineTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getLineTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const { plot, valueTicks } = model.layout
  const isEmpty = data.length === 0
  const showLegend = legend ?? allSeries.length > 1
  const revealWidth =
    reveal >= 1 ? (size?.width ?? 0) : plot.x + plot.width * reveal
  const activeTops =
    activeIndex === null
      ? []
      : series
          .filter((item) => !item.isLeaving)
          .map((item) => ({ item, top: item.top[activeIndex] }))
          .filter(
            (entry): entry is { item: LineSeriesGeometry; top: number } =>
              entry.top !== null && entry.top !== undefined
          )
  const anchor =
    activeIndex === null
      ? null
      : {
          x: model.positions[activeIndex],
          y: activeTops.length
            ? Math.min(...activeTops.map((entry) => entry.top))
            : plot.y + plot.height / 2,
        }

  return (
    <div
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className={cn("cn-chart-plot relative min-h-0 flex-1", plotClassName)}
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            <defs>
              {variant === "area" &&
                series.map((item) => (
                  <linearGradient
                    key={item.key}
                    id={`${id}-fill-${toSvgId(item.key)}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0"
                      stopColor={getChartColor(item.paint)}
                      stopOpacity={stack === "none" ? 0.24 : 0.34}
                    />
                    <stop
                      offset="1"
                      stopColor={getChartColor(item.paint)}
                      stopOpacity={stack === "none" ? 0 : 0.14}
                    />
                  </linearGradient>
                ))}
              <clipPath id={`${id}-reveal`}>
                <rect
                  x={0}
                  y={-8}
                  width={revealWidth}
                  height={size.height + 16}
                />
              </clipPath>
            </defs>
            <ChartGrid
              ticks={valueTicks}
              start={plot.x}
              end={plot.x + plot.width}
            />
            <ChartAxis
              side="start"
              ticks={valueTicks}
              offset={plot.x - CHART_LABEL_GAP}
            />
            <ChartAxis
              side="bottom"
              offset={plot.y + plot.height + CHART_LABEL_GAP}
              ticks={model.labelIndices.map((position) => ({
                position: model.positions[position],
                label: model.labels[position],
              }))}
            />
            <g clipPath={`url(#${id}-reveal)`}>
              {/* Every wash first, then every line, so no wash covers a line. */}
              {variant === "area" &&
                series.map((item) => (
                  <path
                    key={item.key}
                    data-slot="chart-area"
                    data-dimmed={
                      (spotlight !== null && spotlight !== item.key) ||
                      item.isLeaving ||
                      undefined
                    }
                    className="cn-chart-series"
                    d={getAreaPath(
                      model.positions,
                      item.top,
                      item.bottom,
                      curve
                    )}
                    fill={`url(#${id}-fill-${toSvgId(item.key)})`}
                  />
                ))}
              {series.map((item) => (
                <path
                  key={item.key}
                  data-slot="chart-series"
                  data-dimmed={
                    (spotlight !== null && spotlight !== item.key) ||
                    item.isLeaving ||
                    undefined
                  }
                  className="cn-chart-series"
                  d={getLinePath(model.positions, item.top, curve)}
                  fill="none"
                  stroke={getChartColor(item.paint)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={item.dashed ? "4 4" : undefined}
                />
              ))}
            </g>
            {activeIndex !== null && (
              <ChartCrosshair
                x={model.positions[activeIndex]}
                top={plot.y}
                bottom={plot.y + plot.height}
              />
            )}
            {activeTops.map(({ item, top }) => (
              <ChartDot
                key={item.key}
                point={{ x: model.positions[activeIndex ?? 0], y: top }}
                color={getChartColor(item.paint)}
              />
            ))}
          </svg>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip content={content} anchor={anchor} frame={size} />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={data.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getNearestIndex(model.positions, point.x)}
            valueText={
              content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}`
                : undefined
            }
          />
        )}
      </div>
      {showLegend && (
        <ChartLegend
          series={allSeries}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
          shape={variant === "area" ? "square" : "line"}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { ChartLinePlot, type ChartLinePlotProps }
