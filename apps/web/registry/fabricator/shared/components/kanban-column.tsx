"use client"

// A column: a quiet track under a header that says where work stands. The body
// scrolls on its own, draws only the cards in view once there are many, and
// answers for its own loading, error and empty states.
import * as React from "react"
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "cn"

import { KanbanComposer } from "@/registry/bases/__base__/components/kanban-composer"
import type { KanbanDragState } from "@/registry/bases/__base__/components/kanban-drag"
import {
  ControlMenu,
  type ControlMenuItem,
} from "@/registry/bases/__base__/components/property-controls"
import { PropertyMark } from "@/registry/bases/__base__/components/property-icons"
import type { KanbanController } from "@/registry/bases/__base__/hooks/use-kanban"
import {
  getKanbanCardShift,
  getKanbanLimitState,
  renameKanbanColumn,
  type KanbanColumn as KanbanColumnDefinition,
} from "@/registry/bases/__base__/lib/kanban-model"
import {
  getPaletteVariables,
  PALETTE_COLORS,
} from "@/registry/bases/__base__/lib/palette-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Input } from "@/registry/bases/__base__/ui/input"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

import {
  KanbanCard,
  type KanbanCardProps,
  type KanbanCardRenderers,
} from "./kanban-card"

const countFormat = new Intl.NumberFormat("en-US")
const VIRTUAL_FROM = 30
const ESTIMATED_HEIGHT = 112

type KanbanColumnProps<Item> = React.ComponentProps<"section"> &
  KanbanCardRenderers<Item> &
  Pick<KanbanCardProps<Item>, "onMenu"> & {
    board: KanbanController<Item>
    column: KanbanColumnDefinition
    items: readonly Item[]
    laneId?: string | null
    drag?: KanbanDragState | null
    /** The card Tab reaches. */
    tabStopId?: string | null
    composing?: "start" | "end" | null
    onComposingChange?: (end: "start" | "end" | null) => void
    /** Opens the app's own way to add a card, instead of the composer. */
    onAddCard?: (columnId: string, laneId: string | null) => void
    /** The app's items in the column's menu. */
    getColumnActions?: (
      column: KanbanColumnDefinition
    ) => readonly ControlMenuItem[]
    /** "New card", under the cards and on the header's add button. */
    addLabel?: string
    /** Loads the next page on reaching the end, or behind a button. */
    paging?: "scroll" | "button"
  }

