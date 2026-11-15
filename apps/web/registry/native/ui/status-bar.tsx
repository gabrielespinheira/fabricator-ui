import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"
import Svg, { G, Rect } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartDatum,
  type ChartPaint,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  getStatusBarModel,
  getStatusBarTable,
  getStatusBarTooltip,
  interpolateStatusPills,
  type StatusConfig,
  type StatusPill,
} from "@/registry/fabricator/shared/lib/chart-status-bar-model"
import {
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

// Uptime from the website's model: a tall pill per day, coloured by its
// status, with the first and last day, the uptime share and a legend naming
// each status shown. Pills rise in a wave once the bar has a size; the one
// under the finger lifts and glides along as the finger scrubs, while the
// rest dim a little.

// The opacity the other pills take while one is inspected.
const statusBarPillStyle = cva("cn-status-bar-pill")

type StatusBarProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  index: keyof TDatum & string
  statusKey?: string
  noteKey?: string
  statuses?: StatusConfig
  label: string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 32 }
const NO_PILLS: StatusPill[] = []
const RISE = 0.4
const LIFT = { x: 1.25, y: 1.1 }

/** The inspected pill, lifted a little, gliding as the finger scrubs. */
function StatusBarLift({ pill, color }: { pill: StatusPill; color: string }) {
  const x = useGlide(pill.x)
  const opacity = useFadeIn()
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: x.get() },
      { scaleX: LIFT.x },
      { scaleY: LIFT.y },
    ],
  }))
  return (
    <Animated.View
      data-slot="status-bar-lift"
      pointerEvents="none"
      className="cn-status-bar-lift absolute top-0 left-0"
      style={[{ width: pill.width, height: pill.height }, animated]}
    >
      <View
        className="flex-1"
        style={{
          borderRadius: pill.radius,
          backgroundColor: color,
          opacity: pill.opacity,
        }}
      />
    </Animated.View>
  )
}

function StatusBar<TDatum extends ChartDatum>({
  data,
  index,
  statusKey = "status",
  noteKey,
  statuses,
  label,
  formatIndex,
  legend = true,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: StatusBarProps<TDatum>) {
  const { onLayout, size } = useChartSize()
  const [active, setActive] = React.useState<number | null>(null)
  const dimmed = useResolveClassNames(statusBarPillStyle())
  const dimmedOpacity =
    typeof dimmed.opacity === "number" ? dimmed.opacity : 0.6

  const model = React.useMemo(
    () =>
      getStatusBarModel({
        data,
        index,
        statusKey,
        noteKey,
        statuses,
        size: size ?? FALLBACK_SIZE,
        formatIndex,
      }),
    [data, index, statusKey, noteKey, statuses, size, formatIndex]
  )
  const paints = React.useMemo(
    (): ChartPaint[] => model.days.map((day) => day.status.paint),
    [model]
  )
  const colors = useChartColors(paints)
  const dataVersion = React.useMemo(
    () => ({ data, index, statusKey, statuses }),
    [data, index, statusKey, statuses]
  )
  const reveal = useChartReveal(size !== null, animate)
  const pills = useChartTween(
    size ? model.pills : NO_PILLS,
    interpolateStatusPills,
    animate ? dataVersion : null
  )

  const activeIndex =
    active !== null && active < model.pills.length ? active : null
  const activePill = activeIndex === null ? null : model.pills[activeIndex]
  const content =
    activeIndex === null ? null : getStatusBarTooltip(model, activeIndex)
  const table = React.useMemo(() => getStatusBarTable(model), [model])

  const inspect = (next: number | null) => {
    setActive(next)
    const pill = next === null ? undefined : model.pills[next]
    onActiveChange?.(
      pill ? { index: pill.index, datum: data[pill.index] } : null
    )
  }

  const isEmpty = data.length === 0
  const anchor = activePill
    ? { x: activePill.x + activePill.width / 2, y: activePill.y }
    : null

  return (
    <View
      data-slot="status-bar"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-status-bar flex-col", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot cn-status-bar-plot relative"
      >
        {size && !isEmpty && (
          <Svg
            width={size.width}
            height={size.height}
            style={{ position: "absolute" }}
            importantForAccessibility="no-hide-descendants"
          >
            {pills.map((pill) => {
              const amount = getStaggeredProgress(
                reveal,
                pill.index - model.first,
                model.pills.length,
                0.5
              )
              const shown = amount * pill.presence
              const y = pill.y + (1 - amount) * pill.height * RISE
              const isDimmed =
                (activePill !== null && activePill.id !== pill.id) ||
                pill.isLeaving === true
              return (
                <G
                  key={pill.id}
                  data-slot="status-bar-pill"
                  data-status={pill.status}
                  opacity={isDimmed ? dimmedOpacity : 1}
                >
                  <Rect
                    x={pill.x}
                    y={y}
                    width={pill.width}
                    height={pill.height}
                    rx={pill.radius}
                    fill={getChartColor(pill.paint, colors)}
                    fillOpacity={pill.opacity * shown}
                  />
                  {pill.previous && (
                    <Rect
                      x={pill.x}
                      y={y}
                      width={pill.width}
                      height={pill.height}
                      rx={pill.radius}
                      fill={getChartColor(pill.previous.paint, colors)}
                      fillOpacity={pill.previous.opacity * shown}
                    />
                  )}
                </G>
              )
            })}
          </Svg>
        )}
        {activePill && (
          <StatusBarLift
            pill={activePill}
            color={getChartColor(activePill.paint, colors)}
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
            count={model.pills.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getNearestIndex(model.centers, point.x)}
            valueText={
              content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}${content.note ? `. ${content.note}` : ""}`
                : undefined
            }
          />
        )}
      </View>
      {!isEmpty && (
        <View
          data-slot="status-bar-footer"
          className="cn-status-bar-footer flex-row items-center"
        >
          <Text
            data-slot="status-bar-start"
            numberOfLines={1}
            className="cn-status-bar-footer-text flex-1"
          >
            {model.startLabel}
          </Text>
          <Text
            data-slot="status-bar-uptime"
            numberOfLines={1}
            className="cn-status-bar-uptime"
          >
            {model.uptimeLabel}
          </Text>
          <Text
            data-slot="status-bar-end"
            numberOfLines={1}
            className="cn-status-bar-footer-text flex-1 text-right"
          >
            {model.endLabel}
          </Text>
        </View>
      )}
      {legend && model.statuses.length > 0 && (
        <View
          data-slot="status-bar-legend"
          accessibilityLabel="Statuses"
          className="cn-status-bar-legend flex-row flex-wrap items-center"
        >
          {model.statuses.map((status) => (
            <View
              key={status.key}
              data-slot="status-bar-legend-item"
              className="cn-status-bar-legend-item flex-row items-center"
            >
              <View
                data-slot="status-bar-legend-key"
                className="cn-status-bar-legend-key"
                style={{
                  backgroundColor: getChartColor(status.paint, colors),
                  opacity: status.opacity,
                }}
              />
              <Text className="cn-status-bar-legend-text">{status.label}</Text>
            </View>
          ))}
        </View>
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { StatusBar, type StatusBarProps, type StatusConfig }
