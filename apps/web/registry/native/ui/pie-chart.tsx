import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartPiePlot,
  type ChartPiePlotProps,
} from "@/registry/native/ui/chart-pie-plot"

// Parts of one whole, from the website's model: slices clockwise from 12
// o'clock with a 2pt gap, the share inside each slice on request.

type PieChartProps<TDatum extends ChartDatum> = Omit<
  ChartPiePlotProps<TDatum>,
  "variant" | "centerLabel" | "list"
>

function PieChart<TDatum extends ChartDatum>({
  className,
  ...props
}: PieChartProps<TDatum>) {
  return (
    <ChartPiePlot
      data-slot="pie-chart"
      variant="pie"
      className={cn("cn-pie-chart", className)}
      {...props}
    />
  )
}

export { PieChart, type PieChartProps }
