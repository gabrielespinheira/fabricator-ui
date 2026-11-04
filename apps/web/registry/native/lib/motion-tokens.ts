// Fabricator's motion tokens as React Native reads them: `useCSSVariable`
// hands back what the theme holds, so parse it here. No React Native imports,
// so these stay testable anywhere.

export type Bezier = readonly [number, number, number, number]

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
  options: { scale?: number; translateY?: number },
  isReduced: boolean
) {
  return isReduced
    ? { opacity: 0, scale: 1, translateY: 0 }
    : {
        opacity: 0,
        scale: options.scale ?? 1,
        translateY: options.translateY ?? 0,
      }
}
