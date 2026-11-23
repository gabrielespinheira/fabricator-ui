"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getFunnelLabels,
  getFunnelModel,
  getFunnelStagePath,
  getFunnelTable,
  getFunnelTooltip,
  interpolateFunnelStages,
  type FunnelOrientation,
  type FunnelStage,
} from "@/registry/bases/__base__/lib/chart-funnel-model"
import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartColor,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartBand,
  ChartDataTable,
  ChartEmpty,
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

// Ordered stages losing volume: each stage as wide as its value, centred,
// narrowing into the next through a smooth taper, in one hue that lightens
// stage by stage. Each value sits on a pill and each conversion beside the
// taper that leads to its stage. Stages grow out of the centre line the
// first time the funnel is on screen, and morph when the data changes.

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
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 288 }
const NO_STAGES: FunnelStage[] = []

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
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
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
  const dataVersion = React.useMemo(
    () => ({ data, config, nameField, valueField, color, orientation }),
    [data, config, nameField, valueField, color, orientation]
  )
  const reveal = useChartReveal(plotRef, animate)
  const stages = useChartTween(
    plotRef,
    size ? model.stages : NO_STAGES,
    interpolateFunnelStages,
    animate ? dataVersion : null
  )

  const activeIndex = active !== null && active < data.length ? active : null
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < data.length ? shown.value : null
  const content =
    shownIndex === null
      ? null
      : getFunnelTooltip(model, shownIndex, formatValue)
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
  const fill = getChartColor(model.series.paint)
  const drawnStages = useChartDrawOrder(stages, getStageId)
  const labels = getFunnelLabels(drawnStages, model)
  const activeStage =
    shownIndex === null
      ? null
      : (stages.find((stage) => stage.id === model.stages[shownIndex]?.id) ??
        null)
  const anchor = activeStage
    ? isVertical
      ? {
          x: activeStage.center + activeStage.size / 2,
          y: (activeStage.start + activeStage.flatEnd) / 2,
        }
      : {
          x: activeStage.flatEnd,
          y: activeStage.center,
        }
    : null
  const band = shownIndex === null ? null : model.bands[shownIndex]

  return (
    <div
      data-slot="funnel-chart"
      data-orientation={orientation}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-funnel-chart flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className={cn(
          "cn-chart-plot relative min-h-0 flex-1",
          "cn-funnel-chart-plot"
        )}
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            {band && <ChartBand rect={band} leaving={shown.isLeaving} />}
            {drawnStages.map((stage) => (
              <path
                key={stage.id}
                data-slot="funnel-chart-stage"
                data-leaving={stage.isLeaving || undefined}
                className="cn-funnel-chart-stage"
                d={getFunnelStagePath(
                  stage,
                  orientation,
                  getStaggeredProgress(reveal, stage.index, data.length)
                )}
                fill={fill}
                fillOpacity={stage.opacity}
              />
            ))}
            {drawnStages.map((stage, position) => {
              const { name, pill, conversion } = labels[position]
              const amount = getStaggeredProgress(
                reveal,
                stage.index,
                data.length
              )
              return (
                <g key={stage.id} opacity={amount}>
                  <g
                    data-leaving={stage.isLeaving || undefined}
                    className="cn-chart-label-presence"
                  >
                    {name && (
                      <text
                        data-slot="funnel-chart-name"
                        className="cn-funnel-chart-name"
                        x={name.x}
                        y={name.y}
                        textAnchor={name.anchor}
                      >
                        {name.text}
                      </text>
                    )}
                    {conversion && (
                      <text
                        data-slot="funnel-chart-conversion"
                        className="cn-funnel-chart-conversion"
                        x={conversion.x}
                        y={conversion.y}
                        textAnchor={conversion.anchor}
                      >
                        {conversion.text}
                      </text>
                    )}
                    {pill && (
                      <g data-slot="funnel-chart-value">
                        <rect
                          className="cn-funnel-chart-pill"
                          x={pill.x}
                          y={pill.y}
                          width={pill.width}
                          height={pill.height}
                          rx={pill.height / 2}
                        />
                        <text
                          className="cn-funnel-chart-value"
                          x={pill.text.x}
                          y={pill.text.y}
                          textAnchor={pill.text.anchor}
                        >
                          {pill.text.text}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}
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
              getNearestIndex(model.centers, isVertical ? point.y : point.x)
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
      {legend && (
        <ChartLegend
          series={[model.series]}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { FunnelChart, type FunnelChartProps }
