"use client"

// Which cards are on the board and how they are arranged. Every control reads
// and writes the view, one plain object the app can save.
import * as React from "react"
import { cn } from "cn"

import {
  getKanbanChoiceItems,
  getKanbanMoveItems,
} from "@/registry/bases/__base__/components/kanban-actions"
import {
  ControlMenu,
  ControlOptions,
  ControlPopover,
  ControlSwitch,
  type ControlMenuGroup,
} from "@/registry/bases/__base__/components/property-controls"
import { getChoices } from "@/registry/bases/__base__/components/property-editor"
import {
  PropertyIcon,
  PropertyMark,
} from "@/registry/bases/__base__/components/property-icons"
import type { KanbanController } from "@/registry/bases/__base__/hooks/use-kanban"
import {
  getOptionFilter,
  isChoiceProperty,
  isMultiProperty,
  readPropertyKeys,
  toggleOptionFilter,
  type PropertyDefinition,
} from "@/registry/bases/__base__/lib/property-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/registry/bases/__base__/ui/drawer"
import { Search } from "@/registry/bases/__base__/ui/search"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type KanbanPartProps<Item> = { board: KanbanController<Item> }

/** How much room the toolbar has, for what CSS can't decide. */
type KanbanRoom = "wide" | "compact" | "narrow"

const KanbanRoomContext = React.createContext<KanbanRoom>("wide")

const COMPACT_BELOW = 960
const NARROW_BELOW = 560

function getKanbanRoom(width: number): KanbanRoom {
  if (width < NARROW_BELOW) return "narrow"
  return width < COMPACT_BELOW ? "compact" : "wide"
}

function useKanbanRoom(element: React.RefObject<HTMLElement | null>) {
  const [room, setRoom] = React.useState<KanbanRoom>("wide")
  React.useLayoutEffect(() => {
    if (!element.current) return
    setRoom(getKanbanRoom(element.current.offsetWidth))
    const observer = new ResizeObserver(([entry]) =>
      setRoom(getKanbanRoom(entry.contentRect.width))
    )
    observer.observe(element.current)
    return () => observer.disconnect()
  }, [element])
  return room
}

/**
 * One compact line over the board: what it is and what it is filtered by at the
 * start, how it is arranged at the end, then the app's own actions.
 */
