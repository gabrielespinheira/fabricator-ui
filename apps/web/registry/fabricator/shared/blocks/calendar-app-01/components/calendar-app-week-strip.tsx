"use client"

import * as React from "react"
import { cn } from "cn"

import { getStripDays } from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import { type EventCalendarWeekday } from "@/registry/bases/__base__/lib/event-calendar-model"

const DAY = 24 * 60 * 60 * 1000
/** A sideways drag past this many pixels turns the week. */
const SWIPE = 40

/**
 * The phone's way between days: the week around the day on screen. Swiping it
 * turns the week; arrows move through the days.
 */
export function CalendarAppWeekStrip({
  date,
  now,
  weekStartsOn,
  locale,
  onDateChange,
}: {
  date: Date
  now: Date
  weekStartsOn: EventCalendarWeekday
  locale: string
  onDateChange: (date: Date) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const start = React.useRef<number>(undefined)
  const days = getStripDays(date, weekStartsOn)
  const formats = React.useMemo(
    () => ({
      narrow: new Intl.DateTimeFormat(locale, { weekday: "narrow" }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
    }),
    [locale]
  )
  const move = (from: Date, by: number) =>
    onDateChange(
      new Date(from.getFullYear(), from.getMonth(), from.getDate() + by)
    )

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Days of the week"
      className="grid shrink-0 touch-pan-y grid-cols-7 px-(--density-8) pb-(--density-8)"
      onTouchStart={(touch) => {
        start.current = touch.touches[0]?.clientX
      }}
      onTouchEnd={(touch) => {
        const end = touch.changedTouches[0]?.clientX
        if (start.current === undefined || end === undefined) return
        const moved = end - start.current
        start.current = undefined
        if (Math.abs(moved) < SWIPE) return
        move(date, moved > 0 ? -7 : 7)
      }}
      onKeyDown={(key) => {
        const by =
          key.key === "ArrowRight" ? 1 : key.key === "ArrowLeft" ? -1 : 0
        if (by === 0) return
        key.preventDefault()
        move(date, by)
        // The day that takes over is drawn with the new week.
        requestAnimationFrame(() =>
          ref.current
            ?.querySelector<HTMLElement>("[aria-current=date]")
            ?.focus()
        )
      }}
    >
      {days.map((day) => {
        const isSelected = day.toDateString() === date.toDateString()
        const isToday = day.toDateString() === now.toDateString()
        return (
          <button
            key={Math.round(+day / DAY)}
            type="button"
            tabIndex={isSelected ? 0 : -1}
            aria-current={isSelected ? "date" : undefined}
            onClick={() => onDateChange(day)}
            className="group/day flex cursor-pointer flex-col items-center gap-(--density-4) py-(--density-4) text-(length:--density-text-11) text-muted-foreground outline-none"
          >
            <span className="sr-only">
              {formats.full.format(day)}
              {isToday ? ", today" : ""}
            </span>
            <span aria-hidden>{formats.narrow.format(day)}</span>
            <span
              aria-hidden
              className={cn(
                "flex size-(--density-36) items-center justify-center rounded-full text-(length:--density-text-16) text-foreground tabular-nums transition-colors duration-feedback ease-feedback group-hover/day:bg-hover group-focus-visible/day:ring-1 group-focus-visible/day:ring-ring",
                isToday && "text-primary-text weight-semibold",
                isSelected &&
                  "bg-primary text-primary-foreground weight-semibold group-hover/day:bg-primary"
              )}
            >
              {day.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
