import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg"
import { useResolveClassNames } from "uniwind"

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
} from "@/registry/fabricator/shared/lib/chart-candlestick-model"
import { CHART_LABEL_GAP } from "@/registry/fabricator/shared/lib/chart-cartesian-model"
import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartAxis,
  ChartCrosshair,
  ChartDataTable,
  ChartEmpty,
  ChartGrid,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

// Open, high, low and close per period, from the website's model: a body
// from the open to the close and a wick from the low to the high, rising in
// the success colour and falling in destructive, volume along the bottom
// and a dashed line at the latest close with its price at the end. Bodies
// grow from their open once the plot has a size; when a period is added and
// the oldest dropped, the candles slide along.

// The rules drawn into SVG are read as styles: a sliding-out candle's
// opacity, the volume's, and the last close's line, pill and price.
const candleStyle = cva("cn-candlestick-chart-candle")
const volumeStyle = cva("cn-candlestick-chart-volume")
const lastLineStyle = cva("cn-candlestick-chart-last-line")
const lastPillStyle = cva("cn-candlestick-chart-last-pill")
const lastLabelStyle = cva("cn-candlestick-chart-last-label")

type CandlestickChartProps<TDatum extends ChartDatum> = {
  /** Rows with `open`, `high`, `low`, `close` and optionally `volume`. */
  data: readonly TDatum[]
  index: keyof TDatum & string
  label: string
  config?: CandlestickConfig
  volume?: boolean
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 200 }
const NO_CANDLES: Candle[] = []
const DIRECTIONS = ["up", "down"] as const

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}

function readStyle(style: ReturnType<typeof useResolveClassNames>) {
  return {
    color: typeof style.color === "string" ? style.color : undefined,
    backgroundColor:
      typeof style.backgroundColor === "string"
        ? style.backgroundColor
        : undefined,
    opacity: typeof style.opacity === "number" ? style.opacity : undefined,
    fontSize: typeof style.fontSize === "number" ? style.fontSize : 11,
    fontWeight:
      typeof style.fontWeight === "string" ? style.fontWeight : undefined,
  }
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
  const { onLayout, size, fontSize } = useChartSize()
  const [active, setActive] = React.useState<number | null>(null)
  const dimmed = readStyle(useResolveClassNames(candleStyle()))
  const faint = readStyle(useResolveClassNames(volumeStyle()))
  const lastLine = readStyle(useResolveClassNames(lastLineStyle()))
  const lastPill = readStyle(useResolveClassNames(lastPillStyle()))
  const lastLabel = readStyle(useResolveClassNames(lastLabelStyle()))

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
  const colors = useChartColors([
    model.directions.up.paint,
    model.directions.down.paint,
  ])
  const dataVersion = React.useMemo(
    () => ({ data, config, volume }),
    [data, config, volume]
  )
  const reveal = useChartReveal(size !== null, animate)
  const candles = useChartTween(
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
    <View
      data-slot="candlestick-chart"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-candlestick-chart flex-col", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {size && !isEmpty && (
          <Svg
            width={size.width}
            height={size.height}
            style={{ position: "absolute" }}
            importantForAccessibility="no-hide-descendants"
          >
            <Defs>
              <ClipPath id={`${id}-plot`}>
                <Rect
                  x={plot.x}
                  y={0}
                  width={plot.width}
                  height={size.height}
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
                position: model.centers[position],
                label: model.labels[position],
              }))}
            />
            <G clipPath={`url(#${id}-plot)`}>
              {shown.map((candle) => {
                const color = getChartColor(candle.paint, colors)
                const body = getCandleBody(candle)
                const bar = getCandleVolume(candle)
                const wick = getCandleWickX(candle)
                return (
                  <G
                    key={candle.id}
                    data-slot="candlestick-chart-candle"
                    opacity={candle.isLeaving ? (dimmed.opacity ?? 0.25) : 1}
                  >
                    {bar && (
                      <Rect
                        data-slot="candlestick-chart-volume"
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        fill={color}
                        opacity={faint.opacity ?? 0.3}
                      />
                    )}
                    <Line
                      data-slot="candlestick-chart-wick"
                      x1={wick}
                      x2={wick}
                      y1={candle.high}
                      y2={candle.low}
                      stroke={color}
                      strokeWidth={1}
                    />
                    <Rect
                      data-slot="candlestick-chart-body"
                      x={body.x}
                      y={body.y}
                      width={body.width}
                      height={body.height}
                      fill={color}
                    />
                  </G>
                )
              })}
            </G>
            {mark && (
              <G data-slot="candlestick-chart-last-close">
                <Line
                  x1={plot.x}
                  x2={mark.pill.x}
                  y1={mark.y}
                  y2={mark.y}
                  stroke={lastLine.color}
                  strokeWidth={1}
                  strokeDasharray={[2, 3]}
                />
                <Rect
                  x={mark.pill.x}
                  y={mark.pill.y}
                  width={mark.pill.width}
                  height={mark.pill.height}
                  rx={mark.pill.height / 2}
                  fill={lastPill.backgroundColor}
                />
                <SvgText
                  x={mark.pill.x + mark.pill.width / 2}
                  y={
                    mark.pill.y +
                    mark.pill.height / 2 +
                    lastLabel.fontSize * 0.35
                  }
                  fill={lastLabel.color}
                  fontSize={lastLabel.fontSize}
                  fontWeight={lastLabel.fontWeight}
                  fontFamily="Inter"
                  textAnchor="middle"
                >
                  {mark.label}
                </SvgText>
              </G>
            )}
          </Svg>
        )}
        {activeIndex !== null && (
          <ChartCrosshair
            x={model.centers[activeIndex]}
            top={plot.y}
            bottom={plot.y + plot.height}
          />
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
      </View>
      {legend && (
        <View
          data-slot="candlestick-chart-legend"
          accessibilityLabel="Candles"
          className="cn-candlestick-chart-legend flex-row flex-wrap items-center"
        >
          {DIRECTIONS.map((direction) => (
            <View
              key={direction}
              data-slot="candlestick-chart-legend-item"
              className="cn-candlestick-chart-legend-item flex-row items-center"
            >
              <View
                data-slot="candlestick-chart-legend-key"
                className="cn-candlestick-chart-legend-key"
                style={{
                  backgroundColor: getChartColor(
                    model.directions[direction].paint,
                    colors
                  ),
                }}
              />
              <Text className="cn-candlestick-chart-legend-label">
                {model.directions[direction].label}
              </Text>
            </View>
          ))}
        </View>
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { CandlestickChart, type CandlestickChartProps }
