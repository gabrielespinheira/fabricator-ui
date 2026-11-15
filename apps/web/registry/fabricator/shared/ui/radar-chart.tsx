"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getChartSeries,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  getRadarAnchor,
  getRadarAxisAt,
  getRadarChartModel,
  getRadarGridPath,
  getRadarPoint,
  getRadarPolygonPath,
  getRadarTable,
  getRadarTooltip,
  interpolateRadarSeries,
  RADAR_WASH_OPACITY,
  type RadarSeriesGeometry,
} from "@/registry/bases/__base__/lib/chart-radar-model"
import {
  ChartDataTable,
  ChartDot,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Several measures of one or more subjects on shared axes: a hairline grid of
// four polygons and the spokes, the axis names just past it, and a polygon
// per series with a wash of its colour. The polygons grow from the centre the
// first time the chart is on screen and move vertex by vertex when the data
// changes. Inspecting an axis lights its spoke and rings each series' vertex.

type RadarChartProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  config: ChartConfig
  /** The field naming each axis. */
  index: keyof TDatum & string
  /** The chart's accessible name. */
  label: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 320, height: 280 }
const NO_SERIES: RadarSeriesGeometry[] = []

function RadarChart<TDatum extends ChartDatum>({
  data,
  config,
  index,
  label,
  formatValue,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: RadarChartProps<TDatum>) {
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const model = React.useMemo(
    () =>
      getRadarChartModel({
        data,
        config,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        hidden,
      }),
    [data, config, index, size, fontSize, hidden]
  )
  // A new token whenever the data changes rather than the size: the
  // polygons morph on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, config, index, hidden }),
    [data, config, index, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const series = useChartTween(
    plotRef,
    size ? model.series : NO_SERIES,
    interpolateRadarSeries,
    animate ? dataVersion : null
  )

  const activeIndex =
    active !== null && active < model.axes.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getRadarTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getRadarTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const isEmpty = data.length === 0
  const showLegend = legend ?? allSeries.length > 1
  const isDimmed = (item: RadarSeriesGeometry) =>
    (spotlight !== null && spotlight !== item.key) || item.isLeaving === true
  const grow = (radii: readonly number[]) =>
    reveal >= 1 ? radii : radii.map((radius) => radius * reveal)

  return (
    <div
      data-slot="radar-chart"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-radar-chart flex flex-col items-center", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className="cn-chart-plot relative min-h-0 w-full flex-1"
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            <g data-slot="radar-chart-grid" className="cn-radar-chart-grid">
              {model.levels.map((radius) => (
                <path
                  key={radius}
                  d={getRadarGridPath(model, radius)}
                  fill="none"
                />
              ))}
              {model.axes.map((axis, axisIndex) => (
                <line
                  key={axis.id}
                  data-slot="radar-chart-spoke"
                  data-active={axisIndex === activeIndex || undefined}
                  className="cn-radar-chart-spoke"
                  x1={model.center.x}
                  y1={model.center.y}
                  x2={axis.end.x}
                  y2={axis.end.y}
                />
              ))}
            </g>
            <g>
              {model.axes.map((axis, axisIndex) => (
                <text
                  key={axis.id}
                  data-slot="radar-chart-label"
                  data-active={axisIndex === activeIndex || undefined}
                  className="cn-radar-chart-label"
                  x={axis.labelX}
                  y={axis.labelY}
                  textAnchor={axis.anchor}
                >
                  {axis.text}
                </text>
              ))}
            </g>
            {/* Every wash first, then every outline, so no wash covers a line. */}
            {series.map((item) => (
              <path
                key={item.key}
                data-slot="radar-chart-area"
                data-dimmed={isDimmed(item) || undefined}
                className="cn-radar-chart-area"
                d={getRadarPolygonPath(model, grow(item.radii))}
                fill={getChartColor(item.paint)}
                fillOpacity={RADAR_WASH_OPACITY}
              />
            ))}
            {series.map((item) => (
              <path
                key={item.key}
                data-slot="radar-chart-series"
                data-dimmed={isDimmed(item) || undefined}
                className="cn-radar-chart-series"
                d={getRadarPolygonPath(model, grow(item.radii))}
                fill="none"
                stroke={getChartColor(item.paint)}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ))}
            {activeIndex !== null &&
              model.series.map((item) => (
                <ChartDot
                  key={item.key}
                  point={getRadarPoint(
                    model,
                    activeIndex,
                    item.radii[activeIndex] ?? 0
                  )}
                  color={getChartColor(item.paint)}
                />
              ))}
          </svg>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && activeIndex !== null && (
          <ChartTooltip
            content={content}
            anchor={getRadarAnchor(model, activeIndex)}
            frame={size}
          />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={model.axes.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getRadarAxisAt(model, point)}
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
          className="justify-center"
          series={allSeries}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { RadarChart, type RadarChartProps }
