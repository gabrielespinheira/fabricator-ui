// Pan and zoom for the Canvas: converting between the screen and the
// canvas, fitting content, zooming about a point, which nodes are in view,
// and how much detail a node shows at a zoom. Native runs the conversions
// on the UI thread during gestures, so they are worklets.

import {
  getNodeRect,
  indexNodes,
  type CanvasNode,
  type CanvasPosition,
  type CanvasRect,
  type CanvasSize,
  type CanvasViewport,
} from "./canvas-model"

const DEFAULT_MIN_ZOOM = 0.1
const DEFAULT_MAX_ZOOM = 2

/** The stops the zoom buttons and keys move between. */
const ZOOM_STOPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const

/** Below this zoom a node drops its content and keeps its header. */
const COMPACT_ZOOM = 0.5
/** Below this zoom a node is a coloured block with its title. */
const OUTLINE_ZOOM = 0.25

type CanvasLevelOfDetail = "full" | "compact" | "outline"

/** A share of the frame (0.08), a percentage ("8%") or pixels ("24px"). */
type CanvasPaddingValue = number | `${number}%` | `${number}px`

type CanvasPadding =
  | CanvasPaddingValue
  | {
      top?: CanvasPaddingValue
      right?: CanvasPaddingValue
      bottom?: CanvasPaddingValue
      left?: CanvasPaddingValue
    }

type CanvasFitOptions = {
  /** Space kept around the content; per side to clear panels. */
  padding?: CanvasPadding
  minZoom?: number
  maxZoom?: number
}

function clamp(value: number, min: number, max: number) {
  "worklet"
  return Math.min(max, Math.max(min, value))
}

function screenToCanvas(
  point: CanvasPosition,
  viewport: CanvasViewport
): CanvasPosition {
  "worklet"
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  }
}

function canvasToScreen(
  point: CanvasPosition,
  viewport: CanvasViewport
): CanvasPosition {
  "worklet"
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  }
}

/** Zooms to `zoom` keeping the canvas point under `anchor` (screen) still. */
function zoomAt(
  viewport: CanvasViewport,
  zoom: number,
  anchor: CanvasPosition,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM
): CanvasViewport {
  "worklet"
  const next = clamp(zoom, minZoom, maxZoom)
  const point = screenToCanvas(anchor, viewport)
  return {
    x: anchor.x - point.x * next,
    y: anchor.y - point.y * next,
    zoom: next,
  }
}

function resolvePaddingValue(
  value: CanvasPaddingValue | undefined,
  length: number
) {
  if (value === undefined) return length * 0.08
  if (typeof value === "number") return length * value
  const amount = Number.parseFloat(value)
  return value.endsWith("%") ? (length * amount) / 100 : amount
}

function resolvePadding(padding: CanvasPadding | undefined, size: CanvasSize) {
  const sides =
    typeof padding === "object"
      ? padding
      : { top: padding, right: padding, bottom: padding, left: padding }
  return {
    top: resolvePaddingValue(sides.top, size.height),
    right: resolvePaddingValue(sides.right, size.width),
    bottom: resolvePaddingValue(sides.bottom, size.height),
    left: resolvePaddingValue(sides.left, size.width),
  }
}

/** The viewport that shows `bounds` whole and centred in a frame of `size`. */
function getViewportForBounds(
  bounds: CanvasRect,
  size: CanvasSize,
  {
    padding,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
  }: CanvasFitOptions = {}
): CanvasViewport {
  const space = resolvePadding(padding, size)
  const width = Math.max(1, size.width - space.left - space.right)
  const height = Math.max(1, size.height - space.top - space.bottom)
  const zoom = clamp(
    Math.min(
      width / Math.max(1, bounds.width),
      height / Math.max(1, bounds.height)
    ),
    minZoom,
    maxZoom
  )
  // Centred in the space the padding leaves.
  const centerX = space.left + width / 2
  const centerY = space.top + height / 2
  return {
    x: Math.round(centerX - (bounds.x + bounds.width / 2) * zoom),
    y: Math.round(centerY - (bounds.y + bounds.height / 2) * zoom),
    zoom,
  }
}

/** The part of the canvas the frame shows. */
function getVisibleRect(
  viewport: CanvasViewport,
  size: CanvasSize
): CanvasRect {
  "worklet"
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  }
}

