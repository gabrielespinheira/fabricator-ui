"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartLinePlot,
  type ChartLinePlotProps,
} from "@/registry/bases/__base__/ui/chart-line-plot"

// Change over time as lines, for comparing series: a dashed series reads as
// a target or a forecast. Drawn by the plot Area Chart shares, without the
// wash.

type LineChartProps<TDatum extends ChartDatum> = Omit<
  ChartLinePlotProps<TDatum>,
  "variant" | "plotClassName"
>

function LineChart<TDatum extends ChartDatum>({
  className,
  ...props
}: LineChartProps<TDatum>) {
  return (
    <ChartLinePlot
      data-slot="line-chart"
      variant="line"
      className={cn("cn-line-chart", className)}
      {...props}
    />
  )
}

export { LineChart, type LineChartProps }
