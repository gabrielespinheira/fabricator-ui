import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, { G, Path } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  getRadialAnchor,
  getRadialArcPath,
  getRadialCenterFontSize,
  getRadialCenterText,
  getRadialChartModel,
  getRadialParts,
  getRadialRingAt,
  getRadialSeries,
  getRadialTable,
  getRadialTooltip,
  interpolateRadialRings,
  type RadialRing,
  type RadialShape,
} from "@/registry/fabricator/shared/lib/chart-radial-model"
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
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

// Progress of a few values against their target as concentric rings, from
// the website's model: a faint track with the value swept over it, round a
// full circle or a half gauge. The arcs sweep from zero once the plot has a
// size; the ring under the finger stays lit while the others fade back.

// Read as styles and drawn into SVG: the dimmed opacity and the track.
const radialRingStyle = cva("cn-radial-chart-ring")
const radialTrackStyle = cva("cn-radial-chart-track")

type RadialChartProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  nameKey?: keyof TDatum & string
  valueKey?: keyof TDatum & string
  max?: number
  maxKey?: keyof TDatum & string
  config?: ChartConfig
  label: string
  shape?: RadialShape
  centerLabel?: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 240, height: 240 }
const NO_RINGS: RadialRing[] = []
const NO_CONFIG: ChartConfig = {}

function RadialChart<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  max,
  maxKey,
  config = NO_CONFIG,
  label,
  shape = "full",
  centerLabel,
  formatValue,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: RadialChartProps<TDatum>) {
  const { onLayout, size } = useChartSize()
  const [active, setActive] = React.useState<number | null>(null)
  const ring = useResolveClassNames(radialRingStyle())
  const dimmedOpacity = typeof ring.opacity === "number" ? ring.opacity : 0.4
  const track = useResolveClassNames(radialTrackStyle())
  const trackColor = typeof track.color === "string" ? track.color : undefined

  const parts = React.useMemo(
    () => getRadialParts({ data, nameKey, valueKey, config }),
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
      getRadialChartModel({
        data,
        nameKey,
        valueKey,
        max,
        maxKey,
        config,
        size: size ?? FALLBACK_SIZE,
        shape,
        hidden,
      }),
    [data, nameKey, valueKey, max, maxKey, config, size, shape, hidden]
  )
  const dataVersion = React.useMemo(
    () => ({ data, nameKey, valueKey, max, maxKey, config, shape, hidden }),
    [data, nameKey, valueKey, max, maxKey, config, shape, hidden]
  )
  const reveal = useChartReveal(size !== null, animate)
  const rings = useChartTween(
    size ? model.rings : NO_RINGS,
    interpolateRadialRings,
    animate ? dataVersion : null
  )

  const activeIndex =
    active !== null && active < model.rings.length ? active : null
  const highlighted =
    activeIndex === null ? spotlight : model.rings[activeIndex].id
  const content =
    activeIndex === null
      ? null
      : getRadialTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getRadialTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    if (!onActiveChange) return
    const current = next === null ? null : model.rings[next]
    const row = parts.find((part) => part.id === current?.id)?.row
    onActiveChange(
      row === undefined
        ? null
        : { index: row, datum: data[row], key: current?.id }
    )
  }

  const isEmpty = parts.length === 0
  const showLegend = legend ?? parts.length > 1
  const centerText = centerLabel ?? getRadialCenterText(model)
  const centerFontSize = getRadialCenterFontSize(model, centerText)
  const isHalf = shape === "half"
  const centerHeight = centerFontSize * 1.3

  return (
    <View
      data-slot="radial-chart"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-radial-chart flex-col items-center", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-shape={shape}
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot cn-radial-chart-plot relative"
      >
        {size && !isEmpty && (
          <Svg
            width={size.width}
            height={size.height}
            style={{ position: "absolute" }}
            importantForAccessibility="no-hide-descendants"
          >
            <G x={model.center.x} y={model.center.y}>
              {rings.map((item, position) => {
                const amount = getStaggeredProgress(
                  reveal,
                  position,
                  rings.length
                )
                const isDimmed =
                  (highlighted !== null && item.id !== highlighted) ||
                  item.isLeaving === true
                return (
                  <G
                    key={item.id}
                    data-slot="radial-chart-ring"
                    opacity={isDimmed ? dimmedOpacity : 1}
                  >
                    <Path
                      data-slot="radial-chart-track"
                      d={getRadialArcPath(model, item, 1)}
                      fill={trackColor}
                    />
                    <Path
                      data-slot="radial-chart-value"
                      d={getRadialArcPath(model, item, item.share * amount)}
                      fill={getChartColor(item.paint, colors)}
                    />
                  </G>
                )
              })}
            </G>
          </Svg>
        )}
        {size && !isEmpty && centerText !== "" && (
          <View
            data-slot="radial-chart-center"
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            className="absolute items-center justify-center"
            style={{
              left: model.center.x - model.holeRadius * 0.8,
              top: isHalf
                ? model.center.y - centerHeight
                : model.center.y - centerHeight / 2,
              width: model.holeRadius * 1.6,
              height: centerHeight,
            }}
          >
            <Text
              numberOfLines={1}
              className="cn-radial-chart-center"
              style={{ fontSize: centerFontSize, lineHeight: centerHeight }}
            >
              {centerText}
            </Text>
          </View>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && activeIndex !== null && (
          <ChartTooltip
            content={content}
            anchor={getRadialAnchor(model, activeIndex)}
            frame={size}
            colors={colors}
          />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={model.rings.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getRadialRingAt(model, point)}
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
      {showLegend && (
        <ChartLegend
          className="justify-center"
          series={getRadialSeries(model)}
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

export { RadialChart, type RadialChartProps }
