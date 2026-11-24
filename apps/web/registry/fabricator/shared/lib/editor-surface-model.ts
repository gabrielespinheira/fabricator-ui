// The arithmetic behind the web editing surface, kept out of the DOM code so
// it can be tested: where an offset falls among a block's text pieces, where
// the keyboard bar sits over a phone's virtual keyboard, where a bar or menu
// opens so nothing crops it, and which toolbar controls fit.

/** One piece of a block's text in the DOM: a text node, a line break, or a placeholder (0). */
type EditorSegment = { length: number }

function getSegmentStart(segments: readonly EditorSegment[], index: number) {
  let start = 0
  for (let position = 0; position < index; position += 1) {
    start += segments[position].length
  }
  return start
}

/**
 * The segment an offset falls in. At a boundary it prefers the end of the
 * segment before, so a caret after "abc" stays in "abc" instead of jumping
 * into the next node.
 */
function getSegmentAtOffset(
  segments: readonly EditorSegment[],
  offset: number
): { index: number; offset: number } | null {
  if (segments.length === 0) return null
  let start = 0
  let last: { index: number; offset: number } | null = null
  for (const [index, segment] of segments.entries()) {
    if (segment.length === 0) continue
    const end = start + segment.length
    if (offset <= end) return { index, offset: Math.max(offset - start, 0) }
    last = { index, offset: segment.length }
    start = end
  }
  return last ?? { index: 0, offset: 0 }
}

/** Shorter than this, the viewport shrank for something other than a keyboard. */
const KEYBOARD_MIN_HEIGHT = 120

/**
 * Where the keyboard bar goes: on top of the virtual keyboard, which is the
 * part of the layout viewport below the visual one. Hidden without focus,
 * because iOS 26 leaves `visualViewport.offsetTop` stale after the keyboard
 * closes.
 */
function getKeyboardBarLayout({
  isFocused,
  layoutHeight,
  viewportHeight,
  viewportOffsetTop,
}: {
  isFocused: boolean
  layoutHeight: number
  viewportHeight: number
  viewportOffsetTop: number
}) {
  if (!isFocused) return { isVisible: false, bottom: 0 }
  const bottom = Math.max(layoutHeight - viewportHeight - viewportOffsetTop, 0)
  if (bottom < KEYBOARD_MIN_HEIGHT) return { isVisible: false, bottom: 0 }
  return { isVisible: true, bottom }
}

function getShortcutPlatform(platform: string): "apple" | "other" {
  return /mac|iphone|ipad|ipod/i.test(platform) ? "apple" : "other"
}

type SurfaceRect = {
  left: number
  top: number
  right: number
  bottom: number
}

/** The part two rects share, or null. A caret's rect has no width and counts. */
function intersectRects(
  first: SurfaceRect,
  second: SurfaceRect
): SurfaceRect | null {
  const left = Math.max(first.left, second.left)
  const top = Math.max(first.top, second.top)
  const right = Math.min(first.right, second.right)
  const bottom = Math.min(first.bottom, second.bottom)
  if (right < left || bottom < top) return null
  return { left, top, right, bottom }
}

type FloatingSide = "top" | "bottom"
type FloatingAlign = "start" | "center" | "end"

/** A menu shorter than this is worse than one over its trigger. */
const SHRUNK_MIN_HEIGHT = 120

const OPPOSITE_SIDE = { top: "bottom", bottom: "top" } as const

/** `value` from `min` to `max`, at `min` when they cross. */
function clamp(value: number, min: number, max: number) {
  return Math.max(Math.min(value, max), min)
}

/**
 * Where a bar or menu opens beside its anchor. `limits` are the boxes it
 * should stay in, best first (the editor); it never leaves the `screen`. On
 * each axis it uses the first of them it fits: it flips sides, slides
 * sideways, shrinks when it can scroll (`canShrink`), and only then covers
 * its anchor.
 */
