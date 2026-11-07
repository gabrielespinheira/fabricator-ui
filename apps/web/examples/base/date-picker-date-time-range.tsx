"use client"

import * as React from "react"
import { format, isAfter, parse } from "date-fns"
import { CalendarIcon, Clock2Icon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { Button } from "@/styles/base-nova/ui/button"
import { Calendar } from "@/styles/base-nova/ui/calendar"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-nova/ui/field"
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

export function DatePickerDateTimeRange() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    to: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
  })
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:30")

  const start = range?.from && parse(startTime, "HH:mm", range.from)
  const end = range?.from && parse(endTime, "HH:mm", range.to ?? range.from)
  const isInvalid = start && end ? !isAfter(end, start) : false

  return (
    <Field className="mx-auto w-80" data-invalid={isInvalid}>
      <FieldLabel htmlFor="date-picker-date-time-range">
        Starts and ends
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-date-time-range"
              data-empty={!start}
              aria-invalid={isInvalid}
              className="justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {start && end ? (
            <>
              {format(start, "LLL d, p")} - {format(end, "LLL d, p")}
            </>
          ) : (
            <span>Pick a start and end</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-auto gap-0 overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            onSelect={setRange}
            numberOfMonths={2}
          />
          <div className="flex flex-col gap-3 border-t p-3">
            <FieldGroup className="flex-row">
              <Field>
                <FieldLabel htmlFor="date-picker-date-time-range-start">
                  Start time
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="date-picker-date-time-range-start"
                    type="time"
                    required
                    value={startTime}
                    onChange={(event) => {
                      if (event.target.value) setStartTime(event.target.value)
                    }}
                    className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                  <InputGroupAddon>
                    <Clock2Icon className="text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="date-picker-date-time-range-end">
                  End time
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="date-picker-date-time-range-end"
                    type="time"
                    required
                    value={endTime}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid
                        ? "date-picker-date-time-range-error"
                        : undefined
                    }
                    onChange={(event) => {
                      if (event.target.value) setEndTime(event.target.value)
                    }}
                    className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                  <InputGroupAddon>
                    <Clock2Icon className="text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            {isInvalid && (
              <FieldError id="date-picker-date-time-range-error">
                The end must be after the start.
              </FieldError>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  )
}
