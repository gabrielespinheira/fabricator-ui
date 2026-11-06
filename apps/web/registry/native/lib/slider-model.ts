// Stepping, clamping and thumb geometry for Slider, with the rules of Base UI's
// Slider, which the website's component is built on. Every function is a
// worklet, because a dragged thumb runs them on the UI thread.

export type SliderCollision = "push" | "swap" | "none"

export type SliderRange = {
  min: number
  max: number
  step: number
  minStepsBetweenValues: number
}

export type SliderGeometry = {
  min: number
  max: number
  /** The control's length along its axis. */
  length: number
  thumbSize: number
}

function clamp(value: number, min: number, max: number) {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

function getDecimalPrecision(value: number) {
  "worklet"
  if (value === 0) return 0
  if (Math.abs(value) < 1) {
    const [mantissa, exponent] = value.toExponential().split("e-")
    const decimals = mantissa?.split(".")[1]
    return (decimals ? decimals.length : 0) + parseInt(exponent ?? "0", 10)
  }
  const decimals = value.toString().split(".")[1]
  return decimals ? decimals.length : 0
}

export function roundValueToStep(value: number, step: number, min: number) {
  "worklet"
  const nearest = Math.round((value - min) / step) * step + min
  return Number(
    nearest.toFixed(
      Math.max(getDecimalPrecision(step), getDecimalPrecision(min))
    )
  )
}

/** The thumbs' values in ascending order, from a slider's `value`. */
export function toSliderValues(value: number | readonly number[]) {
  if (typeof value === "number") return [value]
  return [...value].sort((a, b) => a - b)
}

export function sameValues(a: readonly number[], b: readonly number[]) {
  "worklet"
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/** From the control's start to the thumb's near edge: the thumb stays inside. */
export function getThumbOffset(value: number, geometry: SliderGeometry) {
  "worklet"
  const { min, max, length, thumbSize } = geometry
  if (max <= min) return 0
  const ratio = clamp((value - min) / (max - min), 0, 1)
  return ratio * Math.max(length - thumbSize, 0)
}

export function getThumbCenter(value: number, geometry: SliderGeometry) {
  "worklet"
  return getThumbOffset(value, geometry) + geometry.thumbSize / 2
}

/** The stepped value with the thumb's centre at `position`. */
export function getValueAtPosition(
  position: number,
  options: SliderGeometry & { step: number }
) {
  "worklet"
  const { min, max, step, length, thumbSize } = options
  const travel = length - thumbSize
  if (travel <= 0) return min
  const ratio = clamp((position - thumbSize / 2) / travel, 0, 1)
  return clamp(roundValueToStep(min + ratio * (max - min), step, min), min, max)
}

/** A step's pitch, rising along the scale: the website's `0.8 + position * 0.6`. */
export function getNotchPitch(
  value: number,
  { min, max }: { min: number; max: number }
) {
  const position = max > min ? clamp((value - min) / (max - min), 0, 1) : 0.5
  return 0.8 + position * 0.6
}

/** The thumb a press takes. Of two on one value, the one that can move there. */
export function getClosestThumb(values: readonly number[], target: number) {
  "worklet"
  let closest = 0
  let closestDistance = Infinity
  values.forEach((value, index) => {
    const distance = Math.abs(value - target)
    if (
      distance < closestDistance ||
      (distance === closestDistance && target > value)
    ) {
      closest = index
      closestDistance = distance
    }
  })
  return closest
}

function trimFloat(value: number) {
  "worklet"
  return Number(value.toFixed(12))
}

function getPushedValues(
  values: readonly number[],
  initialValues: readonly number[],
  index: number,
  nextValue: number,
  { min, max, step, minStepsBetweenValues }: SliderRange
) {
  "worklet"
  const next = values.slice()
  const gap = step * minStepsBetweenValues
  const last = next.length - 1
  next[index] = clamp(nextValue, min + index * gap, max - (last - index) * gap)
  for (let i = index + 1; i <= last; i += 1) {
    const lowest = (next[i - 1] ?? min) + gap
    const highest = max - (last - i) * gap
    const initial = initialValues[i] ?? max
    let candidate = Math.max(next[i] ?? min, lowest)
    if (initial < candidate) candidate = Math.max(initial, lowest)
    next[i] = clamp(candidate, lowest, highest)
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    const highest = (next[i + 1] ?? max) - gap
    const lowest = min + i * gap
    const initial = initialValues[i] ?? min
    let candidate = Math.min(next[i] ?? max, highest)
    if (initial > candidate) candidate = Math.min(initial, highest)
    next[i] = clamp(candidate, lowest, highest)
  }
  return next.map(trimFloat)
}

/**
 * The values after a thumb moves to `nextValue`, and which thumb the drag holds
 * now: `swap` hands it to the neighbour it passes.
 */
export function resolveThumbCollision(
  behavior: SliderCollision,
  values: readonly number[],
  initialValues: readonly number[],
  pressedIndex: number,
  nextValue: number,
  range: SliderRange
) {
  "worklet"
  const { min, max, step, minStepsBetweenValues } = range
  if (values.length <= 1) {
    return { values: [clamp(nextValue, min, max)], thumbIndex: 0 }
  }
  if (behavior === "push") {
    return {
      values: getPushedValues(
        values,
        initialValues,
        pressedIndex,
        nextValue,
        range
      ),
      thumbIndex: pressedIndex,
    }
  }

  const gap = step * minStepsBetweenValues
  const candidate = values.slice()
  const previous = candidate[pressedIndex - 1]
  const following = candidate[pressedIndex + 1]
  const lower = previous === undefined ? min : previous + gap
  const upper = following === undefined ? max : following - gap
  const pressedValue = trimFloat(clamp(nextValue, lower, upper))
  candidate[pressedIndex] = pressedValue
  const current = values[pressedIndex] ?? min
  const swapsUp =
    behavior === "swap" &&
    nextValue > current &&
    following !== undefined &&
    nextValue >= following - 1e-7
  const swapsDown =
    behavior === "swap" &&
    nextValue < current &&
    previous !== undefined &&
    nextValue <= previous + 1e-7
  if (!swapsUp && !swapsDown) {
    return { values: candidate, thumbIndex: pressedIndex }
  }

  const target = swapsUp ? pressedIndex + 1 : pressedIndex - 1
  const baseline = candidate.map((value, index) =>
    index === pressedIndex ? pressedValue : (initialValues[index] ?? value)
  )
  const targetValue = candidate[target] ?? nextValue
  const adjusted = getPushedValues(
    candidate,
    baseline,
    target,
    swapsUp
      ? Math.max(nextValue, targetValue)
      : Math.min(nextValue, targetValue),
    range
  )
  const neighbour = swapsUp ? target - 1 : target + 1
  const before = adjusted[neighbour - 1]
  const after = adjusted[neighbour + 1]
  const neighbourLow = Math.max(
    before === undefined ? min : before + gap,
    min + neighbour * gap
  )
  const neighbourHigh = Math.min(
    after === undefined ? max : after - gap,
    max - (adjusted.length - 1 - neighbour) * gap
  )
  adjusted[neighbour] = trimFloat(
    clamp(pressedValue, neighbourLow, neighbourHigh)
  )
  return { values: adjusted, thumbIndex: target }
}

/** The values after a screen reader's increment or decrement of one thumb. */
export function stepThumb(
  values: readonly number[],
  index: number,
  amount: number,
  behavior: SliderCollision,
  range: SliderRange
) {
  "worklet"
  const { min, max, step } = range
  const current = values[index] ?? min
  const next = clamp(roundValueToStep(current + amount, step, min), min, max)
  return resolveThumbCollision(behavior, values, values, index, next, range)
    .values
}
