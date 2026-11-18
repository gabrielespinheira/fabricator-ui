"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  HeatCalendar,
  type HeatCalendarActive,
} from "@/styles/base-fabricator/ui/heat-calendar"

const DAY = 86_400_000
const START = Date.UTC(2026, 7, 24)

type Activity = { date: string; commits: number; reviews: number }

let seed = 5
const random = () => {
  seed = (seed * 16_807) % 2_147_483_647
  return seed / 2_147_483_647
}

const DATA: Activity[] = Array.from({ length: 84 }, (_, index) => {
  const date = new Date(START + index * DAY)
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
  return {
    date: date.toISOString().slice(0, 10),
    commits: Math.round(random() ** 1.4 * (isWeekend ? 3 : 12)),
    reviews: isWeekend ? 0 : Math.round(random() ** 2 * 6),
  }
})

const METRICS = {
  commits: { label: "Commits", one: "commit", many: "commits" },
  reviews: { label: "Reviews", one: "review", many: "reviews" },
} as const

const FORMAT_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})

// The day under the pointer, the finger or the keyboard shows above the
// grid. Switching the metric eases each day to its new level.
export function HeatCalendarInteractive() {
  const [metric, setMetric] = React.useState<keyof typeof METRICS>("commits")
  const [active, setActive] =
    React.useState<HeatCalendarActive<Activity> | null>(null)
  const words = METRICS[metric]
  const count = (value: number) =>
    `${value} ${value === 1 ? words.one : words.many}`
  const total = DATA.reduce((sum, datum) => sum + datum[metric], 0)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(METRICS) as (keyof typeof METRICS)[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={metric === key ? "secondary" : "ghost"}
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
          >
            {METRICS[key].label}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-semibold tabular-nums">
          {active ? count(active.value ?? 0) : count(total)}
        </span>
        <span className="text-sm text-muted-foreground">
          {active
            ? FORMAT_DAY.format(new Date(`${active.date}T00:00:00Z`))
            : "In the last 12 weeks"}
        </span>
      </div>
      <HeatCalendar
        data={DATA}
        valueKey={metric}
        range={{ start: "2026-08-24", end: "2026-11-15" }}
        label={`${words.label} per day`}
        formatValue={count}
        onActiveChange={setActive}
      />
    </div>
  )
}
