import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native"
import Animated from "react-native-reanimated"
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  formatChartNumber,
  formatChartPercent,
  interpolateNumber,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  getDonutCenterFontSize,
  getPieAnchor,
  getPieChartModel,
  getPieListRows,
  getPieParts,
  getPieSeries,
  getPieSliceAt,
  getPieSlicePath,
  getPieTable,
  getPieTooltip,
  getSliceOffset,
  interpolatePieSlices,
  PIE_LIFT,
  sweepPieSlices,
  type PieSlice,
  type PieVariant,
} from "@/registry/fabricator/shared/lib/chart-pie-model"
import { useMotion } from "@/registry/native/lib/motion"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartLegendState,
  useChartReveal,
  useChartTween,
} from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

// The plot Pie Chart and Donut Chart share, drawn from the website's model:
// slices clockwise from 12 o'clock that sweep in once the plot has a size, a
// lift and a spotlight for the slice under the finger, the tooltip and the
// legend. A donut adds its total in the centre and a value list beside the
// ring on a wide screen, under it on a phone.

// Read as styles and drawn into SVG: the dimmed opacity, the label's size,
// its pill and its text.
const chartSliceStyle = cva("cn-chart-slice")
const chartSliceLabelStyle = cva("cn-chart-slice-label")
const chartSliceLabelPillStyle = cva("cn-chart-slice-label-pill")
const chartSliceLabelTextStyle = cva("cn-chart-slice-label-text")

type ChartPiePlotProps<TDatum extends ChartDatum> = {
  variant: PieVariant
  data: readonly TDatum[]
  nameKey?: keyof TDatum & string
  valueKey?: keyof TDatum & string
  config?: ChartConfig
  label: string
  labels?: boolean
  centerLabel?: string
  list?: boolean
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const NO_SLICES: PieSlice[] = []
const NO_CONFIG: ChartConfig = {}
const NO_LIFT: Record<string, number> = {}
/** Wide enough for the list to sit beside the ring, as the website's 28rem. */
const ROW_WIDTH = 448

function readColor(style: { color?: unknown }) {
  return typeof style.color === "string" ? style.color : undefined
}

function interpolateLift(
  from: Record<string, number>,
  to: Record<string, number>,
  progress: number
) {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)])
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      interpolateNumber(from[key] ?? 0, to[key] ?? 0, progress),
    ])
  )
}

