"use client"

import * as React from "react"
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type CellData,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type FilterFn,
  type PaginationState,
  type Row,
  type RowData,
  type SortFn,
  type SortingState,
  type Table,
  type TableFeatures,
  type TableOptions,
} from "@tanstack/react-table"

import {
  compareCellValues,
  DATA_TABLE_LOCALE,
  getColumnTypeDefaults,
  getFilterKind,
  getWindowsToCancel,
  getWindowsToLoad,
  indexWindows,
  isFilterActive,
  isSearchable,
  matchesFilter,
  toSearchText,
  type DataTableAggregate,
  type DataTableAlign,
  type DataTableColumnType,
  type DataTableFormatOptions,
} from "@/registry/bases/__base__/lib/data-table-model"
import { DataTableCell } from "@/registry/bases/__base__/ui/data-table-cells"

/** Colours a status, person or tag, as Badge's status variants do. */
export type DataTableTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"

export type DataTableOption = {
  value: string
  label: string
  tone?: DataTableTone
  /** A person's picture. */
  image?: string
}

/** What a column tells the Data Table about itself, under `meta`. */
export type DataTableColumnMeta = {
  /** Picks the cell, filter, sort, editor, alignment and calculations. */
  type?: DataTableColumnType
  /** A column the table draws itself: the selection checkboxes or row actions. */
  kind?: "select" | "actions"
  /** The header text, the column's name in menus. */
  label?: string
  /** Replaces the type's icon in the header. */
  icon?: React.ComponentType<{ className?: string }>
  /** The values of a status, person or tags column, in sort order. */
  options?: DataTableOption[]
  format?: DataTableFormatOptions
  /** The footer's calculation. People can change it from the footer. */
  aggregate?: DataTableAggregate
  align?: DataTableAlign
  /** The record's name: foreground and medium weight. */
  primary?: boolean
  /** Pins the column to an edge on first render. */
  pin?: "start" | "end"
  /** Cells edit in place, with the editor the type calls for. Needs `onCellChange`. */
  editable?: boolean
}

/** Footer calculations a server worked out over every matching row. */
export type DataTableAggregates = Record<
  string,
  Partial<Record<DataTableAggregate, number | null>>
>

/** What a loader is asked for: a window of rows and the view that orders them. */
export type DataTableQuery = {
  offset: number
  limit: number
  sorting: SortingState
  filters: ColumnFiltersState
  search: string
}

export type DataTablePage<TData> = {
  rows: TData[]
  /** How many rows match the query in all. */
  total: number
  aggregates?: DataTableAggregates
}

export type DataTableLoader<TData> = (
  query: DataTableQuery,
  signal: AbortSignal
) => Promise<DataTablePage<TData>>

export type DataTableLoaderStatus = "loading" | "refreshing" | "error" | "idle"

export type DataTableLoaderState = {
  /** `loading` before the first rows, `refreshing` while a new view loads. */
  status: DataTableLoaderStatus
  /** How many rows match the view, loaded or not. */
  total: number
  /** Rows one request asks for. */
  windowSize: number
  /** The table's row at a position, or undefined while its window loads. */
  rowIndexAt: (position: number) => number | undefined
  /** A row's position among every match. */
  positionOf: (rowIndex: number) => number
  /**
   * The positions in view: their windows load, at once while the scroll is
   * slow and when it settles while it's fast.
   */
  requestRange: (start: number, end: number) => void
  /** Windows whose request failed; `retryWindow` asks again. */
  failedWindows: ReadonlySet<number>
  retryWindow: (window: number) => void
  /** Asks for the whole view again, after it failed. */
  retry: () => void
  error: unknown
  aggregates?: DataTableAggregates
  /** Changes when rows for a new view arrive. */
  resultKey: string | null
}

export type DataTableCellChange<TData> = {
  row: TData
  rowId: string
  columnId: string
  value: unknown
  /** With `load`: puts the edited row in place, so the change shows at once. */
  replaceRow?: (row: TData) => void
}