function KanbanColumn<Item>({
  board,
  column,
  items,
  laneId = null,
  drag,
  tabStopId,
  composing,
  onComposingChange,
  onAddCard,
  getColumnActions,
  addLabel = "New card",
  paging = "scroll",
  onMenu,
  onOpenCard,
  getHref,
  getCover,
  renderCard,
  openId,
  children,
  className,
  style,
  ...props
}: KanbanColumnProps<Item>) {
  const heading = React.useId()
  const collapsed = board.view.collapsedColumns?.includes(column.id)
  const count =
    laneId === null && !board.lanes?.length
      ? (board.totals.get(column.id) ?? items.length)
      : items.length
  const page = board.pages?.get(column.id)
  const isLoading =
    page?.isLoading ||
    (board.isPaged && !page && board.columns.some(({ id }) => id === column.id))
  const target =
    drag?.target?.columnId === column.id && drag.target.laneId === laneId
      ? drag.target
      : null
  const isSource = drag?.columnId === column.id && drag.laneId === laneId
  const isSorted = !!board.view.sort?.length
  const isFiltered = !!(board.view.search?.trim() || board.view.filters)
  const canAdd =
    !column.isLocked && (onAddCard ? true : board.canCreate) && !isLoading
  function add(end: "start" | "end") {
    if (onAddCard) onAddCard(column.id, laneId)
    else onComposingChange?.(end)
  }
  function setCollapsed(next: boolean) {
    const previous = board.view.collapsedColumns ?? []
    board.setView({
      ...board.view,
      collapsedColumns: next
        ? [...previous, column.id]
        : previous.filter((id) => id !== column.id),
    })
  }
  const shared = {
    "data-slot": "kanban-column",
    "data-kanban-column": column.id,
    "data-kanban-lane": laneId ?? undefined,
    // Gray is the track's own colour, so it has nothing to tint.
    "data-tinted":
      (board.view.colorColumns && !!column.color && column.color !== "gray") ||
      undefined,
    "data-drop-target": (target && !target.blocked) || undefined,
    "data-blocked": !!target?.blocked || undefined,
    style: {
      ...style,
      ...getPaletteVariables(column.color ?? "gray"),
    },
  }

  if (collapsed)
    return (
      <section
        {...props}
        {...shared}
        aria-labelledby={heading}
        data-collapsed=""
        className={cn("cn-kanban-column flex shrink-0 flex-col", className)}
      >
        <button
          type="button"
          aria-expanded={false}
          aria-label={`Expand ${column.name}`}
          className="cn-kanban-rail flex flex-1 flex-col items-center"
          onClick={() => setCollapsed(false)}
        >
          <PropertyMark mark={column} />
          <span className="cn-kanban-column-count tabular-nums">{count}</span>
          <span id={heading} className="cn-kanban-rail-name truncate">
            {column.name}
          </span>
        </button>
      </section>
    )

  return (
    <section
      {...props}
      {...shared}
      aria-labelledby={heading}
      className={cn(
        "cn-kanban-column group/kanban-column flex min-h-0 shrink-0 snap-start flex-col",
        className
      )}
    >
      <KanbanColumnHeader
        id={heading}
        board={board}
        column={column}
        count={count}
        shown={isFiltered ? items.length : null}
        isPartial={
          page !== undefined &&
          page.total === undefined &&
          page.nextCursor !== null
        }
        hint={
          target?.blocked ??
          (target && isSorted
            ? `Sorted by ${board.properties.find(({ id }) => id === board.view.sort?.[0]?.propertyId)?.name ?? "a property"}`
            : null)
        }
        isBlocked={!!target?.blocked}
        addLabel={addLabel}
        onAdd={canAdd ? () => add("start") : undefined}
        onCollapse={() => setCollapsed(true)}
        actions={getColumnActions?.(column) ?? []}
      />
      <KanbanColumnBody
        board={board}
        column={column}
        items={items}
        isLoading={!!isLoading}
        isAdding={composing ?? null}
        onCreate={(title, end) => board.create(title, column.id, laneId, end)}
        onComposingClose={() => onComposingChange?.(null)}
        drag={drag}
        isSource={isSource}
        target={isSorted || target?.blocked ? null : target}
        addLabel={addLabel}
        onAdd={canAdd ? () => add("end") : undefined}
        paging={paging}
        tabStopId={tabStopId}
        onMenu={onMenu}
        onOpenCard={onOpenCard}
        getHref={getHref}
        getCover={getCover}
        renderCard={renderCard}
        openId={openId}
      >
        {children}
      </KanbanColumnBody>
    </section>
  )
}

