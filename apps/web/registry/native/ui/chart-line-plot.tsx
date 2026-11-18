import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import { CHART_LABEL_GAP } from "@/registry/fabricator/shared/lib/chart-cartesian-model"
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
} from "@/registry/fabricator/shared/lib/chart-line-model"
import {
  getChartSeries,
  getNearestIndex,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
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
  useChartColors,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"

// The plot Area Chart and Line Chart share, drawn from the website's model:
// gridlines and axes in SVG, a line per series (with a fading wash under it
// for areas), and over them the crosshair, dots and tooltip a finger moves.
// Lines reveal from the start edge once the plot has a size, and morph point
// by point when the data, the stacking or the visible series change.

// The opacity a dimmed series takes, read from the style map.
const chartSeriesStyle = cva("cn-chart-series")

type ChartLinePlotProps<TDatum extends ChartDatum> = {
  variant: "area" | "line"
  data: readonly TDatum[]
  config: ChartConfig
  index: keyof TDatum & string
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
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 200 }
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
  const { onLayout, size, fontSize } = useChartSize()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)
  const dimmed = useResolveClassNames(chartSeriesStyle())
  const dimmedOpacity =
    typeof dimmed.opacity === "number" ? dimmed.opacity : 0.25

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const colors = useChartColors(allSeries.map((item) => item.paint))
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
  const dataVersion = React.useMemo(
    () => ({ data, config, stack, hidden }),
    [data, config, stack, hidden]
  )
  const reveal = useChartReveal(size !== null, animate)
  const series = useChartTween(
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
  const isDimmed = (item: LineSeriesGeometry) =>
    (spotlight !== null && spotlight !== item.key) || item.isLeaving === true

  return (
    <View
      data-loading={loading}
      aria-busy={loading}
      className={cn("flex-col", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className={cn("cn-chart-plot relative min-h-0 flex-1", plotClassName)}
      >
        {size && !isEmpty && (
          <Svg
            width={size.width}
            height={size.height}
            style={{ position: "absolute" }}
            importantForAccessibility="no-hide-descendants"
          >
            <Defs>
              {variant === "area" &&
                series.map((item) => (
                  <LinearGradient
                    key={item.key}
                    id={`${id}-fill-${toSvgId(item.key)}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop
                      offset="0"
                      stopColor={getChartColor(item.paint, colors)}
                      stopOpacity={stack === "none" ? 0.24 : 0.34}
                    />
                    <Stop
                      offset="1"
                      stopColor={getChartColor(item.paint, colors)}
                      stopOpacity={stack === "none" ? 0 : 0.14}
                    />
                  </LinearGradient>
                ))}
              <ClipPath id={`${id}-reveal`}>
                <Rect
                  x={0}
                  y={-8}
                  width={revealWidth}
                  height={size.height + 16}
                />
              </ClipPath>
            </Defs>
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
            <G clipPath={`url(#${id}-reveal)`}>
              {variant === "area" &&
                series.map((item) => (
                  <Path
                    key={item.key}
                    data-slot="chart-area"
                    d={getAreaPath(
                      model.positions,
                      item.top,
                      item.bottom,
                      curve
                    )}
                    fill={`url(#${id}-fill-${toSvgId(item.key)})`}
                    opacity={isDimmed(item) ? dimmedOpacity : 1}
                  />
                ))}
              {series.map((item) => (
                <Path
                  key={item.key}
                  data-slot="chart-series"
                  d={getLinePath(model.positions, item.top, curve)}
                  fill="none"
                  stroke={getChartColor(item.paint, colors)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={item.dashed ? [4, 4] : undefined}
                  opacity={isDimmed(item) ? dimmedOpacity : 1}
                />
              ))}
            </G>
          </Svg>
        )}
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
            color={getChartColor(item.paint, colors)}
          />
        ))}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip
            content={content}
            anchor={anchor}
            frame={size}
            colors={colors}
          />
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
      </View>
      {showLegend && (
        <ChartLegend
          series={allSeries}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
          colors={colors}
          shape={variant === "area" ? "square" : "line"}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { ChartLinePlot, type ChartLinePlotProps }
