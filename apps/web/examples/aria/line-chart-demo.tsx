"use client"

import { formatChartNumber } from "@/styles/aria-fabricator/lib/chart-model"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"
import { LineChart } from "@/styles/aria-fabricator/ui/line-chart"

const data = [
  { month: "Jan", actual: 36_400, target: 36_000 },
  { month: "Feb", actual: 43_000, target: 38_500 },
  { month: "Mar", actual: 43_900, target: 41_000 },
  { month: "Apr", actual: 44_200, target: 43_500 },
  { month: "May", actual: 49_100, target: 46_000 },
  { month: "Jun", actual: 52_200, target: 48_500 },
  { month: "Jul", actual: 53_600, target: 51_000 },
  { month: "Aug", actual: 58_700, target: 53_500 },
  { month: "Sep", actual: 63_800, target: 56_000 },
  { month: "Oct", actual: 67_100, target: 58_500 },
  { month: "Nov", actual: 71_600, target: 61_000 },
  { month: "Dec", actual: 75_600, target: 63_500 },
]

// A dashed series reads as a target.
const config = {
  actual: { label: "Revenue" },
  target: { label: "Target", color: "muted-foreground", dashed: true },
} satisfies ChartConfig

export function LineChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Revenue against target</CardTitle>
        <CardDescription>Acme Inc, 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart
          data={data}
          index="month"
          config={config}
          label="Revenue against target"
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
        />
      </CardContent>
    </Card>
  )
}
