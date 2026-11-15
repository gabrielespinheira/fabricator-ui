"use client"

import { formatChartNumber } from "@/styles/aria-fabricator/lib/chart-model"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { RadialChart } from "@/styles/aria-fabricator/ui/radial-chart"

const data = [
  { goal: "Revenue", value: 412_000, target: 500_000 },
  { goal: "New customers", value: 284, target: 320 },
  { goal: "Renewals", value: 168, target: 180 },
]

export function RadialChartDemo() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Quarterly goals</CardTitle>
        <CardDescription>Acme Inc, Q4 so far</CardDescription>
      </CardHeader>
      <CardContent>
        <RadialChart
          data={data}
          nameKey="goal"
          maxKey="target"
          label="Quarterly goals"
          formatValue={(value) => formatChartNumber(value, { compact: true })}
        />
      </CardContent>
    </Card>
  )
}
