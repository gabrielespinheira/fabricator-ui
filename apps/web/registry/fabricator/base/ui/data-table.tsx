"use client"

// The Data Table: a TanStack table (from `useDataTable`) drawn as one real
// <table> in a scrolling frame. Rows are virtual, so ten thousand of them
// scroll like ten; headers sort, filter by column type and resize; cells
// edit in place; columns pin to either edge; the footer calculates; and the
// table's own settings sit in the header. Parts take the `table` they draw,
// so each one is typed by your rows.
import * as React from "react"
import {
  Subscribe,
  type Cell,
  type Column,
  type Header,
  type Row,
  type RowData,
  type Table,
} from "@tanstack/react-table"
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from "@tanstack/react-virtual"
import { cn } from "cn"

import {
  createDataTableColumnHelper,
  type DataTableFeatures,
  type DataTableInstance,
  type DataTableLoaderState,
} from "@/registry/bases/base/hooks/use-data-table"
import {
  countOptionValues,
  DATA_TABLE_AGGREGATE_LABELS,
  DATA_TABLE_DATE_PRESETS,
  formatDataTableAggregate,
  formatDataTableValue,
  getAggregateOptions,
  getAggregateValue,
  getColumnTypeDefaults,
  getDefaultOperator,
  getEditText,
  getFilterKind,
  getOperators,
  getPageRange,
  getPageRowRange,
  getRangeSelection,
  needsFilterValue,
  parseEditText,
  readFilter,
  shouldLoadMore,
  toPixels,
  toTimestamp,
  type DataTableAggregate,
  type DataTableAlign,
  type DataTableFilter,
  type DataTableFilterKind,
  type DataTableOperator,
} from "@/registry/bases/base/lib/data-table-model"
import { Button } from "@/registry/bases/base/ui/button"
import { Calendar } from "@/registry/bases/base/ui/calendar"
import { Checkbox } from "@/registry/bases/base/ui/checkbox"
import {
  DataTableCell,
  DataTableCheckbox,
  DataTableInsideControl,
  DataTableTypeIcon,
  DataTableValue,
} from "@/registry/bases/base/ui/data-table-cells"
import {
  DensityProvider,
  useDensity,
  type Density,
} from "@/registry/bases/base/ui/density"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/base/ui/empty"
import { Input } from "@/registry/bases/base/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/base/ui/popover"
import { Search } from "@/registry/bases/base/ui/search"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/base/ui/select"
import { Separator } from "@/registry/bases/base/ui/separator"
import { Skeleton } from "@/registry/bases/base/ui/skeleton"
import { Switch } from "@/registry/bases/base/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type DataTableTable<TData extends RowData> = DataTableInstance<TData>
/** The table cell and header renderers receive: no React state helpers. */
type DataTableCoreTable<TData extends RowData> = Table<DataTableFeatures, TData>
type DataTableColumn<TData extends RowData> = Column<
  DataTableFeatures,
  TData,
  unknown
>
type DataTableSize = "sm" | "default" | "lg"

/** How the table looks; people change it from the settings in the header. */
type DataTableView = {
  /** Density: compact, default or comfortable. Unset follows the page. */
  size?: DataTableSize
  /** Hairlines between rows, or between rows and columns. */
  lines: "rows" | "grid"
  /** Tints every other row. */
  striped: boolean
  /** The footer of calculations. */
  footer: boolean
  /** Each row's place in the selection column, until it's lit or picked. */
  numbered: boolean
}

const DEFAULT_VIEW: DataTableView = {
  lines: "rows",
  striped: false,
  footer: true,
  numbered: false,
}

const SIZE_DENSITY: Record<DataTableSize, Density> = {
  sm: "compact",
  default: "default",
  lg: "spacious",
}

const SIZES: { value: DataTableSize; label: string }[] = [
  { value: "sm", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "lg", label: "Comfortable" },
]

function isDataTableSize(value: unknown): value is DataTableSize {
  return SIZES.some((size) => size.value === value)
}

// MARK: Root

type DataTableContextValue = {
  variant: "card" | "flat"
  view: DataTableView
  setView: (patch: Partial<DataTableView>) => void
}

const DataTableContext = React.createContext<DataTableContextValue | null>(null)

class DataTableContextError extends Error {
  constructor(part: string) {
    super(`<${part}> must be inside <DataTable>.`)
    this.name = "DataTableContextError"
  }
}

function useDataTableContext(part: string) {
  const context = React.use(DataTableContext)
  if (!context) throw new DataTableContextError(part)
  return context
}

/**
 * The frame around a Data Table's parts. `view` (or `defaultView`) sets the
 * density, lines, stripes, footer and row numbers; people change them from
 * the settings at the end of the header.
 */
function DataTable({
  variant = "card",
  view: viewProp,
  defaultView,
  onViewChange,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** `card` frames the table on the card surface; `flat` leaves it on the page. */
  variant?: "card" | "flat"
  view?: Partial<DataTableView>
  defaultView?: Partial<DataTableView>
  onViewChange?: (view: DataTableView) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState<DataTableView>(() => ({
    ...DEFAULT_VIEW,
    ...defaultView,
  }))
  const view = React.useMemo(
    () => ({ ...uncontrolled, ...viewProp }),
    [uncontrolled, viewProp]
  )
  const setView = React.useCallback(
    (patch: Partial<DataTableView>) => {
      const next = { ...view, ...patch }
      setUncontrolled(next)
      onViewChange?.(next)
    },
    [view, onViewChange]
  )
  const inherited = useDensity()
  const density = view.size ? SIZE_DENSITY[view.size] : undefined
  const context = React.useMemo(
    () => ({ variant, view, setView }),
    [variant, view, setView]
  )

  return (
    <DataTableContext value={context}>
      <DensityProvider
        density={density ?? inherited ?? "default"}
        data-density={density}
      >
        <div
          data-slot="data-table"
          data-variant={variant}
          data-lines={view.lines}
          data-striped={view.striped ? "" : undefined}
          className={cn(
            "cn-data-table relative flex min-h-0 min-w-0 flex-col",
            className
          )}
          {...props}
        />
      </DensityProvider>
    </DataTableContext>
  )
}

/** The row above the table, for the search. */
function DataTableToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "cn-data-table-toolbar flex flex-wrap items-center",
        className
      )}
      {...props}
    />
  )
}

// MARK: Helpers

function getColumnLabel<TData extends RowData>(column: DataTableColumn<TData>) {
  const meta = column.columnDef.meta
  if (meta?.label) return meta.label
  const header = column.columnDef.header
  return typeof header === "string" ? header : column.id
}

function getColumnAlign<TData extends RowData>(
  column: DataTableColumn<TData>
): DataTableAlign {
  const meta = column.columnDef.meta
  if (meta?.align) return meta.align
  if (meta?.kind) return "center"
  return meta?.type ? getColumnTypeDefaults(meta.type).align : "start"
}

function getCssName(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_")
}

/** A pinned column's cells find their offset in the table's pin rules. */
function getPinColumn<TData extends RowData>(column: DataTableColumn<TData>) {
  return column.getIsPinned() ? getCssName(column.id) : undefined
}

function getFormat<TData extends RowData>(
  column: DataTableColumn<TData>,
  table: DataTableCoreTable<TData>
) {
  return {
    ...column.columnDef.meta?.format,
    locale: table.options.meta?.locale,
    now: table.options.meta?.now,
  }
}

function formatCount<TData extends RowData>(
  table: DataTableCoreTable<TData>,
  count: number
) {
  return formatDataTableValue("number", count, {
    locale: table.options.meta?.locale,
  })
}

function hasActiveFilters<TData extends RowData>(table: DataTableTable<TData>) {
  return (
    table.state.columnFilters.length > 0 ||
    String(table.state.globalFilter ?? "").trim() !== ""
  )
}

function clearFilters<TData extends RowData>(table: DataTableTable<TData>) {
  table.resetColumnFilters(true)
  table.setGlobalFilter("")
}

// Row positions by the rows array they belong to, so numbered rows read
// their place in the current sort without searching 10,000 rows per cell.
const rowPositions = new WeakMap<object, Map<string, number>>()

function getRowPosition<TData extends RowData>(
  table: DataTableCoreTable<TData>,
  row: Row<DataTableFeatures, TData>
) {
  const rows = table.getRowModel().rows
  let positions = rowPositions.get(rows)
  if (!positions) {
    positions = new Map(rows.map((item, index) => [item.id, index]))
    rowPositions.set(rows, positions)
  }
  const index = positions.get(row.id) ?? row.index
  const meta = table.options.meta
  if (meta?.loader && !meta.paginate) return meta.loader.positionOf(index)
  return getRowOffset(table) + index
}

/** How many rows come before the first one in view: earlier pages. */
function getRowOffset<TData extends RowData>(table: DataTableCoreTable<TData>) {
  if (!table.options.meta?.paginate) return 0
  const { pageIndex, pageSize } = table.atoms.pagination.get()
  return pageIndex * pageSize
}

// The last row a person picked, per table: Shift-click selects from there.
const selectionAnchors = new WeakMap<object, string>()

// MARK: Search

