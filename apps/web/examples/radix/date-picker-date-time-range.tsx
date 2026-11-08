"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import { ArrowRightIcon, CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import {
  TimeInput,
  TimeRangeInput,
  type TimeRangeValue,
} from "@/styles/radix-fabricator/ui/time-input"
import { Button } from "@/styles/radix-nova/ui/button"
import { Calendar } from "@/styles/radix-nova/ui/calendar"
import { Field, FieldLabel } from "@/styles/radix-nova/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/radix-nova/ui/popover"

export function DatePickerDateTimeRange() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    to: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
  })
  const [times, setTimes] = React.useState<TimeRangeValue>({
    start: "09:00",
    end: "17:30",
  })
  // On one day the end must follow the start, and its list counts the
  // duration; across days any two times work.
  const isOneDay = Boolean(
    range?.from && (!range.to || isSameDay(range.from, range.to))
  )

  return (
    <Field className="mx-auto w-fit">
      <FieldLabel htmlFor="date-picker-date-time-range">
        Starts and ends
      </FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-date-time-range"
            data-empty={!range?.from}
            className="justify-start font-normal data-[empty=true]:text-muted-foreground"
          >
            <CalendarIcon data-icon="inline-start" />
            {range?.from ? (
              <>
                {format(range.from, "EEE, LLL d")}
                {range.to && !isOneDay && (
                  <> - {format(range.to, "EEE, LLL d")}</>
                )}
              </>
            ) : (
              <span>Pick the days</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            onSelect={setRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
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
