import { getCoverProperty } from "./property-model"
import type { PropertyDefinition, PropertyOptionGroup } from "./property-types"

type KanbanColumn = {
  id: string
  name: string
  /** A palette name, a role, or any CSS colour. */
  color?: string
  /** A built-in status glyph (`status-review`) or an app's icon. */
  icon?: string
  group?: PropertyOptionGroup
  limit?: number
  limitMode?: "warn" | "block"
  isLocked?: boolean
}

type KanbanLane = { id: string; name: string }

type KanbanPlacement = {
  columnId: string
  laneId: string | null
  afterId: string | null
  beforeId: string | null
  isEndLoaded: boolean
}

type KanbanChange<Item> = {
  id: string
  reason:
    | "move"
    | "create"
    | "edit"
    | "duplicate"
    | "archive"
    | "delete"
    | "undo"
  cardIds: readonly string[]
  placement?: KanbanPlacement
  placements?: readonly { id: string; placement: KanbanPlacement }[]
  apply: (items: readonly Item[]) => Item[]
}

type KanbanPage<Item> = {
  items: readonly Item[]
  nextCursor: string | null
  total?: number
  isLoading?: boolean
  error?: unknown
}

type KanbanLoader<Item> = (request: {
  columnId: string
  cursor: string | null
  limit: number
  signal: AbortSignal
}) => Promise<KanbanPage<Item>>

const unassignedColumn = { id: "__kanban_unassigned", name: "Unassigned" }
const unknownColumn = {
  id: "__kanban_unknown",
  name: "Unknown",
  isLocked: true,
}

function groupKanbanItems<Item>(
  items: readonly Item[],
  columns: readonly KanbanColumn[],
  getColumnId: (item: Item) => string | null
) {
  const groups = new Map(
    columns.map((column) => [column.id, { column, items: [] as Item[] }])
  )
  for (const item of items) {
    const columnId = getColumnId(item)
    const fallback = columnId === null ? unassignedColumn : unknownColumn
    const group = groups.get(columnId ?? fallback.id) ?? groups.get(fallback.id)
    if (group) group.items.push(item)
    else groups.set(fallback.id, { column: fallback, items: [item] })
  }
  const unknown = groups.get(unknownColumn.id)
  groups.delete(unknownColumn.id)
  return unknown ? [...groups.values(), unknown] : [...groups.values()]
}

function getKanbanPlacement(
  columnId: string,
  laneId: string | null,
  destinationIds: readonly string[],
  movedIds: readonly string[],
  index: number,
  isEndLoaded: boolean
): KanbanPlacement {
  const moved = new Set(movedIds)
  const boundary = Math.max(0, index)
  const before = destinationIds
    .slice(0, boundary)
    .filter((id) => !moved.has(id))
  const after = destinationIds.slice(boundary).find((id) => !moved.has(id))
  return {
    columnId,
    laneId,
    afterId: before.at(-1) ?? null,
    beforeId: after ?? null,
    isEndLoaded,
  }
}

function applyKanbanMove<Item>(
  items: readonly Item[],
  ids: readonly string[],
  placement: KanbanPlacement,
  getId: (item: Item) => string,
  moveTo: (item: Item, placement: KanbanPlacement) => Item
) {
  const moved = new Set(ids)
  const records = new Map<string, Item>()
  const remaining = items.filter((item) => {
    const id = getId(item)
    if (!moved.has(id)) return true
    records.set(id, item)
    return false
  })
  const beforeIndex = remaining.findIndex(
    (item) => getId(item) === placement.beforeId
  )
  const afterIndex = remaining.findIndex(
    (item) => getId(item) === placement.afterId
  )
  const index =
    beforeIndex >= 0
      ? beforeIndex
      : afterIndex >= 0
        ? afterIndex + 1
        : remaining.length
  const moving = [...moved].flatMap((id) => {
    const record = records.get(id)
    return record === undefined ? [] : [moveTo(record, placement)]
  })
  return [...remaining.slice(0, index), ...moving, ...remaining.slice(index)]
}

