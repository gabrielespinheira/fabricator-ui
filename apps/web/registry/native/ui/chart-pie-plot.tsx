import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native"
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  areChartMarksPropsEqual,
  formatChartNumber,
  formatChartPercent,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  getDonutCenterFontSize,
  getPieChartModel,
  getPieListRows,
  getPieParts,
  getPieSeries,
  getPieSliceAnchor,
  getPieSliceAt,
  getPieSliceOverlap,
  getPieSlicePath,
  getPieTable,
  getPieTooltip,
  getSliceOffset,
  interpolatePieSlices,
  PIE_LIFT,
  sweepPieSlices,
  type PieChartModel,
  type PieSlice,
  type PieVariant,
} from "@/registry/fabricator/shared/lib/chart-pie-model"
import { useMotion } from "@/registry/native/lib/motion"
import {
  ChartDataTable,
  ChartDimmable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartRevealFade,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartDrawOrder,
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
/** Wide enough for the list to sit beside the ring, as the website's 28rem. */
const ROW_WIDTH = 448

function readColor(style: { color?: unknown }) {
  return typeof style.color === "string" ? style.color : undefined
}

const AnimatedG = Animated.createAnimatedComponent(G)

/**
 * A slice's group, lifted out along its middle angle while it is the one
 * inspected. The lift glides on the UI thread, on the glide role as the
 * website's does, so a finger crossing slices never re-renders the pie.
 * Reduce Motion keeps the lift and drops its travel.
 */
function ChartPieSliceGroup({
  lift,
  isLifted,
  isAnimated,
  isDimmed,
  dimmedOpacity,
  children,
}: {
  /** The full lift, in px, along the slice's middle angle. */
  lift: { x: number; y: number }
  isLifted: boolean
  isAnimated: boolean
  isDimmed: boolean
  dimmedOpacity: number
  children: React.ReactNode
}) {
  const glide = useMotion("glide")
  const amount = useSharedValue(isLifted ? 1 : 0)
  const liftX = useSharedValue(lift.x)
  const liftY = useSharedValue(lift.y)
  React.useEffect(() => {
    liftX.set(lift.x)
    liftY.set(lift.y)
  }, [lift.x, lift.y, liftX, liftY])
  React.useEffect(() => {
    const target = isLifted ? 1 : 0
    if (!isAnimated || glide.isReduced || glide.isOff) {
      amount.set(target)
      return
    }
    amount.set(
      withTiming(target, {
        duration: glide.enterMs,
        easing: glide.enterEasing,
      })
    )
  }, [isLifted, isAnimated, amount, glide])
  // react-native-svg moves a group by its native matrix, [a, b, c, d, tx,
  // ty]: x and y props are turned into it in JS, so they can't animate here.
  const animatedProps = useAnimatedProps<
    React.ComponentProps<typeof G> & { matrix?: number[] }
  >(() => ({
    matrix: [
      1,
      0,
      0,
      1,
      liftX.get() * amount.get(),
      liftY.get() * amount.get(),
    ],
  }))
  return (
    <AnimatedG data-slot="chart-slice" animatedProps={animatedProps}>
      <ChartDimmable isDimmed={isDimmed} dimmedOpacity={dimmedOpacity}>
        {children}
      </ChartDimmable>
    </AnimatedG>
  )
}

/**
 * The slices, memoized so the renders a scrub's tooltip triggers skip them;
 * only a change of the lit slice or the geometry draws them again.
 */
const ChartPieMarks = React.memo(function ChartPieMarks({
  slices,
  model,
  highlighted,
  canLift,
  isSettled,
  colors,
  dimmedOpacity,
  pillColor,
  labelColor,
  labelWeight,
  fontSize,
  animate,
}: {
  slices: readonly PieSlice[]
  model: PieChartModel
  highlighted: string | null
  canLift: boolean
  isSettled: boolean
  colors: Record<string, string>
  dimmedOpacity: number
  pillColor: string | undefined
  labelColor: string | undefined
  labelWeight: string
  fontSize: number
  animate: boolean
}) {
  return (
    <>
      {slices.map((slice) => {
        const isActive = slice.id === highlighted
        const lift =
          canLift && !slice.isLeaving
            ? getSliceOffset(slice, PIE_LIFT)
            : { x: 0, y: 0 }
        const isDimmed =
          (highlighted !== null && !isActive) || slice.isLeaving === true
        const box = isSettled ? slice.labelBox : null
        return (
          <ChartPieSliceGroup
            key={slice.id}
            lift={lift}
            isLifted={isActive}
            isAnimated={animate}
            isDimmed={isDimmed}
            dimmedOpacity={dimmedOpacity}
          >
            <Path
              d={getPieSlicePath(model, slice)}
              fill={getChartColor(slice.paint, colors)}
              stroke={getChartColor(slice.paint, colors)}
              // Translucent outlines would show as lines where they overlap.
              strokeWidth={isDimmed ? 0 : getPieSliceOverlap(model, slice)}
              strokeLinejoin="round"
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
                  fontWeight={labelWeight}
                  textAnchor="middle"
                >
                  {box.text}
                </SvgText>
              </G>
            )}
          </ChartPieSliceGroup>
        )
      })}
    </>
  )
}, areChartMarksPropsEqual)

