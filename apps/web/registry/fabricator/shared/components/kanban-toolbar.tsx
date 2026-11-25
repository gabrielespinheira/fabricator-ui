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
import { Input } from "@/registry/bases/__base__/ui/input"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type KanbanPartProps<Item> = { board: KanbanController<Item> }

function KanbanToolbar<Item>({
  board,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & KanbanPartProps<Item>) {
  return (
    <div
      data-slot="kanban-toolbar"
      className={cn(
        "cn-kanban-toolbar @container/kanban-toolbar flex flex-wrap items-center",
        className
      )}
      {...props}
    >
      <KanbanSearch board={board} />
      <KanbanFilter board={board} />
      <KanbanFilterChips board={board} />
      <div className="cn-kanban-toolbar-end ms-auto flex items-center">
        {board.isSaving && (
          <span role="status" className="cn-kanban-saving">
            Saving…
          </span>
        )}
        {children}
        <KanbanGroup board={board} />
        <KanbanSort board={board} />
        <KanbanViewOptions board={board} />
      </div>
    </div>
  )
}

function KanbanSearch<Item>({
  board,
  placeholder = "Search cards",
}: KanbanPartProps<Item> & { placeholder?: string }) {
  return (
    <div className="cn-kanban-search-field relative">
      <span
        aria-hidden="true"
        className="cn-kanban-search-icon pointer-events-none absolute inline-flex"
      >
        <IconPlaceholder
          lucide="SearchIcon"
          tabler="IconSearch"
          hugeicons="SearchIcon"
          phosphor="MagnifyingGlassIcon"
          remixicon="RiSearchLine"
        />
      </span>
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        data-kanban-search=""
        className="cn-kanban-search"
        value={board.view.search ?? ""}
        onChange={(event) =>
          board.setView({ ...board.view, search: event.target.value })
        }
        onKeyDown={(event) => {
          if (event.key !== "Escape") return
          if (board.view.search) board.setView({ ...board.view, search: "" })
          else event.currentTarget.blur()
        }}
      />
      <Kbd className="cn-kanban-search-key absolute" aria-hidden="true">
        /
      </Kbd>
    </div>
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

function KanbanFilter<Item>({ board }: KanbanPartProps<Item>) {
  const properties = getFilterProperties(board)
  if (!properties.length) return null
  return (
    <ControlMenu
      label="Filter cards"
      variant="outline"
      size="default"
      className="cn-kanban-filter"
      groups={[
        {
          id: "properties",
          items: properties.map((property) => {
            const picked = getOptionFilter(board.view.filters, property.id)
            return {
              type: "submenu" as const,
              id: property.id,
              label: property.name,
              icon: <PropertyIcon property={property} />,
              groups: [
                {
                  id: property.id,
                  items: getChoices(property, picked).map((option) => ({
                    type: "check" as const,
                    id: option.value,
                    label: option.label,
                    icon: option.icon,
                    isChecked: picked.includes(option.value),
                    staysOpen: true,
                    onSelect: () => toggleFilter(board, property, option.value),
                  })),
                },
              ],
            }
          }),
        },
      ]}
    >
      <IconPlaceholder
        lucide="ListFilterIcon"
        tabler="IconFilter"
        hugeicons="FilterHorizontalIcon"
        phosphor="FunnelSimpleIcon"
        remixicon="RiFilter3Line"
      />
      <span className="@max-md/kanban-toolbar:sr-only">Filter</span>
    </ControlMenu>
  )
}

function KanbanFilterChips<Item>({ board }: KanbanPartProps<Item>) {
  const active = getFilterProperties(board).filter(
    ({ id }) => getOptionFilter(board.view.filters, id).length > 0
  )
  if (!active.length) return null
  return (
    <>
      {active.map((property) => (
        <KanbanFilterChip key={property.id} board={board} property={property} />
      ))}
      <Button
        variant="ghost"
        size="default"
        className="cn-kanban-clear"
        onClick={() => board.setView({ ...board.view, filters: undefined })}
      >
        Clear
      </Button>
    </>
  )
}

function KanbanFilterChip<Item>({
  board,
  property,
}: KanbanPartProps<Item> & { property: PropertyDefinition }) {
  const picked = getOptionFilter(board.view.filters, property.id)
  const counts = countOptions(board, property)
  const choices = getChoices(property, picked)
  const names = choices.filter(({ value }) => picked.includes(value))
  return (
    <span
      data-slot="kanban-filter-chip"
      className="cn-kanban-chip inline-flex min-w-0 items-center"
    >
      <ControlPopover
        label={`${property.name} filter`}
        triggerLabel={null}
        className="cn-kanban-chip-trigger min-w-0"
        layout="picker"
        trigger={
          <>
            <PropertyIcon property={property} />
            <span className="cn-kanban-chip-name">{property.name}</span>
            <span className="truncate">
              {names.length === 1 ? names[0].label : `${names.length} selected`}
            </span>
          </>
        }
      >
        <ControlOptions
          label={property.name}
          placeholder={`Search ${property.name.toLowerCase()}…`}
          selected={picked}
          options={choices.map((option) => ({
            ...option,
            count: counts.get(option.value) ?? 0,
          }))}
          onSelect={(key) => toggleFilter(board, property, key)}
        />
      </ControlPopover>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${property.name.toLowerCase()} filter`}
        className="cn-kanban-chip-remove"
        onClick={() => {
          const filters = board.view.filters?.filters.filter(
            (entry) =>
              !("propertyId" in entry) || entry.propertyId !== property.id
          )
          board.setView({
            ...board.view,
            filters: filters?.length
              ? { match: board.view.filters?.match ?? "all", filters }
              : undefined,
          })
        }}
      >
        <IconPlaceholder
          lucide="XIcon"
          tabler="IconX"
          hugeicons="Cancel01Icon"
          phosphor="XIcon"
          remixicon="RiCloseLine"
        />
      </Button>
    </span>
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
      size="default"
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
      <span className="@max-2xl/kanban-toolbar:sr-only">
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
      size="default"
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
      <span className="@max-2xl/kanban-toolbar:sr-only">
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
  const { view } = board
  const fields = board.properties.filter(
    (property) => board.isOnCard(property) !== undefined
  )
  const hidden = view.hiddenColumns ?? []
  const toggle = (list: readonly string[], id: string, isOn: boolean) =>
    isOn ? [...list, id] : list.filter((entry) => entry !== id)
  return (
    <ControlPopover
      label="View options"
      variant="ghost"
      size="default"
      align="end"
      className="cn-kanban-control"
      layout="view"
      trigger={
        <>
          <IconPlaceholder
            lucide="SlidersHorizontalIcon"
            tabler="IconAdjustmentsHorizontal"
            hugeicons="SlidersHorizontalIcon"
            phosphor="SlidersHorizontalIcon"
            remixicon="RiEqualizerLine"
          />
          <span className="@max-2xl/kanban-toolbar:sr-only">View</span>
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
    </ControlPopover>
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
  KanbanFilterChips,
  KanbanGroup,
  KanbanNotices,
  KanbanSearch,
  KanbanSelectionBar,
  KanbanSort,
  KanbanToolbar,
  KanbanViewOptions,
}