export type DataTableMeta = {
  locale: string
  /** Relative dates count from here. Fixed per table so rows agree. */
  now: number
  /** Rows come a page at a time instead of all in one scroll. */
  paginate: boolean
  loader?: DataTableLoaderState
  editCell?: (rowId: string, columnId: string, value: unknown) => void
}

export const dataTableFeatures = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  columnMeta: metaHelper<DataTableColumnMeta>(),
  tableMeta: metaHelper<DataTableMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures

/** TanStack's column helper, typed for the Data Table's features. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

type DataTableColumns<TData extends RowData> = TableOptions<
  DataTableFeatures,
  TData
>["columns"]

function getTypeDefaults<TData extends RowData>(
  meta: DataTableColumnMeta,
  locale: string
) {
  if (!meta.type) return {}
  const type = meta.type
  const kind = getFilterKind(type)
  const defaults = getColumnTypeDefaults(type)
  const filterFn: FilterFn<DataTableFeatures, TData> = Object.assign(
    (row: Row<DataTableFeatures, TData>, columnId: string, filter: unknown) =>
      matchesFilter(
        kind,
        row.getValue(columnId),
        filter,
        row.table.options.meta?.now
      ),
    { autoRemove: (filter: unknown) => !isFilterActive(kind, filter) }
  )
  const sortFn: SortFn<DataTableFeatures, TData> = (rowA, rowB, columnId) =>
    compareCellValues(
      rowA.getValue(columnId),
      rowB.getValue(columnId),
      { type, options: meta.options },
      locale
    )
  return {
    size: defaults.size,
    minSize: defaults.minSize,
    sortDescFirst: defaults.sortDescFirst,
    enableGlobalFilter: isSearchable(type),
    filterFn,
    sortFn,
  }
}

const DISPLAY_SIZES = { select: 44, actions: 52 }

// The table's settings live in the header of the actions column; a table
// without one gets an empty actions column to hold them.
const OPTIONS_COLUMN = {
  id: "options",
  meta: { kind: "actions" },
  cell: () => null,
} satisfies Pick<DataTableColumns<RowData>[number], "id" | "meta" | "cell">

function withOptionsColumn<TData extends RowData>(
  columns: DataTableColumns<TData>
): DataTableColumns<TData> {
  if (columns.some((column) => column.meta?.kind === "actions")) return columns
  return [...columns, OPTIONS_COLUMN]
}

function withTypeDefaults<TData extends RowData>(
  columns: DataTableColumns<TData>,
  locale: string
): DataTableColumns<TData> {
  return withOptionsColumn(columns).map((column) => {
    const meta = column.meta ?? {}
    if (meta.kind) {
      const size = DISPLAY_SIZES[meta.kind]
      return {
        size,
        minSize: size,
        maxSize: size,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        ...column,
      }
    }
    return { ...getTypeDefaults<TData>(meta, locale), ...column }
  })
}

function getColumnId<TData extends RowData>(
  column: ColumnDef<DataTableFeatures, TData, unknown>
) {
  if (column.id) return column.id
  if ("accessorKey" in column && column.accessorKey !== undefined) {
    return String(column.accessorKey).replaceAll(".", "_")
  }
  return undefined
}

/** Where each column starts pinned: selection first, actions last, then `meta.pin`. */
function getInitialPinning<TData extends RowData>(
  columns: DataTableColumns<TData>
): ColumnPinningState {
  const start: string[] = []
  const end: string[] = []
  for (const column of columns) {
    const id = getColumnId(column)
    if (!id) continue
    const meta = column.meta
    if (meta?.kind === "select" || meta?.pin === "start") start.push(id)
    if (meta?.kind === "actions" || meta?.pin === "end") end.push(id)
  }
  return { start, end }
}

