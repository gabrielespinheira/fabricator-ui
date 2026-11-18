import * as React from "react"
import { cn } from "cn"
import { Pressable, View } from "react-native"

import {
  COMPOSITION_BAND_PADDING,
  COMPOSITION_MAX_THICKNESS,
  getCompositionShares,
} from "@/registry/fabricator/shared/lib/chart-composition-model"
import {
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  ChartBarPlot,
  type ChartBarPlotProps,
} from "@/registry/native/ui/chart-bar-plot"
import { getChartColor } from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

// How the mix of a whole changes over time, from the website's model: a 100%
// column per index drawn by the plot Bar Chart shares, with wider columns,
// and a legend that reads each part's share of the column under the finger,
// or of the latest when nothing is inspected.

type CompositionChartProps<TDatum extends ChartDatum> = Omit<
  ChartBarPlotProps<TDatum>,
  "layout" | "stack" | "maxThickness" | "bandPadding" | "renderLegend"
>

/**
 * The parts with their share, as toggles: a press hides a part, a long press
 * spotlights it until the finger lifts. The shares follow the scrub.
 */
function CompositionLegend<TDatum extends ChartDatum>({
  data,
  config,
  hidden,
  activeIndex,
  onToggle,
  onSpotlight,
  colors,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  hidden: ReadonlySet<string>
  activeIndex: number | null
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
  colors: Record<string, string>
}) {
  const feedback = useFeedback()
  const shares = getCompositionShares({
    data,
    config,
    hidden,
    position: activeIndex,
  })
  return (
    <View
      data-slot="chart-legend"
      accessibilityLabel="Parts"
      className="cn-chart-legend flex-row flex-wrap items-center"
    >
      {shares.map((item) => (
        <Pressable
          key={item.key}
          data-slot="chart-legend-item"
          data-hidden={item.isHidden}
          accessibilityRole="button"
          accessibilityState={{ selected: !item.isHidden }}
          accessibilityLabel={
            item.isHidden ? item.label : `${item.label}, ${item.text}`
          }
          className="cn-chart-legend-item flex-row items-center"
          onPress={() => {
            feedback(item.isHidden ? "toggle-on" : "toggle-off")
            onToggle(item.key)
          }}
          onLongPress={() => {
            if (!item.isHidden) onSpotlight(item.key)
          }}
          onPressOut={() => onSpotlight(null)}
        >
          <View
            data-slot="chart-legend-key"
            data-shape="square"
            data-hidden={item.isHidden}
            className="cn-chart-legend-key"
            style={
              item.isHidden
                ? { borderColor: getChartColor(item.paint, colors) }
                : { backgroundColor: getChartColor(item.paint, colors) }
            }
          />
          <Text data-hidden={item.isHidden} className="cn-chart-legend-label">
            {item.label}
          </Text>
          {!item.isHidden && (
            <Text
              data-slot="composition-chart-share"
              className="cn-composition-chart-share"
            >
              {item.text}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
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
            colors={state.colors}
          />
        )
      }
      {...props}
    />
  )
}

export { CompositionChart, type CompositionChartProps }
