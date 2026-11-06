// A Select's values and labels, and how it opens. No React Native imports, so
// these stay testable anywhere.

import type * as React from "react"

type SelectEntry = { label: React.ReactNode; value: unknown }
type SelectGroupEntry = { value: unknown; items: readonly SelectEntry[] }

/** Base UI's `items`: a record of labels, a list of them, or groups of them. */
export type SelectItems =
  | Record<string, React.ReactNode>
  | readonly (SelectEntry | SelectGroupEntry)[]

// Tailwind's sm: the width from which a popover has room beside a finger.
const SM_BREAKPOINT = 640

export function getSelectPresentation(windowWidth: number) {
  return windowWidth >= SM_BREAKPOINT ? "popover" : "sheet"
}

export function toggleSelectValue(
  current: unknown,
  value: unknown,
  multiple: boolean
) {
  if (!multiple) return value
  const list: readonly unknown[] = Array.isArray(current) ? current : []
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value]
}

export function isValueSelected(
  current: unknown,
  value: unknown,
  multiple: boolean
) {
  if (multiple) return Array.isArray(current) && current.includes(value)
  return Object.is(current, value)
}

export function isSelectValueEmpty(value: unknown) {
  if (Array.isArray(value)) return value.length === 0
  return value === null || value === undefined
}

function isItemList(
  items: SelectItems
): items is readonly (SelectEntry | SelectGroupEntry)[] {
  return Array.isArray(items)
}

function isGroup(
  entry: SelectEntry | SelectGroupEntry
): entry is SelectGroupEntry {
  return "items" in entry
}

function findLabel(items: SelectItems, value: unknown): React.ReactNode {
  if (!isItemList(items)) {
    return typeof value === "string" ? items[value] : undefined
  }
  for (const entry of items) {
    if (isGroup(entry)) {
      const label = findLabel(entry.items, value)
      if (label !== undefined) return label
    } else if (Object.is(entry.value, value ?? null)) {
      return entry.label
    }
  }
  return undefined
}

/** What a value reads as. A null item in `items` labels the empty value. */
export function getSelectLabel(
  items: SelectItems | undefined,
  value: unknown
): React.ReactNode {
  if (!items) return undefined
  if (Array.isArray(value)) {
    const labels = value.map((entry) => findLabel(items, entry))
    return labels.every((label) => label !== undefined)
      ? labels.join(", ")
      : undefined
  }
  return findLabel(items, value)
}
