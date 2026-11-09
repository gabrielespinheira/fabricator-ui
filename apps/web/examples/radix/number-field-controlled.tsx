"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import { Field, FieldLabel } from "@/styles/radix-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/radix-fabricator/ui/number-field"

const PRICE_PER_TICKET = 24

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function NumberFieldControlled() {
  const [tickets, setTickets] = React.useState<number | null>(2)
  const total = (tickets ?? 0) * PRICE_PER_TICKET

  return (
    <div className="flex w-full max-w-48 flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="number-field-controlled">Tickets</FieldLabel>
        <NumberField
          id="number-field-controlled"
          value={tickets}
          onValueChange={setTickets}
          min={0}
          max={10}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          Total {currency.format(total)}
        </p>
        <Button variant="outline" size="sm" onClick={() => setTickets(2)}>
          Reset
        </Button>
      </div>
    </div>
  )
}
