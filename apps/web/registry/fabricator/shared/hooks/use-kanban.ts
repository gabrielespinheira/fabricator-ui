"use client"

import * as React from "react"

import { useKanbanPages } from "@/registry/bases/__base__/hooks/use-kanban-pages"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import {
  applyKanbanMove,
  getKanbanCover,
  getKanbanId,
  getKanbanPlacement,
  getKanbanRange,
  getKanbanTitle,
  groupKanbanItems,
  insertKanbanItems,
  isKanbanFieldShown,
  mergeKanbanPage,
  readKanbanField,
  showKanbanField,
  unassignedColumn,
  type KanbanChange,
  type KanbanColumn,
  type KanbanLane,
  type KanbanLoader,
  type KanbanPage,
  type KanbanPlacement,
} from "@/registry/bases/__base__/lib/kanban-model"
import {
  comparePropertyValues,
  formatPropertyValue,
  isMultiProperty,
  matchesPropertyFilters,
  type PropertyDefinition,
  type PropertyFilterGroup,
  type PropertySort,
} from "@/registry/bases/__base__/lib/property-model"

type KanbanView = {
  /** The property whose values are the columns. */
  groupBy?: string
  search?: string
  filters?: PropertyFilterGroup
  sort?: readonly PropertySort[]
  hiddenColumns?: readonly string[]
  collapsedColumns?: readonly string[]
  collapsedLanes?: readonly string[]
  visibleProperties?: readonly string[]
  hideEmpty?: boolean
  colorColumns?: boolean
  /**
   * The files property whose first picture covers a card: the first one there
   * is when left out, none when null.
   */
  cover?: string | null
  /** Fills the cover's frame, or fits the whole picture in it. */
  coverFit?: "fill" | "fit"
}

/** What a composer knows about a card before the app makes it. */
type KanbanDraft = {
  title: string
  columnId: string
  laneId: string | null
  /** The value a drop on the column would write; null for "no value". */
  value: unknown
}

type KanbanNotice = { message: string; canUndo: boolean }

type KanbanOptions<Item> = {
  items?: readonly Item[]
  columns?: readonly KanbanColumn[]
  properties?: readonly PropertyDefinition[]
  groupBy?: string
  lanes?: readonly KanbanLane[]
  getLaneId?: (item: Item) => string | null
  getId?: (item: Item) => string
  getTitle?: (item: Item) => string
  getColumnId?: (item: Item) => string | null
  getValue?: (item: Item, propertyId: string) => unknown
  setValue?: (item: Item, propertyId: string, value: unknown) => Item
  moveTo?: (item: Item, placement: KanbanPlacement) => Item
  /** Makes a card from a composer's draft. Without it columns have no composer. */
  createItem?: (draft: KanbanDraft) => Item
  /** Whether a card's menu offers Delete. Every card, by default. */
  canDelete?: (item: Item) => boolean
  canMove?: (item: Item, placement: KanbanPlacement) => boolean | string
  load?: KanbanLoader<Item>
  queryKey?: string
  pageSize?: number
  pages?: ReadonlyMap<string, KanbanPage<Item>>
  onLoadMore?: (columnId: string) => void
  onRetry?: (columnId: string) => void
  onCardsChange?: (change: KanbanChange<Item>) => void | Promise<void>
  onColumnsChange?: (columns: KanbanColumn[]) => void
  view?: KanbanView
  defaultView?: KanbanView
  onViewChange?: (view: KanbanView) => void
}

const emptyItems: readonly never[] = []
const emptyView: KanbanView = {}

