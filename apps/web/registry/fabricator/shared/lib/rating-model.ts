// The values Rating shares on the web and React Native. A value runs from 0
// to max in steps of `step` (1 or 0.5); a read-only rating may show any
// fraction, such as 4.3.

export type RatingStep = 0.5 | 1

/** Where one star sits along the row, in px from the row's start. */
export type RatingStarSpan = { start: number; end: number }

export type RatingKeyOptions = { step: RatingStep; max: number }

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** A value rounded to the step and kept within 0 and max. */
export function snapRatingValue(value: number, step: RatingStep, max: number) {
  return clamp(Math.round(value / step) * step, max)
}

/**
 * The value a point along the row picks: the star under it, its left half
 * for half a star in half steps. A gap counts as the star before it, before
 * the first star is 0, past the last is every star.
 */
export function getRatingValueAtPoint(
  point: number,
  stars: readonly RatingStarSpan[],
  step: RatingStep
) {
  const first = stars[0]
  if (!first || point < first.start) return 0
  const index = stars.findIndex((star) => point < star.end)
  if (index === -1) return stars.length
  const star = stars[index]
  if (point < star.start) return index
  const isLeftHalf = point - star.start <= (star.end - star.start) / 2
  return step === 0.5 && isLeftHalf ? index + 0.5 : index + 1
}

/** How much of the star at `index` the value fills, from 0 to 1. */
export function getRatingStarFill(index: number, value: number) {
  return Math.min(1, Math.max(0, value - index))
}

/**
 * The value a key moves to (the WAI-ARIA slider keys, plus a digit for a
 * whole value), or null for a key the rating doesn't handle.
 */
export function getRatingKeyValue(
  key: string,
  value: number,
  { step, max }: RatingKeyOptions
) {
  const current = snapRatingValue(value, step, max)
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(current + step, max)
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(current - step, max)
    case "PageUp":
      return clamp(current + 1, max)
    case "PageDown":
      return clamp(current - 1, max)
    case "Home":
      return 0
    case "End":
      return max
  }
  if (!/^\d$/.test(key)) return null
  const digit = Number(key)
  return digit <= max ? digit : null
}

/** What screen readers hear: "3.5 out of 5 stars". */
export function getRatingValueText(value: number, max: number) {
  return `${Math.round(value * 10) / 10} out of ${max} stars`
}
