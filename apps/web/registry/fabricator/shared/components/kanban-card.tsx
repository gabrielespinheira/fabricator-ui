"use client"

// A card: what it is called, who has it, and the few values people decide by.
// The whole card drags and its title opens it, so nothing on it needs a handle.
// Plain markup throughout, because a board draws hundreds.
import * as React from "react"
import { cn } from "cn"

import { PropertyValue } from "@/registry/bases/__base__/components/property-value"
import type { KanbanController } from "@/registry/bases/__base__/hooks/use-kanban"
import {
  getPropertyCover,
  hasPropertyValue,
  readPropertyFiles,
} from "@/registry/bases/__base__/lib/property-model"
import {
  getPropertyType,
  type PropertyDefinition,
} from "@/registry/bases/__base__/lib/property-types"
import { useBoardDragItem } from "@/registry/bases/__base__/lib/sortable"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type KanbanCardRenderers<Item> = {
  onOpenCard?: (item: Item) => void
  /** A card's address, so its title is a link that opens in a new tab. */
  getHref?: (item: Item) => string | undefined
  /** A picture above the card, instead of the view's cover property. */
  getCover?: (item: Item) => string | undefined
  /** Replaces what the card holds. */
  renderCard?: (item: Item) => React.ReactNode
  /** The card shown in the record view. */
  openId?: string | null
}

type KanbanCardProps<Item> = Omit<
  React.ComponentProps<"li">,
  "children" | "color"
> &
  KanbanCardRenderers<Item> & {
    board: KanbanController<Item>
    item: Item
    index: number
    siblings: number
    /** The one card Tab reaches; arrows move between the rest. */
    isTabStop?: boolean
    /** How far the card slides to make room for the one being dragged. */
    shift?: number
    isDragging?: boolean
    onMenu?: (id: string, point: { x: number; y: number }) => void
    onSelectRange?: (id: string) => void
  }

/** The values a card shows, by where they sit on it. Empty ones are left out. */
function getCardFields<Item>(board: KanbanController<Item>, item: Item) {
  const getPlacement = ({ type }: PropertyDefinition) =>
    getPropertyType(type, board.types).placement ?? "tags"
  const shown = board.properties.filter((field) => {
    const value = board.getValue(item, field.id)
    // A lone picture already covers the card; counting it says nothing more.
    const isCoverOnly =
      field.id === board.cover?.id && readPropertyFiles(value).length === 1
    return (
      board.isOnCard(field) &&
      !isCoverOnly &&
      hasPropertyValue(field, value, board.types)
    )
  })
  return {
    keys: shown.filter(({ type }) => type === "key"),
    people: shown.filter(
      (field) => getPlacement(field) === "head" && field.type !== "key"
    ),
    tags: shown.filter((field) => getPlacement(field) === "tags"),
    meta: shown.filter((field) => getPlacement(field) === "meta"),
  }
}

/** A card's picture. One that doesn't load leaves the card as it would be without. */
function KanbanCardCover({ src, fit }: { src: string; fit: "fill" | "fit" }) {
  const [failed, setFailed] = React.useState<string | null>(null)
  if (failed === src) return null
  return (
    <img
      data-slot="kanban-card-cover"
      data-fit={fit}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="cn-kanban-card-cover w-full"
      onError={() => setFailed(src)}
    />
  )
}

