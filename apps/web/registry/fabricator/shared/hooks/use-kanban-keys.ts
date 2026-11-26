"use client"

import * as React from "react"

import type { KanbanController } from "@/registry/bases/__base__/hooks/use-kanban"

const FOCUS = "[data-kanban-focus]"

function getCard(target: EventTarget | null) {
  if (!(target instanceof HTMLElement) || !target.matches(FOCUS)) return null
  return target.closest<HTMLElement>("[data-kanban-id]")
}

/** The card beside this one: the next in its column, or the nearest by height across columns. */
function getNeighbour(
  root: HTMLElement,
  card: HTMLElement,
  key: string
): HTMLElement | null {
  const column = card.closest<HTMLElement>("[data-kanban-column]")
  if (!column) return null
  const cards = [...column.querySelectorAll<HTMLElement>("[data-kanban-id]")]
  const place = cards.indexOf(card)
  if (key === "ArrowUp") return cards[place - 1] ?? null
  if (key === "ArrowDown") return cards[place + 1] ?? null
  if (key === "Home") return cards[0] ?? null
  if (key === "End") return cards[cards.length - 1] ?? null
  const lane = column.dataset.kanbanLane
  const columns = [
    ...root.querySelectorAll<HTMLElement>("[data-kanban-column]"),
  ].filter((entry) => entry.dataset.kanbanLane === lane)
  const step = key === "ArrowRight" ? 1 : -1
  const top = card.getBoundingClientRect().top
  for (
    let index = columns.indexOf(column) + step;
    index >= 0 && index < columns.length;
    index += step
  ) {
    let nearest: { card: HTMLElement; distance: number } | null = null
    for (const entry of columns[index].querySelectorAll<HTMLElement>(
      "[data-kanban-id]"
    )) {
      const distance = Math.abs(entry.getBoundingClientRect().top - top)
      if (!nearest || distance < nearest.distance)
        nearest = { card: entry, distance }
    }
    if (nearest) return nearest.card
  }
  return null
}

const MOVES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]

/**
 * The board's keyboard. Arrows move between cards, ⌥⇧ and an arrow moves the
 * card itself, and single letters work only while a card has focus, so they
 * never take a key from something being typed.
 */
function useKanbanKeys<Item>({
  board,
  root,
  onCompose,
}: {
  board: KanbanController<Item>
  root: React.RefObject<HTMLElement | null>
  onCompose: (columnId: string, laneId: string | null) => void
}) {
  // A card that changes column is drawn again somewhere else, so focus is put
  // back on it once it is there.
  const follow = React.useRef<string | null>(null)
  React.useLayoutEffect(() => {
    if (!follow.current) return
    const card = root.current?.querySelector<HTMLElement>(
      `[data-kanban-id="${CSS.escape(follow.current)}"] ${FOCUS}`
    )
    follow.current = null
    card?.focus()
  })

  function moveCard(card: HTMLElement, key: string) {
    const id = card.dataset.kanbanId
    const column = card.closest<HTMLElement>("[data-kanban-column]")
    const columnId = column?.dataset.kanbanColumn
    if (!id || columnId === undefined) return
    const laneId = column?.dataset.kanbanLane ?? null
    const index = Number(card.dataset.kanbanIndex)
    if (key === "ArrowUp" || key === "ArrowDown") {
      follow.current = id
      board.move(
        [id],
        columnId,
        key === "ArrowUp" ? index - 1 : index + 2,
        laneId
      )
      return
    }
    const columns = board.groups.filter(
      ({ column: entry }) => !board.view.hiddenColumns?.includes(entry.id)
    )
    const place = columns.findIndex(
      ({ column: entry }) => entry.id === columnId
    )
    const next = columns[place + (key === "ArrowRight" ? 1 : -1)]
    if (!next) return
    follow.current = id
    board.move([id], next.column.id, 0, laneId)
  }

  function selectColumn(card: HTMLElement) {
    const columnId = card.closest<HTMLElement>("[data-kanban-column]")?.dataset
      .kanbanColumn
    const group = board.groups.find(({ column }) => column.id === columnId)
    if (!group) return
    board.select(group.items.map(board.getId))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    // The app's own shortcut already answered.
    if (event.defaultPrevented) return
    const card = getCard(event.target)
    const isCommand = event.metaKey || event.ctrlKey
    const isTyping =
      event.target instanceof HTMLElement &&
      event.target.matches("input, textarea, select, [contenteditable=true]")
    if (isTyping) return
    if (isCommand && event.key === "z" && !event.shiftKey && board.undo) {
      event.preventDefault()
      void board.undo()
      return
    }
    if (event.key === "/" && !isCommand) {
      const search = event.currentTarget
        .closest("[data-slot=kanban]")
        ?.querySelector<HTMLElement>("[data-kanban-search]")
      if (search) {
        event.preventDefault()
        search.focus()
      }
      return
    }
    if (!card || !root.current) return
    const id = card.dataset.kanbanId
    if (!id) return
    if (MOVES.includes(event.key)) {
      event.preventDefault()
      if (event.altKey && event.shiftKey) {
        if (board.isMutable && event.key.startsWith("Arrow"))
          moveCard(card, event.key)
        return
      }
      const next = getNeighbour(root.current, card, event.key)
      next?.querySelector<HTMLElement>(FOCUS)?.focus()
      return
    }
    if (isCommand && event.key === "a" && board.isMutable) {
      event.preventDefault()
      selectColumn(card)
      return
    }
    if (isCommand || event.altKey || !board.isMutable) return
    if (event.key === "x") {
      event.preventDefault()
      board.toggleSelection(id)
    }
    if (event.key === "c") {
      const column = card.closest<HTMLElement>("[data-kanban-column]")
      if (column?.dataset.kanbanColumn === undefined) return
      event.preventDefault()
      onCompose(column.dataset.kanbanColumn, column.dataset.kanbanLane ?? null)
    }
    if (event.key === "Escape" && board.selectedIds.size) {
      event.stopPropagation()
      board.clearSelection()
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      const ids = board.selectedIds.has(id) ? [...board.selectedIds] : [id]
      if (!ids.every(board.canDelete)) return
      event.preventDefault()
      const next =
        getNeighbour(root.current, card, "ArrowDown") ??
        getNeighbour(root.current, card, "ArrowUp")
      follow.current = next?.dataset.kanbanId ?? null
      board.remove(ids)
    }
  }

  return handleKeyDown
}

export { useKanbanKeys }
