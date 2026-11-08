"use client"

import * as React from "react"

import { Button } from "@/styles/aria-fabricator/ui/button"
import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"

export function DatePickerForm() {
  const [submitted, setSubmitted] = React.useState<string | null>(null)

  return (
    <form
      className="w-full max-w-64"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setSubmitted(String(data.get("check-in") ?? ""))
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="date-picker-check-in">Check-in</FieldLabel>
          <DatePicker
            id="date-picker-check-in"
            name="check-in"
            required
            defaultValue={new Date(2026, 11, 3)}
          />
          <FieldDescription>
            The form sends{" "}
            <code className="font-mono tabular-nums">
              {submitted === null ? "yyyy-MM-dd" : submitted || "nothing"}
            </code>
            .
          </FieldDescription>
        </Field>
        <Button type="submit" className="self-start">
          Book
        </Button>
      </FieldGroup>
    </form>
  )
}
