"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/radix-fabricator/ui/multi-select"

const labels = ["Bug", "Feature", "Docs", "Design", "Performance", "Security"]

export function MultiSelectControlled() {
  const [value, setValue] = React.useState<string[]>(["Bug", "Performance"])

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <MultiSelect items={labels} value={value} onValueChange={setValue}>
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput aria-label="Labels" placeholder="Add labels" />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectEmpty>No labels found.</MultiSelectEmpty>
          <MultiSelectList>
            {(label: string) => (
              <MultiSelectItem key={label} value={label}>
                {label}
              </MultiSelectItem>
            )}
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
          disabled={value.length === 0}
          onClick={() => setValue([])}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