function KanbanColumnHeader<Item>({
  id,
  board,
  column,
  count,
  shown,
  isPartial,
  hint,
  isBlocked,
  addLabel,
  onAdd,
  onCollapse,
  actions,
}: {
  id: string
  board: KanbanController<Item>
  column: KanbanColumnDefinition
  count: number
  /** How many pass the filters, when any are on. */
  shown: number | null
  isPartial: boolean
  hint: string | null
  isBlocked: boolean
  addLabel: string
  onAdd?: () => void
  onCollapse: () => void
  actions: readonly ControlMenuItem[]
}) {
  const [editing, setEditing] = React.useState<{
    field: "name" | "limit"
    /** A menu hands focus back as it closes, so its field waits for that. */
    isFromMenu: boolean
  } | null>(null)
  const Heading = board.lanes?.length ? "h3" : "h2"
  const limit = getKanbanLimitState(column, count)
  const onColumnsChange = board.onColumnsChange
  const index = board.columns.findIndex((entry) => entry.id === column.id)
  const isOwn = index >= 0
  const canManage = !!onColumnsChange && isOwn
  function change(next: KanbanColumnDefinition) {
    onColumnsChange?.(
      board.columns.map((entry) => (entry.id === column.id ? next : entry))
    )
  }
  function moveTo(to: number) {
    const columns = [...board.columns]
    const [entry] = columns.splice(index, 1)
    columns.splice(to, 0, entry)
    onColumnsChange?.(columns)
  }
  const manage: ControlMenuItem[] = canManage
    ? [
        {
          id: "rename",
          label: "Rename",
          icon: (
            <IconPlaceholder
              lucide="PencilIcon"
              tabler="IconPencil"
              hugeicons="EditIcon"
              phosphor="PencilIcon"
              remixicon="RiPencilLine"
            />
          ),
          onSelect: () => setEditing({ field: "name", isFromMenu: true }),
        },
        {
          type: "submenu",
          id: "color",
          label: "Color",
          icon: (
            <IconPlaceholder
              lucide="PaletteIcon"
              tabler="IconPalette"
              hugeicons="PaintBoardIcon"
              phosphor="PaletteIcon"
              remixicon="RiPaletteLine"
            />
          ),
          groups: [
            {
              id: "color",
              items: Object.keys(PALETTE_COLORS).map((name) => ({
                type: "check" as const,
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
                icon: <PropertyMark mark={{ color: name }} />,
                isChecked: column.color === name,
                onSelect: () => change({ ...column, color: name }),
              })),
            },
          ],
        },
        {
          id: "limit",
          label: column.limit === undefined ? "Set a limit" : "Change limit",
          icon: (
            <IconPlaceholder
              lucide="CircleAlertIcon"
              tabler="IconExclamationCircle"
              hugeicons="AlertCircleIcon"
              phosphor="WarningCircleIcon"
              remixicon="RiErrorWarningLine"
            />
          ),
          onSelect: () => setEditing({ field: "limit", isFromMenu: true }),
        },
        {
          id: "left",
          label: "Move left",
          icon: (
            <IconPlaceholder
              lucide="ArrowLeftIcon"
              tabler="IconArrowLeft"
              hugeicons="ArrowLeft02Icon"
              phosphor="ArrowLeftIcon"
              remixicon="RiArrowLeftLine"
            />
          ),
          isDisabled: index === 0,
          onSelect: () => moveTo(index - 1),
        },
        {
          id: "right",
          label: "Move right",
          icon: (
            <IconPlaceholder
              lucide="ArrowRightIcon"
              tabler="IconArrowForward"
              hugeicons="ArrowRightIcon"
              phosphor="ShareFatIcon"
              remixicon="RiShareForwardLine"
            />
          ),
          isDisabled: index === board.columns.length - 1,
          onSelect: () => moveTo(index + 1),
        },
      ]
    : []
  const isEmpty = !board.isPaged && count === 0

  return (
    <header
      data-slot="kanban-column-header"
      className="cn-kanban-column-header flex items-center"
    >
      <PropertyMark mark={column} />
      {editing?.field === "name" ? (
        <KanbanHeaderField
          isFromMenu={editing.isFromMenu}
          label={`Name of ${column.name}`}
          initial={column.name}
          onClose={() => setEditing(null)}
          onCommit={(text) => {
            const next = renameKanbanColumn(board.columns, column.id, text)
            if (next) onColumnsChange?.(next)
          }}
        />
      ) : (
        <Heading
          id={id}
          data-editable={canManage || undefined}
          className="cn-kanban-column-title min-w-0 truncate"
          onDoubleClick={
            canManage
              ? () => setEditing({ field: "name", isFromMenu: false })
              : undefined
          }
        >
          {column.name}
        </Heading>
      )}
      {editing?.field === "limit" ? (
        <KanbanHeaderField
          isNumeric
          isFromMenu={editing.isFromMenu}
          label={`Card limit for ${column.name}`}
          placeholder="No limit"
          initial={column.limit === undefined ? "" : String(column.limit)}
          onClose={() => setEditing(null)}
          onCommit={(text) => {
            const next = text === "" ? undefined : Number(text)
            if (next === undefined || (Number.isInteger(next) && next >= 0))
              change({ ...column, limit: next })
          }}
        />
      ) : (
        <span
          data-slot="kanban-column-count"
          data-limit={limit ?? undefined}
          className="cn-kanban-column-count inline-flex shrink-0 items-center tabular-nums"
        >
          {limit === "over" && (
            <IconPlaceholder
              lucide="TriangleAlertIcon"
              tabler="IconAlertTriangle"
              hugeicons="Alert02Icon"
              phosphor="WarningIcon"
              remixicon="RiErrorWarningLine"
            />
          )}
          {shown === null
            ? `${countFormat.format(count)}${isPartial ? "+" : ""}${column.limit === undefined ? "" : `/${column.limit}`}`
            : `${countFormat.format(shown)} of ${countFormat.format(count)}`}
          <span className="sr-only">
            {column.limit === undefined
              ? " cards"
              : limit === "over"
                ? ` cards, over the limit of ${column.limit}`
                : ` cards, limit ${column.limit}`}
          </span>
        </span>
      )}
      {column.isLocked && (
        <span title="Locked" className="cn-kanban-column-lock inline-flex">
          <IconPlaceholder
            lucide="LockIcon"
            tabler="IconLock"
            hugeicons="ShieldIcon"
            phosphor="LockIcon"
            remixicon="RiLockLine"
          />
          <span className="sr-only">Locked</span>
        </span>
      )}
      {/* The name's field takes the hint's room. */}
      {editing?.field !== "name" && (
        <span
          data-slot="kanban-column-hint"
          data-blocked={isBlocked || undefined}
          className="cn-kanban-column-hint min-w-0 flex-1 truncate text-end"
        >
          {hint}
        </span>
      )}
      <div className="cn-kanban-column-actions flex shrink-0 items-center">
        <ControlMenu
          label={`${column.name} options`}
          align="end"
          className="cn-kanban-column-more"
          groups={[
            { id: "app", items: actions },
            { id: "manage", items: manage },
            {
              id: "view",
              items: [
                {
                  id: "collapse",
                  label: "Collapse",
                  icon: (
                    <IconPlaceholder
                      lucide="MinusIcon"
                      tabler="IconMinus"
                      hugeicons="MinusSignIcon"
                      phosphor="MinusIcon"
                      remixicon="RiSubtractLine"
                    />
                  ),
                  onSelect: onCollapse,
                },
                {
                  id: "hide",
                  label: "Hide from view",
                  icon: (
                    <IconPlaceholder
                      lucide="EyeOffIcon"
                      tabler="IconEyeClosed"
                      hugeicons="ViewOffIcon"
                      phosphor="EyeSlashIcon"
                      remixicon="RiEyeOffLine"
                    />
                  ),
                  onSelect: () =>
                    board.setView({
                      ...board.view,
                      hiddenColumns: [
                        ...(board.view.hiddenColumns ?? []),
                        column.id,
                      ],
                    }),
                },
              ],
            },
            {
              id: "danger",
              items: canManage
                ? [
                    {
                      id: "delete",
                      label: isEmpty ? "Delete column" : "Delete when empty",
                      icon: (
                        <IconPlaceholder
                          lucide="Trash2Icon"
                          tabler="IconTrash"
                          hugeicons="Delete02Icon"
                          phosphor="TrashIcon"
                          remixicon="RiDeleteBinLine"
                        />
                      ),
                      variant: "destructive",
                      isDisabled: !isEmpty,
                      onSelect: () =>
                        onColumnsChange?.(
                          board.columns.filter(
                            (entry) => entry.id !== column.id
                          )
                        ),
                    },
                  ]
                : [],
            },
          ]}
        >
          <IconPlaceholder
            lucide="EllipsisIcon"
            tabler="IconDots"
            hugeicons="MoreHorizontalCircle01Icon"
            phosphor="DotsThreeIcon"
            remixicon="RiMoreLine"
          />
        </ControlMenu>
        {onAdd && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`${addLabel} in ${column.name}`}
            className="cn-kanban-column-more"
            onClick={onAdd}
          >
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
            />
          </Button>
        )}
      </div>
    </header>
  )
}

