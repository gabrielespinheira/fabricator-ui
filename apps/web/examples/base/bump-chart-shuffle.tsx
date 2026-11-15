"use client"

import * as React from "react"

import { formatChartNumber } from "@/styles/base-fabricator/lib/chart-model"
import { BumpChart } from "@/styles/base-fabricator/ui/bump-chart"
import { Button } from "@/styles/base-fabricator/ui/button"
import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"

const TEAMS = ["design", "platform", "growth", "mobile", "data"] as const
const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6"]

type Week = { week: string } & Record<(typeof TEAMS)[number], number>

const START: Week[] = [
  { week: "W1", design: 42, platform: 38, growth: 31, mobile: 27, data: 19 },
  { week: "W2", design: 36, platform: 44, growth: 29, mobile: 33, data: 24 },
  { week: "W3", design: 31, platform: 47, growth: 35, mobile: 30, data: 28 },
  { week: "W4", design: 34, platform: 41, growth: 39, mobile: 26, data: 37 },
  { week: "W5", design: 29, platform: 36, growth: 45, mobile: 31, data: 40 },
  { week: "W6", design: 33, platform: 35, growth: 48, mobile: 28, data: 43 },
]

function getShuffled(): Week[] {
  return WEEKS.map((week) => ({
    week,
    design: Math.round(20 + Math.random() * 30),
    platform: Math.round(20 + Math.random() * 30),
    growth: Math.round(20 + Math.random() * 30),
    mobile: Math.round(20 + Math.random() * 30),
    data: Math.round(20 + Math.random() * 30),
  }))
}

const config = {
  design: { label: "Design" },
  platform: { label: "Platform" },
  growth: { label: "Growth" },
  mobile: { label: "Mobile" },
  data: { label: "Data" },
} satisfies ChartConfig

// Points per team each week, ranked by the chart: the highest score takes
// rank 1. Shuffle deals new scores and every point moves to its new place.
export function BumpChartShuffle() {
  const [data, setData] = React.useState(START)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setData(getShuffled())}
        >
          Shuffle
        </Button>
      </div>
      <BumpChart
        data={data}
        index="week"
        config={config}
        label="Team rank by points each week"
        ranking="score"
        formatValue={(value) => `${formatChartNumber(value)} pts`}
      />
    </div>
  )
}