function KanbanToolbar<Item>({
  board,
  title,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  KanbanPartProps<Item> & {
    /** What the board is, at the start. */
    title?: React.ReactNode
    /** The app's actions, last in the line. */
    children?: React.ReactNode
  }) {
  const root = React.useRef<HTMLDivElement>(null)
  const room = useKanbanRoom(root)
  const [isSearching, setIsSearching] = React.useState(false)
  const isSearchOpen = isSearching || !!board.view.search
  return (
    <KanbanRoomContext value={room}>
      <div
        ref={root}
        data-slot="kanban-toolbar"
        data-room={room}
        data-searching={(room !== "wide" && isSearchOpen) || undefined}
        className={cn("cn-kanban-toolbar @container/kanban-toolbar", className)}
        {...props}
      >
        <div className="cn-kanban-toolbar-row flex items-center">
          <div
            data-slot="kanban-toolbar-start"
            className="cn-kanban-toolbar-start flex min-w-0 flex-1 items-center"
          >
            {title && (
              <div
                data-slot="kanban-toolbar-title"
                className="cn-kanban-toolbar-title min-w-0 truncate"
              >
                {title}
              </div>
            )}
            <KanbanFilter board={board} />
          </div>
          <div
            data-slot="kanban-toolbar-end"
            className="cn-kanban-toolbar-end flex min-w-0 items-center"
          >
            {board.isSaving && (
              <span role="status" className="cn-kanban-saving">
                Saving…
              </span>
            )}
            <KanbanSearch
              board={board}
              collapsible={room !== "wide"}
              open={isSearchOpen}
              onOpenChange={setIsSearching}
            />
            <div className="cn-kanban-toolbar-controls flex shrink-0 items-center">
              <KanbanGroup board={board} />
              <KanbanSort board={board} />
              <KanbanViewOptions board={board} />
            </div>
            {children && (
              <div className="cn-kanban-toolbar-actions flex shrink-0 items-center">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </KanbanRoomContext>
  )
}

function KanbanSearch<Item>({
  board,
  placeholder = "Search cards",
  collapsible = false,
  open,
  onOpenChange,
}: KanbanPartProps<Item> & {
  placeholder?: string
  /** A button that opens into the field, where there is no room for it. */
  collapsible?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Search
      size="sm"
      variant="outline"
      label={placeholder}
      placeholder={placeholder}
      data-kanban-search=""
      className="cn-kanban-search"
      width="200px"
      collapsible={collapsible}
      open={open}
      onOpenChange={onOpenChange}
      value={board.view.search ?? ""}
      onValueChange={(search) => board.setView({ ...board.view, search })}
      onFocus={() => onOpenChange?.(true)}
    />
  )
}

/** A popover, or a drawer where a popover would have no room. */
function KanbanPanel({
  label,
  trigger,
  className,
  align,
  layout,
  open,
  onOpenChange,
  children,
}: {
  label: string
  trigger: React.ReactNode
  className?: string
  align?: "start" | "end"
  layout: "filter" | "view"
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const isDrawer = React.use(KanbanRoomContext) === "narrow"
  if (!isDrawer)
    return (
      <ControlPopover
        label={label}
        triggerLabel={null}
        trigger={trigger}
        size="sm"
        align={align}
        className={className}
        layout={layout}
        open={open}
        onOpenChange={onOpenChange}
      >
        {children}
      </ControlPopover>
    )
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={className}
        onClick={() => onOpenChange(true)}
      >
        {trigger}
      </Button>
      <Drawer open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
        <DrawerContent data-kanban-drawer={layout} className="cn-kanban-drawer">
          <DrawerTitle className="sr-only">{label}</DrawerTitle>
          {children}
        </DrawerContent>
      </Drawer>
    </>
  )
}

/** How many loaded cards hold each option. */
function countOptions<Item>(
  board: KanbanController<Item>,
  property: PropertyDefinition
) {
  const counts = new Map<string, number>()
  for (const item of board.byId.values())
    for (const key of readPropertyKeys(board.getValue(item, property.id)))
      counts.set(key, (counts.get(key) ?? 0) + 1)
  return counts
}

function getFilterProperties<Item>(board: KanbanController<Item>) {
  return board.properties.filter((property) =>
    isChoiceProperty(property, board.types)
  )
}

function toggleFilter<Item>(
  board: KanbanController<Item>,
  property: PropertyDefinition,
  key: string
) {
  board.setView({
    ...board.view,
    filters: toggleOptionFilter(board.view.filters, property, key),
  })
}

/** The filter without one property's part, or without any. */
function clearFilter<Item>(
  board: KanbanController<Item>,
  property?: PropertyDefinition
) {
  const filters = property
    ? (board.view.filters?.filters.filter(
        (entry) => !("propertyId" in entry) || entry.propertyId !== property.id
      ) ?? [])
    : []
  board.setView({
    ...board.view,
    filters: filters.length
      ? { match: board.view.filters?.match ?? "all", filters }
      : undefined,
  })
}

/**
 * The whole filter in one control. It says what it is on, each part opens where
 * it is changed, and one press clears it. With less room it is a count.
 */
function KanbanFilter<Item>({ board }: KanbanPartProps<Item>) {
  const [open, setOpen] = React.useState(false)
  const [propertyId, setPropertyId] = React.useState<string | null>(null)
  const properties = getFilterProperties(board)
  if (!properties.length) return null
  const active = properties.filter(
    ({ id }) => getOptionFilter(board.view.filters, id).length > 0
  )
  return (
    <span
      data-slot="kanban-filter"
      data-active={active.length > 0 || undefined}
      className="cn-kanban-filter inline-flex min-w-0 items-center"
      // A press on one part of the filter opens that part.
      onPointerDownCapture={(event) => {
        const part =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>("[data-filter]")
            : null
        if (!open) setPropertyId(part?.dataset.filter ?? null)
      }}
      onKeyDownCapture={() => {
        if (!open) setPropertyId(null)
      }}
    >
      <KanbanPanel
        label="Filter cards"
        layout="filter"
        className="cn-kanban-filter-trigger min-w-0"
        open={open}
        onOpenChange={setOpen}
        trigger={
          <>
            <IconPlaceholder
              lucide="ListFilterIcon"
              tabler="IconFilter"
              hugeicons="FilterHorizontalIcon"
              phosphor="FunnelSimpleIcon"
              remixicon="RiFilter3Line"
            />
            {active.length === 0 ? (
              <span className="@max-2xl/kanban-toolbar:sr-only">Filter</span>
            ) : (
              <>
                <span className="sr-only">Filter: </span>
                <span className="cn-kanban-filter-parts flex min-w-0 items-center @max-4xl/kanban-toolbar:sr-only">
                  {active.map((property) => (
                    <KanbanFilterPart
                      key={property.id}
                      board={board}
                      property={property}
                    />
                  ))}
                </span>
                <span
                  aria-hidden="true"
                  className="cn-kanban-filter-count hidden items-center justify-center tabular-nums @max-4xl/kanban-toolbar:inline-flex"
                >
                  {active.length}
                </span>
              </>
            )}
          </>
        }
      >
        <KanbanFilterPanel
          board={board}
          properties={properties}
          property={properties.find(({ id }) => id === propertyId)}
          onPropertyChange={(property) => setPropertyId(property?.id ?? null)}
        />
      </KanbanPanel>
      {active.length > 0 && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Clear filters"
          className="cn-kanban-filter-clear shrink-0"
          onClick={() => clearFilter(board)}
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
        </Button>
      )}
    </span>
  )
}

/** What one property is filtered to. */
function KanbanFilterValue<Item>({
  board,
  property,
}: KanbanPartProps<Item> & { property: PropertyDefinition }) {
  const picked = getOptionFilter(board.view.filters, property.id)
  const choices = getChoices(property, picked).filter(({ value }) =>
    picked.includes(value)
  )
  if (!choices.length) return null
  return (
    <span className="cn-kanban-filter-value inline-flex min-w-0 items-center">
      <span className="cn-kanban-filter-marks inline-flex shrink-0 items-center">
        {choices.slice(0, 3).map((choice) => (
          <span key={choice.value} className="inline-flex">
            {choice.icon}
          </span>
        ))}
      </span>
      <span className="truncate">
        {choices.length === 1 ? choices[0].label : `${choices.length} selected`}
      </span>
    </span>
  )
}

function KanbanFilterPart<Item>({
  board,
  property,
}: KanbanPartProps<Item> & { property: PropertyDefinition }) {
  return (
    <span
      data-slot="kanban-filter-part"
      data-filter={property.id}
      className="cn-kanban-filter-part inline-flex min-w-0 items-center"
    >
      <span className="cn-kanban-filter-name shrink-0">{property.name}</span>
      <KanbanFilterValue board={board} property={property} />
    </span>
  )
}

/** Every property that can be filtered, then one property's options in its place. */
function KanbanFilterPanel<Item>({
  board,
  properties,
  property,
  onPropertyChange,
}: KanbanPartProps<Item> & {
  properties: readonly PropertyDefinition[]
  property: PropertyDefinition | undefined
  onPropertyChange: (property: PropertyDefinition | null) => void
}) {
  const isDrawer = React.use(KanbanRoomContext) === "narrow"
  const picked = property
    ? getOptionFilter(board.view.filters, property.id)
    : []
  const isActive = property ? picked.length > 0 : !!board.view.filters
  return (
    <div
      data-slot="kanban-filter-panel"
      data-escape={property ? "back" : undefined}
      className="cn-kanban-filter-panel flex min-h-0 flex-col"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !property || isDrawer) return
        event.preventDefault()
        event.stopPropagation()
        onPropertyChange(null)
      }}
    >
      <div className="cn-kanban-filter-header flex items-center">
        {property && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="All filters"
            onClick={() => onPropertyChange(null)}
          >
            <IconPlaceholder
              lucide="ChevronLeftIcon"
              tabler="IconChevronLeft"
              hugeicons="ArrowLeft01Icon"
              phosphor="CaretLeftIcon"
              remixicon="RiArrowLeftSLine"
            />
          </Button>
        )}
        <span className="cn-kanban-filter-title min-w-0 flex-1 truncate">
          {property?.name ?? "Filter"}
        </span>
        {isActive && (
          <Button
            variant="ghost"
            size="xs"
            className="cn-kanban-filter-reset"
            onClick={() => clearFilter(board, property)}
          >
            {property ? "Clear" : "Clear all"}
          </Button>
        )}
      </div>
      {property ? (
        <KanbanFilterOptions
          key={property.id}
          board={board}
          property={property}
          hasFocus={!isDrawer}
        />
      ) : (
        <div className="cn-kanban-filter-list flex flex-col overflow-y-auto">
          {properties.map((entry) => (
            <Button
              key={entry.id}
              variant="ghost"
              className="cn-kanban-filter-row w-full"
              onClick={() => onPropertyChange(entry)}
            >
              <PropertyIcon property={entry} />
              <span className="min-w-0 flex-1 truncate text-start">
                {entry.name}
              </span>
              <KanbanFilterValue board={board} property={entry} />
              <IconPlaceholder
                lucide="ChevronRightIcon"
                tabler="IconChevronRight"
                hugeicons="ArrowRight01Icon"
                phosphor="CaretRightIcon"
                remixicon="RiArrowRightSLine"
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

function KanbanFilterOptions<Item>({
  board,
  property,
  hasFocus,
}: KanbanPartProps<Item> & {
  property: PropertyDefinition
  hasFocus: boolean
}) {
  const picked = getOptionFilter(board.view.filters, property.id)
  const counts = countOptions(board, property)
  return (
    <ControlOptions
      label={property.name}
      placeholder={`Search ${property.name.toLowerCase()}…`}
      hasFocus={hasFocus}
      selected={picked}
      options={getChoices(property, picked).map((option) => ({
        ...option,
        // Its check takes the place of the count.
        count: picked.includes(option.value)
          ? undefined
          : (counts.get(option.value) ?? 0),
      }))}
      onSelect={(key) => toggleFilter(board, property, key)}
    />
  )
}

function KanbanGroup<Item>({ board }: KanbanPartProps<Item>) {
  const choices = board.properties.filter(
    (property) =>
      (isChoiceProperty(property) && !isMultiProperty(property)) ||
      property.type === "checkbox"
  )
  if (choices.length < 2) return null
  return (
    <ControlMenu
      label={board.group ? `Group cards by ${board.group.name}` : "Group cards"}
      variant="ghost"
      size="sm"
      align="end"
      className="cn-kanban-control"
      groups={[
        {
          id: "group",
          label: "Columns",
          items: choices.map((property) => ({
            type: "check" as const,
            id: property.id,
            label: property.name,
            icon: <PropertyIcon property={property} />,
            isChecked: property.id === board.groupBy,
            onSelect: () =>
              board.setView({
                ...board.view,
                groupBy: property.id,
                hiddenColumns: [],
                collapsedColumns: [],
              }),
          })),
        },
      ]}
    >
      <IconPlaceholder
        lucide="Columns3Icon"
        tabler="IconLayoutColumns"
        hugeicons="LeftToRightListBulletIcon"
        phosphor="ColumnsIcon"
        remixicon="RiLayoutColumnLine"
      />
      <span className="@max-5xl/kanban-toolbar:sr-only">
        {board.group?.name ?? "Group"}
      </span>
    </ControlMenu>
  )
}

function KanbanSort<Item>({ board }: KanbanPartProps<Item>) {
  const sort = board.view.sort?.[0]
  const sorted = board.properties.find(({ id }) => id === sort?.propertyId)
  if (!board.properties.length) return null
  const setSort = (
    propertyId: string | null,
    direction: "asc" | "desc" = "asc"
  ) =>
    board.setView({
      ...board.view,
      sort: propertyId ? [{ propertyId, direction }] : [],
    })
  const groups: ControlMenuGroup[] = [
    {
      id: "manual",
      items: [
        {
          type: "check",
          id: "manual",
          label: "Manual order",
          icon: (
            <IconPlaceholder
              lucide="GripVerticalIcon"
              tabler="IconGripVertical"
              hugeicons="DragDropVerticalIcon"
              phosphor="DotsSixVerticalIcon"
              remixicon="RiDraggable"
            />
          ),
          isChecked: !sort,
          onSelect: () => setSort(null),
        },
      ],
    },
    {
      id: "property",
      label: "Sort by",
      items: board.properties.map((property) => ({
        type: "check" as const,
        id: property.id,
        label: property.name,
        icon: <PropertyIcon property={property} />,
        isChecked: property.id === sort?.propertyId,
        onSelect: () => setSort(property.id, sort?.direction),
      })),
    },
    {
      id: "direction",
      items: sort
        ? (["asc", "desc"] as const).map((direction) => ({
            type: "check" as const,
            id: direction,
            label: direction === "asc" ? "Ascending" : "Descending",
            icon:
              direction === "asc" ? (
                <IconPlaceholder
                  lucide="ArrowUpIcon"
                  tabler="IconArrowUp"
                  hugeicons="ArrowUpIcon"
                  phosphor="ArrowUpIcon"
                  remixicon="RiArrowUpLine"
                />
              ) : (
                <IconPlaceholder
                  lucide="ArrowDownIcon"
                  tabler="IconArrowDown"
                  hugeicons="ArrowDown02Icon"
                  phosphor="ArrowDownIcon"
                  remixicon="RiArrowDownLine"
                />
              ),
            isChecked: sort.direction === direction,
            onSelect: () => setSort(sort.propertyId, direction),
          }))
        : [],
    },
  ]
  return (
    <ControlMenu
      label={sorted ? `Sort cards by ${sorted.name}` : "Sort cards"}
      variant="ghost"
      size="sm"
      align="end"
      className="cn-kanban-control"
      groups={groups}
    >
      <IconPlaceholder
        lucide="ArrowUpDownIcon"
        tabler="IconArrowsSort"
        hugeicons="ArrowUpDownIcon"
        phosphor="ArrowsDownUpIcon"
        remixicon="RiArrowUpDownLine"
      />
      <span className="@max-5xl/kanban-toolbar:sr-only">
        {sorted?.name ?? "Sort"}
      </span>
    </ControlMenu>
  )
}

function KanbanOption({
  label,
  icon,
  checked,
  onCheckedChange,
}: {
  label: string
  icon?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      data-slot="kanban-view-option"
      className="cn-kanban-view-option flex min-w-0 items-center"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ControlSwitch
        label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function KanbanViewOptions<Item>({ board }: KanbanPartProps<Item>) {
  const [open, setOpen] = React.useState(false)
  const { view } = board
  const fields = board.properties.filter(
    (property) => board.isOnCard(property) !== undefined
  )
  const hidden = view.hiddenColumns ?? []
  const toggle = (list: readonly string[], id: string, isOn: boolean) =>
    isOn ? [...list, id] : list.filter((entry) => entry !== id)
  return (
    <KanbanPanel
      label="View options"
      align="end"
      className="cn-kanban-control"
      layout="view"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <>
          <IconPlaceholder
            lucide="SlidersHorizontalIcon"
            tabler="IconAdjustmentsHorizontal"
            hugeicons="SlidersHorizontalIcon"
            phosphor="SlidersHorizontalIcon"
            remixicon="RiEqualizerLine"
          />
          <span className="@max-5xl/kanban-toolbar:sr-only">View</span>
        </>
      }
    >
      <div
        data-slot="kanban-view-options"
        className="cn-kanban-view-groups flex flex-col overflow-y-auto"
      >
        <div className="cn-kanban-view-group flex flex-col">
          <KanbanOption
            label="Color columns"
            checked={view.colorColumns ?? false}
            onCheckedChange={(colorColumns) =>
              board.setView({ ...view, colorColumns })
            }
          />
          <KanbanOption
            label="Hide empty columns"
            checked={view.hideEmpty ?? false}
            onCheckedChange={(hideEmpty) =>
              board.setView({ ...view, hideEmpty })
            }
          />
        </div>
        <KanbanCoverOptions board={board} />
        {fields.length > 0 && (
          <div className="cn-kanban-view-group flex flex-col">
            <p className="cn-kanban-view-label">On cards</p>
            {fields.map((property) => (
              <KanbanOption
                key={property.id}
                label={property.name}
                icon={<PropertyIcon property={property} />}
                checked={board.isOnCard(property) ?? false}
                onCheckedChange={(isOn) => board.setOnCard(property.id, isOn)}
              />
            ))}
          </div>
        )}
        <div className="cn-kanban-view-group flex flex-col">
          <p className="cn-kanban-view-label">Columns</p>
          {board.columns.map((column) => (
            <KanbanOption
              key={column.id}
              label={column.name}
              icon={<PropertyMark mark={column} />}
              checked={!hidden.includes(column.id)}
              onCheckedChange={(isOn) =>
                board.setView({
                  ...view,
                  hiddenColumns: toggle(hidden, column.id, !isOn),
                })
              }
            />
          ))}
        </div>
      </div>
    </KanbanPanel>
  )
}

/** Which pictures cover the cards, when there are any to choose from. */
function KanbanCoverOptions<Item>({ board }: KanbanPartProps<Item>) {
  const { view } = board
  const sources = board.properties.filter(({ type }) => type === "files")
  if (!sources.length) return null
  const { cover } = board
  return (
    <div className="cn-kanban-view-group flex flex-col">
      <p className="cn-kanban-view-label">Cover</p>
      <div
        data-slot="kanban-view-option"
        className="cn-kanban-view-option flex min-w-0 items-center"
      >
        <IconPlaceholder
          lucide="ImageIcon"
          tabler="IconPhoto"
          hugeicons="ImageIcon"
          phosphor="ImageIcon"
          remixicon="RiImageLine"
        />
        <span className="min-w-0 flex-1 truncate">Picture</span>
        <ControlMenu
          label={`Cover picture: ${cover?.name ?? "None"}`}
          size="sm"
          align="end"
          isRaised
          className="cn-kanban-view-choice"
          groups={[
            {
              id: "none",
              items: [
                {
                  type: "check",
                  id: "none",
                  label: "None",
                  isChecked: !cover,
                  onSelect: () => board.setCover(null),
                },
              ],
            },
            {
              id: "sources",
              items: sources.map((property) => ({
                type: "check" as const,
                id: property.id,
                label: property.name,
                icon: <PropertyIcon property={property} />,
                isChecked: property.id === cover?.id,
                onSelect: () => board.setCover(property.id),
              })),
            },
          ]}
        >
          <span className="truncate">{cover?.name ?? "None"}</span>
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconChevronDown"
            hugeicons="ArrowDown01Icon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
          />
        </ControlMenu>
      </div>
      {cover && (
        <KanbanOption
          label="Fit the whole picture"
          checked={view.coverFit === "fit"}
          onCheckedChange={(isFit) =>
            board.setView({ ...view, coverFit: isFit ? "fit" : "fill" })
          }
        />
      )}
    </div>
  )
}

/** What can be done to the cards picked, while any are. */
function KanbanSelectionBar<Item>({
  board,
  children,
}: KanbanPartProps<Item> & { children?: React.ReactNode }) {
  const ids = [...board.selectedIds].filter((id) => board.byId.has(id))
  if (!ids.length) return null
  const choices = getKanbanChoiceItems(board, ids)
  return (
    <div
      role="toolbar"
      aria-label="Selected cards"
      data-slot="kanban-selection-bar"
      className="cn-kanban-selection-bar cn-kanban-float flex max-w-full items-center"
    >
      <span role="status" className="cn-kanban-selection-count tabular-nums">
        {ids.length} selected
      </span>
      <ControlMenu
        label="Move selected cards"
        variant="ghost"
        size="sm"
        groups={[{ id: "move", items: getKanbanMoveItems(board, ids) }]}
      >
        <IconPlaceholder
          lucide="ArrowRightIcon"
          tabler="IconArrowForward"
          hugeicons="ArrowRightIcon"
          phosphor="ShareFatIcon"
          remixicon="RiShareForwardLine"
        />
        Move
      </ControlMenu>
      {choices.length > 0 && (
        <ControlMenu
          label="Edit selected cards"
          variant="ghost"
          size="sm"
          groups={[{ id: "edit", items: choices }]}
        >
          <IconPlaceholder
            lucide="SquarePenIcon"
            tabler="IconEdit"
            hugeicons="PencilEdit02Icon"
            phosphor="NotePencilIcon"
            remixicon="RiEditBoxLine"
          />
          Edit
        </ControlMenu>
      )}
      {children}
      {ids.every(board.canDelete) && (
        <Button
          variant="ghost"
          size="sm"
          className="cn-kanban-selection-delete"
          onClick={() => board.remove(ids)}
        >
          <IconPlaceholder
            lucide="Trash2Icon"
            tabler="IconTrash"
            hugeicons="Delete02Icon"
            phosphor="TrashIcon"
            remixicon="RiDeleteBinLine"
          />
          Delete
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Clear selection"
        onClick={board.clearSelection}
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

/** One line at the foot of the board: what went wrong, or what can be undone. */
function KanbanNotices<Item>({ board }: KanbanPartProps<Item>) {
  const { moveError, notice, failure, dismissMoveError, dismissNotice } = board
  React.useEffect(() => {
    if (!moveError && !notice) return
    const timer = setTimeout(() => {
      if (moveError) dismissMoveError()
      else dismissNotice()
    }, 6000)
    return () => clearTimeout(timer)
    // The dismissers are new each render; only what is shown restarts the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveError, notice])

  if (failure)
    return (
      <div
        data-slot="kanban-error"
        data-tone="error"
        className="cn-kanban-notice cn-kanban-float flex max-w-full items-center"
      >
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
        />
        <p role="alert" className="min-w-0 flex-1">
          {failure.message}
        </p>
        <Button variant="outline" size="sm" onClick={board.retryChange}>
          Retry
        </Button>
        <Button variant="ghost" size="sm" onClick={board.dismissFailure}>
          Dismiss
        </Button>
      </div>
    )
  if (moveError)
    return (
      <div
        data-slot="kanban-move-error"
        data-tone="warning"
        className="cn-kanban-notice cn-kanban-float flex max-w-full items-center"
      >
        <IconPlaceholder
          lucide="TriangleAlertIcon"
          tabler="IconAlertTriangle"
          hugeicons="Alert02Icon"
          phosphor="WarningIcon"
          remixicon="RiErrorWarningLine"
        />
        <p role="status" className="min-w-0 flex-1">
          {moveError}
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          onClick={dismissMoveError}
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
  if (!notice) return null
  return (
    <div
      data-slot="kanban-notice"
      className="cn-kanban-notice cn-kanban-float flex max-w-full items-center"
    >
      <p className="min-w-0 flex-1">{notice.message}</p>
      {notice.canUndo && board.undo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void board.undo?.()
            dismissNotice()
          }}
        >
          <IconPlaceholder
            lucide="Undo2Icon"
            tabler="IconArrowBackUp"
            hugeicons="Undo02Icon"
            phosphor="ArrowUUpLeftIcon"
            remixicon="RiArrowGoBackLine"
          />
          Undo
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss"
        onClick={dismissNotice}
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

export {
  KanbanFilter,
  KanbanGroup,
  KanbanNotices,
  KanbanSearch,
  KanbanSelectionBar,
  KanbanSort,
  KanbanToolbar,
  KanbanViewOptions,
}