function KanbanCardFace<Item>({
  board,
  item,
  title,
  renderCard,
  getCover,
  actions,
}: Pick<KanbanCardProps<Item>, "board" | "item" | "renderCard" | "getCover"> & {
  title: React.ReactNode
  actions?: React.ReactNode
}) {
  const fields = getCardFields(board, item)
  const picture =
    board.cover &&
    getPropertyCover(board.cover, board.getValue(item, board.cover.id))
  const cover = getCover?.(item) ?? picture?.thumbnail ?? picture?.url
  const draw = (field: PropertyDefinition) => (
    <PropertyValue
      key={field.id}
      variant="card"
      property={field}
      value={board.getValue(item, field.id)}
    />
  )
  const hasHead = fields.keys.length > 0 || fields.people.length > 0
  return (
    <>
      {cover && (
        <KanbanCardCover src={cover} fit={board.view.coverFit ?? "fill"} />
      )}
      {renderCard ? (
        <div className="cn-kanban-card-content relative flex min-w-0 flex-col">
          {title}
          {renderCard(item)}
          <div className="cn-kanban-card-actions absolute">{actions}</div>
        </div>
      ) : (
        <div className="cn-kanban-card-content flex min-w-0 flex-col">
          {hasHead && (
            <div
              data-slot="kanban-card-head"
              className="cn-kanban-card-head flex min-w-0 items-center"
            >
              <span className="cn-kanban-card-key flex min-w-0 flex-1 items-center">
                {fields.keys.map(draw)}
              </span>
              {actions}
              {fields.people.map(draw)}
            </div>
          )}
          <div className="flex min-w-0 items-start">
            {title}
            {!hasHead && actions}
          </div>
          {fields.tags.length + fields.meta.length > 0 && (
            <div
              data-slot="kanban-card-properties"
              className="cn-kanban-card-properties flex flex-wrap items-center"
            >
              {fields.tags.map(draw)}
              {fields.meta.length > 0 && (
                <span className="cn-kanban-card-meta ms-auto flex flex-wrap items-center">
                  {fields.meta.map(draw)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function KanbanCard<Item>({
  board,
  item,
  index,
  siblings,
  onOpenCard,
  getHref,
  getCover,
  renderCard,
  openId,
  isTabStop = true,
  shift = 0,
  isDragging,
  onMenu,
  onSelectRange,
  className,
  style,
  ref: measureRef,
  ...props
}: KanbanCardProps<Item>) {
  const id = board.getId(item)
  const title = board.getTitle(item)
  const { ref } = useBoardDragItem(id, !board.isMutable)
  const setRef = React.useCallback(
    (element: HTMLLIElement | null) => {
      ref(element)
      if (typeof measureRef === "function") measureRef(element)
      else if (measureRef) measureRef.current = element
    },
    [ref, measureRef]
  )
  const isSelected = board.selectedIds.has(id)
  const href = getHref?.(item)

  function handleClick(event: React.MouseEvent) {
    if (event.shiftKey && board.isMutable) {
      event.preventDefault()
      onSelectRange?.(id)
      return
    }
    const isCommand = event.metaKey || event.ctrlKey
    if (isCommand && href) return
    if (isCommand && board.isMutable) {
      event.preventDefault()
      board.toggleSelection(id)
      return
    }
    if (!onOpenCard) return
    event.preventDefault()
    onOpenCard(item)
  }
  const titleProps = {
    "data-slot": "kanban-card-title",
    "data-kanban-focus": "",
    tabIndex: isTabStop ? 0 : -1,
    draggable: false,
    onClick: handleClick,
  }

  return (
    <li
      {...props}
      ref={setRef}
      data-slot="kanban-card"
      data-kanban-index={index}
      data-kanban-id={id}
      data-selected={isSelected || undefined}
      data-open={id === openId || undefined}
      data-pending={board.pendingIds.has(id) || undefined}
      data-dragging={isDragging || undefined}
      data-movable={board.isMutable || undefined}
      aria-setsize={siblings}
      aria-posinset={index + 1}
      className={cn(
        "cn-kanban-card group/kanban-card relative min-w-0",
        className
      )}
      style={shift ? { ...style, transform: `translateY(${shift}px)` } : style}
    >
      <KanbanCardFace
        board={board}
        item={item}
        renderCard={renderCard}
        getCover={getCover}
        title={
          renderCard ? (
            <button
              type="button"
              {...titleProps}
              aria-label={title}
              className="cn-kanban-card-hit absolute inset-0"
            />
          ) : href ? (
            <a
              href={href}
              {...titleProps}
              className="cn-kanban-card-title min-w-0 flex-1 text-start"
            >
              {title}
            </a>
          ) : (
            <button
              type="button"
              {...titleProps}
              className="cn-kanban-card-title min-w-0 flex-1 text-start"
            >
              {title}
            </button>
          )
        }
        actions={
          onMenu && (
            <button
              type="button"
              tabIndex={isTabStop ? 0 : -1}
              aria-label={`Actions for ${title}`}
              aria-haspopup="menu"
              className="cn-kanban-card-more relative inline-flex shrink-0 items-center justify-center"
              data-sortable-ignore=""
              onClick={(event) => {
                const box = event.currentTarget.getBoundingClientRect()
                onMenu(id, { x: box.left, y: box.bottom })
              }}
            >
              <IconPlaceholder
                lucide="EllipsisIcon"
                tabler="IconDots"
                hugeicons="MoreHorizontalCircle01Icon"
                phosphor="DotsThreeIcon"
                remixicon="RiMoreLine"
              />
            </button>
          )
        }
      />
    </li>
  )
}

/** What follows the pointer: the card itself, with a count when several travel. */
function KanbanCardOverlay<Item>({
  board,
  item,
  count,
  renderCard,
  getCover,
}: Pick<KanbanCardProps<Item>, "board" | "item" | "renderCard" | "getCover"> & {
  count: number
}) {
  return (
    <div
      data-slot="kanban-drag-overlay"
      data-stacked={count > 1 || undefined}
      className="cn-kanban-drag-overlay pointer-events-none relative"
    >
      <div className="cn-kanban-card cn-kanban-card-lifted">
        <KanbanCardFace
          board={board}
          item={item}
          renderCard={renderCard}
          getCover={getCover}
          title={
            <span
              data-slot="kanban-card-title"
              className="cn-kanban-card-title min-w-0 flex-1 text-start"
            >
              {renderCard ? null : board.getTitle(item)}
            </span>
          }
        />
      </div>
      {count > 1 && (
        <span className="cn-kanban-drag-count absolute tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}

export {
  KanbanCard,
  KanbanCardOverlay,
  type KanbanCardProps,
  type KanbanCardRenderers,
}
