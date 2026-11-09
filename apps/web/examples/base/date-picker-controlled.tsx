"use client"

import * as React from "react"

import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"

export function DatePickerControlled() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 10, 12)
  )

  return (
    <Field className="max-w-64">
      <FieldLabel htmlFor="date-picker-controlled">Publish on</FieldLabel>
      <DatePicker
        id="date-picker-controlled"
        value={date}
        onValueChange={setDate}
      />
      <p className="text-sm text-muted-foreground tabular-nums">
        {date
          ? date.toLocaleDateString("en-US", { dateStyle: "full" })
          : "No date"}
      </p>
    </Field>
  )
}