function KanbanHeaderField({
  label,
  initial,
  placeholder,
  isNumeric = false,
  isFromMenu,
  onCommit,
  onClose,
}: {
  label: string
  initial: string
  placeholder?: string
  isNumeric?: boolean
  isFromMenu: boolean
  onCommit: (text: string) => void
  onClose: () => void
}) {
  const isCancelled = React.useRef(false)
  const isSettled = React.useRef(false)
  const field = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    function settle() {
      isSettled.current = true
      field.current?.focus()
      field.current?.select()
    }
    if (!isFromMenu) return settle()
    // The menu that opened this puts focus back on its trigger as it leaves,
    // so the field takes it after that, and only then listens for a blur.
    const timer = setTimeout(settle, 220)
    return () => clearTimeout(timer)
  }, [isFromMenu])
  return (
    <Input
      ref={field}
      aria-label={label}
      defaultValue={initial}
      placeholder={placeholder}
      inputMode={isNumeric ? "numeric" : undefined}
      data-numeric={isNumeric || undefined}
      className="cn-kanban-header-field"
      onBlur={(event) => {
        if (!isSettled.current) return
        if (!isCancelled.current) onCommit(event.target.value.trim())
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          isCancelled.current = true
          event.currentTarget.blur()
        }
        if (event.key === "Enter") event.currentTarget.blur()
      }}
    />
  )
}

