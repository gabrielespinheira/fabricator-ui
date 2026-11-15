"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartBarPlot,
  type ChartBarPlotProps,
} from "@/registry/bases/__base__/ui/chart-bar-plot"

// Magnitude by category: bars side by side or stacked, as columns or as rows
// for long category names. At most 24px thick, the rest of each band is air.

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
