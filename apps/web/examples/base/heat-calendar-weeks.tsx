import { HeatCalendar } from "@/styles/base-fabricator/ui/heat-calendar"

const DAY = 86_400_000
const START = Date.UTC(2026, 6, 27)

// Sixteen weeks of support replies, seeded so every render draws the same:
// a handful on weekdays, few at the weekend.
let seed = 11
const random = () => {
  seed = (seed * 16_807) % 2_147_483_647
  return seed / 2_147_483_647
}

const data = Array.from({ length: 112 }, (_, index) => {
  const date = new Date(START + index * DAY)
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
  return {
    day: date.toISOString().slice(0, 10),
    replies: isWeekend
      ? Math.round(random() * 2)
      : Math.round(random() ** 1.6 * 13),
  }
})

// A range of its own, Sunday-first weeks, a colour and fixed levels: up to
// 2 replies is level 1, up to 5 level 2, up to 9 level 3, more is level 4.
export function HeatCalendarWeeks() {
  return (
    <HeatCalendar
      data={data}
      dateKey="day"
      valueKey="replies"
      label="Support replies per day"
      range={{ start: "2026-07-27", end: "2026-11-15" }}
      weekStartsOn={0}
      thresholds={[2, 5, 9]}
      color="chart-series-6"
      className="max-w-md"
    />
  )
}
