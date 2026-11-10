// What Base UI's combobox and cmdk decide without a DOM: which items a query
// keeps, how a selection changes, and how a menu counts what it still shows.

import * as React from "react"

export function normalizeText(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Base UI's default: an item's `label`, then its `value`, then the item. */
export function getItemLabel<TItem>(
  item: TItem,
  itemToString?: (item: TItem) => string
) {
  if (itemToString) return itemToString(item)
  if (typeof item === "string") return item
  if (typeof item === "number") return String(item)
  if (typeof item === "object" && item !== null) {
    if ("label" in item && typeof item.label === "string") return item.label
    if ("value" in item && item.value != null) return String(item.value)
  }
  return ""
}

export function matchesQuery(label: string, query: string) {
  return normalizeText(label).includes(normalizeText(query))
}

export type ItemFilter = (
  item: unknown,
  query: string,
  itemToString?: (item: unknown) => string
) => boolean

function isItemGroup(entry: unknown): entry is { items: readonly unknown[] } {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "items" in entry &&
    Array.isArray(entry.items)
  )
}

/**
 * The items a query keeps. Groups (`{ value, items }`) are filtered inside and
 * dropped when empty. `filter: null` keeps everything, as on the website.
 */
export function filterItems<TEntry>(
  entries: readonly TEntry[],
  query: string,
  {
    filter,
    itemToString,
  }: {
    filter?: ItemFilter | null
    itemToString?: (item: unknown) => string
  } = {}
) {
  if (filter === null) return [...entries]
  const keeps = (item: unknown) =>
    filter
      ? filter(item, query, itemToString)
      : matchesQuery(getItemLabel(item, itemToString), query)
  const result: TEntry[] = []
  for (const entry of entries) {
    if (!isItemGroup(entry)) {
      if (keeps(entry)) result.push(entry)
      continue
    }
    const items = entry.items.filter(keeps)
    if (items.length > 0) result.push({ ...entry, items })
  }
  return result
}

type IsEqual<TItem> = (item: TItem, value: TItem) => boolean

export function isItemSelected<TItem>(
  selection: readonly TItem[],
  item: TItem,
  isEqual: IsEqual<TItem> = Object.is
) {
  return selection.some((value) => isEqual(item, value))
}

export function removeItem<TItem>(
  selection: readonly TItem[],
  item: TItem,
  isEqual: IsEqual<TItem> = Object.is
) {
  return selection.filter((value) => !isEqual(item, value))
}

/** The selection after pressing an item. */
export function selectItem<TItem>(
  selection: readonly TItem[],
  item: TItem,
  {
    multiple,
    isEqual = Object.is,
  }: { multiple: boolean; isEqual?: IsEqual<TItem> }
) {
  if (!multiple) return [item]
  return isItemSelected(selection, item, isEqual)
    ? removeItem(selection, item, isEqual)
    : [...selection, item]
}

function isSubsequence(text: string, query: string) {
  let position = 0
  for (const character of text) {
    if (character === query[position]) position += 1
    if (position === query.length) return true
  }
  return false
}

function scoreText(text: string, query: string) {
  if (text === query) return 1
  if (text.startsWith(query)) return 0.9
  if (` ${text.replace(/[-_/]/g, " ")}`.includes(` ${query}`)) return 0.8
  if (text.includes(query)) return 0.6
  return isSubsequence(text, query) ? 0.3 : 0
}

/** cmdk's contract: 0 hides an item, anything higher keeps it. */
export function scoreCommand(
  value: string,
  query: string,
  keywords: readonly string[] = []
) {
  const search = normalizeText(query)
  if (!search) return 1
  const keywordScore = Math.max(
    0,
    ...keywords.map((keyword) => scoreText(normalizeText(keyword), search))
  )
  return Math.max(scoreText(normalizeText(value), search), keywordScore * 0.9)
}

/** cmdk reads an item's value from its text when it isn't given one. */
export function getChildrenText(children: React.ReactNode): string {
  let text = ""
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child)
    } else if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      text += getChildrenText(child.props.children)
    }
  })
  return text
}

