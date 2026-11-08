"use client"

import * as React from "react"

import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"

export function DatePickerDateTime() {
  const [value, setValue] = React.useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12, 10, 30)
  )

  return (
    <Field className="max-w-72">
      <FieldLabel htmlFor="date-picker-date-time">Date and time</FieldLabel>
      <DatePicker
        id="date-picker-date-time"
        hasTime
        value={value}
        onValueChange={setValue}
      />
    </Field>
  )
}
