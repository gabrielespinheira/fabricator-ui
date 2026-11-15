"use client"

import * as React from "react"

import { formatChartNumber } from "@/styles/radix-fabricator/lib/chart-model"
import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { Treemap } from "@/styles/radix-fabricator/ui/treemap"

type Holding = { name: string; value?: number; children?: Holding[] }

const QUARTERS = {
  Q1: [
    {
      name: "Technology",
      children: [
        { name: "Northwind", value: 182_000 },
        { name: "Contoso", value: 141_000 },
        { name: "Tailspin", value: 96_000 },
        { name: "Wingtip", value: 54_000 },
      ],
    },
    {
      name: "Healthcare",
      children: [
        { name: "Fabrikam", value: 118_000 },
        { name: "Litware", value: 72_000 },
        { name: "Coho", value: 38_000 },
      ],
    },
    {
      name: "Financials",
      children: [
        { name: "Woodgrove", value: 104_000 },
        { name: "Adatum", value: 61_000 },
      ],
    },
    {
      name: "Energy",
      children: [
        { name: "Proseware", value: 66_000 },
        { name: "Alpine", value: 29_000 },
      ],
    },
    { name: "Cash", value: 45_000 },
  ],
  Q2: [
    {
      name: "Technology",
      children: [
        { name: "Northwind", value: 214_000 },
        { name: "Contoso", value: 126_000 },
        { name: "Tailspin", value: 118_000 },
        { name: "Wingtip", value: 47_000 },
      ],
    },
    {
      name: "Healthcare",
      children: [
        { name: "Fabrikam", value: 109_000 },
        { name: "Litware", value: 84_000 },
        { name: "Coho", value: 31_000 },
      ],
    },
    {
      name: "Financials",
      children: [
        { name: "Woodgrove", value: 97_000 },
        { name: "Adatum", value: 70_000 },
      ],
    },
    {
      name: "Energy",
      children: [
        { name: "Proseware", value: 52_000 },
        { name: "Alpine", value: 22_000 },
      ],
    },
    { name: "Cash", value: 62_000 },
  ],
  Q3: [
    {
      name: "Technology",
      children: [
        { name: "Northwind", value: 238_000 },
        { name: "Contoso", value: 119_000 },
        { name: "Tailspin", value: 131_000 },
        { name: "Margie", value: 58_000 },
      ],
    },
    {
      name: "Healthcare",
      children: [
        { name: "Fabrikam", value: 121_000 },
        { name: "Litware", value: 93_000 },
      ],
    },
    {
      name: "Financials",
      children: [
        { name: "Woodgrove", value: 88_000 },
        { name: "Adatum", value: 79_000 },
        { name: "Humongous", value: 34_000 },
      ],
    },
    {
      name: "Energy",
      children: [
        { name: "Proseware", value: 47_000 },
        { name: "Alpine", value: 26_000 },
      ],
    },
    { name: "Cash", value: 38_000 },
  ],
} satisfies Record<string, Holding[]>

type Quarter = keyof typeof QUARTERS

// Switching the quarter re-lays the map: holdings that stay move and resize,
// new ones grow in and sold ones shrink away.
export function TreemapDemo() {
  const [quarter, setQuarter] = React.useState<Quarter>("Q1")

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Portfolio allocation</CardTitle>
          <CardDescription>
            Acme Inc pension fund, end of {quarter}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {(["Q1", "Q2", "Q3"] as const).map((item) => (
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
        <Treemap
          data={QUARTERS[quarter]}
          label={`Portfolio allocation by sector and holding, ${quarter}`}
          formatValue={(value) =>
            `$${formatChartNumber(value, { compact: true })}`
          }
          className="h-80"
        />
      </CardContent>
    </Card>
  )
}