/** Searches every text, status, person, link and tags column at once. */
function DataTableSearch<TData extends RowData>({
  table,
  label = "Search",
  placeholder,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof Search>,
  "value" | "defaultValue" | "onValueChange"
> & { table: DataTableTable<TData> }) {
  const external = String(table.state.globalFilter ?? "")
  const [query, setQuery] = React.useState(external)
  const [synced, setSynced] = React.useState(external)
  const [, startTransition] = React.useTransition()
  if (external !== synced) {
    setSynced(external)
    setQuery(external)
  }

  return (
    <Search
      collapsible={false}
      label={label}
      placeholder={placeholder ?? `${label}…`}
      value={query}
      onValueChange={(value) => {
        setQuery(value)
        startTransition(() => table.setGlobalFilter(value))
      }}
      className={cn("cn-data-table-search", className)}
      {...props}
    />
  )
}

// MARK: Filters

/** The condition picker at the top of a filter. */
function DataTableOperatorSelect({
  kind,
  value,
  label,
  onValueChange,
}: {
  kind: DataTableFilterKind
  value: DataTableOperator
  label: string
  onValueChange: (operator: DataTableOperator) => void
}) {
  const operators = getOperators(kind)
  return (
    <Select
      items={operators}
      value={value}
      onValueChange={(next) => {
        const operator = operators.find((option) => option.value === next)
        if (operator) onValueChange(operator.value)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`${label} condition`}
        className="cn-data-table-operator"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {operators.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Searchable once a list is longer than this. */
const SEARCHABLE_OPTIONS = 7

/** A searchable checklist of a column's options, with counts in view. */
function DataTableOptionList<TData extends RowData>({
  column,
  table,
  picked,
  onToggle,
}: {
  column: DataTableColumn<TData>
  table: DataTableCoreTable<TData>
  picked: readonly string[]
  onToggle: (value: string, checked: boolean) => void
}) {
  const meta = column.columnDef.meta
  const manual = table.options.manualFiltering
  const facetRows = column.getFacetedRowModel().rows
  const counts = React.useMemo(
    () =>
      manual
        ? new Map<string, number>()
        : countOptionValues(facetRows.map((row) => row.getValue(column.id))),
    [facetRows, column.id, manual]
  )
  const options =
    meta?.options ??
    [...counts.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const visible = options.filter((option) =>
    option.label.toLowerCase().includes(needle)
  )
  const label = getColumnLabel(column)

  return (
    <div
      data-slot="data-table-option-list"
      className="cn-data-table-option-list flex flex-col"
    >
      {options.length > SEARCHABLE_OPTIONS && (
        <Input
          autoFocus
          value={query}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label}`}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <div
        role="group"
        aria-label={label}
        className="cn-data-table-option-items flex flex-col overflow-y-auto"
      >
        {visible.map((option) => (
          <label
            key={option.value}
            data-slot="data-table-filter-option"
            className="cn-data-table-option flex items-center"
          >
            <Checkbox
              checked={picked.includes(option.value)}
              onCheckedChange={(checked) => onToggle(option.value, checked)}
            />
            <span className="flex min-w-0 flex-1">
              <DataTableInsideControl value={true}>
                <DataTableValue
                  type={meta?.type}
                  value={meta?.type === "tags" ? [option.value] : option.value}
                  meta={meta}
                  locale={table.options.meta?.locale}
                />
              </DataTableInsideControl>
            </span>
            {!manual && (
              <span className="cn-data-table-option-count">
                {formatCount(table, counts.get(option.value) ?? 0)}
              </span>
            )}
          </label>
        ))}
        {visible.length === 0 && (
          <p className="cn-data-table-hint">No matches.</p>
        )}
      </div>
    </div>
  )
}

function toDay(time: unknown) {
  return typeof time === "number" ? new Date(time) : undefined
}

/**
 * A column's filter: a condition (contains, ≥, is within the past week, is
 * any of…) and the value it compares with, drawn for the column's type.
 * Changes apply as you go.
 */
const BOOLEAN_FILTERS = [
  { value: "all", label: "All" },
  { value: "checked", label: "Checked" },
  { value: "unchecked", label: "Unchecked" },
]

function DataTableColumnFilter<TData extends RowData>({
  column,
  table,
}: {
  column: DataTableColumn<TData>
  table: DataTableCoreTable<TData>
}) {
  const type = column.columnDef.meta?.type
  const kind = type ? getFilterKind(type) : "text"
  const [draft, setDraft] = React.useState<DataTableFilter>(
    () =>
      readFilter(kind, column.getFilterValue()) ?? {
        operator: getDefaultOperator(kind),
      }
  )
  const [, startTransition] = React.useTransition()
  if (!type) return null
  const label = getColumnLabel(column)
  const format = getFormat(column, table)
  const now = table.options.meta?.now ?? 0

  // The draft keeps a condition that has no value yet, which the column's
  // filter state drops until it does.
  const update = (next: DataTableFilter) => {
    setDraft(next)
    startTransition(() => column.setFilterValue(next))
  }
  const clear = () => {
    setDraft({ operator: getDefaultOperator(kind) })
    startTransition(() => column.setFilterValue(undefined))
  }
  const filtered = column.getIsFiltered()
  const changeOperator = (operator: DataTableOperator) =>
    update({
      operator,
      ...(needsFilterValue(operator) && operator !== "within"
        ? { value: draft.operator === "within" ? undefined : draft.value }
        : {}),
      ...(operator === "between" && draft.to !== undefined
        ? { to: draft.to }
        : {}),
      ...(operator === "within" && draft.preset
        ? { preset: draft.preset }
        : {}),
    })

  let editor: React.ReactNode = null
  // A checkbox has three answers, so they're the filter itself.
  if (kind === "boolean") {
    editor = (
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label={`${label} filter`}
        value={[filtered ? draft.operator : "all"]}
        onValueChange={([next]) => {
          if (next === "all") clear()
          if (next === "checked" || next === "unchecked") {
            update({ operator: next })
          }
        }}
        className="w-full"
      >
        {BOOLEAN_FILTERS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="flex-1"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    )
  } else if (needsFilterValue(draft.operator)) {
    if (kind === "text") {
      editor = (
        <Input
          autoFocus
          value={typeof draft.value === "string" ? draft.value : ""}
          placeholder="Type a value…"
          aria-label={`${label} value`}
          onChange={(event) => update({ ...draft, value: event.target.value })}
        />
      )
    }
    if (kind === "number") {
      // Percentages are stored as fractions and typed as whole percents.
      const scale = type === "percent" ? 100 : 1
      const toInput = (value: unknown) =>
        typeof value === "number"
          ? String(Math.round(value * scale * 100) / 100)
          : ""
      const parse = (text: string) => {
        if (text.trim() === "") return undefined
        const number = Number(text)
        return Number.isFinite(number) ? number / scale : undefined
      }
      const bounds = table.options.manualFiltering
        ? undefined
        : column.getFacetedMinMaxValues()
      const between = draft.operator === "between"
      editor = (
        <div className="cn-data-table-filter-number flex flex-col">
          <div className="cn-data-table-filter-inputs flex items-center">
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              value={toInput(draft.value)}
              placeholder={between ? "From" : "Value"}
              aria-label={between ? `${label} from` : `${label} value`}
              onChange={(event) =>
                update({ ...draft, value: parse(event.target.value) })
              }
            />
            {between && (
              <>
                <span aria-hidden className="cn-data-table-hint">
                  and
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={toInput(draft.to)}
                  placeholder="To"
                  aria-label={`${label} to`}
                  onChange={(event) =>
                    update({ ...draft, to: parse(event.target.value) })
                  }
                />
              </>
            )}
          </div>
          {bounds && (
            <p className="cn-data-table-hint">
              {formatDataTableValue(type, bounds[0], format)} to{" "}
              {formatDataTableValue(type, bounds[1], format)} in view
            </p>
          )}
        </div>
      )
    }
    if (kind === "date") {
      if (draft.operator === "within") {
        editor = (
          <div
            role="group"
            aria-label={`${label} range`}
            className="cn-data-table-presets grid grid-cols-2"
          >
            {DATA_TABLE_DATE_PRESETS.map((preset) => {
              const active = draft.preset === preset.value
              return (
                <Button
                  key={preset.value}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => update({ ...draft, preset: preset.value })}
                  className="cn-data-table-preset"
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>
        )
      } else if (draft.operator === "between") {
        editor = (
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={{ from: toDay(draft.value), to: toDay(draft.to) }}
            defaultMonth={toDay(draft.value) ?? new Date(now)}
            onSelect={(range) =>
              update({
                ...draft,
                value: range?.from?.getTime(),
                to: range?.to?.getTime(),
              })
            }
            className="cn-data-table-calendar"
          />
        )
      } else {
        editor = (
          <Calendar
            mode="single"
            selected={toDay(draft.value)}
            defaultMonth={toDay(draft.value) ?? new Date(now)}
            onSelect={(day) => update({ ...draft, value: day?.getTime() })}
            className="cn-data-table-calendar"
          />
        )
      }
    }
    if (kind === "option" || kind === "multi") {
      const picked = Array.isArray(draft.value) ? draft.value : []
      editor = (
        <DataTableOptionList
          column={column}
          table={table}
          picked={picked}
          onToggle={(value, checked) =>
            update({
              ...draft,
              value: checked
                ? [...picked, value]
                : picked.filter((item) => item !== value),
            })
          }
        />
      )
    }
  }

  return (
    <div
      data-slot="data-table-filter"
      className="cn-data-table-filter flex flex-col"
    >
      <div className="cn-data-table-filter-head flex items-center">
        <span className="cn-data-table-section-label">Filter</span>
        {kind !== "boolean" && (
          <DataTableOperatorSelect
            kind={kind}
            value={draft.operator}
            label={label}
            onValueChange={changeOperator}
          />
        )}
      </div>
      {editor}
    </div>
  )
}

// MARK: Header

function DataTableSortIcon({
  type,
  direction,
}: {
  type: React.ComponentProps<typeof DataTableTypeIcon>["type"]
  direction: false | "asc" | "desc"
}) {
  return (
    <span
      aria-hidden
      data-slot="data-table-sort-icon"
      data-direction={direction || undefined}
      className="cn-data-table-sort-icon grid shrink-0 place-items-center"
    >
      <span className="cn-data-table-sort-type col-start-1 row-start-1 grid place-items-center">
        <DataTableTypeIcon type={type} />
      </span>
      <span className="cn-data-table-sort-arrow col-start-1 row-start-1 grid place-items-center">
        <IconPlaceholder
          lucide="ArrowUpIcon"
          tabler="IconArrowUp"
          hugeicons="ArrowUp01Icon"
          phosphor="ArrowUpIcon"
          remixicon="RiArrowUpLine"
        />
      </span>
    </span>
  )
}

/** Sort, filter, pin and hide for one column, in a popover from its header. */
function DataTableColumnMenu<TData extends RowData>({
  column,
  table,
}: {
  column: DataTableColumn<TData>
  table: DataTableTable<TData>
}) {
  const meta = column.columnDef.meta
  const label = getColumnLabel(column)
  const sorted = column.getIsSorted()
  const pinned = column.getIsPinned()
  const filtered = column.getIsFiltered()
  const canFilter = column.getCanFilter() && meta?.type !== undefined
  // Clearing starts the filter's draft over too.
  const [cleared, setCleared] = React.useState(0)

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-xs" />}
        aria-label={`${label} options`}
        data-slot="data-table-column-trigger"
        data-filtered={filtered ? "" : undefined}
        className="cn-data-table-column-trigger"
      >
        <IconPlaceholder
          lucide="ListFilterIcon"
          tabler="IconFilter"
          hugeicons="FilterHorizontalIcon"
          phosphor="FunnelSimpleIcon"
          remixicon="RiFilter3Line"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={`${label} options`}
        className="cn-data-table-panel"
      >
        <div className="cn-data-table-panel-header flex items-center">
          <DataTableTypeIcon type={meta?.type} />
          <span className="truncate">{label}</span>
        </div>
        {column.getCanSort() && (
          <div className="cn-data-table-panel-sort grid grid-cols-2">
            <Button
              variant={sorted === "asc" ? "secondary" : "outline"}
              size="sm"
              aria-pressed={sorted === "asc"}
              onClick={() =>
                sorted === "asc"
                  ? column.clearSorting()
                  : column.toggleSorting(false)
              }
            >
              <IconPlaceholder
                lucide="ArrowUpIcon"
                tabler="IconArrowUp"
                hugeicons="ArrowUp01Icon"
                phosphor="ArrowUpIcon"
                remixicon="RiArrowUpLine"
                data-icon="inline-start"
              />
              Ascending
            </Button>
            <Button
              variant={sorted === "desc" ? "secondary" : "outline"}
              size="sm"
              aria-pressed={sorted === "desc"}
              onClick={() =>
                sorted === "desc"
                  ? column.clearSorting()
                  : column.toggleSorting(true)
              }
            >
              <IconPlaceholder
                lucide="ArrowDownIcon"
                tabler="IconArrowDown"
                hugeicons="ArrowDown01Icon"
                phosphor="ArrowDownIcon"
                remixicon="RiArrowDownLine"
                data-icon="inline-start"
              />
              Descending
            </Button>
          </div>
        )}
        {canFilter && (
          <>
            <Separator />
            <DataTableColumnFilter
              key={cleared}
              column={column}
              table={table}
            />
          </>
        )}
        <Separator />
        <div className="cn-data-table-panel-actions grid grid-cols-2">
          {column.getCanPin() &&
            (pinned ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.pin(false)}
                className="cn-data-table-panel-item"
              >
                <IconPlaceholder
                  lucide="PinOffIcon"
                  tabler="IconPinnedOff"
                  hugeicons="PinOffIcon"
                  phosphor="PushPinSlashIcon"
                  remixicon="RiUnpinLine"
                />
                Unpin
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.pin("start")}
                className="cn-data-table-panel-item"
              >
                <IconPlaceholder
                  lucide="PinIcon"
                  tabler="IconPin"
                  hugeicons="PinIcon"
                  phosphor="PushPinIcon"
                  remixicon="RiPushpinLine"
                />
                Pin
              </Button>
            ))}
          {column.getCanHide() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleVisibility(false)}
              className="cn-data-table-panel-item"
            >
              <IconPlaceholder
                lucide="EyeOffIcon"
                tabler="IconEyeClosed"
                hugeicons="ViewOffIcon"
                phosphor="EyeSlashIcon"
                remixicon="RiEyeOffLine"
              />
              Hide
            </Button>
          )}
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                column.setFilterValue(undefined)
                setCleared((count) => count + 1)
              }}
              className="cn-data-table-panel-item col-span-2"
            >
              <IconPlaceholder
                lucide="XIcon"
                tabler="IconX"
                hugeicons="Cancel01Icon"
                phosphor="XIcon"
                remixicon="RiCloseLine"
              />
              Clear filter
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** The table's settings: density, lines, footer, row numbers and columns. */
function DataTableSettings<TData extends RowData>({
  table,
}: {
  table: DataTableTable<TData>
}) {
  const { view, setView } = useDataTableContext("DataTableContent")
  const columns = table.getAllLeafColumns()
  const hideable = columns.filter((column) => column.getCanHide())
  const shown = hideable.filter((column) => column.getIsVisible()).length
  const numberable = columns.some(
    (column) => column.columnDef.meta?.kind === "select"
  )
  const switches: { key: keyof DataTableView; label: string }[] = [
    { key: "footer", label: "Calculations" },
    ...(numberable ? [{ key: "numbered" as const, label: "Row numbers" }] : []),
    { key: "striped", label: "Striped rows" },
  ]

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-xs" />}
        aria-label="Table settings"
        data-slot="data-table-settings-trigger"
        className="cn-data-table-settings-trigger"
      >
        <IconPlaceholder
          lucide="Settings2Icon"
          tabler="IconAdjustmentsHorizontal"
          hugeicons="SlidersHorizontalIcon"
          phosphor="SlidersHorizontalIcon"
          remixicon="RiEqualizerLine"
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Table settings"
        className="cn-data-table-panel cn-data-table-settings"
      >
        <div className="cn-data-table-section flex flex-col">
          <span className="cn-data-table-section-label">Density</span>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Density"
            value={[view.size ?? "default"]}
            onValueChange={([next]) => {
              if (isDataTableSize(next)) setView({ size: next })
            }}
            className="w-full"
          >
            {SIZES.map((size) => (
              <ToggleGroupItem
                key={size.value}
                value={size.value}
                className="flex-1"
              >
                {size.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="cn-data-table-section flex flex-col">
          {switches.map(({ key, label }) => (
            <label
              key={key}
              className="cn-data-table-setting flex items-center"
            >
              <span className="flex-1">{label}</span>
              <Switch
                size="sm"
                checked={Boolean(view[key])}
                onCheckedChange={(checked) => setView({ [key]: checked })}
              />
            </label>
          ))}
          <label className="cn-data-table-setting flex items-center">
            <span className="flex-1">Column lines</span>
            <Switch
              size="sm"
              checked={view.lines === "grid"}
              onCheckedChange={(checked) =>
                setView({ lines: checked ? "grid" : "rows" })
              }
            />
          </label>
        </div>
        <Separator />
        <div className="cn-data-table-section flex flex-col">
          <div className="flex items-center">
            <span className="cn-data-table-section-label flex-1">
              Columns · {shown} of {hideable.length}
            </span>
            {shown < hideable.length && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => table.resetColumnVisibility(true)}
              >
                Show all
              </Button>
            )}
          </div>
          <div className="cn-data-table-column-list flex flex-col overflow-y-auto">
            {hideable.map((column) => {
              const visible = column.getIsVisible()
              return (
                <Button
                  key={column.id}
                  variant="ghost"
                  size="sm"
                  aria-pressed={visible}
                  data-hidden={visible ? undefined : ""}
                  onClick={() => column.toggleVisibility(!visible)}
                  className="cn-data-table-column-item"
                >
                  <DataTableTypeIcon type={column.columnDef.meta?.type} />
                  <span className="flex-1 truncate text-start">
                    {getColumnLabel(column)}
                  </span>
                  {visible ? (
                    <IconPlaceholder
                      lucide="EyeIcon"
                      tabler="IconEye"
                      hugeicons="EyeIcon"
                      phosphor="EyeIcon"
                      remixicon="RiEyeLine"
                    />
                  ) : (
                    <IconPlaceholder
                      lucide="EyeOffIcon"
                      tabler="IconEyeClosed"
                      hugeicons="ViewOffIcon"
                      phosphor="EyeSlashIcon"
                      remixicon="RiEyeOffLine"
                    />
                  )}
                </Button>
              )
            })}
          </div>
        </div>
        <Separator />
        <div className="cn-data-table-panel-actions grid grid-cols-2">
          {hasActiveFilters(table) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearFilters(table)}
              className="cn-data-table-panel-item"
            >
              <IconPlaceholder
                lucide="XIcon"
                tabler="IconX"
                hugeicons="Cancel01Icon"
                phosphor="XIcon"
                remixicon="RiCloseLine"
              />
              Clear filters
            </Button>
          )}
          {table.state.sorting.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetSorting(true)}
              className="cn-data-table-panel-item"
            >
              <IconPlaceholder
                lucide="ArrowUpDownIcon"
                tabler="IconArrowsSort"
                hugeicons="ArrowUpDownIcon"
                phosphor="ArrowsDownUpIcon"
                remixicon="RiArrowUpDownLine"
              />
              Clear sort
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnVisibility()
              table.resetColumnSizing(true)
              table.resetColumnPinning()
            }}
            className="cn-data-table-panel-item"
          >
            <IconPlaceholder
              lucide="RotateCwIcon"
              tabler="IconRotateClockwise"
              hugeicons="RotateRight01Icon"
              phosphor="ArrowClockwiseIcon"
              remixicon="RiRefreshLine"
            />
            Reset columns
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** A header's sort button, type icon and options. Select and actions columns draw their own. */
function DataTableColumnHeader<TData extends RowData>({
  header,
  table,
}: {
  header: Header<DataTableFeatures, TData, unknown>
  table: DataTableTable<TData>
}) {
  const column = header.column
  const meta = column.columnDef.meta
  if (meta?.kind) {
    return (
      <div
        data-slot="data-table-head-content"
        className="cn-data-table-head-content flex min-w-0 items-center"
      >
        {meta.kind === "actions" ? (
          <DataTableSettings table={table} />
        ) : (
          <table.FlexRender header={header} />
        )}
      </div>
    )
  }

  const label = getColumnLabel(column)
  const sorted = column.getIsSorted()
  const sortIndex = column.getSortIndex()
  const multiSort = table.state.sorting.length > 1

  return (
    <div
      data-slot="data-table-head-content"
      className="cn-data-table-head-content flex min-w-0 items-center"
    >
      {column.getCanSort() ? (
        <button
          type="button"
          data-slot="data-table-sort"
          data-sorted={sorted || undefined}
          onClick={column.getToggleSortingHandler()}
          className="cn-data-table-sort flex min-w-0 items-center outline-none"
        >
          <DataTableSortIcon type={meta?.type} direction={sorted} />
          <span className="truncate">{label}</span>
          {multiSort && sortIndex >= 0 && (
            <span className="cn-data-table-sort-index">{sortIndex + 1}</span>
          )}
        </button>
      ) : (
        <span className="cn-data-table-sort flex min-w-0 items-center">
          <DataTableSortIcon type={meta?.type} direction={false} />
          <span className="truncate">{label}</span>
        </span>
      )}
      <DataTableColumnMenu column={column} table={table} />
    </div>
  )
}

const RESIZE_STEP = 16

/** The viewport before it's measured, so the first render draws rows. */
const INITIAL_RECT = { width: 0, height: 720 }

/** Pixels a millisecond above which rows coming in draw as skeletons. */
const SKIM_SPEED = 4
/** How long after the last fast scroll the real rows come back. */
const SKIM_SETTLE = 90
/** Skeleton rows drawn ahead of a fast scroll. */
const SKIM_AHEAD = 40

/**
 * While a column resizes from its edge, the page keeps the resize cursor
 * (nothing under the pointer changes it, nothing selects) and a line follows
 * the edge down the table. Pointer only: the keyboard resizes in steps.
 */
function useResizeGuide() {
  const [guide, setGuide] = React.useState<number | null>(null)
  const stopRef = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => stopRef.current?.(), [])

  const onPointerDownCapture = (event: React.PointerEvent<HTMLElement>) => {
    const handle = event.target
    if (
      !(handle instanceof HTMLElement) ||
      handle.dataset.slot !== "data-table-resize"
    ) {
      return
    }
    const root = event.currentTarget
    const page = document.documentElement.style
    const saved = { cursor: page.cursor, userSelect: page.userSelect }
    page.cursor = "col-resize"
    page.userSelect = "none"
    let frame = 0
    const measure = () => {
      frame = 0
      // The middle of the handle, where its line is, in either direction.
      const edge = handle.getBoundingClientRect()
      const box = root.getBoundingClientRect()
      const x = (edge.left + edge.right) / 2 - box.left
      setGuide(Math.min(Math.max(x, 0), box.width))
    }
    const move = () => {
      frame ||= requestAnimationFrame(measure)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      page.cursor = saved.cursor
      page.userSelect = saved.userSelect
      setGuide(null)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
      stopRef.current = null
    }
    stopRef.current?.()
    stopRef.current = stop
    measure()
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
  }

  return { guide, onPointerDownCapture }
}

function DataTableResizeHandle<TData extends RowData>({
  header,
  table,
}: {
  header: Header<DataTableFeatures, TData, unknown>
  table: DataTableTable<TData>
}) {
  const column = header.column
  if (!column.getCanResize()) return null
  const handler = header.getResizeHandler()
  const minSize = column.columnDef.minSize ?? 40

  // The handle follows its column's width on its own, so a drag redraws it
  // and not every head.
  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        size: state.columnSizing[column.id],
        resizing: state.columnResizing.isResizingColumn === column.id,
      })}
    >
      {() => (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${getColumnLabel(column)}`}
          aria-valuenow={column.getSize()}
          aria-valuemin={minSize}
          tabIndex={0}
          data-slot="data-table-resize"
          data-resizing={column.getIsResizing() ? "" : undefined}
          onMouseDown={handler}
          onTouchStart={handler}
          onDoubleClick={() => column.resetSize()}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
              return
            }
            event.preventDefault()
            const step = event.shiftKey ? RESIZE_STEP * 3 : RESIZE_STEP
            const size = column.getSize()
            const next = event.key === "ArrowLeft" ? size - step : size + step
            table.setColumnSizing((sizes) => ({
              ...sizes,
              [column.id]: Math.max(minSize, next),
            }))
          }}
          className="cn-data-table-resize absolute inset-y-0 end-0 z-10 touch-none outline-none select-none"
        />
      )}
    </Subscribe>
  )
}

// MARK: Selection

/** Selects every row in view (the page, when paginated). */
function DataTableSelectAll<TData extends RowData>({
  table,
}: {
  table: DataTableCoreTable<TData>
}) {
  // Follows the selection on its own, so picking a row doesn't redraw
  // every head.
  return (
    <Subscribe source={table.store} selector={(state) => state.rowSelection}>
      {(selection) => {
        // Both walk every row on the page; with nothing picked, skip them.
        const none = Object.keys(selection).length === 0
        const all = !none && table.getIsAllPageRowsSelected()
        const some = !none && table.getIsSomePageRowsSelected()
        return (
          <DataTableCheckbox
            checked={all}
            indeterminate={some && !all}
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked)
            }
            aria-label="Select all rows"
            className="cn-data-table-checkbox"
          />
        )
      }}
    </Subscribe>
  )
}

