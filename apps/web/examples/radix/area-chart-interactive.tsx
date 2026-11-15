"use client"

import * as React from "react"

import { AreaChart } from "@/styles/radix-fabricator/ui/area-chart"
import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import {
  type ChartActive,
  type ChartConfig,
} from "@/styles/radix-fabricator/ui/chart-kit"

type Day = { day: string; desktop: number; mobile: number }

const METRICS = {
  visitors: [
    [1_240, 980],
    [1_380, 1_120],
    [1_310, 1_260],
    [1_520, 1_190],
    [1_690, 1_430],
    [1_120, 1_610],
    [980, 1_540],
  ],
  signups: [
    [86, 64],
    [92, 71],
    [79, 88],
    [104, 83],
    [121, 97],
    [74, 112],
    [61, 104],
  ],
} as const

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getData(metric: keyof typeof METRICS): Day[] {
  return METRICS[metric].map(([desktop, mobile], index) => ({
    day: DAYS[index],
    desktop,
    mobile,
  }))
}

const config = {
  desktop: { label: "Desktop" },
  mobile: { label: "Mobile" },
} satisfies ChartConfig

// Switching the metric morphs the areas to the new values; scrubbing the
// chart feeds the number in the header.
export function AreaChartInteractive() {
  const [metric, setMetric] = React.useState<keyof typeof METRICS>("visitors")
  const [active, setActive] = React.useState<ChartActive<Day> | null>(null)
  const data = React.useMemo(() => getData(metric), [metric])
  const shown = active?.datum ?? data[data.length - 1]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardDescription>
            {metric === "visitors" ? "Visitors" : "Sign-ups"} on {shown.day}
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {(shown.desktop + shown.mobile).toLocaleString("en-US")}
          </CardTitle>
        </div>
        <div className="flex gap-1">
          {(["visitors", "signups"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={metric === item ? "secondary" : "ghost"}
              aria-pressed={metric === item}
              onClick={() => setMetric(item)}
            >
              {item === "visitors" ? "Visitors" : "Sign-ups"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <AreaChart
          data={data}
          index="day"
          config={config}
          label={
            metric === "visitors" ? "Visitors this week" : "Sign-ups this week"
          }
          stack="stacked"
          onActiveChange={setActive}
        />
      </CardContent>
    </Card>
  )
}
