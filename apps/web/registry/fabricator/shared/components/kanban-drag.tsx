"use client"

// What a drag over the board means: which column and slot the pointer is over,
// whether that column takes the card, and where the card lands. The pointer
// itself comes from lib/sortable; the geometry is lib/kanban-model.
import * as React from "react"
import { flushSync } from "react-dom"

import {
  getKanbanDropSlot,
  getKanbanScrollSpeed,
  type KanbanCardBox,
} from "@/registry/bases/__base__/lib/kanban-model"
import {
  BoardDragProvider,
  type BoardPointer,
} from "@/registry/bases/__base__/lib/sortable"

type KanbanDropTarget = {
  columnId: string
  laneId: string | null
  index: number
  /** Where the slot opens in the column's list, in pixels. */
  top: number
  /** Why the column won't take the card. */
  blocked: string | null
}

type KanbanDragState = {
  id: string
  columnId: string
  laneId: string | null
  index: number
  height: number
  /** A card's height and the space after it. */
  distance: number
  count: number
  target: KanbanDropTarget | null
  /** `landing`: dropped, and travelling to its place. */
  phase: "dragging" | "landing" | "cancelling"
}

type Grab = { offsetX: number; offsetY: number; width: number; height: number }

const COLUMN = "[data-kanban-column]"
const CARD = "[data-kanban-index]"
const LIST = "[data-slot=kanban-card-list]"
const BODY = "[data-slot=kanban-column-body]"

function findColumn(root: HTMLElement, { x, y }: BoardPointer) {
  const bounds = root.getBoundingClientRect()
  if (x < bounds.left - 48 || x > bounds.right + 48) return null
  let nearest: { column: HTMLElement; distance: number } | null = null
  for (const column of root.querySelectorAll<HTMLElement>(COLUMN)) {
    const box = column.getBoundingClientRect()
    const across = Math.max(box.left - x, x - box.right, 0)
    const down = Math.max(box.top - y, y - box.bottom, 0)
    const distance = across * 4 + down
    if (!nearest || distance < nearest.distance) nearest = { column, distance }
  }
  return nearest?.column ?? null
}

/** Cards by their place in the list. Offsets ignore the transforms a drag adds. */
function readBoxes(column: HTMLElement): KanbanCardBox[] {
  return [...column.querySelectorAll<HTMLElement>(CARD)].map((card) => ({
    index: Number(card.dataset.kanbanIndex),
    top: card.offsetTop,
    height: card.offsetHeight,
  }))
}

function locateDrop(
  root: HTMLElement,
  point: BoardPointer,
  drag: KanbanDragState,
  grab: Grab
): Omit<KanbanDropTarget, "blocked"> | null {
  const column = findColumn(root, point)
  const columnId = column?.dataset.kanbanColumn
  if (!column || columnId === undefined) return null
  const laneId = column.dataset.kanbanLane ?? null
  const list = column.querySelector<HTMLElement>(LIST)
  if (!list) return { columnId, laneId, index: 0, top: 0 }
  const isSource = columnId === drag.columnId && laneId === drag.laneId
  const slot = getKanbanDropSlot({
    boxes: readBoxes(column),
    sourceIndex: isSource ? drag.index : null,
    height: grab.height,
    center:
      point.y -
      grab.offsetY +
      grab.height / 2 -
      list.getBoundingClientRect().top,
    gap: drag.distance - grab.height,
  })
  return { columnId, laneId, ...slot }
}

function readMotion(element: Element) {
  const style = getComputedStyle(element)
  const duration = style.getPropertyValue("--motion-move").trim()
  const amount = Number.parseFloat(duration) || 0
  const scale = Number(style.getPropertyValue("--motion-scale").trim() || "1")
  const isStill = matchMedia("(prefers-reduced-motion: reduce)").matches
  return {
    duration: isStill
      ? 0
      : amount * (duration.endsWith("ms") ? 1 : 1000) * scale,
    easing: style.getPropertyValue("--motion-ease-move").trim() || "ease-out",
  }
}