function DataTableSelectRow<TData extends RowData>({
  row,
  table,
}: {
  row: Row<DataTableFeatures, TData>
  table: DataTableCoreTable<TData>
}) {
  const { view } = useDataTableContext("DataTableContent")
  const position = getRowPosition(table, row) + 1

  return (
    <span
      data-slot="data-table-select"
      data-numbered={view.numbered ? "" : undefined}
      className="cn-data-table-select group/data-table-select grid place-items-center"
    >
      {view.numbered && (
        <span
          aria-hidden
          className="cn-data-table-row-number col-start-1 row-start-1"
        >
          {formatCount(table, position)}
        </span>
      )}
      <DataTableCheckbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked, event) => {
          const anchor = selectionAnchors.get(table)
          // Shift with a click, or with Space (the key's click carries it),
          // picks the range from the last row picked.
          if (event.shiftKey && anchor !== undefined) {
            const ids = getRangeSelection(
              table.getRowModel().rows.map((item) => item.id),
              anchor,
              row.id
            )
            table.setRowSelection((selection) => {
              const next = { ...selection }
              for (const id of ids) {
                if (checked) next[id] = true
                else delete next[id]
              }
              return next
            })
          } else {
            row.toggleSelected(checked)
          }
          selectionAnchors.set(table, row.id)
        }}
        aria-label={`Select row ${position}`}
        className="cn-data-table-checkbox col-start-1 row-start-1"
      />
    </span>
  )
}

