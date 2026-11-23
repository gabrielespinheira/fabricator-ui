import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getFunnelLabels,
  getFunnelModel,
  getFunnelStagePath,
  getFunnelTable,
  getFunnelTooltip,
  interpolateFunnelStages,
  type FunnelOrientation,
  type FunnelStage,
} from "@/registry/fabricator/shared/lib/chart-funnel-model"
import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartColor,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartBand,
  ChartDataTable,
  ChartDimmable,
  ChartEmpty,
  ChartInspector,
  ChartLabelPresence,
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

// Ordered stages losing volume, from the website's model: one shape split
// into stages joined by smooth tapers, in one hue that lightens stage by
// stage, each value on a pill and each conversion beside its taper. Stages
// grow out of the centre line once the plot has a size, and morph when the
// data changes.

// Read as styles and drawn into SVG: the labels' size and colours, the
// pills' fill and edge, and a leaving stage's opacity.
const funnelPlotStyle = cva("cn-funnel-chart-plot")
const funnelStageStyle = cva("cn-funnel-chart-stage")
const funnelPillStyle = cva("cn-funnel-chart-pill")
const funnelValueStyle = cva("cn-funnel-chart-value")
const funnelNameStyle = cva("cn-funnel-chart-name")
const funnelConversionStyle = cva("cn-funnel-chart-conversion")
const labelPresenceStyle = cva("cn-chart-label-presence")

type FunnelChartProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  /** The field naming each stage. */
  nameKey?: keyof TDatum & string
  /** The field holding each stage's value. */
  valueKey?: keyof TDatum & string
  /** The value's label and colour, keyed by `valueKey`. */
  config?: ChartConfig
  /** The funnel's hue; wins over `config`. */
  color?: ChartColor
  /** Stages top to bottom, or left to right. */
  orientation?: FunnelOrientation
  /** The chart's accessible name. */
  label: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 240 }
const NO_STAGES: FunnelStage[] = []

function readText(style: {
  color?: unknown
  fontSize?: unknown
  fontWeight?: unknown
}) {
  const weight =
    typeof style.fontWeight === "number"
      ? style.fontWeight
      : Number(style.fontWeight)
  return {
    color: typeof style.color === "string" ? style.color : undefined,
    fontSize: typeof style.fontSize === "number" ? style.fontSize : undefined,
    fontWeight: Number.isFinite(weight) ? weight : undefined,
  }
}

function getStageId(stage: FunnelStage) {
  return stage.id
}

