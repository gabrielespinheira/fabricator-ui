"use client"

import {
  Field,
  FieldDescription,
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

const languages = [
  "TypeScript",
  "Rust",
  "Go",
  "Python",
  "Swift",
  "Kotlin",
  "Elixir",
]

export function MultiSelectField() {
  return (
    <Field className="max-w-sm">
      <MultiSelect
        defaultValue={["TypeScript"]}
        className="flex flex-col gap-2"
      >
        <FieldLabel>Languages</FieldLabel>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput
            aria-describedby="multi-select-languages-description"
            placeholder="Add languages"
          />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectList
            renderEmptyState={() => (
              <MultiSelectEmpty>No languages found.</MultiSelectEmpty>
            )}
          >
            {languages.map((language) => (
              <MultiSelectItem key={language} id={language}>
                {language}
              </MultiSelectItem>
            ))}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <FieldDescription id="multi-select-languages-description">
        Pick every language the role uses. Backspace removes the last one.
      </FieldDescription>
    </Field>
  )
}
