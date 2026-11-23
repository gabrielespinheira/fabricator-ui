"use client"

import * as React from "react"
import { cn } from "cn"

import {
  collapseBar,
  getBarChartModel,
  getBarPath,
  getBarTable,
  getBarTooltip,
  interpolateBars,
  type BarRect,
  type BarStack,
} from "@/registry/bases/__base__/lib/chart-bar-model"
import {
  CHART_LABEL_GAP,
  type ChartOrientation,
} from "@/registry/bases/__base__/lib/chart-cartesian-model"
import {
  getChartSeries,
  getNearestIndex,
  getStaggeredProgress,
  interpolateNumber,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
  type ChartSeries,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartAxis,
  ChartBand,
  ChartDataTable,
  ChartEmpty,
  ChartGrid,
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

// The plot Bar Chart and Composition Chart share: gridlines and axes, bars
// that grow from zero in a quick wave the first time the chart is on screen,
// a wash that glides to the category under the pointer, the tooltip, the
// legend and the hidden table. Bars move and resize when the data, the
// stacking or the visible series change.

type ChartBarPlotProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  config: ChartConfig
  /** The field naming each category. */
  index: keyof TDatum & string
  /** The chart's accessible name. */
  label: string
  layout?: ChartOrientation
  stack?: BarStack
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
  /** Wider bars and narrower gaps, for 100% columns read as one figure. */
  maxThickness?: number
  bandPadding?: number
  /** Replaces the legend, for charts that list more than the names. */
  renderLegend?: (legend: {
    series: ChartSeries[]
    hidden: ReadonlySet<string>
    onToggle: (key: string) => void
    onSpotlight: (key: string | null) => void
    /** The inspected category, or null when nothing is inspected. */
    activeIndex: number | null
  }) => React.ReactNode
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 240 }
const NO_BARS: BarRect[] = []

function getBarKey(bar: BarRect) {
  return bar.id
}

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

/** Every bar. Memoized: the band and tooltip moving don't redraw them. */
const ChartBars = React.memo(function ChartBars({
  bars,
  reveal,
  count,
  baseline,
  layout,
  spotlight,
}: {
  bars: readonly BarRect[]
  reveal: number
  count: number
  baseline: number
  layout: ChartOrientation
  spotlight: string | null
}) {
  return bars.map((bar) => {
    const amount = getStaggeredProgress(reveal, bar.index, count)
    return (
      <path
        key={bar.id}
        data-slot="chart-bar"
        data-leaving={bar.isLeaving || undefined}
        data-dimmed={
          (!bar.isLeaving && spotlight !== null && spotlight !== bar.key) ||
          undefined
        }
        className="cn-chart-bar"
        d={getBarPath(grow(bar, baseline, layout, amount))}
        fill={getChartColor(bar.paint)}
      />
    )
  })
})

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
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
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
    ]
  )
  const dataVersion = React.useMemo(
    () => ({ data, config, layout, stack, hidden }),
    [data, config, layout, stack, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const bars = useChartTween(
    plotRef,
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
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < data.length ? shown.value : null
  const content =
    shownIndex === null ? null : getBarTooltip(model, shownIndex, formatValue)
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
  // The tooltip sits on the bars as drawn now, so during a morph it travels
  // with them instead of arriving first.
  const activeBars =
    shownIndex === null
      ? []
      : bars.filter((bar) => bar.index === shownIndex && !bar.isLeaving)
  const anchor =
    shownIndex === null
      ? null
      : isVertical
        ? {
            x: model.centers[shownIndex],
            y: activeBars.length
              ? Math.min(...activeBars.map((bar) => bar.y))
              : plot.y + plot.height / 2,
          }
        : {
            x: activeBars.length
              ? Math.max(...activeBars.map((bar) => bar.x + bar.width))
              : plot.x + plot.width / 2,
            y: model.centers[shownIndex],
          }
  const band = shownIndex === null ? null : model.bands[shownIndex]
  const indexTicks = model.labelIndices.map((position) => ({
    position: model.centers[position],
    label: model.labels[position],
  }))

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
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            <ChartGrid
              ticks={valueTicks}
              orientation={isVertical ? "horizontal" : "vertical"}
              start={isVertical ? plot.x : plot.y}
              end={isVertical ? plot.x + plot.width : plot.y + plot.height}
            />
            {band && <ChartBand rect={band} leaving={shown.isLeaving} />}
            {isVertical ? (
              <>
                <ChartAxis
                  side="start"
                  ticks={valueTicks}
                  offset={plot.x - CHART_LABEL_GAP}
                />
                <ChartAxis
                  side="bottom"
                  ticks={indexTicks}
                  offset={plot.y + plot.height + CHART_LABEL_GAP}
                />
              </>
            ) : (
              <>
                <ChartAxis
                  side="start"
                  ticks={indexTicks}
                  offset={plot.x - CHART_LABEL_GAP}
                />
                <ChartAxis
                  side="bottom"
                  ticks={valueTicks}
                  offset={plot.y + plot.height + CHART_LABEL_GAP}
                />
              </>
            )}
            <ChartBars
              bars={drawnBars}
              reveal={reveal}
              count={data.length}
              baseline={model.baseline}
              layout={layout}
              spotlight={spotlight}
            />
          </svg>
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
            count={data.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) =>
              getNearestIndex(model.centers, isVertical ? point.x : point.y)
            }
            valueText={
              activeIndex !== null && content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}`
                : undefined
            }
          />
        )}
      </div>
      {renderLegend
        ? renderLegend({
            series: allSeries,
            hidden,
            onToggle: toggle,
            onSpotlight: setSpotlight,
            activeIndex,
          })
        : showLegend && (
            <ChartLegend
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

export { ChartBarPlot, type ChartBarPlotProps }