export type CommandFilter = (
  value: string,
  query: string,
  keywords?: readonly string[]
) => number

type CommandEntry = {
  id: string
  value: string
  keywords?: readonly string[]
  groupId?: string
}

export type CommandSnapshot = {
  query: string
  count: number
  groupCounts: ReadonlyMap<string, number>
}

function isSameSnapshot(a: CommandSnapshot, b: CommandSnapshot) {
  if (a.query !== b.query || a.count !== b.count) return false
  if (a.groupCounts.size !== b.groupCounts.size) return false
  for (const [groupId, count] of a.groupCounts) {
    if (b.groupCounts.get(groupId) !== count) return false
  }
  return true
}

/**
 * Items register here so the parts that depend on all of them (the empty state,
 * a group's visibility) can read a count without walking the React tree.
 */
export function createCommandStore() {
  const entries = new Map<string, CommandEntry>()
  const visibility = new Map<string, boolean>()
  const listeners = new Set<() => void>()
  let filter: CommandFilter = scoreCommand
  let shouldFilter = true
  let query = ""

  const isVisible = (value: string, keywords?: readonly string[]) =>
    !shouldFilter || query === "" || filter(value, query, keywords) > 0

  let snapshot: CommandSnapshot = { query, count: 0, groupCounts: new Map() }

  const publish = (next: CommandSnapshot, visibilityChanged = false) => {
    if (!visibilityChanged && isSameSnapshot(snapshot, next)) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  const refresh = () => {
    const groupCounts = new Map<string, number>()
    let count = 0
    let visibilityChanged = false
    for (const entry of entries.values()) {
      const isMatch = isVisible(entry.value, entry.keywords)
      if (visibility.get(entry.id) !== isMatch) visibilityChanged = true
      visibility.set(entry.id, isMatch)
      if (!isMatch) continue
      count += 1
      if (entry.groupId !== undefined) {
        groupCounts.set(
          entry.groupId,
          (groupCounts.get(entry.groupId) ?? 0) + 1
        )
      }
    }
    publish({ query, count, groupCounts }, visibilityChanged)
  }

  // Mounting or removing one item doesn't change any other item's score.
  const changeCounts = (
    changes: readonly { entry: CommandEntry; delta: number }[]
  ) => {
    const groupCounts = new Map(snapshot.groupCounts)
    let count = snapshot.count
    for (const { entry, delta } of changes) {
      count += delta
      if (entry.groupId === undefined || delta === 0) continue
      const groupCount = (groupCounts.get(entry.groupId) ?? 0) + delta
      if (groupCount === 0) groupCounts.delete(entry.groupId)
      else groupCounts.set(entry.groupId, groupCount)
    }
    publish({ query, count, groupCounts })
  }

  return {
    isVisible,
    isItemVisible: (id: string) =>
      visibility.get(id) ?? (!shouldFilter || query === ""),
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    register(entry: CommandEntry) {
      const previous = entries.get(entry.id)
      const wasVisible = visibility.get(entry.id)
      entries.set(entry.id, entry)
      const isMatch = isVisible(entry.value, entry.keywords)
      visibility.set(entry.id, isMatch)
      changeCounts([
        ...(previous && wasVisible ? [{ entry: previous, delta: -1 }] : []),
        { entry, delta: isMatch ? 1 : 0 },
      ])
      return () => {
        if (entries.get(entry.id) !== entry) return
        entries.delete(entry.id)
        const wasVisible = visibility.get(entry.id)
        visibility.delete(entry.id)
        if (wasVisible) changeCounts([{ entry, delta: -1 }])
      }
    },
    setQuery(next: string) {
      if (next === query) return
      query = next
      refresh()
    },
    configure(options: { filter?: CommandFilter; shouldFilter?: boolean }) {
      const nextFilter =
        "filter" in options ? (options.filter ?? scoreCommand) : filter
      const nextShouldFilter = options.shouldFilter ?? shouldFilter
      if (nextFilter === filter && nextShouldFilter === shouldFilter) return
      filter = nextFilter
      shouldFilter = nextShouldFilter
      refresh()
    },
  }
}
