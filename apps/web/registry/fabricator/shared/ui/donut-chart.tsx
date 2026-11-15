"use client"

import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartPiePlot,
  type ChartPiePlotProps,
} from "@/registry/bases/__base__/ui/chart-pie-plot"

// Parts of one whole as a ring, with the total in the centre and a value list
// beside it: the slice under the pointer, or the row, takes the centre. Drawn
// by the plot Pie Chart shares.

type DonutChartProps<TDatum extends ChartDatum> = Omit<
  ChartPiePlotProps<TDatum>,
  "variant"
>

function DonutChart<TDatum extends ChartDatum>({
  list = true,
  className,
  ...props
}: DonutChartProps<TDatum>) {
  return (
    <ChartPiePlot
      data-slot="donut-chart"
      variant="donut"
      list={list}
      className={cn("cn-donut-chart", className)}
      {...props}
    />
  )
}

export { DonutChart, type DonutChartProps }
