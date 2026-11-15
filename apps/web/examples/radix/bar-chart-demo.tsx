"use client"

import { formatChartNumber } from "@/styles/radix-fabricator/lib/chart-model"
import { BarChart } from "@/styles/radix-fabricator/ui/bar-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"

const data = [
  {
    region: "North America",
    subscriptions: 66_000,
    services: 75_000,
    marketplace: 31_000,
  },
  {
    region: "Europe",
    subscriptions: 102_000,
    services: 61_000,
    marketplace: 36_000,
  },
  {
    region: "Asia Pacific",
    subscriptions: 72_000,
    services: 50_000,
    marketplace: 36_000,
  },
  {
    region: "Latin America",
    subscriptions: 29_000,
    services: 23_000,
    marketplace: 25_000,
  },
  {
    region: "Middle East",
    subscriptions: 51_000,
    services: 16_000,
    marketplace: 13_000,
  },
  {
    region: "Africa",
    subscriptions: 18_000,
    services: 12_000,
    marketplace: 9_000,
  },
]

const config = {
  subscriptions: { label: "Subscriptions" },
  services: { label: "Services" },
  marketplace: { label: "Marketplace" },
} satisfies ChartConfig

export function BarChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Revenue by region</CardTitle>
        <CardDescription>Acme Inc, first half of 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart
          data={data}
          index="region"
          config={config}
          label="Revenue by region"
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
        />
      </CardContent>
    </Card>
  )
}
