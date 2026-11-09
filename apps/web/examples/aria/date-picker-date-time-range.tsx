"use client"

import * as React from "react"
import {
  CalendarDate,
  getLocalTimeZone,
  isSameDay,
} from "@internationalized/date"
import { ArrowRightIcon, CalendarIcon } from "lucide-react"
import { type DateRange } from "react-aria-components"

import {
  TimeInput,
  TimeRangeInput,
  type TimeRangeValue,
} from "@/styles/aria-fabricator/ui/time-input"
import { Button } from "@/styles/aria-nova/ui/button"
import { RangeCalendar } from "@/styles/aria-nova/ui/calendar"
import { Field, FieldLabel } from "@/styles/aria-nova/ui/field"
import { Popover, PopoverTrigger } from "@/styles/aria-nova/ui/popover"

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})

export function DatePickerDateTimeRange() {
  const [range, setRange] = React.useState<DateRange | null>({
    start: new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      12
    ),
    end: new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      15
    ),
  })
  const [times, setTimes] = React.useState<TimeRangeValue>({
    start: "09:00",
    end: "17:30",
  })
  // On one day the end must follow the start, and its list counts the
  // duration; across days any two times work.
  const isOneDay = Boolean(range && isSameDay(range.start, range.end))

  return (
    <Field className="mx-auto w-fit">
      <FieldLabel htmlFor="date-picker-date-time-range">
        Starts and ends
      </FieldLabel>
      <PopoverTrigger>
        <Button
          variant="outline"
          id="date-picker-date-time-range"
          data-empty={!range}
          className="justify-start font-normal data-[empty=true]:text-muted-foreground"
        >
          <CalendarIcon data-icon="inline-start" />
          {range ? (
            <>
              {dateFormat.format(range.start.toDate(getLocalTimeZone()))}
              {!isOneDay && (
                <>
                  {" "}
                  - {dateFormat.format(range.end.toDate(getLocalTimeZone()))}
                </>
              )}
            </>
          ) : (
            <span>Pick the days</span>
          )}
        </Button>
        <Popover
          className="w-auto overflow-hidden p-0"
          placement="bottom start"
        >
          <RangeCalendar value={range} onChange={setRange} numberOfMonths={2} />
        </Popover>
      </PopoverTrigger>
      {isOneDay ? (
        <TimeRangeInput value={times} onValueChange={setTimes} />
      ) : (
        <div role="group" className="flex items-center gap-2">
          <TimeInput
            aria-label="Start time"
            value={times.start}
            onValueChange={(start) => setTimes({ ...times, start })}
            className="w-36"
          />
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <TimeInput
            aria-label="End time"
            value={times.end}
            onValueChange={(end) => setTimes({ ...times, end })}
            className="w-36"
          />
        </div>
      )}
    </Field>
  )
}