/** A row's share bar: it opens with the ring, then moves with the data. */
function DonutListBar({
  share,
  color,
  isDrawn,
  isSettled,
}: {
  share: number
  color: string
  isDrawn: boolean
  isSettled: boolean
}) {
  const revealMotion = useMotion("reveal")
  const moveMotion = useMotion("move")
  const width = useSharedValue(0)
  React.useEffect(() => {
    if (!isDrawn) return
    const timing = isSettled ? moveMotion : revealMotion
    width.set(
      timing.isOff
        ? share
        : withTiming(share, {
            duration: timing.enterMs,
            easing: isSettled ? timing.moveEasing : timing.enterEasing,
          })
    )
  }, [share, isDrawn, isSettled, moveMotion, revealMotion, width])
  const animated = useAnimatedStyle(() => ({
    width: `${width.get() * 100}%`,
  }))
  return (
    <Animated.View
      className="cn-donut-chart-list-bar-fill h-full"
      style={[{ backgroundColor: color }, animated]}
    />
  )
}

function getSliceId(slice: PieSlice) {
  return slice.id
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
  const labelWeight =
    typeof labelText.fontWeight === "string" ? labelText.fontWeight : "500"
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
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  const target = size ? model.slices : NO_SLICES
  const tweened = useChartTween(
    target,
    interpolatePieSlices,
    animate ? dataVersion : null
  )
  const slices = sweepPieSlices(tweened, reveal)
  const drawnSlices = useChartDrawOrder(slices, getSliceId)
  const isSettled = tweened === target && reveal >= 1

  const activeIndex =
    active !== null && active < model.slices.length ? active : null
  const activeSlice = activeIndex === null ? null : model.slices[activeIndex]
  const highlighted = activeSlice?.id ?? spotlight
  const content =
    activeIndex === null ? null : getPieTooltip(model, activeIndex, formatValue)
  // The tooltip points at the slice as drawn now, so during a morph it
  // travels with the slice instead of arriving first.
  const targetSlice = activeIndex === null ? null : model.slices[activeIndex]
  const anchor = targetSlice
    ? getPieSliceAnchor(
        model,
        slices.find(
          (slice) => slice.id === targetSlice.id && !slice.isLeaving
        ) ?? targetSlice
      )
    : null
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
          ref={plotRef}
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
            <ChartRevealFade isReady={size !== null} enabled={animate}>
              <Svg
                width={size.width}
                height={size.height}
                style={{ position: "absolute" }}
                importantForAccessibility="no-hide-descendants"
              >
                <G x={model.center.x} y={model.center.y}>
                  <ChartPieMarks
                    slices={drawnSlices}
                    model={model}
                    highlighted={highlighted}
                    canLift={canLift}
                    isSettled={isSettled}
                    colors={colors}
                    dimmedOpacity={dimmedOpacity}
                    pillColor={pillColor}
                    labelColor={labelColor}
                    labelWeight={labelWeight}
                    fontSize={fontSize}
                    animate={animate}
                  />
                </G>
              </Svg>
            </ChartRevealFade>
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
          {showTooltip && size && content && anchor && (
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
                  <DonutListBar
                    share={row.share}
                    color={getChartColor(row.paint, colors)}
                    isDrawn={reveal > 0}
                    isSettled={reveal >= 1}
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
