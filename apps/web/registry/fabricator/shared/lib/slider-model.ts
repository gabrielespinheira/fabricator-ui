// The Slider's step dots and its drag rule. No DOM, so it stays testable and
// shared by every base.

export type SliderStep = {
  value: number
  /** Where the step sits along the track, from 0 at min to 1 at max. */
  ratio: number
  /** Under the range: the dot hides there, so the fill reads as one piece. */
  isFilled: boolean
}

// How far a press travels before it counts as a drag, in px. Under it the
// thumb glides to a click; past it the thumb follows the pointer at once.
const DRAG_THRESHOLD = 3

function getDecimals(value: number) {
  const [, decimals = ""] = String(value).split(".")
  return decimals.length
}

/** Every value a thumb can land on, with where it sits and whether it's filled. */
export function getSliderSteps({
  min,
  max,
  step,
  values,
}: {
  min: number
  max: number
  step: number
  values: readonly number[]
}): SliderStep[] {
  if (max <= min || step <= 0) return []
  const precision = Math.max(getDecimals(step), getDecimals(min))
  const count = Math.floor((max - min) / step + 1e-9)
  const sorted = [...values].sort((a, b) => a - b)
  const first = sorted.length > 1 ? (sorted[0] ?? min) : min
  const last = sorted.at(-1) ?? min
  return Array.from({ length: count + 1 }, (_, index) => {
    const value = Number((min + index * step).toFixed(precision))
    return {
      value,
      ratio: (value - min) / (max - min),
      isFilled: value >= first && value <= last,
    }
  })
}

export function hasLeftDragThreshold(
  start: { x: number; y: number },
  point: { x: number; y: number }
) {
  return Math.hypot(point.x - start.x, point.y - start.y) > DRAG_THRESHOLD
}