function mergeKanbanPage<Item>(
  current: readonly Item[],
  incoming: readonly Item[],
  getId: (item: Item) => string
) {
  return [
    ...new Map(
      [...current, ...incoming].map((item) => [getId(item), item])
    ).values(),
  ]
}

/** Writes a saved optimistic change into the pages owned by the loader. */
function applyKanbanPageChange<Item>(
  pages: ReadonlyMap<string, KanbanPage<Item>>,
  apply: (items: readonly Item[]) => Item[],
  getId: (item: Item) => string,
  getColumnId: (item: Item) => string | null
) {
  const before = mergeKanbanPage(
    [],
    [...pages.values()].flatMap((page) => page.items),
    getId
  )
  const after = apply(before)
  const toColumn = (item: Item) => getColumnId(item) ?? unassignedColumn.id
  const previousCounts = new Map<string, number>()
  for (const item of before) {
    const id = toColumn(item)
    previousCounts.set(id, (previousCounts.get(id) ?? 0) + 1)
  }
  const groups = new Map<string, Item[]>()
  for (const item of after) {
    const id = toColumn(item)
    const group = groups.get(id)
    if (group) group.push(item)
    else groups.set(id, [item])
  }
  const result = new Map(pages)
  for (const id of new Set([...pages.keys(), ...groups.keys()])) {
    const page = pages.get(id)
    const items = groups.get(id) ?? []
    if (!page) {
      result.set(id, { items, nextCursor: null })
      continue
    }
    if (
      page.items.length === items.length &&
      page.items.every((item, index) => item === items[index])
    )
      continue
    result.set(id, {
      ...page,
      items,
      total:
        page.total === undefined
          ? undefined
          : Math.max(
              0,
              page.total + items.length - (previousCounts.get(id) ?? 0)
            ),
    })
  }
  return result
}

function readKanbanField(item: unknown, property: string): unknown {
  return item && typeof item === "object" && Object.hasOwn(item, property)
    ? Object.getOwnPropertyDescriptor(item, property)?.value
    : undefined
}

function getKanbanId(item: unknown): string {
  const value: unknown = readKanbanField(item, "id")
  if (typeof value !== "string" || !value)
    throw new TypeError("Kanban records require a string ID or getId.")
  return value
}

function getKanbanTitle(item: unknown): string {
  const value: unknown = readKanbanField(item, "title")
  return typeof value === "string" && value.trim() ? value : "Untitled"
}

function getKanbanDropIndex(centers: readonly number[], pointer: number) {
  const index = centers.findIndex((center) => pointer < center)
  return index < 0 ? centers.length : index
}

/** A card's place in its list before any drag moved it. */
type KanbanCardBox = { index: number; top: number; height: number }

/**
 * Where a dragged card would land: before the first card whose centre is below
 * the dragged card's, in the list as it is without the dragged card. Measuring
 * it that way keeps cards of unequal height from swapping back and forth.
 */
function getKanbanDropSlot({
  boxes,
  sourceIndex,
  height,
  center,
  gap,
}: {
  boxes: readonly KanbanCardBox[]
  sourceIndex: number | null
  height: number
  center: number
  gap: number
}): { index: number; top: number } {
  const distance = height + gap
  let end = { index: 0, top: 0 }
  for (const box of boxes) {
    if (box.index === sourceIndex) continue
    const top =
      sourceIndex !== null && box.index > sourceIndex
        ? box.top - distance
        : box.top
    if (center < top + box.height / 2) return { index: box.index, top }
    end = { index: box.index + 1, top: top + box.height + gap }
  }
  return end
}

/** How far a card slides while another is dragged: up into the place it left, down for its slot. */
function getKanbanCardShift({
  index,
  sourceIndex,
  dropIndex,
  distance,
}: {
  index: number
  sourceIndex: number | null
  dropIndex: number | null
  distance: number
}) {
  if (index === sourceIndex) return 0
  const isPastSource = sourceIndex !== null && index > sourceIndex
  const isPastDrop = dropIndex !== null && index >= dropIndex
  if (isPastSource === isPastDrop) return 0
  return isPastDrop ? distance : -distance
}

