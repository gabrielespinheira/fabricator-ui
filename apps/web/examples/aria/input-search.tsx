"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Field, FieldLabel } from "@/styles/aria-nova/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/aria-nova/ui/input-group"

export function InputSearch() {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <Field>
      <FieldLabel htmlFor="input-search">Search</FieldLabel>
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          id="input-search"
          type="search"
          placeholder="Search components..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </Field>
  )
}