/** The space between cards, which the density decides. */
function useListGap(list: React.RefObject<HTMLElement | null>) {
  const [gap, setGap] = React.useState(8)
  React.useLayoutEffect(() => {
    if (!list.current) return
    const next = Number.parseFloat(getComputedStyle(list.current).rowGap)
    if (Number.isFinite(next)) setGap(next)
  }, [list])
  return gap
}

type KanbanColumnBodyProps<Item> = KanbanCardRenderers<Item> &
  Pick<KanbanCardProps<Item>, "onMenu"> & {
    board: KanbanController<Item>
    column: KanbanColumnDefinition
    items: readonly Item[]
    isLoading: boolean
    isAdding: "start" | "end" | null
    onCreate: (title: string, end: "start" | "end") => void
    onComposingClose: () => void
    drag?: KanbanDragState | null
    isSource: boolean
    target: KanbanDragState["target"]
    addLabel: string
    onAdd?: () => void
    paging: "scroll" | "button"
    tabStopId?: string | null
    children?: React.ReactNode
  }

function KanbanColumnBody<Item>({
  board,
  column,
  items,
  isLoading,
  isAdding,
  onCreate,
  onComposingClose,
  drag,
  isSource,
  target,
  addLabel,
  onAdd,
  paging,
  tabStopId,
  children,
  onMenu,
  ...renderers
}: KanbanColumnBodyProps<Item>) {
  const viewport = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<HTMLUListElement>(null)
  const gap = useListGap(list)
  const page = board.pages?.get(column.id)
  const hasMore =
    !isLoading &&
    page !== undefined &&
    page.error === undefined &&
    page.nextCursor !== null
  const isVirtual = items.length > VIRTUAL_FROM
  const { getId } = board
  const keepMounted = [drag?.id, tabStopId, renderers.openId].flatMap((id) =>
    id ? items.findIndex((item) => getId(item) === id) : []
  )
  const getItemKey = React.useCallback(
    (index: number) => getId(items[index]),
    [items, getId]
  )
  const virtual = useVirtualizer({
    count: items.length,
    enabled: isVirtual,
    getScrollElement: () => viewport.current,
    estimateSize: () => ESTIMATED_HEIGHT,
    getItemKey,
    overscan: 5,
    gap,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...keepMounted.filter((index) => index >= 0),
        ]),
      ].sort((left, right) => left - right),
  })
  const isDragging = drag?.phase === "dragging"
  // Cards slide only while one is held. On a drop the list already has the
  // card in place, so the slide ends in the same frame, with nothing to play.
  const isSliding = isDragging || drag?.phase === "cancelling"

  function renderItem(item: Item, index: number, position?: number) {
    const id = getId(item)
    return (
      <KanbanCard
        key={id}
        {...renderers}
        board={board}
        item={item}
        index={index}
        siblings={page?.total ?? items.length}
        isTabStop={tabStopId === id}
        isDragging={drag?.id === id}
        shift={
          isDragging
            ? getKanbanCardShift({
                index,
                sourceIndex: isSource ? drag.index : null,
                dropIndex: target?.index ?? null,
                distance: drag.distance,
              })
            : 0
        }
        onMenu={onMenu}
        onSelectRange={(to) => board.extendSelection(to, items.map(getId))}
        data-index={index}
        data-virtual={position !== undefined || undefined}
        style={
          position === undefined
            ? undefined
            : { position: "absolute", insetInline: 0, top: position }
        }
        ref={position === undefined ? undefined : virtual.measureElement}
      />
    )
  }
  // The list keeps room for the slot it opened and gives up the one it lost.
  const room =
    !isDragging || isSource === !!target
      ? 0
      : target
        ? drag.distance
        : -drag.distance

  return (
    <div
      ref={viewport}
      data-slot="kanban-column-body"
      aria-busy={isLoading || undefined}
      className="cn-kanban-column-body min-h-0 flex-1 scroll-fade-y overflow-y-auto"
    >
      {children ?? (
        <>
          {isAdding === "start" && (
            <KanbanComposer
              label={`${addLabel} in ${column.name}`}
              onCreate={(title) => onCreate(title, "start")}
              onClose={onComposingClose}
            />
          )}
          <ul
            ref={list}
            role="list"
            aria-label={`Cards in ${column.name}`}
            data-slot="kanban-card-list"
            data-sliding={isSliding || undefined}
            className="cn-kanban-card-list relative flex list-none flex-col"
            style={{
              height: isVirtual ? virtual.getTotalSize() : undefined,
              marginBottom: room,
            }}
          >
            {isVirtual
              ? virtual
                  .getVirtualItems()
                  .map(({ index, start }) =>
                    renderItem(items[index], index, start)
                  )
              : items.map((item, index) => renderItem(item, index))}
            {isDragging && target && (
              <li
                aria-hidden="true"
                data-slot="kanban-drop-slot"
                className="cn-kanban-drop-slot pointer-events-none absolute inset-x-0"
                style={{ top: target.top, height: drag.height }}
              />
            )}
          </ul>
          <KanbanColumnState
            board={board}
            column={column}
            isEmpty={items.length === 0}
            isLoading={isLoading}
            error={page?.error}
            hasRoom={!!target}
          />
          {hasMore && paging === "scroll" && (
            <KanbanMoreSentinel
              viewport={viewport}
              onReach={() => board.loadMore(column.id)}
            />
          )}
          {hasMore && paging === "button" && (
            <Button
              variant="ghost"
              className="cn-kanban-add w-full"
              onClick={() => board.loadMore(column.id)}
            >
              Load more
            </Button>
          )}
          {isAdding === "end" ? (
            <KanbanComposer
              label={`${addLabel} in ${column.name}`}
              onCreate={(title) => onCreate(title, "end")}
              onClose={onComposingClose}
            />
          ) : (
            onAdd &&
            !hasMore && (
              <Button
                variant="ghost"
                className="cn-kanban-add cn-kanban-add-card w-full"
                onClick={onAdd}
              >
                <IconPlaceholder
                  lucide="PlusIcon"
                  tabler="IconPlus"
                  hugeicons="PlusSignIcon"
                  phosphor="PlusIcon"
                  remixicon="RiAddLine"
                />
                {addLabel}
              </Button>
            )
          )}
        </>
      )}
    </div>
  )
}

