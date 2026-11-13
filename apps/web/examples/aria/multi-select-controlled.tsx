"use client"

import * as React from "react"
import { type Key } from "react-aria-components"

import { Button } from "@/styles/aria-fabricator/ui/button"
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

const labels = ["Bug", "Feature", "Docs", "Design", "Performance", "Security"]

export function MultiSelectControlled() {
  const [value, setValue] = React.useState<Key[]>(["Bug", "Performance"])

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <MultiSelect aria-label="Labels" value={value} onChange={setValue}>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput placeholder="Add labels" />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectList
            renderEmptyState={() => (
              <MultiSelectEmpty>No labels found.</MultiSelectEmpty>
            )}
          >
            {labels.map((label) => (
              <MultiSelectItem key={label} id={label}>
                {label}
              </MultiSelectItem>
            ))}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {value.length} selected
        </p>
        <Button
          variant="outline"
          size="sm"
          isDisabled={value.length === 0}
          onPress={() => setValue([])}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