/**
 * The checkbox column, pinned to the start. Shift-click picks a range; the
 * settings' Row numbers shows each row's place in it.
 */
function createDataTableSelectColumn<TData extends RowData>() {
  return createDataTableColumnHelper<TData>().display({
    id: "select",
    meta: { kind: "select" },
    header: ({ table }) => <DataTableSelectAll table={table} />,
    cell: ({ row, table }) => <DataTableSelectRow row={row} table={table} />,
  })
}

/** Floats over the bottom of the table while rows are picked. */
function DataTableSelectionBar<TData extends RowData>({
  table,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { table: DataTableTable<TData> }) {
  const count = Object.keys(table.state.rowSelection).length
  const open = count > 0
  // Keeps the last count while the bar fades out.
  const [shown, setShown] = React.useState(count)
  if (open && shown !== count) setShown(count)

  return (
    <div
      role="region"
      aria-label="Selection"
      data-slot="data-table-selection-bar"
      data-state={open ? "open" : "closed"}
      inert={!open}
      className={cn(
        "cn-data-table-selection-bar absolute inset-x-0 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center",
        className
      )}
      {...props}
    >
      <span
        aria-live="polite"
        className="cn-data-table-selection-count whitespace-nowrap"
      >
        {formatCount(table, shown)} selected
      </span>
      {children && (
        <>
          <Separator orientation="vertical" />
          <div className="cn-data-table-selection-actions flex items-center">
            {children}
          </div>
        </>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        onClick={() => table.resetRowSelection(true)}
      >
        <IconPlaceholder
          lucide="XIcon"
          tabler="IconX"
          hugeicons="Cancel01Icon"
          phosphor="XIcon"
          remixicon="RiCloseLine"
        />
      </Button>
    </div>
  )
}

// MARK: Editing

const EDIT_TRIGGER = '[data-slot="data-table-edit-trigger"]'

/** Moves focus to the editable cell beside this one, as arrow keys do in a sheet. */
function focusNeighbor(from: HTMLElement, key: string) {
  const cell = from.closest("td")
  const row = cell?.parentElement
  if (!cell || !(row instanceof HTMLTableRowElement)) return false
  const find = (target: Element | null | undefined) =>
    target?.querySelector<HTMLElement>(EDIT_TRIGGER)
  let next: HTMLElement | null | undefined
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const step = key === "ArrowLeft" ? -1 : 1
    for (
      let index = cell.cellIndex + step;
      !next && index >= 0 && index < row.cells.length;
      index += step
    ) {
      next = find(row.cells[index])
    }
  } else {
    const sibling = (element: Element | null) =>
      key === "ArrowUp"
        ? element?.previousElementSibling
        : element?.nextElementSibling
    let target = sibling(row)
    while (target && target.getAttribute("data-slot") !== "data-table-row") {
      target = sibling(target)
    }
    if (target instanceof HTMLTableRowElement) {
      next = find(target.cells[cell.cellIndex])
    }
  }
  if (!next) return false
  next.focus()
  return true
}

function handleCellKeys(event: React.KeyboardEvent<HTMLElement>) {
  if (!event.key.startsWith("Arrow")) return false
  if (focusNeighbor(event.currentTarget, event.key)) event.preventDefault()
  return true
}

type EditorProps<TData extends RowData> = {
  cell: Cell<DataTableFeatures, TData, unknown>
  table: DataTableTable<TData>
  label: string
  commit: (value: unknown) => void
}

const NUMERIC_TYPES = new Set(["number", "currency", "percent", "progress"])

/** Text and numbers edit in the cell: Enter or blur saves, Escape cancels. */
function DataTableTextEditor<TData extends RowData>({
  cell,
  table,
  label,
  commit,
}: EditorProps<TData>) {
  const meta = cell.column.columnDef.meta
  const type = meta?.type ?? "text"
  const value = cell.getValue()
  const [editing, setEditing] = React.useState<{
    text: string
    select: boolean
  } | null>(null)
  const done = React.useRef(false)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const link = type === "link" || type === "email"

  const finish = (save: boolean, input: HTMLInputElement, refocus: boolean) => {
    if (done.current) return
    done.current = true
    if (save) commit(parseEditText(type, input.value))
    setEditing(null)
    if (refocus) requestAnimationFrame(() => trigger.current?.focus())
  }

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={label}
        defaultValue={editing.text}
        inputMode={NUMERIC_TYPES.has(type) ? "decimal" : undefined}
        data-slot="data-table-edit-input"
        className="cn-data-table-edit-input"
        onFocus={(event) => {
          done.current = false
          const input = event.currentTarget
          if (editing.select) input.select()
          else input.setSelectionRange(input.value.length, input.value.length)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            finish(true, event.currentTarget, true)
          }
          if (event.key === "Escape") {
            event.preventDefault()
            finish(false, event.currentTarget, true)
          }
        }}
        onBlur={(event) => finish(true, event.currentTarget, false)}
      />
    )
  }

  const text = formatDataTableValue(type, value, getFormat(cell.column, table))
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-slot="data-table-edit-trigger"
        onClick={() =>
          setEditing({ text: getEditText(type, value), select: true })
        }
        onKeyDown={(event) => {
          if (handleCellKeys(event)) return
          if (event.key === "F2") {
            event.preventDefault()
            setEditing({ text: getEditText(type, value), select: true })
          }
          // Typing replaces the value, as in a spreadsheet.
          const printable =
            event.key.length === 1 && !event.metaKey && !event.ctrlKey
          if (printable && event.key !== " ") {
            event.preventDefault()
            setEditing({ text: event.key, select: false })
          }
        }}
        className="cn-data-table-edit-trigger"
      >
        {link ? (
          <span className="cn-data-table-text">{text || "–"}</span>
        ) : (
          <table.FlexRender cell={cell} />
        )}
      </button>
      {link && text && (
        <a
          href={type === "email" ? `mailto:${text}` : text}
          target={type === "email" ? undefined : "_blank"}
          rel="noreferrer"
          aria-label={`Open ${text}`}
          className="cn-data-table-edit-link"
        >
          <IconPlaceholder
            lucide="ArrowUpRightIcon"
            tabler="IconArrowUpRight"
            hugeicons="ArrowUpRight01Icon"
            phosphor="ArrowUpRightIcon"
            remixicon="RiArrowRightUpLine"
          />
        </a>
      )}
    </>
  )
}

/**
 * A cell whose editor is a panel. Until someone opens it, it's a plain
 * button: a popover in every cell would cost each row that scrolls in.
 */
