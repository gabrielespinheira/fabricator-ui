import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { ScrollView, View, type ViewProps } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"
import Svg, { G, Rect, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import { CHART_LABEL_GAP } from "@/registry/fabricator/shared/lib/chart-cartesian-model"
import {
  getHeatCalendarIndexAt,
  getHeatCalendarModel,
  getHeatCalendarTable,
  getHeatCalendarTooltip,
  interpolateHeatCells,
  readHeatCalendarDate,
  type HeatCalendarRange,
  type HeatCell,
} from "@/registry/fabricator/shared/lib/chart-heat-calendar-model"
import {
  getStaggeredProgress,
  type ChartActive,
  type ChartColor,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartAxis,
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartReveal,
  useChartSize,
  useChartTween,
  useFadeIn,
  useGlide,
} from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

// A value per day over months, from the website's model: a grid of weeks by
// weekdays in five levels. On a phone the grid scrolls sideways, opening on
// the latest week, while the weekday names stay put. A tap lifts a day and
// shows its value; a press and hold scrubs, since a sideways drag scrolls.

// The empty day's colour and opacity, and the month labels', read as
// styles and drawn into SVG.
const heatCalendarCellStyle = cva("cn-heat-calendar-cell")
const heatCalendarMonthStyle = cva("cn-chart-axis")

/** The inspected day: its row in the data when it has one. */
type HeatCalendarActive<TDatum extends ChartDatum> = Omit<
  ChartActive<TDatum>,
  "datum"
> & {
  /** The day as `yyyy-MM-dd`. */
  date: string
  value: number | null
  /** The first row on the day, if any. */
  datum?: TDatum
}

type HeatCalendarProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  dateKey?: string
  valueKey?: string
  label: string
  range?: HeatCalendarRange
  weekStartsOn?: 0 | 1
  thresholds?: number[]
  color?: ChartColor
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: HeatCalendarActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 360, height: 0 }
const NO_CELLS: HeatCell[] = []
const KEY_CELL = 10
const REVEAL_SCALE = 0.4
/** A finger needs larger cells than a pointer before the grid scrolls. */
const MIN_CELL = 11
const LIFT_SCALE = 1.25

function useStableRange(range: HeatCalendarRange | undefined) {
  const start = range ? readHeatCalendarDate(range.start)?.getTime() : undefined
  const end = range ? readHeatCalendarDate(range.end)?.getTime() : undefined
  return React.useMemo(
    () =>
      start === undefined || end === undefined
        ? undefined
        : { start: new Date(start), end: new Date(end) },
    [start, end]
  )
}

function useStableThresholds(thresholds: number[] | undefined) {
  const key = thresholds?.length ? thresholds.join(",") : undefined
  return React.useMemo(() => key?.split(",").map(Number), [key])
}

function readNumber(style: object, key: "opacity" | "fontSize") {
  const value = (style as Record<string, unknown>)[key]
  return typeof value === "number" ? value : undefined
}

function readColor(style: object) {
  const value = (style as Record<string, unknown>).color
  return typeof value === "string" ? value : undefined
}

/**
 * The inspected day, lifted: a copy of the cell a quarter larger, ringed in
 * the surface, that glides from day to day.
 */
function HeatCalendarLift({
  cell,
  radius,
  empty,
  color,
}: {
  cell: HeatCell
  radius: number
  empty: { color?: string; opacity: number }
  color: string
}) {
  const x = useGlide(cell.x - 2)
  const y = useGlide(cell.y - 2)
  const opacity = useFadeIn()
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: LIFT_SCALE },
    ],
  }))
  return (
    <Animated.View
      data-slot="heat-calendar-lift"
      pointerEvents="none"
      className="cn-heat-calendar-lift absolute top-0 left-0"
      style={[{ width: cell.size + 4, height: cell.size + 4 }, animated]}
    >
      <View className="cn-heat-calendar-lift-mark flex-1">
        <View
          className="cn-heat-calendar-lift-ring absolute inset-0"
          style={{ borderRadius: radius + 2 }}
        />
        <View
          className="absolute top-0.5 left-0.5"
          style={{
            width: cell.size,
            height: cell.size,
            borderRadius: radius,
            backgroundColor: empty.color,
            opacity: empty.opacity,
          }}
        />
        <View
          className="cn-heat-calendar-lift-level absolute top-0.5 left-0.5"
          style={{
            width: cell.size,
            height: cell.size,
            borderRadius: radius,
            backgroundColor: color,
            opacity: cell.opacity,
          }}
        />
      </View>
    </Animated.View>
  )
}

