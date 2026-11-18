import * as React from "react"
import { cn } from "cn"

import { type ChartDatum } from "@/registry/fabricator/shared/lib/chart-model"
import {
  ChartPiePlot,
  type ChartPiePlotProps,
} from "@/registry/native/ui/chart-pie-plot"

// Parts of one whole as a ring, from the website's model: the total in the
// centre, which the slice under the finger or a held row takes over, and a
// value list beside the ring on a wide screen, under it on a phone.

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
