// What a sheet does under a finger. No React Native imports, so it stays testable
// anywhere; the "worklet" directive lets the gesture run it on the UI thread.

export type SheetSide = "top" | "right" | "bottom" | "left"
export type SwipeDirection = "up" | "right" | "down" | "left"

// The website's drawer dismisses at these: half its size, or a flick of 0.5pt/ms.
const DISMISS_FRACTION = 0.5
const MIN_DISMISS_DISTANCE = 10
const FLICK_VELOCITY = 500

const MIN_RELEASE_SCALE = 0.1

// Pulling a sheet past open gives way less and less, up to this far.
const MAX_OVERDRAG = 40
const OVERDRAG_SOFTNESS = 120

// The shadow ring is drawn outside the panel; this keeps it off screen too.
const CLOSED_MARGIN = 24

const SWIPE_SIDES: Record<SwipeDirection, SheetSide> = {
  up: "top",
  right: "right",
  down: "bottom",
  left: "left",
}

/** The side a Drawer sits on: it swipes away toward its own edge. */
export function getSideForSwipe(direction: SwipeDirection) {
  return SWIPE_SIDES[direction]
}

export function getSwipeAxis(side: SheetSide): "x" | "y" {
  "worklet"
  return side === "top" || side === "bottom" ? "y" : "x"
}

/** The sign of a movement toward the edge the sheet closes against. */
function getClosingSign(side: SheetSide) {
  "worklet"
  return side === "bottom" || side === "right" ? 1 : -1
}

/** Where a sheet of this size rests when it's closed. */
export function getClosedOffset(side: SheetSide, size: number) {
  "worklet"
  return getClosingSign(side) * (size + CLOSED_MARGIN)
}

/** Where the panel sits for a finger this far from where it started. */
export function getDragOffset(side: SheetSide, translation: number) {
  "worklet"
  const sign = getClosingSign(side)
  const distance = translation * sign
  if (distance >= 0) return sign * distance
  return -sign * MAX_OVERDRAG * (1 - 1 / (1 - distance / OVERDRAG_SOFTNESS))
}

/**
 * Whether letting go dismisses the sheet. `translation` and `velocity` are the
 * gesture's own, on the sheet's axis; `size` is the panel's along it.
 */
export function shouldDismissSheet({
  side,
  size,
  translation,
  velocity,
}: {
  side: SheetSide
  size: number
  translation: number
  velocity: number
}) {
  "worklet"
  if (size <= 0) return false
  const sign = getClosingSign(side)
  const distance = translation * sign
  const speed = velocity * sign
  if (distance <= 0 || speed <= -FLICK_VELOCITY) return false
  if (speed >= FLICK_VELOCITY) return true
  return distance >= Math.max(size * DISMISS_FRACTION, MIN_DISMISS_DISTANCE)
}

/**
 * How long a released sheet takes to leave: the harder the flick, the quicker,
 * so it carries the finger's speed. Never longer than the role's own timing.
 */
export function getDismissDuration({
  remaining,
  velocity,
  duration,
}: {
  remaining: number
  velocity: number
  duration: number
}) {
  "worklet"
  if (velocity <= 0) return duration
  const flight = (remaining / velocity) * 1000
  return Math.min(duration, Math.max(flight, duration * MIN_RELEASE_SCALE))
}
