"use client"

// Kanban: cards in columns that people drag, sort and open. The app owns the
// records and the rules; useKanban owns everything between a gesture and a
// saved change, and the parts below draw it. Each part takes the controller, so
// any of them can be replaced without giving up the rest.
import * as React from "react"
import { cn } from "cn"

import { getKanbanCardGroups } from "@/registry/bases/__base__/components/kanban-actions"
import {
  KanbanCardOverlay,
  type KanbanCardRenderers,
} from "@/registry/bases/__base__/components/kanban-card"
import {
  KanbanColumn,
  type KanbanColumnProps,
} from "@/registry/bases/__base__/components/kanban-column"
import { KanbanDrag } from "@/registry/bases/__base__/components/kanban-drag"
import {
  KanbanNotices,
  KanbanSelectionBar,
  KanbanToolbar,
} from "@/registry/bases/__base__/components/kanban-toolbar"
import {
  ControlMenu,
  type ControlMenuItem,
} from "@/registry/bases/__base__/components/property-controls"
import { PropertyMark } from "@/registry/bases/__base__/components/property-icons"
import {
  useKanban,
  type KanbanController,
  type KanbanOptions,
} from "@/registry/bases/__base__/hooks/use-kanban"
import { useKanbanKeys } from "@/registry/bases/__base__/hooks/use-kanban-keys"
import type { KanbanLane } from "@/registry/bases/__base__/lib/kanban-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Input } from "@/registry/bases/__base__/ui/input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type KanbanBoardProps<Item> = React.ComponentProps<"div"> &
  KanbanCardRenderers<Item> &
  Pick<
    KanbanColumnProps<Item>,
    "onAddCard" | "getColumnActions" | "addLabel" | "hasHeaderAdd" | "paging"
  > & {
    board: KanbanController<Item>
    /** The app's items in a card's menu. */
    getCardActions?: (item: Item) => readonly ControlMenuItem[]
  }

type KanbanProps<Item> = KanbanOptions<Item> &
  Omit<
    KanbanBoardProps<Item>,
    "board" | "children" | keyof React.ComponentProps<"div">
  > & {
    className?: string
    label?: string
    /** `fill` takes the height it is given; columns scroll inside it. */
    fit?: "content" | "fill"
    children?: (board: KanbanController<Item>) => React.ReactNode
    renderToolbar?: (board: KanbanController<Item>) => React.ReactNode
  }

function Kanban<Item>({
  label = "Kanban board",
  fit = "content",
  className,
  children,
  renderToolbar,
  onAddCard,
  getColumnActions,
  getCardActions,
  addLabel,
  hasHeaderAdd,
  paging,
  onOpenCard,
  getHref,
  getCover,
  renderCard,
  openId,
  ...options
}: KanbanProps<Item>) {
  const board = useKanban(options)
  return (
    <section
      aria-label={label}
      data-slot="kanban"
      data-fit={fit}
      className={cn("cn-kanban relative flex min-w-0 flex-col", className)}
    >
      {children ? (
        children(board)
      ) : (
        <>
          {renderToolbar ? (
            renderToolbar(board)
          ) : (
            <KanbanToolbar board={board} />
          )}
          <KanbanBoard
            board={board}
            onAddCard={onAddCard}
            getColumnActions={getColumnActions}
            getCardActions={getCardActions}
            addLabel={addLabel}
            hasHeaderAdd={hasHeaderAdd}
            paging={paging}
            onOpenCard={onOpenCard}
            getHref={getHref}
            getCover={getCover}
            renderCard={renderCard}
            openId={openId}
          />
        </>
      )}
      <p className="sr-only" role="status" data-slot="kanban-announcer">
        {board.announcement}
      </p>
      <div
        data-slot="kanban-floats"
        className="cn-kanban-floats pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center"
      >
        <KanbanNotices board={board} />
        <KanbanSelectionBar board={board} />
      </div>
    </section>
  )
}

const onlyLane = [{ id: null, name: "" }]

