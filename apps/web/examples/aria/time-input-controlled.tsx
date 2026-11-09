"use client"

import * as React from "react"

import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import { TimeInput } from "@/styles/aria-fabricator/ui/time-input"

export function TimeInputControlled() {
  const [time, setTime] = React.useState<string | undefined>("14:00")

  return (
    <Field className="max-w-48">
      <FieldLabel htmlFor="time-input-controlled">Pickup</FieldLabel>
      <TimeInput
        id="time-input-controlled"
        value={time}
        onValueChange={setTime}
      />
      <p className="text-sm text-muted-foreground tabular-nums">
        Value: {time ?? "none"}
      </p>
    </Field>
  )
}
