"use client"

// The one drag-and-drop adapter. Tab Strip and App Nav import this file, never
// the library, so changing the library touches only this file.
//
// It wraps @dnd-kit/react for pointer sorting: neighbours slide aside, the
// list auto-scrolls, a cancelled drag snaps back. Keyboard reordering is the
// components' own (⌥⇧ arrows and menu actions), so the library's keyboard
// sensor and its ARIA plugin are left out: that plugin would make sortable
// wrappers focusable and relabel tabs and links as "draggable".
import * as React from "react"
import {
  CollisionPriority,
  CollisionType,
  type CollisionDetector,
} from "@dnd-kit/abstract"
import {
  RestrictToHorizontalAxis,
  RestrictToVerticalAxis,
} from "@dnd-kit/abstract/modifiers"
import {
  Accessibility,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable, useSortable } from "@dnd-kit/react/sortable"

export type SortableMove = {
  id: string
  fromGroup: string
  fromIndex: number
  toGroup: string
  toIndex: number
}

const DEFAULT_GROUP = "default"

const sensors = [
  PointerSensor.configure({
    // A mouse or pen drags after 4px of travel, so clicks stay clicks; touch
    // waits for a 250ms hold, so the list still scrolls under a finger.
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 4 })],
    // Rows are links and buttons; only parts marked to be ignored (a close
    // button, an actions menu) never start a drag.
    preventActivation: (event) =>
      event.target instanceof Element &&
      event.target.closest("[data-sortable-ignore]") !== null,
  }),
]

/**
 * How strongly a row is a drop target, or `null` when it isn't one: its own
 * place until the pointer crosses the centre of another row, then the farthest
 * row crossed.
 *
 * The library's default takes any row the pointer is inside. With rows of
 * different heights, swapping shifts a tall row so the pointer is still inside
 * it, and the two swap back and forth. After a swap here, the row crossed has
 * moved by the source's height, so the pointer is no longer past its centre.
 */
function getRowCollisionValue({
  pointerY,
  rowCenterY,
  rowIndex,
  sourceIndex,
}: {
  pointerY: number
  rowCenterY: number
  rowIndex: number
  sourceIndex: number
}) {
  if (rowIndex === sourceIndex) return 0
  const hasCrossed =
    rowIndex < sourceIndex ? pointerY <= rowCenterY : pointerY >= rowCenterY
  return hasCrossed ? Math.abs(rowIndex - sourceIndex) : null
}

// A detector's input is typed for any draggable, and `isSortable` takes only
// the DOM library's classes, so this reads the sortable's index structurally.
function getSortableIndex(element: object | null) {
  return element && "index" in element && typeof element.index === "number"
    ? element.index
    : null
}

const detectCrossedRow: CollisionDetector = ({ dragOperation, droppable }) => {
  const rowIndex = getSortableIndex(droppable)
  const sourceIndex = getSortableIndex(dragOperation.source)
  if (!droppable.shape || rowIndex === null || sourceIndex === null) return null
  const value = getRowCollisionValue({
    pointerY: dragOperation.position.current.y,
    rowCenterY: droppable.shape.center.y,
    rowIndex,
    sourceIndex,
  })
  if (value === null) return null
  return {
    id: droppable.id,
    value,
    type: CollisionType.Collision,
    priority: CollisionPriority.Normal,
  }
}

function SortableProvider({
  axis,
  onMove,
  onDraggingChange,
  children,
}: {
  /** Lock movement to one axis. */
  axis?: "x" | "y"
  /** Called once per drop that changed the order. */
  onMove: (move: SortableMove) => void
  onDraggingChange?: (isDragging: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DragDropProvider
      sensors={sensors}
      plugins={(defaults) =>
        defaults.filter((plugin) => plugin !== Accessibility)
      }
      modifiers={
        axis === "x"
          ? [RestrictToHorizontalAxis]
          : axis === "y"
            ? [RestrictToVerticalAxis]
            : []
      }
      onDragStart={() => onDraggingChange?.(true)}
      onDragEnd={(event) => {
        onDraggingChange?.(false)
        const { source } = event.operation
        if (event.canceled || !source || !isSortable(source)) return
        const move: SortableMove = {
          id: String(source.id),
          fromGroup: String(source.initialGroup ?? DEFAULT_GROUP),
          fromIndex: source.initialIndex,
          toGroup: String(source.group ?? DEFAULT_GROUP),
          toIndex: source.index,
        }
        if (
          move.fromGroup === move.toGroup &&
          move.fromIndex === move.toIndex
        ) {
          return
        }
        onMove(move)
      }}
    >
      {children}
    </DragDropProvider>
  )
}

/**
 * Makes an element sortable. Pass `attach` as the `ref` of the element that
 * moves. With `attachHandle` on a part of it, only that part starts a drag,
 * so sortable lists can nest (a row's children in its element).
 */
function useSortableItem({
  id,
  index,
  group = DEFAULT_GROUP,
  disabled = false,
  hasVariableHeight = false,
}: {
  id: string
  index: number
  group?: string
  disabled?: boolean
  /** The list's rows differ in height, such as rows with their children open. */
  hasVariableHeight?: boolean
}) {
  // Items only land among items of their own group. Moving into another
  // group re-parents the DOM node, which React can't follow; components
  // offer that move from a menu instead.
  const { ref, handleRef, isDragging, isDropping } = useSortable({
    id,
    index,
    group,
    type: group,
    accept: group,
    disabled,
    collisionDetector: hasVariableHeight ? detectCrossedRow : undefined,
  })
  return {
    attach: ref,
    attachHandle: handleRef,
    isDragging: isDragging || isDropping,
  }
}

export { getRowCollisionValue, SortableProvider, useSortableItem }