function FunnelChart<TDatum extends ChartDatum>({
  data,
  nameKey,
  valueKey,
  config,
  color,
  orientation = "vertical",
  label,
  formatValue,
  legend = false,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: FunnelChartProps<TDatum>) {
  const nameField: string = nameKey ?? "name"
  const valueField: string = valueKey ?? "value"
  const { onLayout, size } = useChartSize()
  const fontSize =
    readText(useResolveClassNames(funnelPlotStyle())).fontSize ?? 12
  const stageStyle = useResolveClassNames(funnelStageStyle())
  const dimmedOpacity =
    typeof stageStyle.opacity === "number" ? stageStyle.opacity : 0.25
  const pillStyle = useResolveClassNames(funnelPillStyle())
  const pillFill =
    typeof pillStyle.backgroundColor === "string"
      ? pillStyle.backgroundColor
      : undefined
  const pillEdge =
    typeof pillStyle.borderColor === "string"
      ? pillStyle.borderColor
      : undefined
  const valueText = readText(useResolveClassNames(funnelValueStyle()))
  const nameText = readText(useResolveClassNames(funnelNameStyle()))
  const conversionText = readText(useResolveClassNames(funnelConversionStyle()))
  const labelPresence = useResolveClassNames(labelPresenceStyle())
  const labelLeavingOpacity =
    typeof labelPresence.opacity === "number" ? labelPresence.opacity : 0
  const [active, setActive] = React.useState<number | null>(null)

  const model = React.useMemo(
    () =>
      getFunnelModel({
        data,
        config,
        nameKey: nameField,
        valueKey: valueField,
        color,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        orientation,
        formatValue,
      }),
    [
      data,
      config,
      nameField,
      valueField,
      color,
      size,
      fontSize,
      orientation,
      formatValue,
    ]
  )
  const legendConfig = React.useMemo<ChartConfig>(
    () => ({ [model.series.key]: { label: model.series.label } }),
    [model.series.key, model.series.label]
  )
  const { hidden, toggle, setSpotlight } = useChartLegendState(legendConfig)
  const colors = useChartColors([model.series.paint])
  const dataVersion = React.useMemo(
    () => ({ data, config, nameField, valueField, color, orientation }),
    [data, config, nameField, valueField, color, orientation]
  )
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  const stages = useChartTween(
    size ? model.stages : NO_STAGES,
    interpolateFunnelStages,
    animate ? dataVersion : null
  )
  const drawnStages = useChartDrawOrder(stages, getStageId)

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getFunnelTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getFunnelTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const isVertical = orientation === "vertical"
  const isEmpty = data.length === 0
  const fill = getChartColor(model.series.paint, colors)
  const labels = getFunnelLabels(drawnStages, model)
  const activeStage =
    activeIndex === null
      ? null
      : (stages.find((stage) => stage.id === model.stages[activeIndex]?.id) ??
        null)
  const anchor = activeStage
    ? isVertical
      ? {
          x: activeStage.center,
          y: activeStage.start,
        }
      : {
          x: (activeStage.start + activeStage.flatEnd) / 2,
          y: activeStage.center - activeStage.size / 2,
        }
    : null
  const band = activeIndex === null ? null : model.bands[activeIndex]

  return (
    <View
      data-slot="funnel-chart"
      data-orientation={orientation}
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-funnel-chart flex-col", className)}
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
              {drawnStages.map((stage) => (
                <ChartDimmable
                  key={stage.id}
                  isDimmed={stage.isLeaving === true}
                  dimmedOpacity={dimmedOpacity}
                >
                  <Path
                    data-slot="funnel-chart-stage"
                    d={getFunnelStagePath(
                      stage,
                      orientation,
                      getStaggeredProgress(reveal, stage.index, data.length)
                    )}
                    fill={fill}
                    fillOpacity={stage.opacity}
                  />
                </ChartDimmable>
              ))}
              {drawnStages.map((stage, position) => {
                const { name, pill, conversion } = labels[position]
                return (
                  <G
                    key={stage.id}
                    opacity={getStaggeredProgress(
                      reveal,
                      stage.index,
                      data.length
                    )}
                  >
                    <ChartLabelPresence
                      isLeaving={stage.isLeaving === true}
                      leavingOpacity={labelLeavingOpacity}
                    >
                      {name && (
                        <SvgText
                          data-slot="funnel-chart-name"
                          x={name.x}
                          y={name.y}
                          textAnchor={name.anchor}
                          fill={nameText.color}
                          fontSize={fontSize}
                          fontWeight={nameText.fontWeight}
                          fontFamily="Inter"
                        >
                          {name.text}
                        </SvgText>
                      )}
                      {conversion && (
                        <SvgText
                          data-slot="funnel-chart-conversion"
                          x={conversion.x}
                          y={conversion.y}
                          textAnchor={conversion.anchor}
                          fill={conversionText.color}
                          fontSize={fontSize}
                          fontFamily="Inter"
                        >
                          {conversion.text}
                        </SvgText>
                      )}
                      {pill && (
                        <G data-slot="funnel-chart-value">
                          <Rect
                            x={pill.x}
                            y={pill.y}
                            width={pill.width}
                            height={pill.height}
                            rx={pill.height / 2}
                            fill={pillFill}
                            stroke={pillEdge}
                            strokeWidth={1}
                          />
                          <SvgText
                            x={pill.text.x}
                            y={pill.text.y}
                            textAnchor={pill.text.anchor}
                            fill={valueText.color}
                            fontSize={fontSize}
                            fontWeight={valueText.fontWeight}
                            fontFamily="Inter"
                          >
                            {pill.text.text}
                          </SvgText>
                        </G>
                      )}
                    </ChartLabelPresence>
                  </G>
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
            getIndexAt={(point) =>
              getNearestIndex(model.centers, isVertical ? point.y : point.x)
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
      {legend && (
        <ChartLegend
          series={[model.series]}
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

export { FunnelChart, type FunnelChartProps }
