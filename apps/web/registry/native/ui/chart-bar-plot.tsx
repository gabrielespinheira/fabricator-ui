import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, { Path } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  collapseBar,
  getBarChartModel,
  getBarPath,
  getBarTable,
  getBarTooltip,
  interpolateBars,
  type BarRect,
  type BarStack,
} from "@/registry/fabricator/shared/lib/chart-bar-model"
import {
  CHART_LABEL_GAP,
  type ChartOrientation,
} from "@/registry/fabricator/shared/lib/chart-cartesian-model"
import {
  areChartMarksPropsEqual,
  getChartSeries,
  getNearestIndex,
  getStaggeredProgress,
  interpolateNumber,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
  type ChartSeries,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartAxis,
  ChartBand,
  ChartDataTable,
  ChartDimmable,
  ChartEmpty,
  ChartEnds,
  ChartGrid,
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

// The plot Bar Chart and Composition Chart share, drawn from the website's
// model: bars that grow from zero in a quick wave once the plot has a size,
// a wash that glides to the category under the finger, the tooltip and the
// legend. Bars move and resize when the data, the stacking or the visible
// series change.

// The opacity a dimmed bar takes, read from the style map.
const chartBarStyle = cva("cn-chart-bar")

type ChartBarPlotProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  config: ChartConfig
  index: keyof TDatum & string
  label: string
  layout?: ChartOrientation
  stack?: BarStack
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  /**
   * No axes or gridlines, only the first and last labels under the plot: for
   * charts in small cards. Horizontal bars keep their labels.
   */
  minimal?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
  maxThickness?: number
  bandPadding?: number
  renderLegend?: (legend: {
    series: ChartSeries[]
    hidden: ReadonlySet<string>
    onToggle: (key: string) => void
    onSpotlight: (key: string | null) => void
    colors: Record<string, string>
    /** The inspected category, or null when nothing is inspected. */
    activeIndex: number | null
  }) => React.ReactNode
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 200 }
const NO_BARS: BarRect[] = []

function grow(
  bar: BarRect,
  baseline: number,
  layout: ChartOrientation,
  amount: number
) {
  if (amount >= 1) return bar
  const collapsed = collapseBar(bar, baseline, layout)
  return {
    ...bar,
    x: interpolateNumber(collapsed.x, bar.x, amount),
    y: interpolateNumber(collapsed.y, bar.y, amount),
    width: interpolateNumber(collapsed.width, bar.width, amount),
    height: interpolateNumber(collapsed.height, bar.height, amount),
  }
}

/**
 * The bars, memoized: a scrub only moves the band and the tooltip, so an
 * index change doesn't draw every bar again.
 */
const ChartBarMarks = React.memo(function ChartBarMarks({
  bars,
  reveal,
  dataLength,
  baseline,
  layout,
  colors,
  spotlight,
  dimmedOpacity,
}: {
  bars: readonly BarRect[]
  reveal: number
  dataLength: number
  baseline: number
  layout: ChartOrientation
  colors: Record<string, string>
  spotlight: string | null
  dimmedOpacity: number
}) {
  return (
    <>
      {bars.map((bar) => {
        const amount = getStaggeredProgress(reveal, bar.index, dataLength)
        const isDimmed =
          (spotlight !== null && spotlight !== bar.key) ||
          bar.isLeaving === true
        return (
          <ChartDimmable
            key={bar.id}
            isDimmed={isDimmed}
            dimmedOpacity={dimmedOpacity}
          >
            <Path
              data-slot="chart-bar"
              d={getBarPath(grow(bar, baseline, layout, amount))}
              fill={getChartColor(bar.paint, colors)}
            />
          </ChartDimmable>
        )
      })}
    </>
  )
}, areChartMarksPropsEqual)

function getBarKey(bar: BarRect) {
  return bar.id
}

