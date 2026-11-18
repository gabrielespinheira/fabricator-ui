"use client"

import { formatChartNumber } from "@/styles/radix-fabricator/lib/chart-model"
import { AreaChart } from "@/styles/radix-fabricator/ui/area-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"

const data = [
  { month: "Jan", thisYear: 36_400, lastYear: 36_500 },
  { month: "Feb", thisYear: 43_000, lastYear: 35_800 },
  { month: "Mar", thisYear: 43_900, lastYear: 36_300 },
  { month: "Apr", thisYear: 44_200, lastYear: 39_900 },
  { month: "May", thisYear: 49_100, lastYear: 43_300 },
  { month: "Jun", thisYear: 52_200, lastYear: 40_900 },
  { month: "Jul", thisYear: 53_600, lastYear: 44_200 },
  { month: "Aug", thisYear: 58_700, lastYear: 45_600 },
  { month: "Sep", thisYear: 63_800, lastYear: 51_100 },
  { month: "Oct", thisYear: 67_100, lastYear: 55_500 },
  { month: "Nov", thisYear: 71_600, lastYear: 53_700 },
  { month: "Dec", thisYear: 75_600, lastYear: 55_500 },
]

const config = {
  thisYear: { label: "This year" },
  lastYear: { label: "Last year" },
} satisfies ChartConfig

export function AreaChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Monthly revenue</CardTitle>
        <CardDescription>Acme Inc, this year against last</CardDescription>
      </CardHeader>
      <CardContent>
        <AreaChart
          data={data}
          index="month"
          config={config}
          label="Monthly revenue"
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
        />
      </CardContent>
    </Card>
  )
}
