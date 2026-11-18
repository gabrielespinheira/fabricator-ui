import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartBarPlot,
  type ChartBarPlotProps,
} from "@/registry/native/ui/chart-bar-plot"

// Magnitude by category, from the website's model: bars side by side or
// stacked, as columns or rows, at most 24pt thick.

type BarChartProps<TDatum extends ChartDatum> = Omit<
  ChartBarPlotProps<TDatum>,
  "maxThickness" | "bandPadding" | "renderLegend" | "stack"
> & {
  /** Side by side, or stacked on each other. */
  stack?: "none" | "stacked"
}

function BarChart<TDatum extends ChartDatum>({
  className,
  ...props
}: BarChartProps<TDatum>) {
  return (
    <ChartBarPlot
      data-slot="bar-chart"
      className={cn("cn-bar-chart", className)}
      {...props}
    />
  )
}

export { BarChart, type BarChartProps }
