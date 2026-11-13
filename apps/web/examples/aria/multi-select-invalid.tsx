"use client"

import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/aria-fabricator/ui/multi-select"

const reviewers = ["Ana", "Bruno", "Carla", "Diego", "Eva"]

export function MultiSelectInvalid() {
  return (
    <Field data-invalid className="max-w-sm">
      <MultiSelect isInvalid className="flex flex-col gap-2">
        <FieldLabel>Reviewers</FieldLabel>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput
            aria-describedby="multi-select-reviewers-error"
            placeholder="Add reviewers"
          />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectList
            renderEmptyState={() => (
              <MultiSelectEmpty>No reviewers found.</MultiSelectEmpty>
            )}
          >
            {reviewers.map((reviewer) => (
              <MultiSelectItem key={reviewer} id={reviewer}>
                {reviewer}
              </MultiSelectItem>
            ))}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <FieldError id="multi-select-reviewers-error">
        Add at least one reviewer.
      </FieldError>
    </Field>
  )
}
