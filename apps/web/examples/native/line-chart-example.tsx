import { Example, ExampleWrapper } from "@/examples/native/example"

import { type ChartConfig } from "@/registry/native/ui/chart-kit"
import { LineChart } from "@/registry/native/ui/line-chart"

const revenue = [
  { month: "Jan", actual: 36_400, target: 36_000 },
  { month: "Feb", actual: 43_000, target: 38_500 },
  { month: "Mar", actual: 43_900, target: 41_000 },
  { month: "Apr", actual: 44_200, target: 43_500 },
  { month: "May", actual: 49_100, target: 46_000 },
  { month: "Jun", actual: 52_200, target: 48_500 },
  { month: "Jul", actual: 53_600, target: 51_000 },
  { month: "Aug", actual: 58_700, target: 53_500 },
]

// A dashed series reads as a target.
const revenueConfig = {
  actual: { label: "Revenue" },
  target: { label: "Target", color: "muted-foreground", dashed: true },
} satisfies ChartConfig

const latency = [
  { day: "Mon", api: 182, web: 240, worker: 96, cron: 41 },
  { day: "Tue", api: 176, web: 251, worker: 104, cron: 44 },
  { day: "Wed", api: 214, web: 233, worker: 131, cron: 39 },
  { day: "Thu", api: 198, web: 262, worker: 122, cron: 52 },
  { day: "Fri", api: 241, web: 288, worker: 158, cron: 47 },
  { day: "Sat", api: 132, web: 174, worker: 88, cron: 45 },
  { day: "Sun", api: 121, web: 162, worker: 79, cron: 43 },
]

const latencyConfig = {
  api: { label: "API" },
  web: { label: "Web" },
  worker: { label: "Worker" },
  cron: { label: "Cron" },
} satisfies ChartConfig

export function LineChartExample() {
  return (
    <ExampleWrapper>
      <Example title="Against a target" className="items-stretch">
        <LineChart
          data={revenue}
          index="month"
          config={revenueConfig}
          label="Revenue against target"
          formatValue={(value) => `$${(value / 1000).toFixed(1)}K`}
          className="h-60 w-full"
        />
      </Example>
      <Example title="Several series" className="items-stretch">
        <LineChart
          data={latency}
          index="day"
          config={latencyConfig}
          label="p95 latency by service, in milliseconds"
          formatValue={(value) => `${value} ms`}
          curve="linear"
          className="h-60 w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}
