"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartLinePlot,
  type ChartLinePlotProps,
} from "@/registry/bases/__base__/ui/chart-line-plot"

// Change over time as filled areas: one series, several overlapping, stacked
// on each other or stretched to the whole. Drawn by the plot Line Chart
// shares, with a wash under each line.

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