function isOverlapping(a: CanvasRect, b: CanvasRect) {
  "worklet"
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * The nodes in view plus a margin of screen pixels, for culling. A node not
 * measured yet counts as visible, so it gets measured.
 */
function getVisibleNodeIds(
  nodes: readonly CanvasNode[],
  viewport: CanvasViewport,
  size: CanvasSize,
  margin = 200
): Set<string> {
  const visible = getVisibleRect(viewport, size)
  const outer = margin / viewport.zoom
  const area = {
    x: visible.x - outer,
    y: visible.y - outer,
    width: visible.width + outer * 2,
    height: visible.height + outer * 2,
  }
  const nodesById = indexNodes(nodes)
  const ids = new Set<string>()
  for (const node of nodes) {
    if (node.hidden) continue
    const rect = getNodeRect(node, nodesById)
    if (rect.width === 0 || isOverlapping(area, rect)) ids.add(node.id)
  }
  return ids
}

/** The next zoom stop in a direction from the current zoom. */
function getNextZoom(
  zoom: number,
  direction: "in" | "out",
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM
) {
  const epsilon = 0.001
  const stop =
    direction === "in"
      ? ZOOM_STOPS.find((value) => value > zoom + epsilon)
      : [...ZOOM_STOPS].reverse().find((value) => value < zoom - epsilon)
  return clamp(stop ?? zoom, minZoom, maxZoom)
}

function getLevelOfDetail(zoom: number): CanvasLevelOfDetail {
  "worklet"
  if (zoom < OUTLINE_ZOOM) return "outline"
  if (zoom < COMPACT_ZOOM) return "compact"
  return "full"
}

/**
 * The smallest pan that brings `rect` into view with a margin, keeping the
 * zoom. Returns the same viewport when it's already in view.
 */
function getViewportToReveal(
  rect: CanvasRect,
  viewport: CanvasViewport,
  size: CanvasSize,
  margin = 48
): CanvasViewport {
  const screen = {
    ...canvasToScreen(rect, viewport),
    width: rect.width * viewport.zoom,
    height: rect.height * viewport.zoom,
  }
  let dx = 0
  let dy = 0
  if (screen.x < margin) dx = margin - screen.x
  else if (screen.x + screen.width > size.width - margin)
    dx = Math.max(
      size.width - margin - (screen.x + screen.width),
      margin - screen.x
    )
  if (screen.y < margin) dy = margin - screen.y
  else if (screen.y + screen.height > size.height - margin)
    dy = Math.max(
      size.height - margin - (screen.y + screen.height),
      margin - screen.y
    )
  if (dx === 0 && dy === 0) return viewport
  return { x: viewport.x + dx, y: viewport.y + dy, zoom: viewport.zoom }
}

/**
 * How fast to pan while a drag nears an edge: zero outside `edge` px from it,
 * rising to `speed` px per frame at the edge. Positive pans the content right
 * and down, so the canvas scrolls towards the pointer.
 */
function getAutoPanVelocity(
  pointer: CanvasPosition,
  size: CanvasSize,
  edge = 40,
  speed = 12
): CanvasPosition {
  "worklet"
  const axis = (value: number, length: number) => {
    if (value < edge) return ((edge - Math.max(0, value)) / edge) * speed
    if (value > length - edge)
      return -((Math.min(length, value) - (length - edge)) / edge) * speed
    return 0
  }
  return { x: axis(pointer.x, size.width), y: axis(pointer.y, size.height) }
}

/**
 * A motion token's length in ms, stretched by `--motion-scale`. The
 * minified stylesheet writes 250ms as .25s, so the unit is read.
 */
function getMotionDuration(duration: string, scale: string) {
  const value = Number.parseFloat(duration)
  if (!Number.isFinite(value)) return 0
  const milliseconds = duration.trim().endsWith("ms") ? value : value * 1000
  const factor = Number.parseFloat(scale)
  return milliseconds * (Number.isFinite(factor) ? factor : 1)
}

export {
  canvasToScreen,
  clamp,
  COMPACT_ZOOM,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  getAutoPanVelocity,
  getLevelOfDetail,
  getMotionDuration,
  getNextZoom,
  getViewportForBounds,
  getViewportToReveal,
  getVisibleNodeIds,
  getVisibleRect,
  isOverlapping,
  OUTLINE_ZOOM,
  screenToCanvas,
  ZOOM_STOPS,
  zoomAt,
  type CanvasFitOptions,
  type CanvasLevelOfDetail,
  type CanvasPadding,
  type CanvasPaddingValue,
}
