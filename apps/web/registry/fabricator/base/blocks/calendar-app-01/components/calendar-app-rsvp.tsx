"use client"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"

// Your answer to an invitation, as a segmented control. Its state API differs
// by base; the radix and aria copies of this file keep the same props.

type CalendarAppRsvpValue = "yes" | "maybe" | "no"

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
] as const

function isRsvpValue(value: unknown): value is CalendarAppRsvpValue {
  return OPTIONS.some((option) => option.value === value)
}

export function CalendarAppRsvp({
  value,
  onValueChange,
  "aria-labelledby": labelledBy,
}: {
  value: CalendarAppRsvpValue | undefined
  onValueChange: (value: CalendarAppRsvpValue) => void
  "aria-labelledby": string
}) {
  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      variant="outline"
      size="sm"
      value={value ? [value] : []}
      onValueChange={(values) => {
        // One answer: take the newly pressed item, keep the current one.
        const next = values.find((entry) => entry !== value)
        if (isRsvpValue(next)) onValueChange(next)
      }}
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
