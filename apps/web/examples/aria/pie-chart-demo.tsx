"use client"

import { formatChartNumber } from "@/styles/aria-fabricator/lib/chart-model"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { PieChart } from "@/styles/aria-fabricator/ui/pie-chart"

const data = [
  { source: "Organic search", visits: 48_200 },
  { source: "Direct", visits: 29_100 },
  { source: "Referral", visits: 16_400 },
  { source: "Social", visits: 11_200 },
  { source: "Email", visits: 6_100 },
]

export function PieChartDemo() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Traffic by source</CardTitle>
        <CardDescription>Acme Inc, visits in October</CardDescription>
      </CardHeader>
      <CardContent>
        <PieChart
          data={data}
          nameKey="source"
          valueKey="visits"
          label="Traffic by source"
          formatValue={(value) => formatChartNumber(value, { compact: true })}
        />
      </CardContent>
    </Card>
  )
}