function KanbanDrag({
  root,
  getCount,
  getBlocked,
  onDrop,
  renderOverlay,
  children,
}: {
  root: React.RefObject<HTMLDivElement | null>
  /** How many cards travel with the one picked up. */
  getCount: (id: string) => number
  getBlocked: (
    id: string,
    target: Omit<KanbanDropTarget, "blocked">
  ) => string | null
  onDrop: (id: string, target: KanbanDropTarget) => boolean
  renderOverlay: (id: string, count: number) => React.ReactNode
  children: (drag: KanbanDragState | null) => React.ReactNode
}) {
  const [drag, setDrag] = React.useState<KanbanDragState | null>(null)
  const current = React.useRef<KanbanDragState | null>(null)
  const grab = React.useRef<Grab>({
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  })
  const pointer = React.useRef<BoardPointer | null>(null)
  const blocked = React.useRef(getBlocked)
  React.useEffect(() => {
    blocked.current = getBlocked
  })

  function update(next: KanbanDragState | null) {
    current.current = next
    setDrag(next)
  }

  const isDragging = drag?.phase === "dragging"
  React.useEffect(() => {
    if (!isDragging) return
    let frame = 0
    let lastX = pointer.current?.x ?? 0
    let tilt = 0
    let held = 0
    const isStill = matchMedia("(prefers-reduced-motion: reduce)").matches
    function step() {
      const viewport = root.current
      const point = pointer.current
      const state = current.current
      if (viewport && point && state?.phase === "dragging") {
        const bounds = viewport.getBoundingClientRect()
        const list = findColumn(viewport, point)?.querySelector<HTMLElement>(
          BODY
        )
        const across = getKanbanScrollSpeed(point.x, bounds.left, bounds.right)
        let down = 0
        if (list) {
          const box = list.getBoundingClientRect()
          down = getKanbanScrollSpeed(point.y, box.top, box.bottom)
        }
        // Eases in, so brushing an edge on the way past doesn't throw the board.
        held = across || down ? Math.min(1, held + 0.04) : 0
        viewport.scrollLeft += across * held
        if (list) list.scrollTop += down * held

        const drop = locateDrop(viewport, point, state, grab.current)
        const old = state.target
        if (
          old?.columnId !== drop?.columnId ||
          old?.laneId !== drop?.laneId ||
          old?.index !== drop?.index ||
          old?.top !== drop?.top
        ) {
          update({
            ...state,
            target: drop && {
              ...drop,
              blocked:
                old &&
                old.columnId === drop.columnId &&
                old.laneId === drop.laneId
                  ? old.blocked
                  : blocked.current(state.id, drop),
            },
          })
        }

        // Leans into the travel and settles upright when the pointer rests.
        const wanted = Math.max(-2, Math.min(2, (point.x - lastX) * 0.35))
        tilt += (wanted - tilt) * 0.16
        lastX = point.x
        const card = viewport.ownerDocument.querySelector<HTMLElement>(
          "[data-slot=kanban-drag-overlay]"
        )
        if (card && !isStill) card.style.rotate = `${tilt.toFixed(2)}deg`
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [root, isDragging])

  function handleStart(
    id: string,
    point: BoardPointer,
    element: Element | null
  ) {
    const card =
      element ??
      root.current?.querySelector(`[data-kanban-id="${CSS.escape(id)}"]`)
    const column = card?.closest<HTMLElement>(COLUMN)
    const list = card?.closest<HTMLElement>(LIST)
    if (!(card instanceof HTMLElement) || !column || !list) return
    const box = card.getBoundingClientRect()
    const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0
    grab.current = {
      offsetX: point.x - box.left,
      offsetY: point.y - box.top,
      width: box.width,
      height: box.height,
    }
    pointer.current = point
    update({
      id,
      columnId: column.dataset.kanbanColumn ?? "",
      laneId: column.dataset.kanbanLane ?? null,
      index: Number(card.dataset.kanbanIndex),
      height: box.height,
      distance: box.height + gap,
      count: getCount(id),
      target: null,
      phase: "dragging",
    })
  }

  function handleEnd(point: BoardPointer | null) {
    const state = current.current
    if (!state) return
    const drop =
      point && root.current
        ? locateDrop(root.current, point, state, grab.current)
        : null
    // The overlay is still over the slot, so the board has to draw the card in
    // it before the landing measures where it is.
    flushSync(() => {
      const isMoved =
        !!drop &&
        onDrop(state.id, { ...drop, blocked: blocked.current(state.id, drop) })
      update({
        ...state,
        target: null,
        phase: isMoved ? "landing" : "cancelling",
      })
    })
  }

  async function land(overlay: Element) {
    const state = current.current
    const card = overlay.querySelector<HTMLElement>(
      "[data-slot=kanban-drag-overlay]"
    )
    const place = state
      ? root.current?.querySelector(
          `[data-kanban-id="${CSS.escape(state.id)}"]`
        )
      : null
    if (card) {
      const { duration, easing } = readMotion(card)
      // Solid again by the time it is the card in the column.
      card.dataset.landing = ""
      const from = card.getBoundingClientRect()
      const to = place?.getBoundingClientRect()
      const animation = card.animate(
        to
          ? {
              translate: [
                "0px 0px",
                `${to.left + to.width / 2 - from.left - from.width / 2}px ${to.top + to.height / 2 - from.top - from.height / 2}px`,
              ],
              rotate: [card.style.rotate || "0deg", "0deg"],
              scale: [getComputedStyle(card).scale, "1"],
            }
          : { opacity: [1, 0] },
        { duration, easing, fill: "forwards" }
      )
      await animation.finished.catch(() => undefined)
    }
    flushSync(() => update(null))
    pointer.current = null
  }

  return (
    <BoardDragProvider
      onStart={handleStart}
      onMove={(point) => {
        pointer.current = point
      }}
      onEnd={handleEnd}
      onLand={land}
      renderOverlay={(id) => renderOverlay(id, getCount(id))}
    >
      {children(drag)}
    </BoardDragProvider>
  )
}

export { KanbanDrag, type KanbanDragState, type KanbanDropTarget }