function useKanban<Item>(options: KanbanOptions<Item>) {
  const {
    items = emptyItems,
    properties = emptyItems,
    getValue = readKanbanField,
    getId = getKanbanId,
    getTitle = getKanbanTitle,
    getLaneId,
    onCardsChange,
    onColumnsChange,
  } = options
  const types = usePropertyTypes()
  const definitions = React.useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties]
  )
  const [internalView, setInternalView] = React.useState(
    options.defaultView ?? emptyView
  )
  const view = options.view ?? internalView
  const setView = (next: KanbanView) => {
    if (!options.view) setInternalView(next)
    options.onViewChange?.(next)
  }
  // The columns passed in belong to the board's own grouping. Another grouping,
  // picked in the view, draws its columns from that property.
  const groupBy = view.groupBy ?? options.groupBy
  const isOwnGroup = groupBy === options.groupBy
  const ownColumns = isOwnGroup ? options.columns : undefined
  const readColumnId = isOwnGroup ? options.getColumnId : undefined
  const group = groupBy === undefined ? undefined : definitions.get(groupBy)
  const columns = React.useMemo<readonly KanbanColumn[]>(() => {
    if (ownColumns) return ownColumns
    if (group?.type === "checkbox")
      return [
        { id: "false", name: "Unchecked" },
        { id: "true", name: "Checked" },
      ]
    return (
      group?.options
        ?.filter(({ isArchived }) => !isArchived)
        .map(({ value, label, color, icon, group: stage }) => ({
          id: value,
          name: label,
          color,
          icon,
          group: stage,
        })) ?? emptyItems
    )
  }, [ownColumns, group])
  const readLaneId = React.useCallback(
    (item: Item) => {
      const id = getLaneId?.(item)
      return options.lanes?.some((lane) => lane.id === id) ? (id ?? null) : null
    },
    [getLaneId, options.lanes]
  )
  const getColumnId = React.useCallback(
    (item: Item) => {
      if (readColumnId) return readColumnId(item)
      const stored = getValue(item, groupBy ?? "columnId")
      const value: unknown = Array.isArray(stored) ? stored[0] : stored
      return typeof value === "string" && value
        ? value
        : typeof value === "boolean"
          ? String(value)
          : null
    },
    [readColumnId, getValue, groupBy]
  )
  const columnIds = React.useMemo(() => columns.map(({ id }) => id), [columns])
  const {
    pages: loaded,
    loadMore,
    captureCommit,
  } = useKanbanPages({
    load: options.load,
    queryKey: options.queryKey ?? "",
    columnIds,
    getId,
    pageSize: options.pageSize ?? 50,
  })
  const pages = options.pages ?? loaded

  const isPaged = !!(options.load || options.pages)

  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [anchorId, setAnchorId] = React.useState<string | null>(null)
  // Changes the app hasn't settled, replayed over whatever it has saved.
  const [pending, setPending] =
    React.useState<readonly KanbanChange<Item>[]>(emptyItems)
  const [failure, setFailure] = React.useState<{
    change: KanbanChange<Item>
    inverse?: KanbanChange<Item>
    message: string
  } | null>(null)
  const [announcement, setAnnouncement] = React.useState("")
  const [moveError, setMoveError] = React.useState<string | null>(null)
  const [undo, setUndo] = React.useState<KanbanChange<Item> | null>(null)
  const [notice, setNotice] = React.useState<KanbanNotice | null>(null)
  // The last save of each card, so changes to one card reach the app in order.
  const saves = React.useRef(new Map<string, Promise<void>>())

  const source = React.useMemo(() => {
    if (!pages) return items
    return mergeKanbanPage(
      [],
      [...pages.values()].flatMap((page) => page.items),
      getId
    )
  }, [items, pages, getId])
  const records = React.useMemo(
    () =>
      pending.reduce<readonly Item[]>(
        (rows, change) => change.apply(rows),
        source
      ),
    [pending, source]
  )
  const byId = React.useMemo(
    () => new Map(records.map((item) => [getId(item), item])),
    [records, getId]
  )
  const filtered = React.useMemo(() => {
    const query = view.search?.trim().toLocaleLowerCase()
    const rows = records.filter((item) => {
      if (
        view.filters &&
        !matchesPropertyFilters(
          view.filters,
          definitions,
          (id) => getValue(item, id),
          types
        )
      )
        return false
      if (!query) return true
      return (
        getTitle(item).toLocaleLowerCase().includes(query) ||
        properties.some((property) =>
          formatPropertyValue(property, getValue(item, property.id), types)
            .toLocaleLowerCase()
            .includes(query)
        )
      )
    })
    if (!view.sort?.length) return rows
    return rows.sort((left, right) => {
      for (const sort of view.sort ?? []) {
        const property = definitions.get(sort.propertyId)
        if (!property) continue
        const order = comparePropertyValues(
          property,
          getValue(left, property.id),
          getValue(right, property.id),
          types
        )
        if (order) return sort.direction === "asc" ? order : -order
      }
      return 0
    })
  }, [
    records,
    view.search,
    view.filters,
    view.sort,
    definitions,
    getTitle,
    getValue,
    properties,
    types,
  ])

  const groups = React.useMemo(
    () =>
      groupKanbanItems(filtered, columns, getColumnId).map((entry) =>
        entry.column === unassignedColumn && group
          ? {
              ...entry,
              column: {
                ...unassignedColumn,
                name: `No ${group.name.toLowerCase()}`,
              },
            }
          : entry
      ),
    [filtered, columns, getColumnId, group]
  )
  const totals = React.useMemo(() => {
    const original = groupKanbanItems(source, columns, getColumnId)
    const current = new Map(
      groupKanbanItems(records, columns, getColumnId).map(
        ({ column, items }) => [column.id, items.length]
      )
    )
    for (const { column, items } of original) {
      const total = pages?.get(column.id)?.total
      if (total !== undefined)
        current.set(
          column.id,
          Math.max(0, total + (current.get(column.id) ?? 0) - items.length)
        )
    }
    return current
  }, [records, source, columns, getColumnId, pages])

  const pendingIds = React.useMemo(
    () => new Set(pending.flatMap(({ cardIds }) => cardIds)),
    [pending]
  )

  async function submit(
    change: KanbanChange<Item>,
    inverse?: KanbanChange<Item>,
    nextNotice?: KanbanNotice
  ) {
    if (!onCardsChange) return false
    const commit = captureCommit()
    setPending((changes) => [...changes, change])
    setFailure(null)
    const earlier = change.cardIds.flatMap((id) => {
      const save = saves.current.get(id)
      return save ? [save] : []
    })
    const save = (async () => {
      if (earlier.length) await Promise.allSettled(earlier)
      await onCardsChange(change)
    })()
    for (const id of change.cardIds) saves.current.set(id, save)
    try {
      await save
      commit(change.apply, getColumnId)
      setUndo(inverse ?? null)
      setNotice(nextNotice ?? null)
      return true
    } catch (error) {
      setNotice(null)
      setFailure({
        change,
        inverse,
        message:
          error instanceof Error
            ? error.message
            : "Changes could not be saved.",
      })
      return false
    } finally {
      for (const id of change.cardIds)
        if (saves.current.get(id) === save) saves.current.delete(id)
      setPending((changes) => changes.filter((entry) => entry !== change))
    }
  }

  /** What a card in a column holds for the property the board groups by. */
  function getColumnValue(columnId: string): unknown {
    if (columnId === unassignedColumn.id) return null
    if (group?.type === "checkbox") return columnId === "true"
    return group && isMultiProperty(group) ? [columnId] : columnId
  }

  const moveTo =
    (isOwnGroup ? options.moveTo : undefined) ??
    ((item: Item, placement: KanbanPlacement): Item => {
      const value = getColumnValue(placement.columnId)
      if (options.setValue)
        return options.setValue(item, groupBy ?? "columnId", value)
      return { ...item, [groupBy ?? "columnId"]: value }
    })

  function getMove(
    ids: readonly string[],
    columnId: string,
    index: number,
    laneId: string | null
  ) {
    const destination = groups.find(({ column }) => column.id === columnId)
    if (!destination || !ids.length) return null
    const page = pages?.get(columnId)
    const placement = getKanbanPlacement(
      columnId,
      laneId,
      destination.items
        .filter((item) => readLaneId(item) === laneId)
        .map(getId),
      ids,
      index,
      !isPaged || page?.nextCursor === null
    )
    const moving = [...new Set(ids)].flatMap((id) => {
      const item = byId.get(id)
      return item === undefined ? [] : [item]
    })
    const incoming = moving.filter(
      (item) => (getColumnId(item) ?? unassignedColumn.id) !== columnId
    )
    return { column: destination.column, placement, moving, incoming }
  }

  /** Why cards can't be dropped on a column, or null when they can. */
  function getMoveBlock(
    ids: readonly string[],
    columnId: string,
    index: number,
    laneId: string | null = null
  ): string | null {
    const target = getMove(ids, columnId, index, laneId)
    if (!target) return "This column is not available."
    const { column, placement, moving, incoming } = target
    if (incoming.length && readColumnId && !options.moveTo && !options.setValue)
      return "This board needs a move rule for custom columns."
    if (column.isLocked || (group?.isReadOnly && incoming.length))
      return "Read-only column"
    if (
      column.limitMode === "block" &&
      column.limit !== undefined &&
      incoming.length &&
      (totals.get(columnId) ?? 0) + incoming.length > column.limit
    )
      return `Limit of ${column.limit} reached`
    for (const item of moving) {
      const permission = options.canMove?.(item, placement)
      if (permission === false) return "This card can't move here"
      if (typeof permission === "string") return permission
      if (readLaneId(item) !== laneId && !(isOwnGroup && options.moveTo))
        return "This card can't change lanes"
    }
    return null
  }

  /** Moves cards. Returns whether they moved. */
  function move(
    ids: readonly string[],
    columnId: string,
    index: number,
    laneId: string | null = null
  ) {
    if (!onCardsChange) return false
    setMoveError(null)
    const target = getMove(ids, columnId, index, laneId)
    if (!target) return false
    const blocked = getMoveBlock(ids, columnId, index, laneId)
    if (blocked) {
      setMoveError(`${target.column.name}: ${blocked}`)
      setAnnouncement("")
      return false
    }
    const { column, placement, moving, incoming } = target
    if (
      !moving.length ||
      (view.sort?.length &&
        !incoming.length &&
        moving.every((item) => readLaneId(item) === laneId))
    )
      return false
    const apply = (rows: readonly Item[]) =>
      applyKanbanMove(rows, ids, placement, getId, (item, target) =>
        (getColumnId(item) ?? unassignedColumn.id) === target.columnId &&
        readLaneId(item) === target.laneId
          ? item
          : moveTo(item, target)
      )
    const next = apply(records)
    if (
      !incoming.length &&
      next.every(
        (item, index) =>
          getId(item) === getId(records[index]) &&
          readLaneId(item) === readLaneId(records[index])
      )
    )
      return false
    const undoMoves = moving.map((item) => {
      const id = getId(item)
      const origin = getColumnId(item) ?? unassignedColumn.id
      const lane = readLaneId(item)
      const peers = records
        .filter(
          (entry) =>
            (getColumnId(entry) ?? unassignedColumn.id) === origin &&
            readLaneId(entry) === lane
        )
        .map(getId)
      return {
        id,
        placement: getKanbanPlacement(
          origin,
          lane,
          peers,
          [id],
          peers.indexOf(id),
          true
        ),
      }
    })
    const position = next
      .filter(
        (item) =>
          (getColumnId(item) ?? unassignedColumn.id) === columnId &&
          readLaneId(item) === laneId
      )
      .findIndex((item) => getId(item) === ids[0])
    const moved =
      moving.length === 1 ? getTitle(moving[0]) : `${moving.length} cards`
    setAnnouncement(
      `Moved ${moved} to ${column.name}, position ${position + 1}.`
    )
    void submit(
      { id: createChangeId(), reason: "move", cardIds: ids, placement, apply },
      {
        id: createChangeId(),
        reason: "undo",
        cardIds: ids,
        placements: undoMoves,
        apply: (rows) =>
          undoMoves.reduce(
            (result, entry) =>
              applyKanbanMove(
                result,
                [entry.id],
                entry.placement,
                getId,
                moveTo
              ),
            [...rows]
          ),
      },
      moving.length > 1
        ? { message: `Moved ${moved} to ${column.name}.`, canUndo: true }
        : undefined
    )
    return true
  }

  /** The placement at either end of a column, among the cards shown there. */
  function getEndPlacement(
    columnId: string,
    laneId: string | null,
    end: "start" | "end"
  ) {
    const ids = (
      groups.find(({ column }) => column.id === columnId)?.items ?? []
    )
      .filter((item) => readLaneId(item) === laneId)
      .map(getId)
    return getKanbanPlacement(
      columnId,
      laneId,
      ids,
      emptyItems,
      end === "start" ? 0 : ids.length,
      !isPaged || pages?.get(columnId)?.nextCursor === null
    )
  }

  function create(
    title: string,
    columnId: string,
    laneId: string | null,
    end: "start" | "end"
  ) {
    if (!options.createItem) return
    const item = options.createItem({
      title,
      columnId,
      laneId,
      value: getColumnValue(columnId),
    })
    const id = getId(item)
    const placement = getEndPlacement(columnId, laneId, end)
    setAnnouncement(`Added ${title}.`)
    void submit(
      {
        id: createChangeId(),
        reason: "create",
        cardIds: [id],
        placement,
        apply: (rows) => insertKanbanItems(rows, [item], placement, getId),
      },
      {
        id: createChangeId(),
        reason: "undo",
        cardIds: [id],
        apply: (rows) => rows.filter((entry) => getId(entry) !== id),
      }
    )
    return id
  }

  function remove(ids: readonly string[]) {
    const removed = ids.flatMap((id) => {
      const item = byId.get(id)
      if (item === undefined) return []
      const index = records.indexOf(item)
      return [{ id, item, index }]
    })
    if (!removed.length) return
    const gone = new Set(ids)
    const name =
      removed.length === 1
        ? getTitle(removed[0].item)
        : `${removed.length} cards`
    setSelectedIds(
      (current) => new Set([...current].filter((id) => !gone.has(id)))
    )
    setAnnouncement(`Deleted ${name}.`)
    void submit(
      {
        id: createChangeId(),
        reason: "delete",
        cardIds: ids,
        apply: (rows) => rows.filter((item) => !gone.has(getId(item))),
      },
      {
        id: createChangeId(),
        reason: "undo",
        cardIds: ids,
        apply: (rows) =>
          [...removed]
            .sort((left, right) => left.index - right.index)
            .reduce(
              (result, { id, item, index }) => {
                if (result.some((entry) => getId(entry) === id)) return result
                return [...result.slice(0, index), item, ...result.slice(index)]
              },
              [...rows]
            ),
      },
      { message: `Deleted ${name}.`, canUndo: true }
    )
  }

  function setValue(
    ids: readonly string[],
    propertyId: string,
    value: unknown
  ) {
    const edited = new Set(ids)
    const previous = new Map(
      ids.flatMap((id) => {
        const item = byId.get(id)
        return item === undefined
          ? []
          : [[id, getValue(item, propertyId)] as const]
      })
    )
    const write =
      options.setValue ??
      ((item: Item, id: string, next: unknown): Item => ({
        ...item,
        [id]: next,
      }))
    const apply = (read: (id: string) => unknown) => (rows: readonly Item[]) =>
      rows.map((item) =>
        edited.has(getId(item))
          ? write(item, propertyId, read(getId(item)))
          : item
      )
    void submit(
      {
        id: createChangeId(),
        reason: "edit",
        cardIds: ids,
        apply: apply(() => value),
      },
      {
        id: createChangeId(),
        reason: "undo",
        cardIds: ids,
        apply: apply((id) => previous.get(id)),
      }
    )
  }

  function toggleSelection(id: string) {
    setAnchorId(id)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function select(ids: readonly string[]) {
    setAnchorId(ids[0] ?? null)
    setSelectedIds(new Set(ids))
  }

  /** Adds everything between the last card picked and this one. */
  function extendSelection(id: string, ids: readonly string[]) {
    const range = anchorId === null ? [id] : getKanbanRange(ids, anchorId, id)
    if (anchorId === null) setAnchorId(id)
    setSelectedIds((current) => new Set([...current, ...range]))
  }

  return {
    columns,
    groups,
    totals,
    byId,
    lanes: getLaneId && options.lanes?.length ? options.lanes : undefined,
    getLaneId: getLaneId && options.lanes?.length ? readLaneId : undefined,
    getId,
    getTitle,
    getValue,
    properties,
    group,
    groupBy,
    isOwnGroup,
    view,
    setView,
    isSaving: pending.length > 0,
    pendingIds,
    failure,
    notice,
    dismissNotice: () => setNotice(null),
    announcement,
    moveError,
    dismissMoveError: () => setMoveError(null),
    selectedIds,
    select,
    toggleSelection,
    extendSelection,
    clearSelection: () => {
      setAnchorId(null)
      setSelectedIds(new Set())
    },
    isMutable: !!onCardsChange,
    canCreate: !!(onCardsChange && options.createItem),
    canDelete: (id: string) => {
      const item = byId.get(id)
      return (
        !!onCardsChange &&
        item !== undefined &&
        (options.canDelete?.(item) ?? true)
      )
    },
    types,
    /** Whether cards show a property; undefined for those they never list. */
    isOnCard: (property: PropertyDefinition) =>
      isKanbanFieldShown(property, { ...view, groupBy }),
    /** Shows a property's value on the cards, or takes it off them. */
    setOnCard: (propertyId: string, isOnCard: boolean) =>
      setView({
        ...view,
        visibleProperties: showKanbanField(
          properties,
          view,
          propertyId,
          isOnCard
        ),
      }),
    /** The property whose pictures cover the cards. */
    cover: getKanbanCover(properties, { ...view, groupBy }),
    /** Covers cards with a property, which puts it on them; null for none. */
    setCover: (propertyId: string | null) =>
      setView({
        ...view,
        cover: propertyId,
        ...(propertyId === null
          ? undefined
          : {
              visibleProperties: showKanbanField(
                properties,
                view,
                propertyId,
                true
              ),
            }),
      }),
    onColumnsChange: ownColumns ? onColumnsChange : undefined,
    move,
    getMoveBlock,
    create,
    remove,
    setValue,
    submit,
    undo: undo
      ? () => {
          setAnnouncement("Undone.")
          return submit(undo)
        }
      : undefined,
    retryChange: () => failure && submit(failure.change, failure.inverse),
    dismissFailure: () => setFailure(null),
    pages,
    isPaged,
    loadMore: options.onLoadMore ?? loadMore,
    retry:
      options.onRetry ??
      options.onLoadMore ??
      ((columnId: string) => loadMore(columnId)),
  }
}

function createChangeId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

type KanbanController<Item> = ReturnType<typeof useKanban<Item>>

export {
  useKanban,
  type KanbanController,
  type KanbanDraft,
  type KanbanNotice,
  type KanbanOptions,
  type KanbanView,
}
