"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartPiePlot,
  type ChartPiePlotProps,
} from "@/registry/bases/__base__/ui/chart-pie-plot"

// Parts of one whole, for a few parts: slices clockwise from 12 o'clock in
// data order, a 2px gap between them, the share inside each slice on
// request. Drawn by the plot Donut Chart shares.

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
