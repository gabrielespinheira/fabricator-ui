"use client"

import * as React from "react"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"
import { InputSearch } from "@/styles/aria-fabricator/ui/input-group"

const COMPONENTS = ["Button", "Checkbox", "Input", "Select", "Slider", "Switch"]

export function InputSearchField() {
  const [query, setQuery] = React.useState("")
  const matches = COMPONENTS.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <Field>
      <FieldLabel htmlFor="input-search">Search</FieldLabel>
      <InputSearch
        id="input-search"
        placeholder="Search components..."
        value={query}
        onValueChange={setQuery}
      />
      <FieldDescription aria-live="polite">
        {matches.length === 0 ? "No components match." : matches.join(", ")}
      </FieldDescription>
    </Field>
  )
}