// TanStack types this option for any table, so the meta is read untyped.
function canSearchColumn<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData,
>(column: Column<TFeatures, TData, TValue>) {
  const meta: unknown = column.columnDef.meta
  return (
    typeof meta === "object" &&
    meta !== null &&
    "type" in meta &&
    typeof meta.type === "string" &&
    isSearchable(meta.type)
  )
}

// Each cell's search text, lowercased once and kept until its row's data or
// its column's definition changes, so a keystroke over 10,000 rows compares
// strings instead of rebuilding them.
const searchTexts = new WeakMap<object, WeakMap<object, string>>()
let lastQuery = ""
let lastNeedle = ""

function toNeedle(query: unknown) {
  const text = String(query)
  if (text !== lastQuery) {
    lastQuery = text
    lastNeedle = text.trim().toLowerCase()
  }
  return lastNeedle
}

function searchRow<TData extends RowData>(
  row: Row<DataTableFeatures, TData>,
  columnId: string,
  query: unknown
) {
  const needle = toNeedle(query)
  if (needle === "") return true
  const definition = row.table.getColumn(columnId)?.columnDef
  const original: unknown = row.original
  if (!definition || typeof original !== "object" || original === null) {
    return toSearchText(row.getValue(columnId)).includes(needle)
  }
  let texts = searchTexts.get(definition)
  if (!texts) {
    texts = new WeakMap()
    searchTexts.set(definition, texts)
  }
  let text = texts.get(original)
  if (text === undefined) {
    text = toSearchText(row.getValue(columnId), definition.meta?.options)
    texts.set(original, text)
  }
  return text.includes(needle)
}

/** Search waits this long after the last keystroke before asking a loader. */
const SEARCH_DELAY = 250

/** A fast scroll asks for its windows this long after it settles. */
const SETTLE_DELAY = 120

const NO_WINDOWS: ReadonlySet<number> = new Set()

