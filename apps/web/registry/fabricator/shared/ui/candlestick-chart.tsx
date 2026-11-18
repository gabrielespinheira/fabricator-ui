"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getCandleBody,
  getCandlestickChartModel,
  getCandlestickTable,
  getCandlestickTooltip,
  getCandleVolume,
  getCandleWickX,
  getLastCloseMark,
  interpolateCandles,
  revealCandle,
  type Candle,
  type CandlestickConfig,
} from "@/registry/bases/__base__/lib/chart-candlestick-model"
import { CHART_LABEL_GAP } from "@/registry/bases/__base__/lib/chart-cartesian-model"
import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartAxis,
  ChartCrosshair,
  ChartDataTable,
  ChartEmpty,
  ChartGrid,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Open, high, low and close per period: a body from the open to the close
// and a wick from the low to the high, rising periods in the success colour
// and falling ones in destructive. Volume runs along the bottom, a dashed
// line marks the latest close with its price at the end, and the crosshair
// and tooltip read the inspected period. Bodies grow from their open the
// first time the chart is on screen; when a period is added and the oldest
// dropped, the candles slide along.

type CandlestickChartProps<TDatum extends ChartDatum> = {
  /** Rows with `open`, `high`, `low`, `close` and optionally `volume`. */
  data: readonly TDatum[]
  /** The field naming each period. */
  index: keyof TDatum & string
  /** The chart's accessible name. */
  label: string
  /** Names and colours for rising and falling periods. */
  config?: CandlestickConfig
  /** The volume band; on when the data has volume. */
  volume?: boolean
  /** Formats prices (keys `open`, `high`, `low`, `close`) and `volume`. */
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  /** Names the up and down colours under the plot. */
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 240 }
const NO_CANDLES: Candle[] = []
const DIRECTIONS = ["up", "down"] as const

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}

function CandlestickChart<TDatum extends ChartDatum>({
  data,
  index,
  label,
  config,
  volume,
  formatValue,
  formatIndex,
  legend = false,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: CandlestickChartProps<TDatum>) {
  const id = toSvgId(React.useId())
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  const model = React.useMemo(
    () =>
      getCandlestickChartModel({
        data,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        config,
        volume,
        formatValue,
        formatIndex,
      }),
    [data, index, size, fontSize, config, volume, formatValue, formatIndex]
  )
  // A new token whenever the data changes rather than the size: candles
  // slide on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, config, volume }),
    [data, config, volume]
  )
  const reveal = useChartReveal(plotRef, animate)
  const candles = useChartTween(
    plotRef,
    size ? model.candles : NO_CANDLES,
    interpolateCandles,
    animate ? dataVersion : null
  )

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getCandlestickTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getCandlestickTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const { plot, valueTicks } = model.layout
  const { price } = model
  const isEmpty = data.length === 0
  const shown = candles.map((candle) =>
    revealCandle(
      candle,
      getStaggeredProgress(reveal, candle.index, data.length)
    )
  )
  const mark = getLastCloseMark(model, shown)
  const activeCandle =
    activeIndex === null
      ? undefined
      : model.candles.find((candle) => candle.index === activeIndex)
  const anchor =
    activeIndex === null
      ? null
      : {
          x: model.centers[activeIndex],
          y: activeCandle ? activeCandle.high : price.y + price.height / 2,
        }

  return (
    <div
      data-slot="candlestick-chart"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-candlestick-chart flex flex-col", className)}
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
            <defs>
              {/* Candles sliding in or out disappear at the plot's edges. */}
              <clipPath id={`${id}-plot`}>
                <rect
                  x={plot.x}
                  y={0}
                  width={plot.width}
                  height={size.height}
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
                position: model.centers[position],
                label: model.labels[position],
              }))}
            />
            <g clipPath={`url(#${id}-plot)`}>
              {shown.map((candle) => {
                const color = getChartColor(candle.paint)
                const body = getCandleBody(candle)
                const bar = getCandleVolume(candle)
                const wick = getCandleWickX(candle)
                return (
                  <g
                    key={candle.id}
                    data-slot="candlestick-chart-candle"
                    data-direction={candle.direction}
                    data-dimmed={candle.isLeaving || undefined}
                    className="cn-candlestick-chart-candle"
                    fill={color}
                    stroke={color}
                  >
                    {bar && (
                      <rect
                        data-slot="candlestick-chart-volume"
                        className="cn-candlestick-chart-volume"
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        strokeWidth={0}
                      />
                    )}
                    <line
                      data-slot="candlestick-chart-wick"
                      x1={wick}
                      x2={wick}
                      y1={candle.high}
                      y2={candle.low}
                      strokeWidth={1}
                    />
                    <rect
                      data-slot="candlestick-chart-body"
                      x={body.x}
                      y={body.y}
                      width={body.width}
                      height={body.height}
                      strokeWidth={0}
                    />
                  </g>
                )
              })}
            </g>
            {mark && (
              <g data-slot="candlestick-chart-last-close">
                <line
                  className="cn-candlestick-chart-last-line"
                  x1={plot.x}
                  x2={mark.pill.x}
                  y1={Math.round(mark.y) + 0.5}
                  y2={Math.round(mark.y) + 0.5}
                  strokeDasharray="2 3"
                />
                <rect
                  className="cn-candlestick-chart-last-pill"
                  x={mark.pill.x}
                  y={mark.pill.y}
                  width={mark.pill.width}
                  height={mark.pill.height}
                  rx={mark.pill.height / 2}
                />
                <text
                  className="cn-candlestick-chart-last-label"
                  x={mark.pill.x + mark.pill.width / 2}
                  y={mark.pill.y + mark.pill.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {mark.label}
                </text>
              </g>
            )}
            {activeIndex !== null && (
              <ChartCrosshair
                x={model.centers[activeIndex]}
                top={plot.y}
                bottom={plot.y + plot.height}
              />
            )}
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
            getIndexAt={(point) => getNearestIndex(model.centers, point.x)}
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
      {legend && (
        <ul
          data-slot="candlestick-chart-legend"
          aria-label="Candles"
          className="cn-candlestick-chart-legend flex flex-wrap items-center"
        >
          {DIRECTIONS.map((direction) => (
            <li
              key={direction}
              data-slot="candlestick-chart-legend-item"
              className="cn-candlestick-chart-legend-item inline-flex items-center"
            >
              <span
                data-slot="candlestick-chart-legend-key"
                className="cn-candlestick-chart-legend-key"
                style={{
                  color: getChartColor(model.directions[direction].paint),
                }}
              />
              {model.directions[direction].label}
            </li>
          ))}
        </ul>
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { CandlestickChart, type CandlestickChartProps }
