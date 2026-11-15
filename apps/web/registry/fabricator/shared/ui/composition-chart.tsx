"use client"

import * as React from "react"
import { cn } from "cn"

import {
  COMPOSITION_BAND_PADDING,
  COMPOSITION_MAX_THICKNESS,
  getCompositionShares,
} from "@/registry/bases/__base__/lib/chart-composition-model"
import {
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartBarPlot,
  type ChartBarPlotProps,
} from "@/registry/bases/__base__/ui/chart-bar-plot"
import { getChartColor } from "@/registry/bases/__base__/ui/chart-kit"

// How the mix of a whole changes over time: a 100% column per index, each
// part its share of the column. Drawn by the plot Bar Chart shares, with
// wider columns, and a legend that reads each part's share of the inspected
// column, or of the latest when nothing is inspected.

type CompositionChartProps<TDatum extends ChartDatum> = Omit<
  ChartBarPlotProps<TDatum>,
  "layout" | "stack" | "maxThickness" | "bandPadding" | "renderLegend"
>

/**
 * The parts with their share, as toggles: pressing hides a part, pointing
 * at it spotlights it. The shares follow the inspected column.
 */
function CompositionLegend<TDatum extends ChartDatum>({
  data,
  config,
  hidden,
  activeIndex,
  onToggle,
  onSpotlight,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  hidden: ReadonlySet<string>
  activeIndex: number | null
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
}) {
  const shares = getCompositionShares({
    data,
    config,
    hidden,
    position: activeIndex,
  })
  return (
    <ul
      data-slot="chart-legend"
      aria-label="Parts"
      className="cn-chart-legend flex flex-wrap items-center"
      onPointerLeave={() => onSpotlight(null)}
    >
      {shares.map((item) => (
        <li key={item.key} className="flex">
          <button
            type="button"
            data-slot="chart-legend-item"
            aria-pressed={!item.isHidden}
            data-hidden={item.isHidden || undefined}
            className="cn-chart-legend-item inline-flex items-center outline-none select-none"
            onClick={() => {
              onToggle(item.key)
              // A part being hidden can't stay spotlit, or every other
              // part would stay dimmed under the pointer.
              onSpotlight(item.isHidden ? item.key : null)
            }}
            onPointerEnter={() => onSpotlight(item.isHidden ? null : item.key)}
            onFocus={() => onSpotlight(item.isHidden ? null : item.key)}
            onBlur={() => onSpotlight(null)}
          >
            <span
              data-slot="chart-legend-key"
              data-shape="square"
              className="cn-chart-legend-key"
              style={{ color: getChartColor(item.paint) }}
            />
            {item.label}
            {!item.isHidden && (
              <span
                data-slot="composition-chart-share"
                className="cn-composition-chart-share"
              >
                {item.text}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function CompositionChart<TDatum extends ChartDatum>({
  data,
  config,
  legend,
  className,
  ...props
}: CompositionChartProps<TDatum>) {
  const showLegend = legend ?? Object.keys(config).length > 1
  return (
    <ChartBarPlot
      data-slot="composition-chart"
      data={data}
      config={config}
      stack="expand"
      maxThickness={COMPOSITION_MAX_THICKNESS}
      bandPadding={COMPOSITION_BAND_PADDING}
      className={cn("cn-composition-chart", className)}
      renderLegend={(state) =>
        showLegend && (
          <CompositionLegend
            data={data}
            config={config}
            hidden={state.hidden}
            activeIndex={state.activeIndex}
            onToggle={state.onToggle}
            onSpotlight={state.onSpotlight}
          />
        )
      }
      {...props}
    />
  )
}

export { CompositionChart, type CompositionChartProps }
