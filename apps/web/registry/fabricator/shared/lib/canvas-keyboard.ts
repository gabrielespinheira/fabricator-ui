// The Canvas's keyboard: which key does what, which node an arrow key goes
// to, and how far a nudge moves. Arrows move focus between nodes by where
// they sit on screen; Alt (Option) with an arrow moves the selection. The
// same map drives a hardware keyboard on an iPad.

import { type CanvasRect } from "./canvas-model"

type CanvasDirection = "left" | "right" | "up" | "down"

type CanvasKeyAction =
  | { type: "focus"; direction: CanvasDirection }
  | { type: "move"; direction: CanvasDirection; isLarge: boolean }
  | {
      type:
        | "open"
        | "toggle-select"
        | "connect"
        | "delete"
        | "select-all"
        | "copy"
        | "cut"
        | "paste"
        | "duplicate"
        | "undo"
        | "redo"
        | "group"
        | "ungroup"
        | "zoom-in"
        | "zoom-out"
        | "zoom-reset"
        | "fit-view"
        | "search"
        | "menu"
        | "escape"
    }

type CanvasKeyInput = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

const ARROWS: Record<string, CanvasDirection> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
}

/** The action a key press asks for; null when the Canvas leaves it alone. */
function getCanvasKeyAction(
  input: CanvasKeyInput,
  { isMac }: { isMac: boolean }
): CanvasKeyAction | null {
  const command = isMac ? input.metaKey : input.ctrlKey
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key
  const direction = ARROWS[input.key]

  if (direction) {
    if (input.altKey)
      return { type: "move", direction, isLarge: input.shiftKey }
    if (command) return null
    return { type: "focus", direction }
  }
  if (command) {
    if (key === "z") return { type: input.shiftKey ? "redo" : "undo" }
    if (key === "y" && !isMac) return { type: "redo" }
    if (key === "a") return { type: "select-all" }
    if (key === "c") return { type: "copy" }
    if (key === "x") return { type: "cut" }
    if (key === "v") return { type: "paste" }
    if (key === "d") return { type: "duplicate" }
    if (key === "g") return { type: input.shiftKey ? "ungroup" : "group" }
    if (key === "k") return { type: "search" }
    if (key === "0") return { type: "zoom-reset" }
    if (key === "=" || key === "+") return { type: "zoom-in" }
    if (key === "-") return { type: "zoom-out" }
    return null
  }
  if (input.altKey) return null
  if (key === "ContextMenu" || (input.shiftKey && key === "F10"))
    return { type: "menu" }
  if (input.shiftKey && key === "!") return { type: "fit-view" }
  if (input.shiftKey && key === "1") return { type: "fit-view" }
  if (input.shiftKey) return null
  if (key === "Enter") return { type: "open" }
  if (key === " ") return { type: "toggle-select" }
  if (key === "c") return { type: "connect" }
  if (key === "/") return { type: "search" }
  if (key === "Delete" || key === "Backspace") return { type: "delete" }
  if (key === "Escape") return { type: "escape" }
  return null
}

function getCenter(rect: CanvasRect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/**
 * The node an arrow key lands on: the nearest whose centre lies in that
 * direction, within a 45° cone either side, with sideways distance counting
 * double so a node straight ahead beats a nearer one off to the side.
 */
function getNearestInDirection(
  from: CanvasRect,
  candidates: readonly { id: string; rect: CanvasRect }[],
  direction: CanvasDirection
): string | null {
  const origin = getCenter(from)
  let bestId: string | null = null
  let bestScore = Infinity
  for (const candidate of candidates) {
    const center = getCenter(candidate.rect)
    const dx = center.x - origin.x
    const dy = center.y - origin.y
    const ahead =
      direction === "right"
        ? dx
        : direction === "left"
          ? -dx
          : direction === "down"
            ? dy
            : -dy
    const side = direction === "left" || direction === "right" ? dy : dx
    if (ahead <= 0 || Math.abs(side) > ahead) continue
    const score = ahead + Math.abs(side) * 2
    if (score < bestScore) {
      bestScore = score
      bestId = candidate.id
    }
  }
  return bestId
}

/** How far a nudge moves: one grid step, ten with Shift. */
function getNudge(
  direction: CanvasDirection,
  isLarge: boolean,
  grid: number
): { x: number; y: number } {
  const step = (grid > 0 ? grid : 8) * (isLarge ? 10 : 1)
  if (direction === "left") return { x: -step, y: 0 }
  if (direction === "right") return { x: step, y: 0 }
  if (direction === "up") return { x: 0, y: -step }
  return { x: 0, y: step }
}

/** Whether a key press belongs to a text field the Canvas must not steal. */
function isTypingTarget(target: {
  tagName?: string
  isContentEditable?: boolean
}) {
  const tag = target.tagName?.toLowerCase()
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable === true
  )
}

export {
  getCanvasKeyAction,
  getNearestInDirection,
  getNudge,
  isTypingTarget,
  type CanvasDirection,
  type CanvasKeyAction,
  type CanvasKeyInput,
}
