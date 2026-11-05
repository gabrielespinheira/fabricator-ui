// Fabricator's motion tokens as React Native reads them: `useCSSVariable`
// hands back what the theme holds, so parse it here. No React Native imports,
// so these stay testable anywhere.

export type Bezier = readonly [number, number, number, number]

export type SurfaceSide = "top" | "right" | "bottom" | "left"
export type SurfaceAlign = "start" | "center" | "end"

const LINEAR: Bezier = [0, 0, 1, 1]

/** `cubic-bezier(0.23, 1, 0.32, 1)` as its four numbers. */
export function parseBezier(value: unknown): Bezier {
  if (typeof value !== "string") return LINEAR
  const match = /cubic-bezier\(([^)]+)\)/.exec(value)
  if (!match) return LINEAR
  const numbers = match[1].split(",").map(Number)
  if (numbers.length !== 4 || numbers.some(Number.isNaN)) return LINEAR
  return [numbers[0], numbers[1], numbers[2], numbers[3]]
}

/** A number from a token, however the theme wrote it: `250`, `"250ms"`, `"6px"`. */
export function parseNumber(value: unknown, fallback: number) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return fallback
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

/** Reduce Motion keeps the fade and drops the travel and the zoom. */
export function getSurfaceFrom(
  options: {
    scale?: number
    translateX?: number
    translateY?: number
    /** Off for a surface that only slides, as a toast does. */
    hasFade?: boolean
  },
  isReduced: boolean
) {
  return isReduced
    ? { opacity: 0, scale: 1, translateX: 0, translateY: 0 }
    : {
        opacity: options.hasFade === false ? 1 : 0,
        scale: options.scale ?? 1,
        translateX: options.translateX ?? 0,
        translateY: options.translateY ?? 0,
      }
}

const OPPOSITE_SIDE: Record<SurfaceSide, string> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
}

const ALIGN_ON_X: Record<SurfaceAlign, string> = {
  start: "left",
  center: "center",
  end: "right",
}

const ALIGN_ON_Y: Record<SurfaceAlign, string> = {
  start: "top",
  center: "center",
  end: "bottom",
}

/**
 * Where a popup grows from: the edge beside its trigger, along its alignment,
 * as the website's `origin-(--transform-origin)` does. Dialogs have no side and
 * grow from the centre.
 */
export function getSurfaceOrigin(
  side: SurfaceSide | undefined,
  align: SurfaceAlign | undefined
) {
  if (!side) return "center"
  const edge = OPPOSITE_SIDE[side]
  const along =
    side === "top" || side === "bottom"
      ? ALIGN_ON_X[align ?? "center"]
      : ALIGN_ON_Y[align ?? "center"]
  return `${edge} ${along}`
}

/** The slide from the trigger's side, for speeds that travel. */
export function getSurfaceTravel(
  side: SurfaceSide | undefined,
  distance: number
) {
  return {
    translateX: side === "right" ? -distance : side === "left" ? distance : 0,
    translateY: side === "bottom" ? -distance : side === "top" ? distance : 0,
  }
}
