"use client"

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/base-fabricator/ui/multi-select"

const regions = ["Lisbon", "Berlin", "Toronto", "Singapore"]

export function MultiSelectDisabled() {
  return (
    <MultiSelect items={regions} defaultValue={["Lisbon", "Berlin"]} disabled>
      <MultiSelectTrigger className="max-w-sm">
        <MultiSelectValue />
        <MultiSelectInput aria-label="Regions" placeholder="Choose regions" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectList>
          {(region: string) => (
            <MultiSelectItem key={region} value={region}>
              {region}
            </MultiSelectItem>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}
