"use client"

import * as React from "react"

import { Button } from "@/styles/aria-fabricator/ui/button"
import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

const PRICE_PER_TICKET = 24

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function NumberFieldControlled() {
  const [tickets, setTickets] = React.useState(2)
  const total = (Number.isNaN(tickets) ? 0 : tickets) * PRICE_PER_TICKET

  return (
    <div className="flex w-full max-w-48 flex-col gap-3">
      <Field>
        <NumberField
          value={tickets}
          onChange={setTickets}
          minValue={0}
          maxValue={10}
        >
          <FieldLabel>Tickets</FieldLabel>
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
        <Button variant="outline" size="sm" onPress={() => setTickets(2)}>
          Reset
        </Button>
      </div>
    </div>
  )
}
