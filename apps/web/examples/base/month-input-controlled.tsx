"use client"

import * as React from "react"

import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import { MonthInput } from "@/styles/base-fabricator/ui/month-input"

export function MonthInputControlled() {
  const [month, setMonth] = React.useState<string | undefined>("2026-11")

  return (
    <Field className="max-w-52">
      <FieldLabel htmlFor="month-input-controlled">Statement</FieldLabel>
      <MonthInput
        id="month-input-controlled"
        value={month}
        onValueChange={setMonth}
      />
      <p className="text-sm text-muted-foreground tabular-nums">
        Value: {month ?? "none"}
      </p>
    </Field>
  )
}
