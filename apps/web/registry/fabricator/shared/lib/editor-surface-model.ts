// The arithmetic behind the web editing surface, kept out of the DOM code so
// it can be tested: where an offset falls among a block's text pieces, and
// where the keyboard bar sits over a phone's virtual keyboard.

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

export {
  getKeyboardBarLayout,
  getSegmentAtOffset,
  getSegmentStart,
  getShortcutPlatform,
}
export type { EditorSegment }