function ChartBarPlot<TDatum extends ChartDatum>({
  data,
  config,
  index,
  label,
  layout = "vertical",
  stack = "none",
  formatValue,
  formatIndex,
  legend,
  minimal = false,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  maxThickness,
  bandPadding,
  renderLegend,
  className,
  ...props
}: ChartBarPlotProps<TDatum>) {
  const { onLayout, size, fontSize } = useChartSize()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)
  const dimmed = useResolveClassNames(chartBarStyle())
  const dimmedOpacity =
    typeof dimmed.opacity === "number" ? dimmed.opacity : 0.4

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const colors = useChartColors(allSeries.map((item) => item.paint))
  const model = React.useMemo(
    () =>
      getBarChartModel({
        data,
        config,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        layout,
        stack,
        hidden,
        maxThickness,
        bandPadding,
        formatIndex,
        minimal,
      }),
    [
      data,
      config,
      index,
      size,
      fontSize,
      layout,
      stack,
      hidden,
      maxThickness,
      bandPadding,
      formatIndex,
      minimal,
    ]
  )
  const dataVersion = React.useMemo(
    () => ({ data, config, layout, stack, hidden }),
    [data, config, layout, stack, hidden]
  )
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  const bars = useChartTween(
    size ? model.bars : NO_BARS,
    (from, to, progress) =>
      interpolateBars(
        { ...model, bars: from },
        { ...model, bars: to },
        progress
      ),
    animate ? dataVersion : null
  )
  const drawnBars = useChartDrawOrder(bars, getBarKey)

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null ? null : getBarTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getBarTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const isVertical = layout === "vertical"
  const { plot, valueTicks } = model.layout
  const isEmpty = data.length === 0
  const showLegend = legend ?? allSeries.length > 1
  const activeBars =
    activeIndex === null
      ? []
      : bars.filter((bar) => bar.index === activeIndex && !bar.isLeaving)
  const anchor =
    activeIndex === null
      ? null
      : isVertical
        ? {
            x: model.centers[activeIndex],
            y: activeBars.length
              ? Math.min(...activeBars.map((bar) => bar.y))
              : plot.y + plot.height / 2,
          }
        : {
            x: activeBars.length
              ? Math.max(...activeBars.map((bar) => bar.x + bar.width))
              : plot.x + plot.width / 2,
            y: model.centers[activeIndex],
          }
  const band = activeIndex === null ? null : model.bands[activeIndex]
  const indexTicks = model.labelIndices.map((position) => ({
    position: model.centers[position],
    label: model.labels[position],
  }))

  return (
    <View
      data-loading={loading}
      aria-busy={loading}
      className={cn("flex-col", className)}
      {...props}
    >
      <View
        ref={plotRef}
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {band && <ChartBand rect={band} />}
        {size && !isEmpty && (
          <ChartRevealFade isReady={size !== null} enabled={animate}>
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: "absolute" }}
              importantForAccessibility="no-hide-descendants"
            >
              <ChartGrid
                ticks={valueTicks}
                orientation={isVertical ? "horizontal" : "vertical"}
                start={isVertical ? plot.x : plot.y}
                end={isVertical ? plot.x + plot.width : plot.y + plot.height}
              />
              <ChartAxis
                side="start"
                ticks={isVertical ? valueTicks : indexTicks}
                offset={plot.x - CHART_LABEL_GAP}
              />
              <ChartAxis
                side="bottom"
                ticks={isVertical ? indexTicks : valueTicks}
                offset={plot.y + plot.height + CHART_LABEL_GAP}
              />
              <ChartBarMarks
                bars={drawnBars}
                reveal={reveal}
                dataLength={data.length}
                baseline={model.baseline}
                layout={layout}
                colors={colors}
                spotlight={spotlight}
                dimmedOpacity={dimmedOpacity}
              />
            </Svg>
          </ChartRevealFade>
        )}
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
            getIndexAt={(point) =>
              getNearestIndex(model.centers, isVertical ? point.x : point.y)
            }
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
      {minimal && layout === "vertical" && data.length > 0 && (
        <ChartEnds labels={model.labels} />
      )}
      {renderLegend
        ? renderLegend({
            series: allSeries,
            hidden,
            onToggle: toggle,
            onSpotlight: setSpotlight,
            colors,
            activeIndex,
          })
        : showLegend && (
            <ChartLegend
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

export { ChartBarPlot, type ChartBarPlotProps }
