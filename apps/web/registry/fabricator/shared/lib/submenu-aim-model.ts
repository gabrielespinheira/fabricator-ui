// Submenu aim, the "safe triangle": while the pointer heads for an open
// submenu, the rows it crosses on the way must not take over. Each move is
// checked against the triangle between the pointer and the submenu's near
// edge; a move inside it keeps the submenu, two misses in a row give the
// rows back. A pointer that rests is handled by the hook (SUBMENU_AIM_REST_MS).

export type AimPoint = { x: number; y: number }

export type AimRect = {
  top: number
  right: number
  bottom: number
  left: number
}

export type SubmenuSide = "left" | "right"

export type SubmenuAim = {
  isAiming: boolean
  /** Consecutive moves that missed the submenu. */
  misses: number
  /** Where the last counted move ended. */
  anchor: AimPoint | null
}

export const initialSubmenuAim: SubmenuAim = {
  isAiming: false,
  misses: 0,
  anchor: null,
}

// A pointer that stops inside the triangle has changed its mind: past this
// the row under it takes over. The same pause jQuery's menu-aim settled on.
export const SUBMENU_AIM_REST_MS = 300

// Moves shorter than this are sensor jitter, too short to give a direction.
const MIN_STEP = 3
// A hand drifts off the straight line a little.
const TOLERANCE = (10 * Math.PI) / 180
// A move this close to vertical is going to the next row, even when the
// submenu is so near that its corner is almost straight below.
const MAX_ANGLE = (80 * Math.PI) / 180
// One stray move (a wobble, a mouse that skips) keeps the aim.
const ALLOWED_MISSES = 2

export function getSubmenuSide(
  trigger: AimRect,
  submenu: AimRect
): SubmenuSide {
  return submenu.left >= (trigger.left + trigger.right) / 2 ? "right" : "left"
}

/** Whether the move from `from` to `to` points into the submenu's near edge. */
export function isMovingTowardSubmenu(
  from: AimPoint,
  to: AimPoint,
  submenu: AimRect,
  side: SubmenuSide
) {
  // Mirror a left submenu so the edge is always ahead on x.
  const direction = side === "right" ? 1 : -1
  const edge = side === "right" ? submenu.left : submenu.right
  const ahead = (edge - from.x) * direction
  if (ahead <= 0) return false
  const angle = Math.atan2(to.y - from.y, (to.x - from.x) * direction)
  const top = Math.max(
    Math.atan2(submenu.top - from.y, ahead) - TOLERANCE,
    -MAX_ANGLE
  )
  const bottom = Math.min(
    Math.atan2(submenu.bottom - from.y, ahead) + TOLERANCE,
    MAX_ANGLE
  )
  return angle >= top && angle <= bottom
}

export function stepSubmenuAim(
  aim: SubmenuAim,
  point: AimPoint,
  submenu: AimRect,
  side: SubmenuSide
): SubmenuAim {
  if (!aim.anchor) return { ...aim, anchor: point }
  const distance = Math.hypot(point.x - aim.anchor.x, point.y - aim.anchor.y)
  if (distance < MIN_STEP) return aim
  if (isMovingTowardSubmenu(aim.anchor, point, submenu, side)) {
    return { isAiming: true, misses: 0, anchor: point }
  }
  const misses = aim.misses + 1
  return {
    isAiming: aim.isAiming && misses < ALLOWED_MISSES,
    misses,
    anchor: point,
  }
}