function HeatCalendar<TDatum extends ChartDatum>({
  data,
  dateKey = "date",
  valueKey = "value",
  label,
  range,
  weekStartsOn = 1,
  thresholds,
  color,
  formatValue,
  legend = true,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: HeatCalendarProps<TDatum>) {
  const { onLayout, size, fontSize } = useChartSize()
  const scrollRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  const scrollOffset = React.useRef(0)
  const [active, setActive] = React.useState<{
    index: number
    offset: number
  } | null>(null)
  const emptyStyle = useResolveClassNames(heatCalendarCellStyle())
  const monthStyle = useResolveClassNames(heatCalendarMonthStyle())
  const emptyCell = {
    color: readColor(emptyStyle),
    opacity: readNumber(emptyStyle, "opacity") ?? 0.08,
  }
  const monthFontSize = readNumber(monthStyle, "fontSize") ?? 11

  const stableRange = useStableRange(range)
  const stableThresholds = useStableThresholds(thresholds)
  const model = React.useMemo(
    () =>
      getHeatCalendarModel({
        data,
        dateKey,
        valueKey,
        range: stableRange,
        weekStartsOn,
        thresholds: stableThresholds,
        color,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        minCell: MIN_CELL,
      }),
    [
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
      size,
      fontSize,
    ]
  )
  const colors = useChartColors([model.paint])
  const paint = getChartColor(model.paint, colors)
  const dataVersion = React.useMemo(
    () => ({
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
    }),
    [
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
    ]
  )
  const reveal = useChartReveal(size !== null, animate)
  const cells = useChartTween(
    size ? model.cells : NO_CELLS,
    interpolateHeatCells,
    animate ? dataVersion : null
  )

  const activeCell =
    active !== null && active.index < model.cells.length
      ? model.cells[active.index]
      : null
  const content =
    activeCell === null
      ? null
      : getHeatCalendarTooltip(model, activeCell.index, formatValue, valueKey)
  const table = React.useMemo(
    () => getHeatCalendarTable(model, formatValue, valueKey),
    [model, formatValue, valueKey]
  )

  const inspect = (next: number | null) => {
    const cell = next === null ? undefined : model.cells[next]
    // A day VoiceOver steps to out of sight scrolls into it.
    const room = (size?.width ?? 0) - model.gutter
    if (cell && room > 0) {
      const end = cell.x + cell.size + model.gap
      const offset =
        end > scrollOffset.current + room
          ? end - room
          : cell.x - model.gap < scrollOffset.current
            ? cell.x - model.gap
            : null
      if (offset !== null) {
        scrollOffset.current = offset
        scrollRef.current?.scrollTo({ x: offset, animated: false })
      }
    }
    setActive(
      next === null ? null : { index: next, offset: scrollOffset.current }
    )
    if (!onActiveChange) return
    if (!cell) {
      onActiveChange(null)
      return
    }
    onActiveChange({
      index: cell.index,
      date: cell.id,
      value: cell.value,
      datum: cell.datumIndex === null ? undefined : data[cell.datumIndex],
    })
  }

  const isEmpty = model.cells.length === 0
  const anchor =
    activeCell && active
      ? {
          x: model.gutter + activeCell.x + activeCell.size / 2 - active.offset,
          y: activeCell.y,
        }
      : null
  const keyCell = Math.min(KEY_CELL, model.cellSize)

  return (
    <View
      data-slot="heat-calendar"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-heat-calendar flex-col", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-loading={loading}
        data-empty={isEmpty}
        onLayout={onLayout}
        className="cn-chart-plot cn-heat-calendar-plot relative flex-row"
        style={isEmpty ? undefined : { height: model.height }}
      >
        {size && !isEmpty && (
          <Svg
            data-slot="heat-calendar-weekdays"
            width={model.gutter}
            height={model.height}
            importantForAccessibility="no-hide-descendants"
          >
            <ChartAxis
              side="start"
              offset={model.gutter - CHART_LABEL_GAP}
              ticks={model.weekdayLabels.map((item) => ({
                position: item.y,
                label: item.label,
              }))}
            />
          </Svg>
        )}
        {!isEmpty && (
          <ScrollView
            ref={scrollRef}
            horizontal
            data-slot="heat-calendar-scroll"
            className="cn-heat-calendar-scroll flex-1"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.x
            }}
            onScrollBeginDrag={() => inspect(null)}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            <View style={{ width: model.width, height: model.height }}>
              {size && (
                <Svg
                  width={model.width}
                  height={model.height}
                  style={{ position: "absolute" }}
                  importantForAccessibility="no-hide-descendants"
                >
                  <G data-slot="heat-calendar-months">
                    {model.monthLabels.map((month) => (
                      <SvgText
                        key={`${month.label}-${month.x}`}
                        x={month.x}
                        y={monthFontSize * 0.9}
                        fill={readColor(monthStyle)}
                        fontSize={monthFontSize}
                        fontFamily="Inter"
                      >
                        {month.label}
                      </SvgText>
                    ))}
                  </G>
                  {cells.map((cell) => {
                    const amount = getStaggeredProgress(
                      reveal,
                      cell.week + cell.day,
                      model.columns + 6,
                      0.5
                    )
                    const scale = REVEAL_SCALE + (1 - REVEAL_SCALE) * amount
                    const side = cell.size * scale
                    const inset = (cell.size - side) / 2
                    const shown = amount * cell.presence
                    const radius = model.radius * scale
                    return (
                      <React.Fragment key={cell.id}>
                        <Rect
                          data-slot="heat-calendar-cell"
                          x={cell.x + inset}
                          y={cell.y + inset}
                          width={side}
                          height={side}
                          rx={radius}
                          fill={emptyCell.color}
                          fillOpacity={emptyCell.opacity * shown}
                        />
                        {cell.opacity > 0 && (
                          <Rect
                            data-slot="heat-calendar-level"
                            x={cell.x + inset}
                            y={cell.y + inset}
                            width={side}
                            height={side}
                            rx={radius}
                            fill={paint}
                            fillOpacity={cell.opacity * shown}
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                </Svg>
              )}
              {activeCell && (
                <HeatCalendarLift
                  cell={activeCell}
                  radius={model.radius}
                  empty={emptyCell}
                  color={paint}
                />
              )}
              <ChartInspector
                label={label}
                count={model.cells.length}
                active={activeCell?.index ?? null}
                onActiveChange={inspect}
                getIndexAt={(point) => getHeatCalendarIndexAt(model, point)}
                scrub="hold"
                valueText={content?.title}
              />
            </View>
          </ScrollView>
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
      </View>
      {!isEmpty && (
        <View
          data-slot="heat-calendar-footer"
          className="cn-heat-calendar-footer flex-row flex-wrap items-center justify-between"
          style={{ maxWidth: model.gutter + model.width }}
        >
          <Text
            data-slot="heat-calendar-range"
            numberOfLines={1}
            className="cn-heat-calendar-footer-text"
          >
            {model.rangeLabel}
          </Text>
          {legend && (
            <View
              data-slot="heat-calendar-key"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              className="cn-heat-calendar-key flex-row items-center"
            >
              <Text className="cn-heat-calendar-key-text">Less</Text>
              <Svg
                width={model.levels.length * (keyCell + model.gap) - model.gap}
                height={keyCell}
              >
                {model.levels.map((level, position) => (
                  <React.Fragment key={level.level}>
                    <Rect
                      x={position * (keyCell + model.gap)}
                      width={keyCell}
                      height={keyCell}
                      rx={2}
                      fill={emptyCell.color}
                      fillOpacity={emptyCell.opacity}
                    />
                    <Rect
                      x={position * (keyCell + model.gap)}
                      width={keyCell}
                      height={keyCell}
                      rx={2}
                      fill={paint}
                      fillOpacity={level.opacity}
                    />
                  </React.Fragment>
                ))}
              </Svg>
              <Text className="cn-heat-calendar-key-text">More</Text>
            </View>
          )}
        </View>
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { HeatCalendar, type HeatCalendarActive, type HeatCalendarProps }
