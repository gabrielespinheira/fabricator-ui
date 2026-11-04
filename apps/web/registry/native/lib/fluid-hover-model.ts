export type Rect = { top: number; left: number; width: number; height: number }

export function sameRect(a: Rect | null, b: Rect | null) {
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
  return Boolean(previous && next)
}
