// Snapping while a node moves: to the grid, and to the edges and centres of
// the nodes around it, with the guide lines that show what it snapped to.
// Native calls these from the drag worklet.

import { type CanvasPosition, type CanvasRect } from "./canvas-model"

type CanvasGuide = {
  orientation: "vertical" | "horizontal"
  /** x for a vertical line, y for a horizontal one, on the canvas. */
  position: number
  /** Where the line starts and ends along its length. */
  from: number
  to: number
}

type CanvasSnap = {
  position: CanvasPosition
  guides: CanvasGuide[]
}

function snapToGrid(position: CanvasPosition, grid: number): CanvasPosition {
  "worklet"
  if (grid <= 0) return position
  return {
    x: Math.round(position.x / grid) * grid,
    y: Math.round(position.y / grid) * grid,
  }
}

type AxisMatch = { delta: number; line: number; other: CanvasRect }

function getAxisLines(rect: CanvasRect, axis: "x" | "y") {
  "worklet"
  const start = axis === "x" ? rect.x : rect.y
  const length = axis === "x" ? rect.width : rect.height
  return [start, start + length / 2, start + length]
}

function findAxisMatch(
  moving: CanvasRect,
  others: readonly CanvasRect[],
  axis: "x" | "y",
  threshold: number
): AxisMatch | null {
  "worklet"
  let best: AxisMatch | null = null
  const movingLines = getAxisLines(moving, axis)
  for (const other of others) {
    const otherLines = getAxisLines(other, axis)
    for (const line of movingLines) {
      for (const target of otherLines) {
        const delta = target - line
        if (Math.abs(delta) > threshold) continue
        if (!best || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, line: target, other }
        }
      }
    }
  }
  return best
}

/**
 * Where a moving rect lands: aligned to a neighbour's edge or centre within
 * `threshold` (canvas units) on each axis, else on the grid when one is set.
 * Only the nearest `others` matter, so pass the nodes in view.
 */
function getSnap(
  moving: CanvasRect,
  others: readonly CanvasRect[],
  { threshold = 6, grid = 0 }: { threshold?: number; grid?: number } = {}
): CanvasSnap {
  "worklet"
  const gridded = grid > 0 ? snapToGrid(moving, grid) : moving
  const matchX = findAxisMatch(moving, others, "x", threshold)
  const matchY = findAxisMatch(moving, others, "y", threshold)
  const position = {
    x: matchX ? moving.x + matchX.delta : gridded.x,
    y: matchY ? moving.y + matchY.delta : gridded.y,
  }
  const guides: CanvasGuide[] = []
  if (matchX) {
    const top = Math.min(position.y, matchX.other.y)
    const bottom = Math.max(
      position.y + moving.height,
      matchX.other.y + matchX.other.height
    )
    guides.push({
      orientation: "vertical",
      position: matchX.line,
      from: top,
      to: bottom,
    })
  }
  if (matchY) {
    const left = Math.min(position.x, matchY.other.x)
    const right = Math.max(
      position.x + moving.width,
      matchY.other.x + matchY.other.width
    )
    guides.push({
      orientation: "horizontal",
      position: matchY.line,
      from: left,
      to: right,
    })
  }
  return { position, guides }
}

export { getSnap, snapToGrid, type CanvasGuide, type CanvasSnap }
