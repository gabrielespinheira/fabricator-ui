"use client"

import { formatChartNumber } from "@/styles/radix-fabricator/lib/chart-model"
import { RadialChart } from "@/styles/radix-fabricator/ui/radial-chart"

const data = [
  { name: "API calls", value: 7_420, limit: 10_000 },
  { name: "Seats", value: 18, limit: 25 },
]

// A half gauge from 9 to 3 o'clock, for a dashboard tile. Each ring is
// measured against its own limit; the centre shows the first ring's share.
export function RadialChartHalf() {
  return (
    <RadialChart
      data={data}
      maxKey="limit"
      label="Plan usage"
      shape="half"
      formatValue={(value) => formatChartNumber(value, { compact: true })}
    />
  )
}
