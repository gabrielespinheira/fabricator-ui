import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getChartSeries,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
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
} from "@/registry/fabricator/shared/lib/chart-radar-model"
import {
  ChartDataTable,
  ChartDimmable,
  ChartDot,
  ChartEmpty,
  ChartFrame,
  ChartInspector,
  ChartLegend,
  ChartRevealFade,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartDrawOrder,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"

// Several measures of one or more subjects on shared axes, from the website's
// model: a hairline grid of four polygons and the spokes, the axis names just
// past it, and a washed polygon per series. The polygons grow from the centre
// once the plot has a size; a finger on an axis lights its spoke and rings
// each series' vertex.

// Read as styles and drawn into SVG: the grid, the inspected spoke, the axis
// names and the dimmed opacity.
const radarGridStyle = cva("cn-radar-chart-grid")
const radarSpokeStyle = cva("cn-radar-chart-spoke")
const radarLabelStyle = cva("cn-radar-chart-label")
const radarLabelActiveStyle = cva("cn-radar-chart-label-active")
const radarAreaStyle = cva("cn-radar-chart-area")
const radarSeriesStyle = cva("cn-radar-chart-series")

type RadarChartProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  config: ChartConfig
  index: keyof TDatum & string
  label: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 280 }
const NO_SERIES: RadarSeriesGeometry[] = []

function readColor(style: { color?: unknown }) {
  return typeof style.color === "string" ? style.color : undefined
}

function readOpacity(style: { opacity?: unknown }, fallback: number) {
  return typeof style.opacity === "number" ? style.opacity : fallback
}

function getSeriesKey(item: RadarSeriesGeometry) {
  return item.key
}

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
  const { onLayout, size } = useChartSize()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)
  const gridColor = readColor(useResolveClassNames(radarGridStyle()))
  const spokeColor = readColor(useResolveClassNames(radarSpokeStyle()))
  const labelStyle = useResolveClassNames(radarLabelStyle())
  const labelColor = readColor(labelStyle)
  const activeLabelColor = readColor(
    useResolveClassNames(radarLabelActiveStyle())
  )
  const fontSize =
    typeof labelStyle.fontSize === "number" ? labelStyle.fontSize : 11
  const areaDimmed = readOpacity(useResolveClassNames(radarAreaStyle()), 0.4)
  const seriesDimmed = readOpacity(
    useResolveClassNames(radarSeriesStyle()),
    0.4
  )

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const colors = useChartColors(allSeries.map((item) => item.paint))
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
  const dataVersion = React.useMemo(
    () => ({ data, config, index, hidden }),
    [data, config, index, hidden]
  )
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  const series = useChartTween(
    size ? model.series : NO_SERIES,
    interpolateRadarSeries,
    animate ? dataVersion : null
  )
  const drawnSeries = useChartDrawOrder(series, getSeriesKey)

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
  const grow = (radii: number[]) =>
    reveal >= 1 ? radii : radii.map((radius) => radius * reveal)
  // The series as drawn now, so the dots and the tooltip ride the morph and
  // the draw-in instead of waiting at the final shape.
  const grownSeries = series
    .filter((item) => !item.isLeaving)
    .map((item) => ({ ...item, radii: grow(item.radii) }))

  return (
    <View
      data-slot="radar-chart"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-radar-chart flex-col items-center", className)}
      {...props}
    >
      <View
        ref={plotRef}
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 w-full flex-1"
      >
        {size && !isEmpty && (
          <ChartRevealFade isReady={size !== null} enabled={animate}>
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: "absolute" }}
              importantForAccessibility="no-hide-descendants"
            >
              <ChartFrame data-slot="radar-chart-grid">
                {model.levels.map((radius) => (
                  <Path
                    key={radius}
                    d={getRadarGridPath(model, radius)}
                    fill="none"
                    stroke={gridColor}
                    strokeWidth={1}
                  />
                ))}
                {model.axes.map((axis, axisIndex) => (
                  <Line
                    key={axis.id}
                    data-slot="radar-chart-spoke"
                    x1={model.center.x}
                    y1={model.center.y}
                    x2={axis.end.x}
                    y2={axis.end.y}
                    stroke={axisIndex === activeIndex ? spokeColor : gridColor}
                    strokeWidth={1}
                  />
                ))}
              </ChartFrame>
              <G>
                {model.axes.map((axis, axisIndex) => (
                  <SvgText
                    key={axis.id}
                    data-slot="radar-chart-label"
                    x={axis.labelX}
                    y={axis.labelY}
                    fill={
                      axisIndex === activeIndex ? activeLabelColor : labelColor
                    }
                    fontSize={fontSize}
                    fontFamily="Inter"
                    textAnchor={axis.anchor}
                  >
                    {axis.text}
                  </SvgText>
                ))}
              </G>
              {drawnSeries.map((item) => (
                <ChartDimmable
                  key={item.key}
                  isDimmed={isDimmed(item)}
                  dimmedOpacity={areaDimmed}
                >
                  <Path
                    data-slot="radar-chart-area"
                    d={getRadarPolygonPath(model, grow(item.radii))}
                    fill={getChartColor(item.paint, colors)}
                    fillOpacity={RADAR_WASH_OPACITY}
                  />
                </ChartDimmable>
              ))}
              {drawnSeries.map((item) => (
                <ChartDimmable
                  key={item.key}
                  isDimmed={isDimmed(item)}
                  dimmedOpacity={seriesDimmed}
                >
                  <Path
                    data-slot="radar-chart-series"
                    d={getRadarPolygonPath(model, grow(item.radii))}
                    fill="none"
                    stroke={getChartColor(item.paint, colors)}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </ChartDimmable>
              ))}
            </Svg>
          </ChartRevealFade>
        )}
        {activeIndex !== null &&
          grownSeries.map((item) => (
            <ChartDot
              key={item.key}
              point={getRadarPoint(
                model,
                activeIndex,
                item.radii[activeIndex] ?? 0
              )}
              color={getChartColor(item.paint, colors)}
            />
          ))}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && activeIndex !== null && (
          <ChartTooltip
            content={content}
            anchor={getRadarAnchor(
              { ...model, series: grownSeries },
              activeIndex
            )}
            frame={size}
            colors={colors}
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
      </View>
      {showLegend && (
        <ChartLegend
          className="justify-center"
          series={allSeries}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
          colors={colors}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { RadarChart, type RadarChartProps }