/** Asks for the next page before the end is in sight. */
function KanbanMoreSentinel({
  viewport,
  onReach,
}: {
  viewport: React.RefObject<HTMLDivElement | null>
  onReach: () => void
}) {
  const mark = React.useRef<HTMLDivElement>(null)
  const reach = React.useRef(onReach)
  React.useEffect(() => {
    reach.current = onReach
  })
  React.useEffect(() => {
    if (!mark.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting))
          reach.current()
      },
      { root: viewport.current, rootMargin: "600px 0px" }
    )
    observer.observe(mark.current)
    return () => observer.disconnect()
  }, [viewport])
  return <div ref={mark} aria-hidden="true" className="h-px" />
}

function KanbanCardSkeleton({ isShort = false }: { isShort?: boolean }) {
  return (
    <div
      data-slot="kanban-card-skeleton"
      className="cn-kanban-card cn-kanban-card-skeleton flex flex-col"
    >
      <Skeleton className="cn-kanban-skeleton-line w-1/4" />
      <Skeleton
        className="cn-kanban-skeleton-line data-[short=true]:w-3/5"
        data-short={isShort}
      />
      <Skeleton className="cn-kanban-skeleton-line w-2/5" />
    </div>
  )
}

function KanbanColumnState<Item>({
  board,
  column,
  isEmpty,
  isLoading,
  error,
  hasRoom,
}: {
  board: KanbanController<Item>
  column: KanbanColumnDefinition
  isEmpty: boolean
  isLoading: boolean
  error: unknown
  hasRoom: boolean
}) {
  if (isLoading)
    return (
      <div
        role="status"
        data-slot="kanban-column-loading"
        className="cn-kanban-loading flex flex-col"
      >
        <span className="sr-only">
          {isEmpty ? "Loading cards…" : "Loading more cards…"}
        </span>
        <KanbanCardSkeleton />
        <KanbanCardSkeleton isShort />
        {isEmpty && <KanbanCardSkeleton />}
      </div>
    )
  if (error !== undefined)
    return (
      <div
        data-slot="kanban-column-error"
        className="cn-kanban-column-message flex flex-col items-center"
      >
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
        />
        <p role="alert">
          {isEmpty ? "Couldn’t load cards." : "Couldn’t load more cards."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => board.retry(column.id)}
        >
          Try again
        </Button>
      </div>
    )
  if (!isEmpty || hasRoom) return null
  return (
    <p data-slot="kanban-column-empty" className="cn-kanban-column-message">
      {board.view.search || board.view.filters
        ? "No matching cards"
        : "No cards yet"}
    </p>
  )
}

export { KanbanColumn, type KanbanColumnProps }
