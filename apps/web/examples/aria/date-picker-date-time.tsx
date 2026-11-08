"use client"

import * as React from "react"
import { CalendarDate, getLocalTimeZone } from "@internationalized/date"
import { CalendarIcon } from "lucide-react"

import { TimeInput } from "@/styles/aria-fabricator/ui/time-input"
import { Button } from "@/styles/aria-nova/ui/button"
import { Calendar } from "@/styles/aria-nova/ui/calendar"
import { Field, FieldLabel } from "@/styles/aria-nova/ui/field"
import { Popover, PopoverTrigger } from "@/styles/aria-nova/ui/popover"

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})

export function DatePickerDateTime() {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<CalendarDate | undefined>(
    new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, 12)
  )
  const [time, setTime] = React.useState<string | undefined>("10:30")

  return (
    <Field className="mx-auto w-fit">
      <FieldLabel htmlFor="date-picker-date-time">Date and time</FieldLabel>
      <div className="flex gap-2">
        <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
          <Button
            variant="outline"
            id="date-picker-date-time"
            data-empty={!date}
            className="justify-start font-normal data-[empty=true]:text-muted-foreground"
          >
            <CalendarIcon data-icon="inline-start" />
            {date ? (
              dateFormat.format(date.toDate(getLocalTimeZone()))
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
          <Popover
            className="w-auto overflow-hidden p-0"
            placement="bottom start"
          >
            <Calendar
              value={date}
              onChange={(day) => {
                setDate(day)
                setOpen(false)
              }}
            />
          </Popover>
        </PopoverTrigger>
        <TimeInput
          aria-label="Time"
          value={time}
          onValueChange={setTime}
          className="w-32"
        />
      </div>
    </Field>
  )
}
