// The Sidebar's plain data and rules, so the web and React Native draw and move
// the same: the toggle's glyph, and the phone sidebar's reveal, where the page
// moves aside and shrinks to uncover the sidebar behind it. No DOM.

/**
 * The toggle's glyph, in a 24 by 24 box: a filled frame with the sidebar drawn
 * inside it in the page colour. The sidebar widens when it is open; both shapes
 * use the same commands, so one morphs into the other.
 */
export const TOGGLE_GLYPH = {
  frame:
    "M11 3H13C16.7712 3 18.6569 3 19.8284 4.17157C21 5.34315 21 7.22876 21 11V13C21 16.7712 21 18.6569 19.8284 19.8284C18.6569 21 16.7712 21 13 21H11C7.2288 21 5.3431 21 4.1716 19.8284C3 18.6569 3 16.7712 3 13V11C3 7.22876 3 5.34315 4.1716 4.17157C5.3431 3 7.2288 3 11 3Z",
  panelClosed:
    "M10 5.5 C10 4.793 10 4.439 9.780 4.220 C9.560 4 9.207 4 8.5 4 H8.5 C6.379 4 5.318 4 4.659 4.659 C4 5.318 4 6.379 4 8.5 V15.5 C4 17.621 4 18.682 4.659 19.341 C5.318 20 6.379 20 8.5 20 H8.5 C9.207 20 9.561 20 9.780 19.780 C10 19.561 10 19.207 10 18.5 V5.5 Z",
  panelOpen:
    "M14 6 C14 5.057 14 4.586 13.707 4.293 C13.414 4 12.943 4 12 4 H10 C7.172 4 5.757 4 4.879 4.879 C4 5.757 4 7.172 4 10 V14 C4 16.828 4 18.243 4.879 19.121 C5.757 20 7.172 20 10 20 H12 C12.943 20 13.414 20 13.707 19.707 C14 19.414 14 18.943 14 18 V6 Z",
}

/** The glyph's size as a multiple of the button's 16 icon step. */
export const TOGGLE_GLYPH_SCALE = 1.125

const PATH_NUMBER = /-?\d*\.?\d+/g

/** The sidebar's shape between closed (0) and open (1). */
export function getToggleGlyphPanel(progress: number) {
  if (progress <= 0) return TOGGLE_GLYPH.panelClosed
  if (progress >= 1) return TOGGLE_GLYPH.panelOpen
  const targets = TOGGLE_GLYPH.panelOpen.match(PATH_NUMBER) ?? []
  let index = 0
  return TOGGLE_GLYPH.panelClosed.replace(PATH_NUMBER, (match) => {
    const from = Number(match)
    const to = Number(targets[index++] ?? match)
    return String(Math.round((from + (to - from) * progress) * 1000) / 1000)
  })
}

/** How small the page gets while the sidebar is open. */
export const REVEAL_SCALE = 0.88

/**
 * How much of the page stays in view beside the revealed sidebar, in px: enough
 * to tap or drag it back, so the sidebar gets the rest of the screen.
 */
export const REVEAL_PAGE = 72

/**
 * The page's corners while it's aside, in px: a screen's, as iOS draws a card of
 * one, so it reads as the app moved aside rather than a panel.
 */
export const REVEAL_RADIUS = 48

/** A flick faster than this decides the drag by itself, in px per ms. */
const FLICK_VELOCITY = 0.5

/** A finger that rests this long before lifting isn't flicking, in ms. */
const FLICK_WINDOW = 100

/** How much of the open distance a drag has to keep to stay open. */
const STAY_OPEN_PROGRESS = 0.6

/** How far the page moves, and how wide the sidebar is: the screen but a strip. */
export function getRevealWidth(screenWidth: number) {
  return screenWidth - REVEAL_PAGE
}

/** Open is 1, closed is 0. `deltaX` is negative towards closed. */
export function getRevealDragProgress({
  deltaX,
  width,
}: {
  deltaX: number
  width: number
}) {
  return Math.max(0, Math.min(1, 1 + deltaX / width))
}

/** Where a released drag settles. `velocity` is negative towards closed. */
export function shouldRevealStayOpen({
  progress,
  velocity,
  restedFor = 0,
}: {
  progress: number
  velocity: number
  /** How long the finger had stopped before lifting, in ms. */
  restedFor?: number
}) {
  const isFlick =
    restedFor < FLICK_WINDOW && Math.abs(velocity) > FLICK_VELOCITY
  if (isFlick) return velocity > 0
  return progress >= STAY_OPEN_PROGRESS
}
