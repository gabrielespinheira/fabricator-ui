"use client"

import { formatChartNumber } from "@/styles/aria-fabricator/lib/chart-model"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { DonutChart } from "@/styles/aria-fabricator/ui/donut-chart"

const data = [
  { plan: "Enterprise", revenue: 48_200 },
  { plan: "Team", revenue: 31_600 },
  { plan: "Pro", revenue: 22_900 },
  { plan: "Starter", revenue: 9_400 },
]

export function DonutChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Revenue by plan</CardTitle>
        <CardDescription>Acme Inc, monthly recurring revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <DonutChart
          data={data}
          nameKey="plan"
          valueKey="revenue"
          label="Revenue by plan"
          centerLabel="MRR"
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
        />
      </CardContent>
    </Card>
  )
}
