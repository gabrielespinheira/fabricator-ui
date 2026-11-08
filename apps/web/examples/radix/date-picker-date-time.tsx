"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { TimeInput } from "@/styles/radix-fabricator/ui/time-input"
import { Button } from "@/styles/radix-nova/ui/button"
import { Calendar } from "@/styles/radix-nova/ui/calendar"
import { Field, FieldLabel } from "@/styles/radix-nova/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/radix-nova/ui/popover"

export function DatePickerDateTime() {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12)
  )
  const [time, setTime] = React.useState<string | undefined>("10:30")

  return (
    <Field className="mx-auto w-fit">
      <FieldLabel htmlFor="date-picker-date-time">Date and time</FieldLabel>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker-date-time"
              data-empty={!date}
              className="justify-start font-normal data-[empty=true]:text-muted-foreground"
            >
              <CalendarIcon data-icon="inline-start" />
              {date ? format(date, "EEE, LLL d") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              onSelect={(day) => {
                setDate(day)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
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