function DataTableEditorPopover({
  open,
  onOpenChange,
  label,
  value: valueProp,
  scroll = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  /** The cell as it reads, inside the button. */
  value: React.ReactNode
  /** The button scrolls its value sideways, as tags do. */
  scroll?: boolean
  children: React.ReactNode
}) {
  const [mounted, setMounted] = React.useState(false)
  const value = (
    <DataTableInsideControl value={true}>{valueProp}</DataTableInsideControl>
  )
  if (!mounted) {
    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={false}
        data-slot="data-table-edit-trigger"
        data-scroll={scroll ? "" : undefined}
        onKeyDown={handleCellKeys}
        onClick={() => {
          setMounted(true)
          onOpenChange(true)
        }}
        className="cn-data-table-edit-trigger"
      >
        {value}
      </button>
    )
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={<button type="button" />}
        data-slot="data-table-edit-trigger"
        data-scroll={scroll ? "" : undefined}
        onKeyDown={handleCellKeys}
        className="cn-data-table-edit-trigger"
      >
        {value}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={`Edit ${label}`}
        className="cn-data-table-panel cn-data-table-picker"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** Statuses and people pick one option; tags toggle several. */
function DataTableOptionEditor<TData extends RowData>({
  cell,
  table,
  label,
  commit,
}: EditorProps<TData>) {
  const meta = cell.column.columnDef.meta
  const multiple = meta?.type === "tags"
  const value = cell.getValue()
  const picked = Array.isArray(value)
    ? value.map(String)
    : value === null || value === undefined || value === ""
      ? []
      : [String(value)]
  const options = meta?.options ?? []
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const visible = options.filter((option) =>
    option.label.toLowerCase().includes(needle)
  )

  return (
    <DataTableEditorPopover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
      label={label}
      value={<table.FlexRender cell={cell} />}
      scroll={multiple}
    >
      {options.length > SEARCHABLE_OPTIONS && (
        <Input
          autoFocus
          value={query}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label}`}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <div
        role="group"
        aria-label={label}
        className="cn-data-table-picker-options flex flex-col overflow-y-auto"
      >
        {visible.map((option) => {
          const selected = picked.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              data-slot="data-table-picker-option"
              onClick={() => {
                if (multiple) {
                  commit(
                    selected
                      ? picked.filter((item) => item !== option.value)
                      : [...picked, option.value]
                  )
                  return
                }
                commit(selected ? null : option.value)
                setOpen(false)
              }}
              className="cn-data-table-picker-option flex items-center"
            >
              <span className="flex min-w-0 flex-1">
                <DataTableInsideControl value={true}>
                  <DataTableValue
                    type={meta?.type}
                    value={multiple ? [option.value] : option.value}
                    meta={meta}
                    locale={table.options.meta?.locale}
                  />
                </DataTableInsideControl>
              </span>
              {selected && (
                <IconPlaceholder
                  lucide="CheckIcon"
                  tabler="IconCheck"
                  hugeicons="Tick02Icon"
                  phosphor="CheckIcon"
                  remixicon="RiCheckLine"
                />
              )}
            </button>
          )
        })}
        {visible.length === 0 && (
          <p className="cn-data-table-hint">No matches.</p>
        )}
      </div>
    </DataTableEditorPopover>
  )
}

/** Keeps a date in the shape the row had it: a Date, ms or an ISO string. */
function toDateValue(previous: unknown, day: Date | undefined) {
  if (!day) return null
  if (previous instanceof Date) return day
  if (typeof previous === "number") return day.getTime()
  return day.toISOString()
}

/** Dates pick a day on a calendar. */
function DataTableDateEditor<TData extends RowData>({
  cell,
  table,
  label,
  commit,
}: EditorProps<TData>) {
  const value = cell.getValue()
  const time = toTimestamp(value)
  const selected = time === null ? undefined : new Date(time)
  const [open, setOpen] = React.useState(false)

  return (
    <DataTableEditorPopover
      open={open}
      onOpenChange={setOpen}
      label={label}
      value={<table.FlexRender cell={cell} />}
    >
      <Calendar
        mode="single"
        autoFocus
        selected={selected}
        defaultMonth={selected ?? new Date(table.options.meta?.now ?? 0)}
        onSelect={(day) => {
          commit(toDateValue(value, day))
          setOpen(false)
        }}
        className="cn-data-table-calendar"
      />
      {selected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            commit(null)
            setOpen(false)
          }}
          className="cn-data-table-panel-item"
        >
          Clear date
        </Button>
      )}
    </DataTableEditorPopover>
  )
}

/** An editable cell: the column type's editor over its value. */
function DataTableEditableCell<TData extends RowData>({
  cell,
  table,
}: {
  cell: Cell<DataTableFeatures, TData, unknown>
  table: DataTableTable<TData>
}) {
  const column = cell.column
  const type = column.columnDef.meta?.type
  const label = getColumnLabel(column)
  const commit = (value: unknown) => {
    const previous = cell.getValue()
    if (!Array.isArray(value) && Object.is(value, previous)) return
    table.options.meta?.editCell?.(cell.row.id, column.id, value)
  }

  switch (type) {
    case "boolean":
      return (
        <DataTableCheckbox
          checked={cell.getValue() === true}
          onCheckedChange={(checked) => commit(checked)}
          aria-label={label}
        />
      )
    case "status":
    case "person":
    case "tags":
      return (
        <DataTableOptionEditor
          cell={cell}
          table={table}
          label={label}
          commit={commit}
        />
      )
    case "date":
      return (
        <DataTableDateEditor
          cell={cell}
          table={table}
          label={label}
          commit={commit}
        />
      )
    default:
      return (
        <DataTableTextEditor
          cell={cell}
          table={table}
          label={label}
          commit={commit}
        />
      )
  }
}

// MARK: Body

const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-5/6", "w-2/5", "w-2/3"]

/**
 * A position whose window hasn't arrived: a skeleton row while it loads,
 * and where it failed, a retry on the first such row in view.
 */
function DataTablePendingRow<TData extends RowData>({
  position,
  columns,
  fillerIndex,
  loader,
  firstInView,
}: {
  position: number
  columns: DataTableColumn<TData>[]
  fillerIndex: number
  loader: DataTableLoaderState | undefined
  firstInView: boolean
}) {
  const window = loader ? Math.floor(position / loader.windowSize) : 0
  const failed = loader?.failedWindows.has(window) ?? false
  if (!failed || !loader) {
    return (
      <DataTableSkeletonRows
        columns={columns}
        count={1}
        fillerIndex={fillerIndex}
        seed={position}
      />
    )
  }
  const first = firstInView || position % loader.windowSize === 0
  return (
    <tr
      data-slot="data-table-pending-row"
      aria-hidden={first ? undefined : true}
      className="cn-data-table-row"
    >
      <td colSpan={columns.length + 1} className="cn-data-table-cell p-0">
        {first && (
          <div className="cn-data-table-load-error">
            <span>Couldn’t load these rows.</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => loader.retryWindow(window)}
            >
              <IconPlaceholder
                lucide="RotateCwIcon"
                tabler="IconRotateClockwise"
                hugeicons="RotateRight01Icon"
                phosphor="ArrowClockwiseIcon"
                remixicon="RiRefreshLine"
                data-icon="inline-start"
              />
              Try again
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

function DataTableSkeletonRows<TData extends RowData>({
  columns,
  count,
  fillerIndex,
  seed = 0,
}: {
  columns: DataTableColumn<TData>[]
  count: number
  fillerIndex: number
  /** Shifts the bar widths, so rows drawn one at a time still vary. */
  seed?: number
}) {
  return Array.from({ length: count }, (_, rowIndex) => (
    <tr
      key={`skeleton-${rowIndex}`}
      aria-hidden
      data-slot="data-table-skeleton-row"
      className="cn-data-table-row"
    >
      {columns.map((column, columnIndex) => {
        const kind = column.columnDef.meta?.kind
        return (
          <React.Fragment key={column.id}>
            {columnIndex === fillerIndex && (
              <td className="cn-data-table-filler" />
            )}
            <td
              data-pinned={column.getIsPinned() || undefined}
              data-align={getColumnAlign(column)}
              data-pin-column={getPinColumn(column)}
              className="cn-data-table-cell"
            >
              {kind === "actions" ? null : (
                <Skeleton
                  className={cn(
                    "cn-data-table-skeleton",
                    kind === "select"
                      ? "size-(--density-icon-16)"
                      : SKELETON_WIDTHS[(seed + rowIndex + columnIndex) % 5]
                  )}
                />
              )}
            </td>
          </React.Fragment>
        )
      })}
      {fillerIndex >= columns.length && <td className="cn-data-table-filler" />}
    </tr>
  ))
}

function isInteractiveTarget(target: EventTarget) {
  return (
    target instanceof Element &&
    target.closest(
      "a,button,input,label,select,textarea,[role=checkbox],[role=menuitem],[data-slot=data-table-select]"
    ) !== null
  )
}

function DataTableEmptyState<TData extends RowData>({
  table,
}: {
  table: DataTableTable<TData>
}) {
  const filtered = hasActiveFilters(table)
  return (
    <Empty className="cn-data-table-empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {filtered ? (
            <IconPlaceholder
              lucide="SearchIcon"
              tabler="IconSearch"
              hugeicons="Search01Icon"
              phosphor="MagnifyingGlassIcon"
              remixicon="RiSearchLine"
            />
          ) : (
            <IconPlaceholder
              lucide="InboxIcon"
              tabler="IconInbox"
              hugeicons="InboxIcon"
              phosphor="TrayIcon"
              remixicon="RiInboxLine"
            />
          )}
        </EmptyMedia>
        <EmptyTitle>
          {filtered ? "No matching records" : "No records"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "Try another search, or clear the filters."
            : "Records show up here once there are some."}
        </EmptyDescription>
      </EmptyHeader>
      {filtered && (
        <EmptyContent>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearFilters(table)}
          >
            Clear filters
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

/** A loader that failed: what happened and a way to try again. */
function DataTableErrorState({ retry }: { retry: () => void }) {
  return (
    <Empty className="cn-data-table-empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconPlaceholder
            lucide="AlertCircleIcon"
            tabler="IconAlertCircle"
            hugeicons="AlertCircleIcon"
            phosphor="WarningCircleIcon"
            remixicon="RiErrorWarningLine"
          />
        </EmptyMedia>
        <EmptyTitle>Couldn’t load the rows</EmptyTitle>
        <EmptyDescription>
          Something went wrong on the way. Try again in a moment.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={retry}>
          <IconPlaceholder
            lucide="RotateCwIcon"
            tabler="IconRotateClockwise"
            hugeicons="RotateRight01Icon"
            phosphor="ArrowClockwiseIcon"
            remixicon="RiRefreshLine"
            data-icon="inline-start"
          />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function DataTableAggregateCell<TData extends RowData>({
  column,
  aggregate,
  value,
  onAggregateChange,
}: {
  column: DataTableColumn<TData>
  aggregate: DataTableAggregate | undefined
  value: { short: string; full: string } | undefined
  onAggregateChange: (aggregate: DataTableAggregate | undefined) => void
}) {
  const type = column.columnDef.meta?.type
  if (!type) return null
  const options = getAggregateOptions(type)
  const label = getColumnLabel(column)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="data-table-aggregate"
        data-empty={aggregate ? undefined : ""}
        aria-label={
          aggregate
            ? `${label}: ${DATA_TABLE_AGGREGATE_LABELS[aggregate]}${value ? ` ${value.full}` : ""}`
            : `Calculate ${label}`
        }
        title={value?.full}
        className="cn-data-table-aggregate flex w-full min-w-0 items-center outline-none"
      >
        {aggregate ? (
          <>
            <span className="cn-data-table-aggregate-label">
              {DATA_TABLE_AGGREGATE_LABELS[aggregate]}
            </span>
            <span className="cn-data-table-aggregate-value truncate">
              {value?.short}
            </span>
          </>
        ) : (
          <span className="cn-data-table-aggregate-label">Calculate</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="cn-data-table-menu w-44">
        <DropdownMenuRadioGroup
          value={aggregate ?? "none"}
          onValueChange={(next) =>
            onAggregateChange(options.find((option) => option === next))
          }
        >
          <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {DATA_TABLE_AGGREGATE_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Renders `children` again only when one of `deps` changes, like a memo
 * that doesn't depend on the row type. It keeps rows, the header and the
 * footer still while the body scrolls.
 */
/**
 * What a body cell redraws for. A cell drawn from its value, or an editor,
 * follows its row's data; the checkbox column also follows the selection
 * and the row's place. Other custom cells follow their row: one that shows
 * table state (selection, expansion) subscribes to it with Subscribe.
 */
function getCellDeps<TData extends RowData>(
  cell: Cell<DataTableFeatures, TData, unknown>,
  editing: boolean,
  selected: boolean,
  position: number
): readonly unknown[] {
  const definition = cell.column.columnDef
  if (editing || definition.cell === DataTableCell) {
    return [cell.row.original, definition, editing]
  }
  if (definition.meta?.kind === "select") return [cell, selected, position]
  return [cell]
}

const DataTableMemo = React.memo(
  function DataTableMemo({
    children,
  }: {
    deps: readonly unknown[]
    children: () => React.ReactNode
  }) {
    return children()
  },
  (previous, next) =>
    previous.deps.length === next.deps.length &&
    previous.deps.every((dep, index) => Object.is(dep, next.deps[index]))
)

/**
 * The scrolling table: a sticky header that sorts and filters, virtual
 * rows that edit in place, pinned columns, loading and empty states, and a
 * footer of calculations. Give it a height (or let a sized DataTable
 * stretch it). With `useDataTable({ load })` it loads, refreshes and loads
 * more on its own; the props below override that.
 */
function DataTableContent<TData extends RowData>({
  table,
  loading: loadingProp,
  loadingMore: loadingMoreProp,
  hasMore: hasMoreProp,
  onLoadMore: onLoadMoreProp,
  loadMoreThreshold = 20,
  overscan = 5,
  empty,
  error: errorProp,
  onRowClick,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onClick"> & {
  table: DataTableTable<TData>
  /** First load (skeleton rows) or a refetch (a line under the header). */
  loading?: boolean
  /** Skeleton rows after the last row while the next ones load. */
  loadingMore?: boolean
  /** More rows wait on the server: scrolling near the end calls `onLoadMore`. */
  hasMore?: boolean
  onLoadMore?: () => void
  /** Rows from the end at which `onLoadMore` fires. */
  loadMoreThreshold?: number
  /** Rows drawn beyond each edge of the view. */
  overscan?: number
  /** Replaces the default empty state. */
  empty?: React.ReactNode
  /** Shown in place of the rows, such as an Empty with a retry button. */
  error?: React.ReactNode
  onRowClick?: (row: Row<DataTableFeatures, TData>) => void
}) {
  const { variant, view } = useDataTableContext("DataTableContent")
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const state = table.state
  const loader = table.options.meta?.loader
  const status = loader?.status
  const loading =
    loadingProp ?? (status === "loading" || status === "refreshing")
  const loadingMore = loadingMoreProp ?? false
  const hasMore = hasMoreProp ?? false
  const onLoadMore = onLoadMoreProp
  // A loader without pages lays every match out in the scroll and fills
  // windows of rows as they come into view.
  const windowed = loader !== undefined && !table.options.meta?.paginate
  const rowIndexAt = loader?.rowIndexAt
  const rowAt = React.useCallback(
    (position: number) => {
      if (!windowed || !rowIndexAt) return rows[position]
      const index = rowIndexAt(position)
      return index === undefined ? undefined : rows[index]
    },
    [rows, windowed, rowIndexAt]
  )
  const virtualCount = windowed ? (loader?.total ?? 0) : rows.length
  const error =
    errorProp ??
    (status === "error" && loader ? (
      <DataTableErrorState retry={loader.retry} />
    ) : undefined)

  const rowClickRef = React.useRef(onRowClick)
  React.useLayoutEffect(() => {
    rowClickRef.current = onRowClick
  })
  const clickable = onRowClick !== undefined

  const startColumns = table.getStartVisibleLeafColumns()
  const centerColumns = table.getCenterVisibleLeafColumns()
  const endColumns = table.getEndVisibleLeafColumns()
  const columns = React.useMemo(
    () => [...startColumns, ...centerColumns, ...endColumns],
    [startColumns, centerColumns, endColumns]
  )
  const fillerIndex = startColumns.length + centerColumns.length
  const headers = [
    ...table.getStartLeafHeaders(),
    ...table.getCenterLeafHeaders(),
    ...table.getEndLeafHeaders(),
  ]

  // A resize touches as little as it can: widths go on the <col>s (layout
  // only), and pinned offsets in rules that match the pinned column's cells
  // alone. A custom property on the table would restyle every cell.
  const pinScope = React.useId().replace(/[^\w-]/g, "")
  let pinRules = ""
  for (const column of columns) {
    const pinned = column.getIsPinned()
    if (!pinned) continue
    const offset =
      pinned === "start" ? column.getStart("start") : column.getAfter("end")
    pinRules += `[data-pin-scope="${pinScope}"] [data-pin-column="${getCssName(column.id)}"]{inset-inline-${pinned}:${offset}px}`
  }

  const [rowHeight, setRowHeight] = React.useState(48)
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const height = toPixels(
      getComputedStyle(viewport).getPropertyValue("--data-table-row-height"),
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    )
    if (height) setRowHeight(height)
  }, [view.size])

  // Stable callbacks: a new one makes the virtualizer measure every row
  // again, which is O(rows) on each render.
  const getItemKey = React.useCallback(
    (index: number) => rowAt(index)?.id ?? `pending-${index}`,
    [rowAt]
  )
  const estimateSize = React.useCallback(() => rowHeight, [rowHeight])

  // Skimming: while the scroll is fast, rows coming in draw as skeletons
  // and the real ones arrive once it slows, so every frame keeps up. Not
  // while focus is in a row, where an editor may be open.
  const [skimming, setSkimming] = React.useState(false)
  const skimRef = React.useRef({ offset: 0, at: 0, timer: 0, forward: true })
  React.useEffect(() => () => window.clearTimeout(skimRef.current.timer), [])
  const onScrollChange = (instance: { scrollOffset: number | null }) => {
    const skim = skimRef.current
    const now = performance.now()
    const offset = instance.scrollOffset ?? 0
    const speed = Math.abs(offset - skim.offset) / Math.max(now - skim.at, 1)
    skim.forward = offset >= skim.offset
    skim.offset = offset
    skim.at = now
    if (speed < SKIM_SPEED) return
    if (viewportRef.current?.querySelector("tr:focus-within")) return
    setSkimming(true)
    window.clearTimeout(skim.timer)
    skim.timer = window.setTimeout(() => setSkimming(false), SKIM_SETTLE)
  }

  // Skimming draws far ahead in the direction of the scroll: skeletons are
  // cheap, and the screen never outruns them.
  const rangeExtractor = React.useCallback(
    (range: Range) => {
      if (!skimming) return defaultRangeExtractor(range)
      const forward = skimRef.current.forward
      const start = Math.max(
        range.startIndex - (forward ? range.overscan : SKIM_AHEAD),
        0
      )
      const end = Math.min(
        range.endIndex + (forward ? SKIM_AHEAD : range.overscan),
        range.count - 1
      )
      return Array.from(
        { length: end - start + 1 },
        (_, index) => start + index
      )
    },
    [skimming]
  )

  const virtualizer = useVirtualizer({
    count: virtualCount,
    getScrollElement: () => viewportRef.current,
    estimateSize,
    getItemKey,
    overscan,
    rangeExtractor,
    initialRect: INITIAL_RECT,
    onChange: onScrollChange,
  })
  React.useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, rowHeight])

  // A new sort, filter or search starts from the first row: at once for
  // rows here, and when the new rows arrive for a loader.
  const viewKey = loader
    ? loader.resultKey
    : JSON.stringify([state.sorting, state.columnFilters, state.globalFilter])
  React.useEffect(() => {
    // Reading the scroll range lays out the new rows, so a table already at
    // the top (the virtualizer knows from its last scroll) skips it.
    if (!virtualizer.scrollOffset) return
    virtualizer.scrollToOffset(0)
  }, [virtualizer, viewKey])

  const items = virtualizer.getVirtualItems()
  const paddingTop = items[0]?.start ?? 0
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) : 0
  const firstIndex = items[0]?.index ?? 0
  const lastIndex = items.at(-1)?.index ?? -1

  // The windows in view load as the scroll reaches them (again when a new
  // view's rows arrive).
  const requestRange = loader?.requestRange
  const resultKey = loader?.resultKey
  React.useEffect(() => {
    if (!windowed || !requestRange || lastIndex < 0) return
    requestRange(firstIndex, lastIndex)
  }, [windowed, requestRange, resultKey, firstIndex, lastIndex])

  // Infinite scroll: once per approach to the end, never while loading.
  const requested = React.useRef(-1)
  React.useEffect(() => {
    if (!onLoadMore) return
    if (requested.current === rows.length) return
    if (
      shouldLoadMore({
        lastIndex,
        rowCount: rows.length,
        threshold: loadMoreThreshold,
        hasMore,
        loading: loading || loadingMore,
      })
    ) {
      requested.current = rows.length
      onLoadMore()
    }
  }, [
    lastIndex,
    rows.length,
    hasMore,
    loading,
    loadingMore,
    loadMoreThreshold,
    onLoadMore,
  ])

  const [aggregates, setAggregates] = React.useState<
    Record<string, DataTableAggregate | undefined>
  >(() =>
    Object.fromEntries(
      table
        .getAllLeafColumns()
        .map((column) => [column.id, column.columnDef.meta?.aggregate])
    )
  )
  const filteredRows = table.getFilteredRowModel().rows
  const remoteAggregates = loader?.aggregates
  const firstLoad = loading && rows.length === 0
  const resizing = Boolean(state.columnResizing.isResizingColumn)
  const resizeGuide = useResizeGuide()
  const leafColumns = table.getAllLeafColumns()
  const rowTotal = table.getRowCount()
  const locale = table.options.meta?.locale
  const now = table.options.meta?.now
  const aggregateValues = React.useMemo(() => {
    const values: Record<string, { short: string; full: string }> = {}
    // Nothing to count before the first rows arrive.
    if (!view.footer || firstLoad) return values
    for (const column of leafColumns) {
      const aggregate = aggregates[column.id]
      const type = column.columnDef.meta?.type
      if (!aggregate || !type) continue
      // A server's figures cover every matching row; rows here cover what
      // loaded, so the count comes from the row count.
      const value =
        remoteAggregates?.[column.id]?.[aggregate] ??
        (aggregate === "count"
          ? rowTotal
          : getAggregateValue(
              aggregate,
              filteredRows.map((row) => row.getValue(column.id)),
              type
            ))
      const format = { ...column.columnDef.meta?.format, locale, now }
      // Totals of money and counts outgrow their column: 2.2B, with the
      // exact figure in the title.
      const compact = type === "currency" || type === "number"
      values[column.id] = {
        short: formatDataTableAggregate(
          type,
          aggregate,
          value,
          compact ? { ...format, fractionDigits: undefined, compact } : format
        ),
        full: formatDataTableAggregate(type, aggregate, value, format),
      }
    }
    return values
  }, [
    aggregates,
    filteredRows,
    firstLoad,
    leafColumns,
    locale,
    now,
    remoteAggregates,
    rowTotal,
    view.footer,
  ])

  const refetching = loading && rows.length > 0
  const showEmpty = !loading && !error && rows.length === 0
  const rowCount = table.getRowCount()
  const rowOffset = getRowOffset(table)
  const selection = state.rowSelection
  const editable = table.options.meta?.editCell !== undefined
  const filler = <td aria-hidden className="cn-data-table-filler" />

  // Each row, the header and the footer redraw only when what they show
  // changes: a scroll mounts the rows coming into view and nothing else,
  // and a resize restyles the table through its CSS variables.
  let body: React.ReactNode = null
  if (!error && firstLoad) {
    body = (
      <DataTableSkeletonRows
        columns={columns}
        count={12}
        fillerIndex={fillerIndex}
      />
    )
  }
  if (!error && !firstLoad) {
    body = (
      <>
        {paddingTop > 0 && (
          <tr aria-hidden style={{ height: paddingTop }}>
            <td
              colSpan={columns.length + 1}
              className="cn-data-table-spacer p-0"
            />
          </tr>
        )}
        {items.map((item) => {
          const row = skimming ? undefined : rowAt(item.index)
          if (!row) {
            const firstInView = item.index === firstIndex
            return (
              <DataTableMemo
                key={`pending-${item.index}`}
                deps={[columns, fillerIndex, loader, firstInView]}
              >
                {() => (
                  <DataTablePendingRow
                    position={item.index}
                    columns={columns}
                    fillerIndex={fillerIndex}
                    loader={loader}
                    firstInView={firstInView}
                  />
                )}
              </DataTableMemo>
            )
          }
          const selected = Boolean(selection[row.id])
          return (
            <DataTableMemo
              key={row.id}
              deps={[
                row,
                selected,
                item.index,
                rowOffset,
                columns,
                clickable,
                editable,
              ]}
            >
              {() => (
                <tr
                  data-slot="data-table-row"
                  data-state={selected ? "selected" : undefined}
                  data-odd={item.index % 2 === 1 ? "" : undefined}
                  data-clickable={clickable ? "" : undefined}
                  aria-rowindex={rowOffset + item.index + 2}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={
                    clickable
                      ? (event) => {
                          if (!isInteractiveTarget(event.target)) {
                            rowClickRef.current?.(row)
                          }
                        }
                      : undefined
                  }
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (
                            event.key === "Enter" &&
                            event.target === event.currentTarget
                          ) {
                            rowClickRef.current?.(row)
                          }
                        }
                      : undefined
                  }
                  className="cn-data-table-row"
                >
                  {[
                    ...row.getStartVisibleCells(),
                    ...row.getCenterVisibleCells(),
                    ...row.getEndVisibleCells(),
                  ].map((cell, index) => {
                    const column = cell.column
                    const meta = column.columnDef.meta
                    const editing = editable && meta?.editable === true
                    return (
                      <React.Fragment key={cell.id}>
                        {index === fillerIndex && filler}
                        <td
                          data-slot="data-table-cell"
                          data-pinned={column.getIsPinned() || undefined}
                          data-kind={meta?.kind}
                          data-type={meta?.type}
                          data-editable={editing ? "" : undefined}
                          data-primary={meta?.primary ? "" : undefined}
                          data-align={getColumnAlign(column)}
                          data-pin-column={getPinColumn(column)}
                          className="cn-data-table-cell"
                        >
                          <DataTableMemo
                            deps={getCellDeps(
                              cell,
                              editing,
                              selected,
                              rowOffset + item.index
                            )}
                          >
                            {() =>
                              editing ? (
                                <DataTableEditableCell
                                  cell={cell}
                                  table={table}
                                />
                              ) : (
                                <table.FlexRender cell={cell} />
                              )
                            }
                          </DataTableMemo>
                        </td>
                      </React.Fragment>
                    )
                  })}
                  {fillerIndex >= columns.length && filler}
                </tr>
              )}
            </DataTableMemo>
          )
        })}
        {paddingBottom > 0 && (
          <tr aria-hidden style={{ height: paddingBottom }}>
            <td
              colSpan={columns.length + 1}
              className="cn-data-table-spacer p-0"
            />
          </tr>
        )}
        {loadingMore && (
          <DataTableSkeletonRows
            columns={columns}
            count={3}
            fillerIndex={fillerIndex}
          />
        )}
      </>
    )
  }

  return (
    <div
      data-slot="data-table-content"
      data-variant={variant}
      data-footer={view.footer ? "" : undefined}
      data-resizing={resizing ? "" : undefined}
      onPointerDownCapture={resizeGuide.onPointerDownCapture}
      className={cn(
        "cn-data-table-content relative flex min-h-0 flex-1 flex-col",
        className
      )}
      {...props}
    >
      <style>{pinRules}</style>
      <div
        ref={viewportRef}
        data-slot="data-table-viewport"
        data-empty={showEmpty || error ? "" : undefined}
        className="cn-data-table-viewport relative min-h-0 flex-1 overflow-auto overscroll-none"
      >
        <table
          data-slot="data-table-table"
          aria-rowcount={rowCount + 1}
          aria-busy={loading || loadingMore}
          data-pin-scope={pinScope}
          style={{ minWidth: table.getTotalSize() }}
          className="cn-data-table-table w-full table-fixed border-separate border-spacing-0"
        >
          <colgroup>
            {columns.map((column, index) => (
              <React.Fragment key={column.id}>
                {index === fillerIndex && <col />}
                <col style={{ width: column.getSize() }} />
              </React.Fragment>
            ))}
            {fillerIndex >= columns.length && <col />}
          </colgroup>
          <thead data-slot="data-table-header" className="cn-data-table-header">
            <DataTableMemo
              deps={[
                columns,
                rows,
                state.sorting,
                state.columnFilters,
                state.globalFilter,
                state.columnVisibility,
                state.pagination,
              ]}
            >
              {() => (
                <tr aria-rowindex={1}>
                  {headers.map((header, index) => {
                    const column = header.column
                    const sorted = column.getIsSorted()
                    return (
                      <React.Fragment key={header.id}>
                        {index === fillerIndex && (
                          <th aria-hidden className="cn-data-table-filler" />
                        )}
                        <th
                          scope="col"
                          data-slot="data-table-head"
                          data-pinned={column.getIsPinned() || undefined}
                          data-kind={column.columnDef.meta?.kind}
                          aria-sort={
                            column.getCanSort()
                              ? sorted === "asc"
                                ? "ascending"
                                : sorted === "desc"
                                  ? "descending"
                                  : "none"
                              : undefined
                          }
                          data-pin-column={getPinColumn(column)}
                          className="cn-data-table-head"
                        >
                          <DataTableColumnHeader
                            header={header}
                            table={table}
                          />
                          <DataTableResizeHandle
                            header={header}
                            table={table}
                          />
                        </th>
                      </React.Fragment>
                    )
                  })}
                  {fillerIndex >= columns.length && (
                    <th aria-hidden className="cn-data-table-filler" />
                  )}
                </tr>
              )}
            </DataTableMemo>
          </thead>
          <tbody
            data-slot="data-table-body"
            data-refetching={refetching ? "" : undefined}
            className="cn-data-table-body"
          >
            {body}
          </tbody>
          {view.footer && (
            <tfoot
              data-slot="data-table-footer"
              className="cn-data-table-footer"
            >
              <DataTableMemo deps={[columns, aggregates, aggregateValues]}>
                {() => (
                  <tr>
                    {columns.map((column, index) => (
                      <React.Fragment key={column.id}>
                        {index === fillerIndex && filler}
                        <td
                          data-slot="data-table-footer-cell"
                          data-pinned={column.getIsPinned() || undefined}
                          data-kind={column.columnDef.meta?.kind}
                          data-align={getColumnAlign(column)}
                          data-pin-column={getPinColumn(column)}
                          className="cn-data-table-footer-cell"
                        >
                          <DataTableAggregateCell
                            column={column}
                            aggregate={aggregates[column.id]}
                            value={aggregateValues[column.id]}
                            onAggregateChange={(aggregate) =>
                              setAggregates((current) => ({
                                ...current,
                                [column.id]: aggregate,
                              }))
                            }
                          />
                        </td>
                      </React.Fragment>
                    ))}
                    {fillerIndex >= columns.length && filler}
                  </tr>
                )}
              </DataTableMemo>
            </tfoot>
          )}
        </table>
      </div>
      <DataTableScrollLayer
        viewportRef={viewportRef}
        startWidth={table.getStartTotalSize()}
        endWidth={table.getEndTotalSize()}
      />
      {refetching && (
        <div
          aria-hidden
          data-slot="data-table-loading-bar"
          className="cn-data-table-loading-bar pointer-events-none absolute inset-x-0 z-30"
        />
      )}
      {resizeGuide.guide !== null && (
        <div
          aria-hidden
          data-slot="data-table-resize-guide"
          style={{ left: resizeGuide.guide }}
          className="cn-data-table-resize-guide pointer-events-none absolute inset-y-0 z-30"
        />
      )}
      {(showEmpty || error) && (
        <div
          data-slot="data-table-empty"
          className="cn-data-table-empty absolute inset-x-0 bottom-0 z-10 flex items-center justify-center"
        >
          {error ?? empty ?? <DataTableEmptyState table={table} />}
        </div>
      )}
      {children}
    </div>
  )
}

// MARK: Scroll layer

/** A thumb never gets shorter than this, however long the table. */
const SCROLLBAR_MIN_THUMB = 24
/** How long the thumbs stay after the last scroll, in milliseconds. */
const SCROLLBAR_HOLD = 800

type ScrollAxis = "x" | "y"

/**
 * Sizes and moves one thumb for the viewport's scroll on its axis. The track
 * runs the length of the part that scrolls (`visible`), which the caller
 * knows before the track is shown.
 */
function placeScrollThumb(
  track: HTMLElement | null,
  axis: ScrollAxis,
  visible: number,
  content: number,
  scrolled: number,
  sign: number
) {
  const thumb = track?.firstElementChild
  if (!track || !(thumb instanceof HTMLElement)) return
  const length = visible
  const overflow = content - visible
  if (overflow <= 1 || length <= 0) {
    track.dataset.hidden = ""
    return
  }
  delete track.dataset.hidden
  const size = Math.max(
    SCROLLBAR_MIN_THUMB,
    Math.round((length * visible) / content)
  )
  const offset =
    ((length - size) * Math.min(Math.abs(scrolled), overflow)) / overflow
  if (axis === "y") {
    thumb.style.height = `${size}px`
    thumb.style.transform = `translateY(${offset}px)`
  } else {
    thumb.style.width = `${size}px`
    thumb.style.transform = `translateX(${sign * offset}px)`
  }
}

function toggleData(element: HTMLElement, key: string, on: boolean) {
  if (on) element.dataset[key] = ""
  else delete element.dataset[key]
}

/**
 * What the table draws over its scrolling rows. Pinned edges: while rows
 * scroll under the pinned columns, a hairline marks the edge and the
 * content fades into it. Scrollbars, for a mouse or trackpad: the vertical
 * one runs from under the header to above the footer and the horizontal one
 * between the pinned columns, so neither crosses what stays in place; they
 * show while the table is lit or scrolling. Touch keeps the system's.
 */
function DataTableScrollLayer({
  viewportRef,
  startWidth,
  endWidth,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>
  /** Widths pinned to either edge. */
  startWidth: number
  endWidth: number
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const verticalRef = React.useRef<HTMLDivElement>(null)
  const horizontalRef = React.useRef<HTMLDivElement>(null)

  // Direction only changes with the page, so it's read on resize, not on
  // every scroll.
  const rtlRef = React.useRef(false)

  const update = React.useCallback(() => {
    const viewport = viewportRef.current
    const root = rootRef.current
    if (!viewport || !root) return
    // Every read first, then every write, so a scroll lays out at most once.
    const head = viewport.querySelector("thead")?.offsetHeight ?? 0
    const foot = viewport.querySelector("tfoot")?.offsetHeight ?? 0
    const { clientHeight, clientWidth, scrollHeight, scrollWidth } = viewport
    const scrollTop = viewport.scrollTop
    const scrollLeft = viewport.scrollLeft
    const pinned = startWidth + endWidth
    const scrolled = Math.abs(scrollLeft)
    const overflow = scrollWidth - clientWidth
    root.style.setProperty("--data-table-head-height", `${head}px`)
    root.style.setProperty("--data-table-foot-height", `${foot}px`)
    toggleData(root, "overflowStart", scrolled > 0.5)
    toggleData(root, "overflowEnd", overflow - scrolled > 0.5)
    placeScrollThumb(
      verticalRef.current,
      "y",
      clientHeight - head - foot,
      scrollHeight - head - foot,
      scrollTop,
      1
    )
    placeScrollThumb(
      horizontalRef.current,
      "x",
      clientWidth - pinned,
      scrollWidth - pinned,
      scrollLeft,
      rtlRef.current ? -1 : 1
    )
  }, [viewportRef, startWidth, endWidth])

  const updateRef = React.useRef(update)
  React.useLayoutEffect(() => {
    updateRef.current = update
  })

  // After the next paint rather than inside the commit, where reading the
  // layout would force it early.
  React.useEffect(() => {
    const frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [update])

  // A layout effect here runs before the content's, so this listener comes
  // before the virtualizer's: it reads the scroll while the layout is still
  // clean, before new rows go in.
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    const root = rootRef.current
    if (!viewport || !root) return
    let hold = 0
    const onScroll = () => {
      updateRef.current()
      root.dataset.scrolling = ""
      window.clearTimeout(hold)
      hold = window.setTimeout(() => {
        delete root.dataset.scrolling
      }, SCROLLBAR_HOLD)
    }
    // The viewport's size, and the table's as rows load and columns resize.
    const observer = new ResizeObserver(() => {
      rtlRef.current = getComputedStyle(viewport).direction === "rtl"
      updateRef.current()
    })
    observer.observe(viewport)
    if (viewport.firstElementChild) {
      observer.observe(viewport.firstElementChild)
    }
    // A wheel over a thumb scrolls the table, not the page under it.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      viewport.scrollBy({ left: event.deltaX, top: event.deltaY })
    }
    viewport.addEventListener("scroll", onScroll, { passive: true })
    root.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      observer.disconnect()
      viewport.removeEventListener("scroll", onScroll)
      root.removeEventListener("wheel", onWheel)
      window.clearTimeout(hold)
    }
  }, [viewportRef])

  // Dragging a thumb scrolls by the same share of the content.
  const drag =
    (axis: ScrollAxis) => (event: React.PointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current
      const root = rootRef.current
      const thumb = event.currentTarget
      const track = thumb.parentElement
      if (event.button !== 0 || !viewport || !root || !track) return
      event.preventDefault()
      thumb.setPointerCapture(event.pointerId)
      const vertical = axis === "y"
      const from = vertical ? event.clientY : event.clientX
      const start = vertical ? viewport.scrollTop : viewport.scrollLeft
      const room = vertical
        ? track.clientHeight - thumb.offsetHeight
        : track.clientWidth - thumb.offsetWidth
      const overflow = vertical
        ? viewport.scrollHeight - viewport.clientHeight
        : viewport.scrollWidth - viewport.clientWidth
      const ratio = room > 0 ? overflow / room : 0
      root.dataset.dragging = ""
      const move = (moved: PointerEvent) => {
        const delta = (vertical ? moved.clientY : moved.clientX) - from
        if (vertical) viewport.scrollTop = start + delta * ratio
        else viewport.scrollLeft = start + delta * ratio
      }
      const end = () => {
        thumb.removeEventListener("pointermove", move)
        thumb.removeEventListener("pointerup", end)
        thumb.removeEventListener("pointercancel", end)
        delete root.dataset.dragging
      }
      thumb.addEventListener("pointermove", move)
      thumb.addEventListener("pointerup", end)
      thumb.addEventListener("pointercancel", end)
    }

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-slot="data-table-scroll-layer"
      className="pointer-events-none absolute inset-0 z-30"
    >
      {startWidth > 0 && (
        <div
          data-slot="data-table-pin-edge"
          data-side="start"
          style={{ insetInlineStart: startWidth }}
          className="cn-data-table-pin-edge absolute inset-y-0"
        />
      )}
      {endWidth > 0 && (
        <div
          data-slot="data-table-pin-edge"
          data-side="end"
          style={{ insetInlineEnd: endWidth }}
          className="cn-data-table-pin-edge absolute inset-y-0"
        />
      )}
      <div
        ref={verticalRef}
        data-slot="data-table-scrollbar"
        data-orientation="vertical"
        data-hidden=""
        className="cn-data-table-scrollbar absolute"
      >
        <div
          data-slot="data-table-scrollbar-thumb"
          onPointerDown={drag("y")}
          className="cn-data-table-scrollbar-thumb pointer-events-auto absolute"
        />
      </div>
      <div
        ref={horizontalRef}
        data-slot="data-table-scrollbar"
        data-orientation="horizontal"
        data-hidden=""
        style={{ insetInlineStart: startWidth, insetInlineEnd: endWidth }}
        className="cn-data-table-scrollbar absolute"
      >
        <div
          data-slot="data-table-scrollbar-thumb"
          onPointerDown={drag("x")}
          className="cn-data-table-scrollbar-thumb pointer-events-auto absolute"
        />
      </div>
    </div>
  )
}

// MARK: Pagination

/** Rows per page, the range in view and page buttons, for paginated tables. */
function DataTablePagination<TData extends RowData>({
  table,
  pageSizes = [10, 25, 50, 100],
  className,
  ...props
}: React.ComponentProps<"div"> & {
  table: DataTableTable<TData>
  pageSizes?: number[]
}) {
  const id = React.useId()
  const { pageIndex, pageSize } = table.state.pagination
  const pageCount = table.getPageCount()
  const rowCount = table.getRowCount()
  const range = getPageRowRange(pageIndex, pageSize, rowCount)
  const sizes = pageSizes.map((value) => ({ value, label: String(value) }))

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "cn-data-table-pagination flex flex-wrap items-center justify-between",
        className
      )}
      {...props}
    >
      <div className="cn-data-table-pagination-size flex items-center">
        <span id={`${id}-size`}>Rows per page</span>
        <Select
          items={sizes}
          value={pageSize}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger size="sm" aria-labelledby={`${id}-size`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p aria-live="polite" className="cn-data-table-pagination-range">
        {formatCount(table, range.start)}–{formatCount(table, range.end)} of{" "}
        {formatCount(table, rowCount)}
      </p>
      <nav
        aria-label="Pagination"
        className="cn-data-table-pagination-pages flex items-center"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="First page"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.firstPage()}
        >
          <IconPlaceholder
            lucide="ChevronsLeftIcon"
            tabler="IconChevronsLeft"
            hugeicons="ArrowLeftDoubleIcon"
            phosphor="CaretDoubleLeftIcon"
            remixicon="RiSkipLeftLine"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous page"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <IconPlaceholder
            lucide="ChevronLeftIcon"
            tabler="IconChevronLeft"
            hugeicons="ArrowLeft01Icon"
            phosphor="CaretLeftIcon"
            remixicon="RiArrowLeftSLine"
          />
        </Button>
        {getPageRange(pageIndex, pageCount).map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              variant={item === pageIndex ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={`Page ${item + 1}`}
              aria-current={item === pageIndex ? "page" : undefined}
              onClick={() => table.setPageIndex(item)}
              className="cn-data-table-page"
            >
              {formatCount(table, item + 1)}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden
              className="cn-data-table-pagination-ellipsis"
            >
              …
            </span>
          )
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next page"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <IconPlaceholder
            lucide="ChevronRightIcon"
            tabler="IconChevronRight"
            hugeicons="ArrowRight01Icon"
            phosphor="CaretRightIcon"
            remixicon="RiArrowRightSLine"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Last page"
          disabled={!table.getCanNextPage()}
          onClick={() => table.lastPage()}
        >
          <IconPlaceholder
            lucide="ChevronsRightIcon"
            tabler="IconChevronsRight"
            hugeicons="ArrowRightDoubleIcon"
            phosphor="CaretDoubleRightIcon"
            remixicon="RiSkipRightLine"
          />
        </Button>
      </nav>
    </div>
  )
}

export {
  DataTable,
  DataTableColumnFilter,
  DataTableColumnHeader,
  DataTableContent,
  DataTablePagination,
  DataTableSearch,
  DataTableSelectionBar,
  DataTableToolbar,
  createDataTableSelectColumn,
  type DataTableView,
}
