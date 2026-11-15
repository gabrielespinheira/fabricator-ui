"use client"

import * as React from "react"

import { AreaChart } from "@/styles/base-fabricator/ui/area-chart"
import { Button } from "@/styles/base-fabricator/ui/button"
import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"

const data = [
  { hour: "08:00", requests: 120 },
  { hour: "09:00", requests: 340 },
  { hour: "10:00", requests: 310 },
  { hour: "11:00", requests: 460 },
  { hour: "12:00", requests: 380 },
  { hour: "13:00", requests: 520 },
  { hour: "14:00", requests: 490 },
  { hour: "15:00", requests: 610 },
]

const config = { requests: { label: "Requests" } } satisfies ChartConfig

const CURVES = ["smooth", "linear", "step"] as const

// Smooth for trends, linear when every reading matters, step for values that
// hold until they change.
export function AreaChartCurves() {
  const [curve, setCurve] = React.useState<(typeof CURVES)[number]>("smooth")
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex gap-1">
        {CURVES.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={curve === item ? "secondary" : "ghost"}
            aria-pressed={curve === item}
            onClick={() => setCurve(item)}
            className="capitalize"
          >
            {item}
          </Button>
        ))}
      </div>
      <AreaChart
        data={data}
        index="hour"
        config={config}
        label="Requests per hour"
        curve={curve}
      />
    </div>
  )
}