function ChartPiePlot<TDatum extends ChartDatum>({
  variant,
  data,
  nameKey = "name",
  valueKey = "value",
  config = NO_CONFIG,
  label,
  labels = false,
  centerLabel = "Total",
  list = false,
  formatValue,
  legend,
  tooltip,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  onLayout,
  ...props
}: ChartPiePlotProps<TDatum>) {
  const [size, setSize] = React.useState<{
    width: number
    height: number
  } | null>(null)
  const [width, setWidth] = React.useState(0)
  const [active, setActive] = React.useState<number | null>(null)
  const dimmed = useResolveClassNames(chartSliceStyle())
  const dimmedOpacity =
    typeof dimmed.opacity === "number" ? dimmed.opacity : 0.4
  const labelStyle = useResolveClassNames(chartSliceLabelStyle())
  const fontSize =
    typeof labelStyle.fontSize === "number" ? labelStyle.fontSize : 11
  const pillColor = readColor(useResolveClassNames(chartSliceLabelPillStyle()))
  const labelText = useResolveClassNames(chartSliceLabelTextStyle())
  const labelColor = readColor(labelText)
  const feedback = useMotion("feedback")

  const parts = React.useMemo(
    () => getPieParts({ data, nameKey, valueKey, config }),
    [data, nameKey, valueKey, config]
  )
  const partConfig = React.useMemo(
    () =>
      Object.fromEntries(parts.map((part) => [part.id, { label: part.label }])),
    [parts]
  )
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(partConfig)
  const colors = useChartColors(parts.map((part) => part.paint))

  const model = React.useMemo(
    () =>
      getPieChartModel({
        data,
        nameKey,
        valueKey,
        config,
        size: size ?? { width: 240, height: 240 },
        fontSize,
        variant,
        hidden,
        labels,
      }),
    [data, nameKey, valueKey, config, size, fontSize, variant, hidden, labels]
  )
  const dataVersion = React.useMemo(
    () => ({ data, nameKey, valueKey, config, hidden }),
    [data, nameKey, valueKey, config, hidden]
  )
  const reveal = useChartReveal(size !== null, animate)
  const target = size ? model.slices : NO_SLICES
  const tweened = useChartTween(
    target,
    interpolatePieSlices,
    animate ? dataVersion : null
  )
  const slices = sweepPieSlices(tweened, reveal)
  const isSettled = tweened === target && reveal >= 1

  const activeIndex =
    active !== null && active < model.slices.length ? active : null
  const activeSlice = activeIndex === null ? null : model.slices[activeIndex]
  const highlighted = activeSlice?.id ?? spotlight
  // The lifted slice eases out and back, as the website's glides.
  const liftTarget = React.useMemo(
    () => (highlighted ? { [highlighted]: 1 } : NO_LIFT),
    [highlighted]
  )
  const lift = useChartTween(
    liftTarget,
    interpolateLift,
    animate ? highlighted : null
  )
  const content =
    activeIndex === null ? null : getPieTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getPieTable(model, formatValue),
    [model, formatValue]
  )
  const format = formatValue ?? ((value: number) => formatChartNumber(value))

  const inspect = (next: number | null) => {
    setActive(next)
    if (!onActiveChange) return
    const slice = next === null ? null : model.slices[next]
    const row = parts.find((part) => part.id === slice?.id)?.rows[0]
    onActiveChange(
      row === undefined
        ? null
        : { index: row, datum: data[row], key: slice?.id }
    )
  }

  const isDonut = variant === "donut"
  const showTooltip = tooltip ?? !isDonut
  const isEmpty = parts.length === 0
  const canLift = model.slices.length > 1
  const hasList = isDonut && list && parts.length > 0
  const layout = hasList && width >= ROW_WIDTH ? "row" : "column"
  const showLegend = legend ?? (!hasList && parts.length > 1)
  const listRows = hasList ? getPieListRows(model, formatValue) : []
  const centerTexts = [
    format(model.total, valueKey),
    ...model.slices.map((slice) => format(slice.value, valueKey)),
  ]
  const centerFontSize = getDonutCenterFontSize(model.innerRadius, centerTexts)
  const fade = feedback.isOff ? 0 : feedback.enterMs

  return (
    <View
      data-loading={loading}
      aria-busy={loading}
      className={cn("flex-col items-center", className)}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width)
        onLayout?.(event)
      }}
      {...props}
    >
      <View
        data-slot="chart-pie-body"
        data-layout={layout}
        className="cn-chart-pie-body w-full flex-col items-center"
      >
        <View
          data-slot="chart-plot"
          data-variant={variant}
          data-layout={layout}
          data-loading={loading}
          onLayout={(event) => {
            const next = event.nativeEvent.layout
            setSize((current) =>
              current?.width === next.width && current.height === next.height
                ? current
                : { width: next.width, height: next.height }
            )
          }}
          className="cn-chart-plot cn-chart-pie-plot relative"
        >
          {size && !isEmpty && (
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: "absolute" }}
              importantForAccessibility="no-hide-descendants"
            >
              <G x={model.center.x} y={model.center.y}>
                {slices.map((slice) => {
                  const isActive = slice.id === highlighted
                  const offset =
                    canLift && !slice.isLeaving
                      ? getSliceOffset(slice, PIE_LIFT * (lift[slice.id] ?? 0))
                      : { x: 0, y: 0 }
                  const isDimmed =
                    (highlighted !== null && !isActive) ||
                    slice.isLeaving === true
                  const box = isSettled ? slice.labelBox : null
                  return (
                    <G
                      key={slice.id}
                      data-slot="chart-slice"
                      x={offset.x}
                      y={offset.y}
                      opacity={isDimmed ? dimmedOpacity : 1}
                    >
                      <Path
                        d={getPieSlicePath(model, slice)}
                        fill={getChartColor(slice.paint, colors)}
                      />
                      {box && (
                        <G data-slot="chart-slice-label">
                          <Rect
                            x={box.x - box.width / 2}
                            y={box.y - box.height / 2}
                            width={box.width}
                            height={box.height}
                            rx={box.height / 2}
                            fill={pillColor}
                          />
                          <SvgText
                            x={box.x}
                            y={box.y + fontSize * 0.35}
                            fill={labelColor}
                            fontSize={fontSize}
                            fontFamily="Inter"
                            fontWeight={
                              typeof labelText.fontWeight === "string"
                                ? labelText.fontWeight
                                : "500"
                            }
                            textAnchor="middle"
                          >
                            {box.text}
                          </SvgText>
                        </G>
                      )}
                    </G>
                  )
                })}
              </G>
            </Svg>
          )}
          {isDonut && size && !isEmpty && (
            <View
              data-slot="donut-chart-center"
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              className="cn-donut-chart-center absolute"
              style={{
                left: model.center.x - model.innerRadius * 0.8,
                top: model.center.y - model.innerRadius * 0.8,
                width: model.innerRadius * 1.6,
                height: model.innerRadius * 1.6,
              }}
            >
              {[null, ...model.slices].map((slice) => {
                const isShown = slice
                  ? slice.id === highlighted
                  : highlighted === null
                return (
                  <Animated.View
                    key={slice?.id ?? "total"}
                    data-active={isShown}
                    className="cn-donut-chart-center-layer absolute inset-0 items-center justify-center"
                    style={{
                      opacity: isShown ? 1 : 0,
                      transitionProperty: "opacity",
                      transitionDuration: fade,
                    }}
                  >
                    <Text
                      data-slot="donut-chart-center-value"
                      numberOfLines={1}
                      className="cn-donut-chart-center-value"
                      style={{
                        fontSize: centerFontSize,
                        lineHeight: centerFontSize * 1.25,
                      }}
                    >
                      {slice
                        ? format(slice.value, valueKey)
                        : format(model.total, valueKey)}
                    </Text>
                    <Text
                      data-slot="donut-chart-center-label"
                      numberOfLines={1}
                      className="cn-donut-chart-center-label"
                    >
                      {slice
                        ? `${slice.label} · ${formatChartPercent(slice.share)}`
                        : centerLabel}
                    </Text>
                  </Animated.View>
                )
              })}
            </View>
          )}
          {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
          {showTooltip && size && content && activeIndex !== null && (
            <ChartTooltip
              content={content}
              anchor={getPieAnchor(model, activeIndex)}
              frame={size}
              colors={colors}
            />
          )}
          {!isEmpty && (
            <ChartInspector
              label={label}
              count={model.slices.length}
              active={activeIndex}
              onActiveChange={inspect}
              getIndexAt={(point) => getPieSliceAt(model, point)}
              valueText={
                content
                  ? `${content.title}: ${content.rows
                      .map((row) => `${row.value}, ${row.label}`)
                      .join(", ")}`
                  : undefined
              }
            />
          )}
        </View>
        {hasList && (
          <View
            data-slot="donut-chart-list"
            data-layout={layout}
            accessibilityLabel={label}
            className="cn-donut-chart-list flex-col"
          >
            {listRows.map((row) => (
              <Pressable
                key={row.id}
                data-slot="donut-chart-list-item"
                data-active={row.id === highlighted}
                accessibilityLabel={`${row.label}: ${row.value}, ${row.shareText}`}
                className="cn-donut-chart-list-item flex-col"
                onPressIn={() => setSpotlight(row.id)}
                onPressOut={() => setSpotlight(null)}
              >
                <View className="cn-donut-chart-list-row flex-row items-center">
                  <View
                    data-slot="donut-chart-list-key"
                    className="cn-donut-chart-list-key shrink-0"
                    style={{
                      backgroundColor: getChartColor(row.paint, colors),
                    }}
                  />
                  <Text
                    data-slot="donut-chart-list-label"
                    numberOfLines={1}
                    className="cn-donut-chart-list-label flex-1"
                  >
                    {row.label}
                  </Text>
                  <Text
                    data-slot="donut-chart-list-share"
                    className="cn-donut-chart-list-share"
                  >
                    {row.shareText}
                  </Text>
                  <Text
                    data-slot="donut-chart-list-value"
                    className="cn-donut-chart-list-value"
                  >
                    {row.value}
                  </Text>
                </View>
                <View
                  data-slot="donut-chart-list-bar"
                  className="cn-donut-chart-list-bar overflow-hidden"
                >
                  <View
                    className="cn-donut-chart-list-bar-fill h-full"
                    style={{
                      width: `${row.share * reveal * 100}%`,
                      backgroundColor: getChartColor(row.paint, colors),
                    }}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {showLegend && (
        <ChartLegend
          className="justify-center"
          series={getPieSeries(model)}
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

export { ChartPiePlot, type ChartPiePlotProps }
