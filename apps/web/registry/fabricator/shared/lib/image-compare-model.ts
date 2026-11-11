// The physics and geometry Image Compare shares on the web and React Native.
// Positions are in pixels across the frame; values are percentages.
//
// The knob glides to a click, a key or a flick on an ease-out, and follows a
// drag exactly. The line is jelly: its ends chase the knob on a soft spring,
// and both the line and the "before" picture are cut along one quadratic
// curve through the knob, so the picture bends with the line.

/** The soft spring the line's ends chase the knob on. */
export const IMAGE_COMPARE_SPRING = { stiffness: 620, damping: 44 }

/** How fast the knob glides to a target, per second (half way in ~90ms). */
const GLIDE_RATE = 7.5

/** How fast a drag that started away from the knob reels it in. */
const CATCH_RATE = 60

/** A release faster than this, in px/s, sends the knob to that edge. */
export const IMAGE_COMPARE_FLICK_SPEED = 1000

/** The window a release's speed is measured over, in ms. */
const VELOCITY_WINDOW = 100

/** How far past a label, in px, the line has to be for it to fully show. */
const LABEL_FADE = 64

const PAGE_STEP = 25

/** The share of the frame's shorter side the line may bend by. */
const BEND_RATIO = 1 / 30

/** The largest physics step: the spring stays stable below it. */
const MAX_SUBSTEP = 1 / 240

export type ImageCompareMotion = {
  /** The knob, where the line crosses the middle of the frame. */
  knob: number
  /** The line's top and bottom ends. */
  ends: number
  endsVelocity: number
  /** A drag has caught the knob, which now sits under the pointer. */
  isFollowing: boolean
}

export type ImageCompareMotionMode = "glide" | "drag"

export type ImageComparePointerSample = { x: number; time: number }

export type ImageCompareLabelSide = "before" | "after"

export function createImageCompareMotion(position: number): ImageCompareMotion {
  "worklet"
  return { knob: position, ends: position, endsVelocity: 0, isFollowing: false }
}

export function clampImageCompareValue(value: number) {
  "worklet"
  return Math.min(100, Math.max(0, value))
}

export function getImageCompareValueAtPoint(x: number, width: number) {
  "worklet"
  if (width <= 0) return 0
  return clampImageCompareValue((x / width) * 100)
}

export function getImageComparePosition(value: number, width: number) {
  "worklet"
  return (clampImageCompareValue(value) / 100) * width
}

function round(value: number) {
  "worklet"
  return Math.round(value * 100) / 100
}

// Worklets capture what they call when they're created, so helpers come first.
export function isImageCompareSettled(
  motion: ImageCompareMotion,
  target: number
) {
  "worklet"
  return (
    Math.abs(motion.knob - target) < 0.05 &&
    Math.abs(motion.ends - motion.knob) < 0.05 &&
    Math.abs(motion.endsVelocity) < 1
  )
}

/** How far the line's ends may trail the knob in a frame this size. */
export function getImageCompareMaxBend(width: number, height: number) {
  "worklet"
  return Math.min(width, height) * BEND_RATIO
}

/**
 * One frame of motion towards `target`, `delta` seconds after the last. The
 * ends never trail the knob by more than `maxBend`, so a fast glide bends the
 * line a little rather than dragging it across the frame.
 */