function getKanbanLimitState(column: KanbanColumn, count: number) {
  if (column.limit === undefined || count < column.limit) return null
  return count > column.limit ? "over" : "at"
}

/** The columns with one renamed, or null when there is nothing to save. */
function renameKanbanColumn(
  columns: readonly KanbanColumn[],
  id: string,
  text: string
) {
  const name = text.trim()
  const column = columns.find((entry) => entry.id === id)
  if (!column || !name || name === column.name) return null
  return columns.map((entry) => (entry.id === id ? { ...entry, name } : entry))
}

function getKanbanRange(ids: readonly string[], from: string, to: string) {
  const start = ids.indexOf(from)
  const end = ids.indexOf(to)
  if (start < 0 || end < 0) return ids.filter((id) => id === to)
  return ids.slice(Math.min(start, end), Math.max(start, end) + 1)
}

/** Adds cards at a placement. Cards already there stay where they are. */
function insertKanbanItems<Item>(
  items: readonly Item[],
  created: readonly Item[],
  placement: KanbanPlacement,
  getId: (item: Item) => string
) {
  const known = new Set(items.map(getId))
  const added = created.filter((item) => !known.has(getId(item)))
  const before = items.findIndex((item) => getId(item) === placement.beforeId)
  const after = items.findIndex((item) => getId(item) === placement.afterId)
  const index = before >= 0 ? before : after >= 0 ? after + 1 : items.length
  return [...items.slice(0, index), ...added, ...items.slice(index)]
}

type KanbanCardView = {
  /** The property whose values are the columns. */
  groupBy?: string
  visibleProperties?: readonly string[]
  cover?: string | null
}

/**
 * Whether cards show a property's value. Undefined for the ones they never list:
 * the title, and the property the columns already say.
 */
function isKanbanFieldShown(
  property: PropertyDefinition,
  { groupBy, visibleProperties }: KanbanCardView
): boolean | undefined {
  if (property.type === "title" || property.id === groupBy) return undefined
  return (
    visibleProperties?.includes(property.id) ?? property.visibility !== "hide"
  )
}

/** The view's properties with one put on the cards or taken off them. */
function showKanbanField(
  properties: readonly PropertyDefinition[],
  { visibleProperties }: KanbanCardView,
  id: string,
  isShown: boolean
) {
  const others = (
    visibleProperties ??
    properties
      .filter(({ visibility }) => visibility !== "hide")
      .map((property) => property.id)
  ).filter((entry) => entry !== id)
  return isShown ? [...others, id] : others
}

/** Where card covers come from. A property off the cards can't cover them. */
function getKanbanCover(
  properties: readonly PropertyDefinition[],
  view: KanbanCardView
) {
  return getCoverProperty(
    properties.filter((property) => isKanbanFieldShown(property, view)),
    view.cover
  )
}

function getKanbanScrollSpeed(pointer: number, start: number, end: number) {
  const edge = Math.min(64, (end - start) / 3)
  if (edge <= 0 || pointer < start - edge || pointer > end + edge) return 0
  if (pointer < start + edge)
    return -Math.min(20, ((start + edge - pointer) / edge) * 20)
  if (pointer > end - edge)
    return Math.min(20, ((pointer - end + edge) / edge) * 20)
  return 0
}

export {
  applyKanbanMove,
  applyKanbanPageChange,
  getKanbanCardShift,
  getKanbanCover,
  getKanbanDropIndex,
  getKanbanDropSlot,
  getKanbanId,
  getKanbanLimitState,
  getKanbanPlacement,
  getKanbanRange,
  getKanbanScrollSpeed,
  getKanbanTitle,
  groupKanbanItems,
  insertKanbanItems,
  isKanbanFieldShown,
  mergeKanbanPage,
  readKanbanField,
  renameKanbanColumn,
  showKanbanField,
  unassignedColumn,
  type KanbanCardBox,
  type KanbanChange,
  type KanbanColumn,
  type KanbanLane,
  type KanbanLoader,
  type KanbanPage,
  type KanbanPlacement,
}
