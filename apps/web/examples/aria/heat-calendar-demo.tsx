"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { HeatCalendar } from "@/styles/aria-fabricator/ui/heat-calendar"

const DAY = 86_400_000
const END = Date.UTC(2026, 10, 15)

// A year of deploys, seeded so every render draws the same one: busy
// weekdays, quiet weekends and a pause over the holidays.
function getDeploys() {
  let seed = 7
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647
    return seed / 2_147_483_647
  }
  return Array.from({ length: 364 }, (_, index) => {
    const time = END - (363 - index) * DAY
    const date = new Date(time)
    const weekday = date.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const isHoliday =
      (date.getUTCMonth() === 11 && date.getUTCDate() > 22) ||
      (date.getUTCMonth() === 0 && date.getUTCDate() < 3)
    const chance = isHoliday ? 0.1 : isWeekend ? 0.25 : 0.85
    const value =
      random() < chance ? Math.round(random() ** 2 * (isWeekend ? 4 : 14)) : 0
    return { date: date.toISOString().slice(0, 10), value }
  })
}

const data = getDeploys()

export function HeatCalendarDemo() {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Deploys</CardTitle>
        <CardDescription>Acme Inc, the last 52 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <HeatCalendar
          data={data}
          label="Deploys per day"
          formatValue={(value) =>
            value === 1 ? "1 deploy" : `${value} deploys`
          }
        />
      </CardContent>
    </Card>
  )
}