/** The windows with one row swapped, found by id as the table finds it. */
function replaceWindowRow<TData>(
  remote: Remote<TData>,
  rowId: string,
  next: TData,
  getRowId: ((row: TData, index: number) => string) | undefined,
  size: number
): Remote<TData> {
  let index = 0
  const windows = new Map<number, TData[]>()
  for (const [window, rows] of [...remote.windows].sort(([a], [b]) => a - b)) {
    windows.set(
      window,
      rows.map((row, offset) => {
        const id = getRowId
          ? getRowId(row, index)
          : String(window * size + offset)
        index += 1
        return id === rowId ? next : row
      })
    )
  }
  return { ...remote, windows }
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

type Remote<TData> = {
  key: string | null
  /** Rows by window, so a scroll can jump ahead and load what's in view. */
  windows: ReadonlyMap<number, TData[]>
  total: number
  aggregates?: DataTableAggregates
  error: unknown
  failed: boolean
}

type DataSource<TData extends RowData> =
  | {
      data: TableOptions<DataTableFeatures, TData>["data"]
      load?: undefined
    }
  | {
      /**
       * Fetches rows a window at a time: the next one as the scroll nears the
       * end (or the current page with `paginate`), and from the top again
       * whenever the sort, filters or search change. The server sorts and
       * filters; `queryRows` from the model answers like the table would.
       */
      load: DataTableLoader<TData>
      data?: undefined
    }

export type UseDataTableOptions<TData extends RowData> = Omit<
  TableOptions<DataTableFeatures, TData>,
  "features" | "meta" | "data"
> &
  DataSource<TData> & {
    /** Locale for numbers and dates. Default en-US. */
    locale?: string
    /** What relative dates count from. Default: when the table mounted. */
    now?: number
    /**
     * The server sorts, filters and pages rows you pass in `data`, and
     * `rowCount` says how many there are in all. Implied by `load`.
     */
    manual?: boolean
    /** Rows a page at a time with DataTablePagination, instead of one scroll. */
    paginate?: boolean
    /** Rows `load` asks for at a time while scrolling. Default 100. */
    pageSize?: number
    /** An edited cell's new value. Columns opt in with `meta.editable`. */
    onCellChange?: (change: DataTableCellChange<TData>) => void
  }

/**
 * A TanStack table set up for the Data Table: every feature it draws, typed
 * columns from `meta.type`, pinning from `meta.pin`, editing, and rows from
 * `data` (sorted and filtered here) or from `load` (a page at a time).
 */
export function useDataTable<TData extends RowData>({
  columns,
  data,
  load,
  locale = DATA_TABLE_LOCALE,
  now,
  manual = false,
  paginate = false,
  pageSize = 100,
  onCellChange,
  initialState,
  defaultColumn,
  state,
  onSortingChange,
  onColumnFiltersChange,
  onGlobalFilterChange,
  onPaginationChange,
  ...options
}: UseDataTableOptions<TData>) {
  const [mountedAt] = React.useState(() => Date.now())
  const typedColumns = React.useMemo(
    () => withTypeDefaults(columns, locale),
    [columns, locale]
  )
  const [pinning] = React.useState(() => getInitialPinning(typedColumns))

  // The view lives here, so a change can ask a loader for new rows and go
  // back to the first page, while an edit stays on the page it was made on.
  // State you control wins.
  const [sortingState, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? []
  )
  const [columnFiltersState, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialState?.columnFilters ?? [])
  const [globalFilterState, setGlobalFilter] = React.useState<string>(
    initialState?.globalFilter ?? ""
  )
  const [paginationState, setPagination] = React.useState<PaginationState>(
    initialState?.pagination ?? { pageIndex: 0, pageSize: 25 }
  )
  const sorting = state?.sorting ?? sortingState
  const columnFilters = state?.columnFilters ?? columnFiltersState
  const globalFilter = String(state?.globalFilter ?? globalFilterState)
  const pagination = state?.pagination ?? paginationState
  const search = useDebounced(globalFilter, SEARCH_DELAY)
  const [remote, setRemote] = React.useState<Remote<TData>>({
    key: null,
    windows: new Map(),
    total: 0,
    error: undefined,
    failed: false,
  })
  const [failedWindows, setFailedWindows] =
    React.useState<ReadonlySet<number>>(NO_WINDOWS)
  const [attempt, setAttempt] = React.useState(0)
  const loadRef = React.useRef(load)
  React.useLayoutEffect(() => {
    loadRef.current = load
  })

  const page = paginate ? pagination : null
  const key = JSON.stringify([sorting, columnFilters, search, page, attempt])
  const hasLoader = load !== undefined
  const windowSize = paginate ? pagination.pageSize : pageSize
  const windowIndex = React.useMemo(
    () => indexWindows(remote.windows, windowSize),
    [remote.windows, windowSize]
  )

  // Requests out, by window. The view's first window counts as one.
  const pendingRef = React.useRef(new Map<number, AbortController>())
  // What a window request needs, read when it fires rather than when the
  // range was asked for.
  const viewRef = React.useRef({
    key,
    sorting,
    columnFilters,
    search,
    remote,
    failedWindows,
    windowSize,
  })
  React.useLayoutEffect(() => {
    viewRef.current = {
      key,
      sorting,
      columnFilters,
      search,
      remote,
      failedWindows,
      windowSize,
    }
  })

  React.useEffect(() => {
    const fetchRows = loadRef.current
    if (!fetchRows) return
    // Windows for the old view would land in the new one.
    const pending = pendingRef.current
    for (const controller of pending.values()) controller.abort()
    pending.clear()
    const controller = new AbortController()
    pending.set(0, controller)
    fetchRows(
      {
        offset: page ? page.pageIndex * page.pageSize : 0,
        limit: page ? page.pageSize : pageSize,
        sorting,
        filters: columnFilters,
        search,
      },
      controller.signal
    ).then(
      (next) => {
        if (pending.get(0) === controller) pending.delete(0)
        if (controller.signal.aborted) return
        setRemote({
          key,
          windows: new Map([[0, next.rows]]),
          total: next.total,
          aggregates: next.aggregates,
          error: undefined,
          failed: false,
        })
        setFailedWindows(NO_WINDOWS)
      },
      (error: unknown) => {
        if (pending.get(0) === controller) pending.delete(0)
        if (controller.signal.aborted) return
        setRemote((current) => ({ ...current, key, error, failed: true }))
      }
    )
    return () => controller.abort()
  }, [key, page, pageSize, sorting, columnFilters, search, hasLoader])

  const fetchWindow = React.useCallback((window: number) => {
    const fetchRows = loadRef.current
    if (!fetchRows) return
    const view = viewRef.current
    const controller = new AbortController()
    const pending = pendingRef.current
    pending.set(window, controller)
    fetchRows(
      {
        offset: window * view.windowSize,
        limit: view.windowSize,
        sorting: view.sorting,
        filters: view.columnFilters,
        search: view.search,
      },
      controller.signal
    ).then(
      (next) => {
        if (pending.get(window) === controller) pending.delete(window)
        if (controller.signal.aborted) return
        setRemote((current) =>
          current.key === view.key
            ? {
                ...current,
                windows: new Map(current.windows).set(window, next.rows),
                total: next.total,
                aggregates: next.aggregates ?? current.aggregates,
              }
            : current
        )
      },
      () => {
        if (pending.get(window) === controller) pending.delete(window)
        if (controller.signal.aborted) return
        setFailedWindows((current) => new Set(current).add(window))
      }
    )
  }, [])

  // The windows a range needs. A slow scroll asks at once; a fast one waits
  // for the scroll to settle, so a fling doesn't ask for every window it
  // passes, and drops requests it has left behind.
  const rangeRef = React.useRef({ start: 0, at: 0, timer: 0 })
  const loadRange = React.useCallback(
    (start: number, end: number) => {
      const view = viewRef.current
      if (view.remote.key !== view.key) return
      const size = view.windowSize
      const lookahead = Math.round(size / 4)
      const pending = pendingRef.current
      const first = Math.floor(Math.max(0, start - lookahead) / size)
      const last = Math.floor((end + lookahead) / size)
      for (const window of getWindowsToCancel(pending.keys(), first, last)) {
        pending.get(window)?.abort()
        pending.delete(window)
      }
      const windows = getWindowsToLoad({
        start: start - lookahead,
        end: end + lookahead,
        size,
        total: view.remote.total,
        loaded: new Set(view.remote.windows.keys()),
        pending: new Set(pending.keys()),
        failed: view.failedWindows,
      })
      for (const window of windows) fetchWindow(window)
    },
    [fetchWindow]
  )
  const requestRange = React.useCallback(
    (start: number, end: number) => {
      const range = rangeRef.current
      const now = performance.now()
      const speed = Math.abs(start - range.start) / Math.max(now - range.at, 1)
      range.start = start
      range.at = now
      window.clearTimeout(range.timer)
      // Rows a second, against a window a second.
      if (speed * 1000 < viewRef.current.windowSize) {
        loadRange(start, end)
        return
      }
      range.timer = window.setTimeout(() => loadRange(start, end), SETTLE_DELAY)
    },
    [loadRange]
  )
  React.useEffect(() => () => window.clearTimeout(rangeRef.current.timer), [])

  const retryWindow = React.useCallback(
    (window: number) => {
      setFailedWindows((current) => {
        const next = new Set(current)
        next.delete(window)
        return next
      })
      fetchWindow(window)
    },
    [fetchWindow]
  )

  const status: DataTableLoaderStatus =
    remote.key !== key
      ? remote.key === null
        ? "loading"
        : "refreshing"
      : remote.failed
        ? "error"
        : "idle"

  const retry = React.useCallback(() => setAttempt((count) => count + 1), [])
  const loader = React.useMemo<DataTableLoaderState | undefined>(
    () =>
      hasLoader
        ? {
            status,
            total: remote.total,
            windowSize,
            rowIndexAt: windowIndex.rowIndexAt,
            positionOf: windowIndex.positionOf,
            requestRange,
            failedWindows,
            retryWindow,
            retry,
            error: remote.error,
            aggregates: remote.aggregates,
            resultKey: remote.key,
          }
        : undefined,
    [
      hasLoader,
      status,
      remote.total,
      windowSize,
      windowIndex,
      requestRange,
      failedWindows,
      retryWindow,
      retry,
      remote.error,
      remote.aggregates,
      remote.key,
    ]
  )

  // A new view starts on its first page.
  const toFirstPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }))

  // One editCell for the table's life that calls the latest onCellChange, so
  // rows memoized long ago still save through the page's current code.
  const tableRef = React.useRef<Table<DataTableFeatures, TData> | null>(null)
  const latestRef = React.useRef({
    onCellChange,
    getRowId: options.getRowId,
    hasLoader,
    windowSize,
  })
  React.useLayoutEffect(() => {
    latestRef.current = {
      onCellChange,
      getRowId: options.getRowId,
      hasLoader,
      windowSize,
    }
  })
  const editCell = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      const current = tableRef.current
      const { onCellChange, getRowId, hasLoader, windowSize } =
        latestRef.current
      if (!current || !onCellChange) return
      onCellChange({
        row: current.getRow(rowId, true).original,
        rowId,
        columnId,
        value,
        replaceRow: hasLoader
          ? (next) =>
              setRemote((previous) =>
                replaceWindowRow(previous, rowId, next, getRowId, windowSize)
              )
          : undefined,
      })
    },
    []
  )
  const editable = onCellChange !== undefined
  const tableNow = now ?? mountedAt
  const meta = React.useMemo<DataTableMeta>(
    () => ({
      locale,
      now: tableNow,
      paginate,
      loader,
      editCell: editable ? editCell : undefined,
    }),
    [locale, tableNow, paginate, loader, editable, editCell]
  )
  const resolvedDefaultColumn = React.useMemo(
    () => ({ cell: DataTableCell, ...defaultColumn }),
    [defaultColumn]
  )

  const table = useTable({
    features: dataTableFeatures,
    columns: typedColumns,
    data: hasLoader ? windowIndex.rows : (data ?? []),
    defaultColumn: resolvedDefaultColumn,
    meta,
    columnResizeMode: "onChange",
    globalFilterFn: searchRow,
    getColumnCanGlobalFilter: canSearchColumn,
    // Without pages, the "page" is every row: the body virtualizes them.
    manualPagination: manual || hasLoader || !paginate,
    manualSorting: manual || hasLoader,
    manualFiltering: manual || hasLoader,
    initialState: {
      columnPinning: pinning,
      ...initialState,
    },
    rowCount: hasLoader ? remote.total : undefined,
    autoResetPageIndex: false,
    // Rows from a loader keep their place in the view as their id, so a
    // selection holds while windows load around it. Your getRowId wins.
    getRowId: hasLoader
      ? (_row, index) => String(windowIndex.positionOf(index))
      : undefined,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      ...state,
    },
    onSortingChange: (updater) => {
      setSorting(updater)
      toFirstPage()
      onSortingChange?.(updater)
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater)
      toFirstPage()
      onColumnFiltersChange?.(updater)
    },
    onGlobalFilterChange: (updater) => {
      setGlobalFilter(updater)
      toFirstPage()
      onGlobalFilterChange?.(updater)
    },
    onPaginationChange: (updater) => {
      setPagination(updater)
      onPaginationChange?.(updater)
    },
    ...options,
  })
  React.useLayoutEffect(() => {
    tableRef.current = table
  })

  return table
}

export type DataTableInstance<TData extends RowData> = ReturnType<
  typeof useDataTable<TData>
>