function KanbanBoard<Item>({
  board,
  className,
  onAddCard,
  getColumnActions,
  getCardActions,
  addLabel,
  hasHeaderAdd,
  paging,
  onOpenCard,
  getHref,
  getCover,
  renderCard,
  openId,
  children,
  ...props
}: KanbanBoardProps<Item>) {
  const root = React.useRef<HTMLDivElement>(null)
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const [menu, setMenu] = React.useState<{
    id: string
    point: { x: number; y: number }
  } | null>(null)
  const [composing, setComposing] = React.useState<{
    columnId: string
    laneId: string | null
    end: "start" | "end"
  } | null>(null)
  const isHidden = (id: string) => board.view.hiddenColumns?.includes(id)
  const hidden = board.groups.filter(({ column }) => isHidden(column.id))
  const visible = board.groups.filter(
    ({ column, items }) =>
      !isHidden(column.id) &&
      (!board.view.hideEmpty ||
        items.length ||
        (board.isPaged && board.pages?.get(column.id)?.total !== 0))
  )
  const lanes: readonly (KanbanLane | { id: null; name: string })[] =
    board.lanes?.length && board.getLaneId
      ? [...board.lanes, { id: null, name: "No lane" }]
      : onlyLane
  const hasLanes = lanes !== onlyLane
  const tabStopId =
    focusedId !== null && board.byId.has(focusedId)
      ? focusedId
      : (visible
          .flatMap(({ items }) => items.slice(0, 1))
          .map(board.getId)[0] ?? null)
  const handleKeyDown = useKanbanKeys({
    board,
    root,
    onCompose: (columnId, laneId) => {
      if (onAddCard) onAddCard(columnId, laneId)
      else if (board.canCreate) setComposing({ columnId, laneId, end: "end" })
    },
  })
  const getIds = (id: string) =>
    board.selectedIds.has(id)
      ? [id, ...[...board.selectedIds].filter((entry) => entry !== id)]
      : [id]
  const opened = menu ? board.byId.get(menu.id) : undefined

  function closeMenu() {
    const id = menu?.id
    setMenu(null)
    if (!id) return
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body)
        return
      root.current
        ?.querySelector<HTMLElement>(
          `[data-kanban-id="${CSS.escape(id)}"] [data-kanban-focus]`
        )
        ?.focus()
    })
  }

  return (
    <KanbanDrag
      root={root}
      getCount={(id) => getIds(id).length}
      getBlocked={(id, target) =>
        board.getMoveBlock(
          getIds(id),
          target.columnId,
          target.index,
          target.laneId
        )
      }
      onDrop={(id, target) =>
        board.move(getIds(id), target.columnId, target.index, target.laneId)
      }
      renderOverlay={(id, count) => {
        const item = board.byId.get(id)
        return item === undefined ? null : (
          <KanbanCardOverlay
            board={board}
            item={item}
            count={count}
            renderCard={renderCard}
            getCover={getCover}
          />
        )
      }}
    >
      {(drag) => (
        // The board's keys are its cards'; the region itself takes no focus. It
        // is positioned, so text for screen readers scrolls with its column
        // instead of widening the page.
        <div
          {...props}
          ref={root}
          data-slot="kanban-board"
          data-dragging={drag?.phase === "dragging" || undefined}
          className={cn(
            "cn-kanban-board relative flex min-h-0 min-w-0 flex-1 scroll-fade-x flex-col overflow-x-auto",
            className
          )}
          onKeyDown={handleKeyDown}
          onFocus={(event) => {
            const id =
              event.target.closest<HTMLElement>("[data-kanban-id]")?.dataset
                .kanbanId
            if (id) setFocusedId(id)
          }}
          onContextMenu={(event) => {
            const id =
              event.target instanceof Element
                ? event.target.closest<HTMLElement>("[data-kanban-id]")?.dataset
                    .kanbanId
                : undefined
            if (!id) return
            event.preventDefault()
            setMenu({ id, point: { x: event.clientX, y: event.clientY } })
          }}
        >
          {children ?? (
            <>
              {lanes.map((lane) => {
                const groups = hasLanes
                  ? visible.map(({ column, items }) => ({
                      column,
                      items: items.filter(
                        (item) => board.getLaneId?.(item) === lane.id
                      ),
                    }))
                  : visible
                const count = groups.reduce(
                  (sum, { items }) => sum + items.length,
                  0
                )
                if (hasLanes && lane.id === null && count === 0) return null
                const key = lane.id ?? ""
                const isCollapsed =
                  hasLanes && !!board.view.collapsedLanes?.includes(key)
                return (
                  <div
                    key={key}
                    data-slot="kanban-lane"
                    className={cn(
                      "cn-kanban-lane flex flex-col",
                      // Lanes keep their height and the board scrolls.
                      hasLanes ? "shrink-0" : "min-h-0 flex-1"
                    )}
                  >
                    {hasLanes && (
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        className="cn-kanban-lane-title sticky left-0 flex w-fit items-center"
                        onClick={() => {
                          const collapsed = board.view.collapsedLanes ?? []
                          board.setView({
                            ...board.view,
                            collapsedLanes: isCollapsed
                              ? collapsed.filter((id) => id !== key)
                              : [...collapsed, key],
                          })
                        }}
                      >
                        <IconPlaceholder
                          lucide="ChevronDownIcon"
                          tabler="IconChevronDown"
                          hugeicons="ArrowDown01Icon"
                          phosphor="CaretDownIcon"
                          remixicon="RiArrowDownSLine"
                          data-slot="kanban-lane-chevron"
                        />
                        <span>{lane.name}</span>
                        <span className="cn-kanban-column-count tabular-nums">
                          {count}
                        </span>
                      </button>
                    )}
                    {!isCollapsed && (
                      <div className="cn-kanban-track flex min-h-0 w-max min-w-full flex-1 items-stretch">
                        {groups.map(({ column, items }) => (
                          <KanbanColumn
                            key={column.id}
                            board={board}
                            column={column}
                            laneId={lane.id}
                            items={items}
                            drag={drag}
                            tabStopId={tabStopId}
                            composing={
                              composing?.columnId === column.id &&
                              composing.laneId === lane.id
                                ? composing.end
                                : null
                            }
                            onComposingChange={(end) =>
                              setComposing(
                                end && {
                                  columnId: column.id,
                                  laneId: lane.id,
                                  end,
                                }
                              )
                            }
                            onAddCard={onAddCard}
                            getColumnActions={getColumnActions}
                            addLabel={addLabel}
                            hasHeaderAdd={hasHeaderAdd}
                            paging={paging}
                            onMenu={(id, point) => setMenu({ id, point })}
                            onOpenCard={onOpenCard}
                            getHref={getHref}
                            getCover={getCover}
                            renderCard={renderCard}
                            openId={openId}
                          />
                        ))}
                        {!hasLanes && (
                          <KanbanEnd board={board} hidden={hidden} />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {!visible.length && !hidden.length && (
                <p className="cn-kanban-column-message">No columns to show.</p>
              )}
            </>
          )}
          {menu && opened !== undefined && (
            <ControlMenu
              key={`${menu.id}/${menu.point.x}/${menu.point.y}`}
              open
              onOpenChange={(open) => {
                if (!open) closeMenu()
              }}
              point={menu.point}
              label={`Actions for ${board.getTitle(opened)}`}
              groups={getKanbanCardGroups(board, menu.id, {
                onOpen: onOpenCard ? () => onOpenCard(opened) : undefined,
                extra: getCardActions?.(opened),
              })}
            />
          )}
        </div>
      )}
    </KanbanDrag>
  )
}

/** After the columns: a new one, then the hidden ones. */
function KanbanEnd<Item>({
  board,
  hidden,
}: {
  board: KanbanController<Item>
  hidden: KanbanController<Item>["groups"]
}) {
  if (!board.onColumnsChange && !hidden.length) return null
  return (
    <div
      data-slot="kanban-end"
      className="cn-kanban-end flex shrink-0 flex-col"
    >
      {board.onColumnsChange && <KanbanColumnCreate board={board} />}
      {hidden.length > 0 && (
        <KanbanHiddenColumns board={board} hidden={hidden} />
      )}
    </div>
  )
}

/** Columns left out of the view, one click from coming back. */
function KanbanHiddenColumns<Item>({
  board,
  hidden,
}: {
  board: KanbanController<Item>
  hidden: KanbanController<Item>["groups"]
}) {
  return (
    <section
      aria-label="Hidden columns"
      data-slot="kanban-hidden-columns"
      className="cn-kanban-hidden flex flex-col"
    >
      <p className="cn-kanban-hidden-label">Hidden</p>
      {hidden.map(({ column, items }) => (
        <Button
          key={column.id}
          variant="ghost"
          className="cn-kanban-hidden-item w-full"
          onClick={() =>
            board.setView({
              ...board.view,
              hiddenColumns: board.view.hiddenColumns?.filter(
                (id) => id !== column.id
              ),
            })
          }
        >
          <PropertyMark mark={column} />
          <span className="min-w-0 flex-1 truncate text-start">
            <span className="sr-only">Show </span>
            {column.name}
          </span>
          <span className="cn-kanban-column-count tabular-nums">
            {board.totals.get(column.id) ?? items.length}
          </span>
        </Button>
      ))}
    </section>
  )
}

function KanbanColumnCreate<Item>({
  board,
}: {
  board: KanbanController<Item>
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  function commit(text: string) {
    const name = text.trim()
    setIsOpen(false)
    if (!name) return
    board.onColumnsChange?.([
      ...board.columns,
      { id: crypto.randomUUID(), name, color: "gray" },
    ])
  }
  return (
    <div data-slot="kanban-column-create" className="cn-kanban-column-create">
      {isOpen ? (
        <Input
          autoFocus
          aria-label="New column name"
          placeholder="Column name"
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              event.currentTarget.value = ""
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="default"
          className="cn-kanban-column-add w-full"
          onClick={() => setIsOpen(true)}
        >
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
          Add column
        </Button>
      )}
    </div>
  )
}

export { Kanban, KanbanBoard, useKanban }
export {
  KanbanCard,
  type KanbanCardProps,
  type KanbanCardRenderers,
} from "@/registry/bases/__base__/components/kanban-card"
export {
  KanbanColumn,
  type KanbanColumnProps,
} from "@/registry/bases/__base__/components/kanban-column"
export {
  KanbanFilter,
  KanbanGroup,
  KanbanNotices,
  KanbanSearch,
  KanbanSelectionBar,
  KanbanSort,
  KanbanToolbar,
  KanbanViewOptions,
} from "@/registry/bases/__base__/components/kanban-toolbar"
export type { KanbanBoardProps, KanbanController, KanbanOptions, KanbanProps }
export type {
  KanbanDraft,
  KanbanView,
} from "@/registry/bases/__base__/hooks/use-kanban"
export type {
  KanbanChange,
  KanbanLane,
  KanbanLoader,
  KanbanPage,
  KanbanPlacement,
} from "@/registry/bases/__base__/lib/kanban-model"
export type { KanbanColumn as KanbanColumnDefinition } from "@/registry/bases/__base__/lib/kanban-model"
export type {
  ControlMenuGroup as KanbanMenuGroup,
  ControlMenuItem as KanbanMenuItem,
} from "@/registry/bases/__base__/components/property-controls"
