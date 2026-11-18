"use client"

import * as React from "react"

import { formatChartNumber } from "@/styles/base-fabricator/lib/chart-model"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { SankeyChart } from "@/styles/base-fabricator/ui/sankey-chart"

const nodes = [
  { id: "direct", label: "Direct" },
  { id: "partners", label: "Partners" },
  { id: "marketplace", label: "Marketplace" },
  { id: "platform", label: "Platform" },
  { id: "analytics", label: "Analytics" },
  { id: "support", label: "Support" },
  { id: "americas", label: "Americas", color: "muted-foreground" },
  { id: "emea", label: "EMEA", color: "muted-foreground" },
  { id: "apac", label: "APAC", color: "muted-foreground" },
]

const QUARTERS = {
  Q2: [
    { source: "direct", target: "platform", value: 420_000 },
    { source: "direct", target: "analytics", value: 160_000 },
    { source: "direct", target: "support", value: 70_000 },
    { source: "partners", target: "platform", value: 210_000 },
    { source: "partners", target: "analytics", value: 90_000 },
    { source: "marketplace", target: "platform", value: 120_000 },
    { source: "marketplace", target: "support", value: 40_000 },
    { source: "platform", target: "americas", value: 390_000 },
    { source: "platform", target: "emea", value: 250_000 },
    { source: "platform", target: "apac", value: 110_000 },
    { source: "analytics", target: "americas", value: 140_000 },
    { source: "analytics", target: "emea", value: 110_000 },
    { source: "support", target: "americas", value: 60_000 },
    { source: "support", target: "apac", value: 50_000 },
  ],
  Q3: [
    { source: "direct", target: "platform", value: 470_000 },
    { source: "direct", target: "analytics", value: 210_000 },
    { source: "direct", target: "support", value: 60_000 },
    { source: "partners", target: "platform", value: 190_000 },
    { source: "partners", target: "analytics", value: 140_000 },
    { source: "partners", target: "support", value: 30_000 },
    { source: "marketplace", target: "platform", value: 160_000 },
    { source: "platform", target: "americas", value: 410_000 },
    { source: "platform", target: "emea", value: 260_000 },
    { source: "platform", target: "apac", value: 150_000 },
    { source: "analytics", target: "americas", value: 180_000 },
    { source: "analytics", target: "emea", value: 120_000 },
    { source: "analytics", target: "apac", value: 50_000 },
    { source: "support", target: "americas", value: 90_000 },
  ],
}

type Quarter = keyof typeof QUARTERS

// Switching the quarter morphs every node and link to its new size; a flow
// that starts or stops grows in or thins away.
export function SankeyChartDemo() {
  const [quarter, setQuarter] = React.useState<Quarter>("Q2")

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Revenue flow</CardTitle>
          <CardDescription>
            Acme Inc, {quarter}: channel to product to region
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {(["Q2", "Q3"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={quarter === item ? "secondary" : "ghost"}
              aria-pressed={quarter === item}
              onClick={() => setQuarter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <SankeyChart
          nodes={nodes}
          links={QUARTERS[quarter]}
          label={`Revenue by channel, product and region, ${quarter}`}
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
          className="h-80"
        />
      </CardContent>
    </Card>
  )
}
