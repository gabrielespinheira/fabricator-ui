"use client"

import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/base-fabricator/ui/multi-select"

const reviewers = ["Ana", "Bruno", "Carla", "Diego", "Eva"]

export function MultiSelectInvalid() {
  return (
    <Field data-invalid className="max-w-sm">
      <FieldLabel htmlFor="multi-select-reviewers">Reviewers</FieldLabel>
      <MultiSelect items={reviewers}>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput
            id="multi-select-reviewers"
            aria-invalid
            aria-describedby="multi-select-reviewers-error"
            placeholder="Add reviewers"
          />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectEmpty>No reviewers found.</MultiSelectEmpty>
          <MultiSelectList>
            {(reviewer: string) => (
              <MultiSelectItem key={reviewer} value={reviewer}>
                {reviewer}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <FieldError id="multi-select-reviewers-error">
        Add at least one reviewer.
      </FieldError>
    </Field>
  )
}
