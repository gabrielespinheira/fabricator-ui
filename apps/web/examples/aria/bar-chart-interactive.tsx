"use client"

import * as React from "react"

import { BarChart } from "@/styles/aria-fabricator/ui/bar-chart"
import { Button } from "@/styles/aria-fabricator/ui/button"
import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"

const DATA = [
  { team: "Design", shipped: 18, planned: 24 },
  { team: "Platform", shipped: 31, planned: 28 },
  { team: "Growth", shipped: 12, planned: 20 },
  { team: "Mobile", shipped: 22, planned: 19 },
  { team: "Data", shipped: 9, planned: 14 },
]

const config = {
  shipped: { label: "Shipped" },
  planned: { label: "Planned" },
} satisfies ChartConfig

// Bars glide to their new places when the layout, the stacking or the order
// changes.
export function BarChartInteractive() {
  const [stack, setStack] = React.useState<"none" | "stacked">("none")
  const [isSorted, setIsSorted] = React.useState(false)
  const data = React.useMemo(
    () =>
      isSorted
        ? [...DATA].sort(
            (a, b) => b.shipped + b.planned - (a.shipped + a.planned)
          )
        : DATA,
    [isSorted]
  )

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={stack === "none" ? "secondary" : "ghost"}
          aria-pressed={stack === "none"}
          onPress={() => setStack("none")}
        >
          Grouped
        </Button>
        <Button
          size="sm"
          variant={stack === "stacked" ? "secondary" : "ghost"}
          aria-pressed={stack === "stacked"}
          onPress={() => setStack("stacked")}
        >
          Stacked
        </Button>
        <Button
          size="sm"
          variant={isSorted ? "secondary" : "ghost"}
          aria-pressed={isSorted}
          onPress={() => setIsSorted((value) => !value)}
        >
          Sort by total
        </Button>
      </div>
      <BarChart
        data={data}
        index="team"
        config={config}
        label="Issues shipped and planned by team"
        stack={stack}
      />
    </div>
  )
}
