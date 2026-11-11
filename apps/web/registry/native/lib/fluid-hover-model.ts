// What Fluid Hover does under a finger. No React Native imports, so it stays
// testable anywhere; the "worklet" directive lets a gesture run it on the UI
// thread.

export type Rect = { top: number; left: number; width: number; height: number }

export type FluidAxis = "x" | "y" | "xy"

export type FluidRow = { key: string; rect: Rect; disabled?: boolean }

type Point = { x: number; y: number }

/** Only the old and new row need to redraw when the highlight moves. */
export function createFluidHoverStore() {
  let key: string | null = null
  const listeners = new Map<string, Set<() => void>>()
  return {
    get: () => key,
    set(next: string | null) {
      if (key === next) return
      const previous = key
      key = next
      if (previous !== null)
        listeners.get(previous)?.forEach((notify) => notify())
      if (next !== null) listeners.get(next)?.forEach((notify) => notify())
    },
    subscribe(row: string, listener: () => void) {
      let subscribers = listeners.get(row)
      if (!subscribers) {
        subscribers = new Set()
        listeners.set(row, subscribers)
      }
      subscribers.add(listener)
      return () => {
        subscribers.delete(listener)
        if (subscribers.size === 0 && listeners.get(row) === subscribers)
          listeners.delete(row)
      }
    },
  }
}

export function sameRect(a: Rect | null, b: Rect | null) {
  "worklet"
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.top === b.top &&
      a.left === b.left &&
      a.width === b.width &&
      a.height === b.height)
  )
}

/** Should the overlay slide, or appear in place? It only slides between rows. */
export function shouldGlide(previous: Rect | null, next: Rect | null) {
  "worklet"
  return Boolean(previous && next)
}

/**
 * The row to light for a finger. Grids take the row under it, else the nearest
 * centre. Lists and strips measure along their axis, so the gaps between rows
 * stay lit; when a strip wraps, the row under the finger comes first, so rows
 * stacked in other lines never win. The website's `pickNearest`, on plain rects.
 */
export function pickNearestRow(
  rows: FluidRow[],
  point: Point,
  axis: FluidAxis
) {
  "worklet"
  let best: string | null = null
  let bestLine = Infinity
  let bestInside = Infinity
  let bestCentre = Infinity
  for (const row of rows) {
    if (row.disabled) continue
    const { top, left, width, height } = row.rect
    const gapX = Math.max(left - point.x, 0, point.x - (left + width))
    const gapY = Math.max(top - point.y, 0, point.y - (top + height))
    const toCentreX = Math.abs(point.x - (left + width / 2))
    const toCentreY = Math.abs(point.y - (top + height / 2))
    const line = axis === "xy" ? 0 : axis === "x" ? gapY : gapX
    const along = axis === "x" ? gapX : gapY
    const inside = (axis === "xy" ? gapX === 0 && gapY === 0 : along === 0)
      ? 0
      : 1
    const centre =
      axis === "xy"
        ? Math.hypot(toCentreX, toCentreY)
        : axis === "x"
          ? toCentreX
          : toCentreY
    if (
      line < bestLine ||
      (line === bestLine &&
        (inside < bestInside || (inside === bestInside && centre < bestCentre)))
    ) {
      best = row.key
      bestLine = line
      bestInside = inside
      bestCentre = centre
    }
  }
  return best
}

/** Whether a finger is still over the rows, or within `slop` of them. */
export function isNearRows(rows: FluidRow[], point: Point, slop: number) {
  "worklet"
  if (rows.length === 0) return false
  let top = Infinity
  let left = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const { rect } of rows) {
    top = Math.min(top, rect.top)
    left = Math.min(left, rect.left)
    right = Math.max(right, rect.left + rect.width)
    bottom = Math.max(bottom, rect.top + rect.height)
  }
  return (
    point.x >= left - slop &&
    point.x <= right + slop &&
    point.y >= top - slop &&
    point.y <= bottom + slop
  )
}

/**
 * How long a released highlight stays. A finger has no hover before it, so a
 * quick tap would fade out before it had faded in: it holds until it's been seen.
 */
export function getFadeOutDelay(pressedFor: number, holdFor: number) {
  return Math.max(0, holdFor - pressedFor)
}
