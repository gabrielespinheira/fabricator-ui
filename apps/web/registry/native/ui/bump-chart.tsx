import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View, type ViewProps } from "react-native"
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getBumpAnchor,
  getBumpChartModel,
  getBumpLegendValue,
  getBumpPath,
  getBumpRevealAmount,
  getBumpSeriesAt,
  getBumpTable,
  getBumpTooltip,
  interpolateBumpSeries,
  type BumpRanking,
  type BumpSeriesGeometry,
} from "@/registry/fabricator/shared/lib/chart-bump-model"
import {
  getChartSeries,
  getNearestIndex,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
  type ChartPoint,
  type ChartSeries,
} from "@/registry/fabricator/shared/lib/chart-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  ChartAxis,
  ChartCrosshair,
  ChartDataTable,
  ChartDimmable,
  ChartEmpty,
  ChartGrid,
  ChartInspector,
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
import { Text } from "@/registry/native/ui/text"

// Rank over time, who overtook whom, from the website's model: a line per
// series through its rank at every index, a ring holding the rank at each
// point and the series' name past its last one. A finger on a line dims
// the others, as a long press on its legend row does. Lines sweep in from
// the start edge once the plot has a size, the rings appearing as the sweep
// passes them, and points move to their new places when the ranks change.

// The rules drawn into SVG are read as styles: a dimmed series' opacity,
// the rings' fill, and the colour and size of the ranks and names.
const seriesStyle = cva("cn-chart-series")
const ringStyle = cva("cn-bump-chart-ring")
const rankStyle = cva("cn-bump-chart-rank")
const nameStyle = cva("cn-bump-chart-name")

