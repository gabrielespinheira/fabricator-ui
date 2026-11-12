"use client"

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/aria-fabricator/ui/multi-select"

const regions = ["Lisbon", "Berlin", "Toronto", "Singapore"]

export function MultiSelectDisabled() {
  return (
    <MultiSelect
      aria-label="Regions"
      defaultValue={["Lisbon", "Berlin"]}
      isDisabled
      className="max-w-sm"
    >
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput placeholder="Choose regions" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectList>
          {regions.map((region) => (
            <MultiSelectItem key={region} id={region}>
              {region}
            </MultiSelectItem>
          ))}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}
