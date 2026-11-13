"use client"

import {
  Field,
  FieldDescription,
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
      <FieldLabel htmlFor="multi-select-languages">Languages</FieldLabel>
      <MultiSelect items={languages} defaultValue={["TypeScript"]}>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput
            id="multi-select-languages"
            aria-describedby="multi-select-languages-description"
            placeholder="Add languages"
          />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectEmpty>No languages found.</MultiSelectEmpty>
          <MultiSelectList>
            {(language: string) => (
              <MultiSelectItem key={language} value={language}>
                {language}
              </MultiSelectItem>
            )}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <FieldDescription id="multi-select-languages-description">
        Pick every language the role uses. Backspace removes the last one.
      </FieldDescription>
    </Field>
  )
}
