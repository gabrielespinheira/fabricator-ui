"use client"

import * as React from "react"

import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  TimeRangeInput,
  type TimeRangeValue,
} from "@/styles/aria-fabricator/ui/time-input"

export function TimeInputDuration() {
  const [range, setRange] = React.useState<TimeRangeValue>({
    start: "11:00",
    end: "12:45",
  })

  return (
    <Field className="w-fit">
      <FieldLabel htmlFor="time-input-duration-start">Meeting</FieldLabel>
      <TimeRangeInput
        startId="time-input-duration-start"
        value={range}
        onValueChange={setRange}
      />
    </Field>
  )
}