export function stepImageCompareMotion(
  motion: ImageCompareMotion,
  {
    target,
    mode,
    delta,
    maxBend,
  }: {
    target: number
    mode: ImageCompareMotionMode
    delta: number
    maxBend: number
  }
): ImageCompareMotion {
  "worklet"
  const { stiffness, damping } = IMAGE_COMPARE_SPRING
  // A tab that slept or a dropped frame shouldn't fling the line.
  const elapsed = Math.min(Math.max(delta, 0), 1 / 15)
  const steps = Math.max(1, Math.ceil(elapsed / MAX_SUBSTEP))
  const step = elapsed / steps
  let { knob, ends, endsVelocity, isFollowing } = motion
  if (mode !== "drag") isFollowing = false
  for (let index = 0; index < steps; index++) {
    if (isFollowing) {
      knob = target
    } else {
      const rate = mode === "drag" ? CATCH_RATE : GLIDE_RATE
      knob += (target - knob) * (1 - Math.exp(-rate * step))
      if (mode === "drag" && Math.abs(target - knob) < 1) {
        knob = target
        isFollowing = true
      }
    }
    endsVelocity += ((knob - ends) * stiffness - endsVelocity * damping) * step
    ends += endsVelocity * step
    ends = Math.min(knob + maxBend, Math.max(knob - maxBend, ends))
  }
  const settled = { knob, ends, endsVelocity, isFollowing }
  if (mode === "glide" && isImageCompareSettled(settled, target)) {
    return createImageCompareMotion(target)
  }
  return settled
}

/**
 * The line, and the "before" picture's clip, as SVG paths. The ends sit at
 * `ends`; the control point mirrors them through the knob, so the curve's
 * middle is always under the knob.
 */
export function getImageCompareCurve(
  knob: number,
  ends: number,
  height: number
) {
  "worklet"
  const top = round(ends)
  const control = round(2 * knob - ends)
  const middle = round(height / 2)
  const bottom = round(height)
  const curve = `Q${control} ${middle} ${top} ${bottom}`
  return {
    line: `M${top} 0${curve}`,
    clip: `M0 0L${top} 0${curve}L0 ${bottom}Z`,
  }
}

/** Where a release sends the knob: an edge after a flick, else nowhere. */
export function getImageCompareReleaseValue(value: number, velocity: number) {
  "worklet"
  if (Math.abs(velocity) < IMAGE_COMPARE_FLICK_SPEED) return value
  return velocity > 0 ? 100 : 0
}

/** The pointer's speed in px/s over its last moments before `now`. */
export function getImageCompareVelocity(
  samples: readonly ImageComparePointerSample[],
  now: number
) {
  const recent = samples.filter(
    (sample) => now - sample.time <= VELOCITY_WINDOW
  )
  const first = recent[0]
  const last = recent.at(-1)
  if (!first || !last || last.time === first.time) return 0
  return ((last.x - first.x) / (last.time - first.time)) * 1000
}

/** The value a key moves to, or null for a key the slider doesn't take. */
export function getImageCompareKeyValue(
  key: string,
  value: number,
  step: number
) {
  const moves: Record<string, number> = {
    ArrowLeft: value - step,
    ArrowDown: value - step,
    ArrowRight: value + step,
    ArrowUp: value + step,
    PageDown: value - PAGE_STEP,
    PageUp: value + PAGE_STEP,
    Home: 0,
    End: 100,
  }
  const next = moves[key]
  return next === undefined ? null : clampImageCompareValue(next)
}

/**
 * Which step a value is nearest, and the pitch its notch plays at: the
 * slider's, rising from 0.8 to 1.4 across the frame.
 */
export function getImageCompareNotch(value: number, step: number) {
  const clamped = clampImageCompareValue(value)
  return {
    index: Math.round(clamped / Math.max(step, 1)),
    pitch: 0.8 + (clamped / 100) * 0.6,
  }
}

export function getImageCompareValueText(
  value: number,
  beforeLabel: string,
  afterLabel: string
) {
  const before = Math.round(clampImageCompareValue(value))
  return `${beforeLabel} ${before}%, ${afterLabel} ${100 - before}%`
}

/**
 * A label shows while its picture has room: it fades out as the knob crosses
 * its centre, from `LABEL_FADE` px away.
 */
export function getImageCompareLabelOpacity(
  side: ImageCompareLabelSide,
  knob: number,
  labelCenter: number
) {
  "worklet"
  const room = side === "before" ? knob - labelCenter : labelCenter - knob
  return Math.min(1, Math.max(0, room / LABEL_FADE))
}
