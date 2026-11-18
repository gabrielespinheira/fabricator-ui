"use client"

import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"
import { LineChart } from "@/styles/radix-fabricator/ui/line-chart"

const data = [
  { day: "Mon", api: 182, web: 240, worker: 96, cron: 41 },
  { day: "Tue", api: 176, web: 251, worker: 104, cron: 44 },
  { day: "Wed", api: 214, web: 233, worker: 131, cron: 39 },
  { day: "Thu", api: 198, web: 262, worker: 122, cron: 52 },
  { day: "Fri", api: 241, web: 288, worker: 158, cron: 47 },
  { day: "Sat", api: 132, web: 174, worker: 88, cron: 45 },
  { day: "Sun", api: 121, web: 162, worker: 79, cron: 43 },
]

const config = {
  api: { label: "API" },
  web: { label: "Web" },
  worker: { label: "Worker" },
  cron: { label: "Cron" },
} satisfies ChartConfig

// Point at a series in the legend to spotlight it; press it to hide it. The
// others keep their colours.
export function LineChartSeries() {
  return (
    <LineChart
      data={data}
      index="day"
      config={config}
      label="p95 latency by service, in milliseconds"
      formatValue={(value) => `${value} ms`}
      curve="linear"
      className="max-w-2xl"
    />
  )
}
