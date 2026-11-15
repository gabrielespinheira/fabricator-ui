import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartLinePlot,
  type ChartLinePlotProps,
} from "@/registry/native/ui/chart-line-plot"

// Change over time as filled areas, from the website's model: the plot Line
// Chart shares, with a wash under each line.

type AreaChartProps<TDatum extends ChartDatum> = Omit<
  ChartLinePlotProps<TDatum>,
  "variant" | "plotClassName"
>

function AreaChart<TDatum extends ChartDatum>({
  className,
  ...props
}: AreaChartProps<TDatum>) {
  return (
    <ChartLinePlot
      data-slot="area-chart"
      variant="area"
      className={cn("cn-area-chart", className)}
      {...props}
    />
  )
}

export { AreaChart, type AreaChartProps }