function getFloatingLayout({
  anchor,
  size,
  limits,
  screen,
  side: preferredSide,
  align,
  gap,
  canShrink = false,
}: {
  anchor: SurfaceRect
  size: { width: number; height: number }
  limits: readonly SurfaceRect[]
  screen: SurfaceRect
  side: FloatingSide
  align: FloatingAlign
  gap: number
  canShrink?: boolean
}): {
  left: number
  top: number
  side: FloatingSide
  maxWidth: number
  maxHeight: number
} {
  const boxes = [...limits, screen]
  const maxWidth = screen.right - screen.left
  const screenHeight = screen.bottom - screen.top
  const width = Math.min(size.width, maxWidth)

  const row = boxes.find((box) => box.right - box.left >= width) ?? screen
  const alignedLeft = {
    start: anchor.left,
    center: (anchor.left + anchor.right - width) / 2,
    end: anchor.right - width,
  }[align]
  const left = clamp(alignedLeft, row.left, row.right - width)

  const getRoom = (box: SurfaceRect, side: FloatingSide) =>
    side === "top"
      ? anchor.top - gap - box.top
      : box.bottom - gap - anchor.bottom
  const getTop = (side: FloatingSide, height: number) =>
    side === "top" ? anchor.top - gap - height : anchor.bottom + gap
  const sides = [preferredSide, OPPOSITE_SIDE[preferredSide]] as const

  for (const box of boxes) {
    const side = sides.find((option) => getRoom(box, option) >= size.height)
    if (!side) continue
    const top = getTop(side, size.height)
    return { left, top, side, maxWidth, maxHeight: screenHeight }
  }

  const [first, second] = sides
  const side = getRoom(screen, second) > getRoom(screen, first) ? second : first
  const room = getRoom(screen, side)
  if (canShrink && room >= SHRUNK_MIN_HEIGHT) {
    return { left, top: getTop(side, room), side, maxWidth, maxHeight: room }
  }

  const height = Math.min(size.height, screenHeight)
  const column = boxes.find((box) => box.bottom - box.top >= height) ?? screen
  const top = clamp(getTop(side, height), column.top, column.bottom - height)
  return { left, top, side, maxWidth, maxHeight: screenHeight }
}

/** A toolbar's control, by its offsets along the row. */
type ToolbarItem = {
  /** Commands can move to the More menu; any other control always shows. */
  kind: "command" | "control" | "separator"
  start: number
  end: number
}

/**
 * Which items to hide so the rest fits: none when the whole row does, or the
 * commands from the first one that doesn't fit beside the More button. Other
 * controls keep their place, and a separator needs an item on both sides.
 */
function getToolbarFit({
  items,
  available,
  availableWithMore,
}: {
  items: readonly ToolbarItem[]
  available: number
  availableWithMore: number
}): boolean[] {
  const last = items[items.length - 1]
  if (!last || last.end <= available) return items.map(() => false)

  const advances = items.map(
    (item, index) => item.end - (items[index - 1]?.end ?? 0)
  )
  // A control always shows, and so does the separator before it.
  const isKept = items.map(
    (item, index) =>
      item.kind === "control" ||
      (item.kind === "separator" && items[index + 1]?.kind === "control")
  )
  let reserved = advances.reduce(
    (sum, advance, index) => (isKept[index] ? sum + advance : sum),
    0
  )
  let used = 0
  let isCut = false
  const isHidden = items.map((item, index) => {
    if (isKept[index]) {
      reserved -= advances[index]
      used += advances[index]
      return false
    }
    if (item.kind === "separator") {
      if (!isCut) used += advances[index]
      return false
    }
    isCut = isCut || used + advances[index] + reserved > availableWithMore
    if (!isCut) used += advances[index]
    return isCut
  })

  let isSeparated = true
  let pending: number | null = null
  for (const [index, item] of items.entries()) {
    if (item.kind === "separator") {
      isHidden[index] = true
      if (!isSeparated) pending = index
      isSeparated = true
      continue
    }
    if (isHidden[index]) continue
    if (pending !== null) isHidden[pending] = false
    pending = null
    isSeparated = false
  }
  return isHidden
}

export {
  getFloatingLayout,
  getKeyboardBarLayout,
  getSegmentAtOffset,
  getSegmentStart,
  getShortcutPlatform,
  getToolbarFit,
  intersectRects,
}
export type {
  EditorSegment,
  FloatingAlign,
  FloatingSide,
  SurfaceRect,
  ToolbarItem,
}
