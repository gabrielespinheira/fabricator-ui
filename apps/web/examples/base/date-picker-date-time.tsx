"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon, Clock2Icon } from "lucide-react"

import { Button } from "@/styles/base-nova/ui/button"
import { Calendar } from "@/styles/base-nova/ui/calendar"
import { Field, FieldLabel } from "@/styles/base-nova/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/styles/base-nova/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-nova/ui/popover"

export function DatePickerDateTime() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12)
  )
  const [time, setTime] = React.useState("10:30")

  return (
    <Field className="mx-auto w-64">
      <FieldLabel htmlFor="date-picker-date-time">Date and time</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-date-time"
              data-empty={!date}
              className="justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {date ? (
            format(parse(time, "HH:mm", date), "LLL d, y, p")
          ) : (
            <span>Pick a date and time</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-auto gap-0 overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            required
            selected={date}
            defaultMonth={date}
            onSelect={setDate}
          />
          <Field className="border-t p-3">
            <FieldLabel htmlFor="date-picker-date-time-time">Time</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="date-picker-date-time-time"
                type="time"
                required
                value={time}
                onChange={(event) => {
                  if (event.target.value) setTime(event.target.value)
                }}
                className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <InputGroupAddon>
                <Clock2Icon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </PopoverContent>
      </Popover>
    </Field>
  )
}