type BumpChartProps<TDatum extends ChartDatum> = {
  /** One row per index, each series' rank or score under its config key. */
  data: readonly TDatum[]
  config: ChartConfig
  index: keyof TDatum & string
  label: string
  /** Ranks as given (1 is the top), or scores ranked per index. */
  ranking?: BumpRanking
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
const NO_SERIES: BumpSeriesGeometry[] = []
const CARD_PAINT = { token: "card" }

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

/**
 * A toggle per series with its latest rank and how it got there: a press
 * hides the series, a long press spotlights it until the finger lifts.
 */
function BumpLegend({
  series,
  geometry,
  hidden,
  onToggle,
  onSpotlight,
  colors,
}: {
  series: readonly ChartSeries[]
  geometry: readonly BumpSeriesGeometry[]
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
  colors: Record<string, string>
}) {
  const feedback = useFeedback()
  return (
    <View
      data-slot="chart-legend"
      accessibilityLabel="Series"
      className="cn-chart-legend flex-row flex-wrap items-center"
    >
      {series.map((item) => {
        const isHidden = hidden.has(item.key)
        const shown = geometry.find((entry) => entry.key === item.key)
        const standing = shown && !isHidden ? getBumpLegendValue(shown) : null
        return (
          <Pressable
            key={item.key}
            data-slot="chart-legend-item"
            data-hidden={isHidden}
            accessibilityRole="button"
            accessibilityState={{ selected: !isHidden }}
            accessibilityLabel={
              standing ? `${item.label}, ${standing}` : item.label
            }
            className="cn-chart-legend-item flex-row items-center"
            onPress={() => {
              feedback(isHidden ? "toggle-on" : "toggle-off")
              onToggle(item.key)
            }}
            onLongPress={() => {
              if (!isHidden) onSpotlight(item.key)
            }}
            onPressOut={() => onSpotlight(null)}
          >
            <View
              data-slot="chart-legend-key"
              data-shape="line"
              data-hidden={isHidden}
              className="cn-chart-legend-key"
              style={
                isHidden
                  ? { borderColor: getChartColor(item.paint, colors) }
                  : { backgroundColor: getChartColor(item.paint, colors) }
              }
            />
            <Text data-hidden={isHidden} className="cn-chart-legend-label">
              {item.label}
            </Text>
            {standing && (
              <Text
                data-slot="bump-chart-standing"
                className="cn-bump-chart-standing"
              >
                {standing}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

function getSeriesKey(item: BumpSeriesGeometry) {
  return item.key
}

function BumpChart<TDatum extends ChartDatum>({
  data,
  config,
  index,
  label,
  ranking = "rank",
  formatValue,
  formatIndex,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: BumpChartProps<TDatum>) {
  const id = toSvgId(React.useId())
  const { onLayout, size, fontSize } = useChartSize()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)
  const [pointed, setPointed] = React.useState<string | null>(null)
  const dimmed = readStyle(useResolveClassNames(seriesStyle()))
  const ring = readStyle(useResolveClassNames(ringStyle()))
  const rank = readStyle(useResolveClassNames(rankStyle()))
  const name = readStyle(useResolveClassNames(nameStyle()))

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const colors = useChartColors([
    ...allSeries.map((item) => item.paint),
    CARD_PAINT,
  ])
  const model = React.useMemo(
    () =>
      getBumpChartModel({
        data,
        config,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        ranking,
        hidden,
        formatIndex,
      }),
    [data, config, index, size, fontSize, ranking, hidden, formatIndex]
  )
  const dataVersion = React.useMemo(
    () => ({ data, config, ranking, hidden }),
    [data, config, ranking, hidden]
  )
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  // Series being shown rise from just under the bottom slot; hidden ones
  // sink there.
  const floor = model.plot.y + model.plot.height + model.radius
  const series = useChartTween(
    size ? model.series : NO_SERIES,
    (from, to, progress) => interpolateBumpSeries(from, to, progress, floor),
    animate ? dataVersion : null
  )
  const drawnSeries = useChartDrawOrder(series, getSeriesKey)

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getBumpTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getBumpTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    if (next === null) setPointed(null)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }
  // The finger picks the index and, on a line, the series it touches.
  const locate = (point: ChartPoint) => {
    // A miss keeps the line last touched, so scrubbing from one line to the
    // next moves the spotlight once instead of blinking.
    const hit = getBumpSeriesAt(model, point)
    if (hit !== null) setPointed(hit)
    return getNearestIndex(model.positions, point.x)
  }

  const { plot, radius } = model
  const isEmpty = data.length === 0
  const showLegend = legend ?? allSeries.length > 1
  const focus = spotlight ?? pointed
  const isDimmed = (item: BumpSeriesGeometry) =>
    (focus !== null && focus !== item.key) || item.isLeaving === true
  const dimmedOpacity = dimmed.opacity ?? 0.4
  const sweep =
    reveal >= 1 ? Number.POSITIVE_INFINITY : (size?.width ?? 0) * reveal
  const ringFill = ring.backgroundColor ?? getChartColor(CARD_PAINT, colors)
  const anchor =
    activeIndex === null ? null : getBumpAnchor(model, activeIndex, pointed)

  return (
    <View
      data-slot="bump-chart"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-bump-chart flex-col", className)}
      {...props}
    >
      <View
        ref={plotRef}
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {activeIndex !== null && (
          <ChartCrosshair
            x={model.positions[activeIndex]}
            top={plot.y - radius}
            bottom={plot.y + plot.height + radius}
          />
        )}
        {size && !isEmpty && (
          <ChartRevealFade isReady={size !== null} enabled={animate}>
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: "absolute" }}
              importantForAccessibility="no-hide-descendants"
            >
              <Defs>
                <ClipPath id={`${id}-reveal`}>
                  <Rect
                    x={0}
                    y={-8}
                    width={Number.isFinite(sweep) ? sweep : size.width + 16}
                    height={size.height + 16}
                  />
                </ClipPath>
              </Defs>
              <ChartGrid
                ticks={model.slots}
                start={plot.x}
                end={plot.x + plot.width}
              />
              <ChartAxis
                side="bottom"
                offset={model.axisOffset}
                ticks={model.labelIndices.map((position) => ({
                  position: model.positions[position],
                  label: model.labels[position],
                }))}
              />
              <G clipPath={`url(#${id}-reveal)`}>
                {drawnSeries.map((item) => (
                  <ChartDimmable
                    key={item.key}
                    isDimmed={isDimmed(item)}
                    dimmedOpacity={dimmedOpacity}
                  >
                    <Path
                      data-slot="chart-series"
                      d={getBumpPath(item.points)}
                      fill="none"
                      stroke={getChartColor(item.paint, colors)}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </ChartDimmable>
                ))}
              </G>
              {drawnSeries.map((item) => {
                const color = getChartColor(item.paint, colors)
                const nameMark = model.names.find(
                  (entry) => entry.key === item.key
                )
                // The name rides the drawn line's last point, so it travels
                // with its line when the ranks change instead of waiting there.
                const last = item.points[item.points.length - 1]
                const nameY = last ? last.y : nameMark?.y
                return (
                  <ChartDimmable
                    key={item.key}
                    isDimmed={isDimmed(item)}
                    dimmedOpacity={dimmedOpacity}
                  >
                    <G data-slot="bump-chart-points">
                      {item.points.map((point, position) => {
                        if (!point) return null
                        const amount = getBumpRevealAmount(
                          sweep,
                          point.x,
                          radius
                        )
                        return (
                          <G
                            key={position}
                            data-slot="bump-chart-dot"
                            opacity={amount}
                          >
                            <Circle
                              cx={point.x}
                              cy={point.y}
                              r={radius * (0.5 + amount * 0.5)}
                              fill={ringFill}
                              stroke={color}
                              strokeWidth={2}
                            />
                            {model.showRanks && (
                              <SvgText
                                x={point.x}
                                y={point.y + rank.fontSize * 0.35}
                                fill={rank.color}
                                fontSize={rank.fontSize}
                                fontWeight={rank.fontWeight}
                                fontFamily="Inter"
                                textAnchor="middle"
                              >
                                {point.rank}
                              </SvgText>
                            )}
                          </G>
                        )
                      })}
                      {nameMark && nameY !== undefined && !item.isLeaving && (
                        <SvgText
                          data-slot="bump-chart-name"
                          x={nameMark.x}
                          y={nameY + name.fontSize * 0.35}
                          fill={name.color}
                          fontSize={name.fontSize}
                          fontFamily="Inter"
                          opacity={getBumpRevealAmount(
                            sweep,
                            nameMark.x,
                            radius
                          )}
                        >
                          {nameMark.text}
                        </SvgText>
                      )}
                    </G>
                  </ChartDimmable>
                )
              })}
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
            getIndexAt={locate}
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
        <BumpLegend
          series={allSeries}
          geometry={model.series}
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

export { BumpChart, type BumpChartProps }
