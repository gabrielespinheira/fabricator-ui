// Springs: a value pulled to its target by stiffness and slowed by damping
// (mass 1), stepped with semi-implicit Euler in small substeps. Retargeting
// keeps the current velocity, so a second click bends the motion instead of
// restarting it. The motion tokens carry the presets as "stiffness damping"
// (`--motion-spring-lead: 620 36`); React Native passes the same two numbers
// to Reanimated's `withSpring`.

export type SpringConfig = { stiffness: number; damping: number }

export type SpringState = { value: number; velocity: number }

// A dropped frame or a tab that slept is stepped as one short frame.
const MAX_ELAPSED = 1 / 30
const MAX_SUBSTEP = 1 / 240
const REST_DISTANCE = 0.05
const REST_VELOCITY = 0.5

export function stepSpring(
  state: SpringState,
  target: number,
  { stiffness, damping }: SpringConfig,
  elapsedSeconds: number
): SpringState {
  "worklet"
  const elapsed = Math.min(Math.max(elapsedSeconds, 0), MAX_ELAPSED)
  const steps = Math.max(1, Math.ceil(elapsed / MAX_SUBSTEP))
  const step = elapsed / steps
  let { value, velocity } = state
  for (let index = 0; index < steps; index++) {
    velocity += (-stiffness * (value - target) - damping * velocity) * step
    value += velocity * step
  }
  return { value, velocity }
}

export function isSpringAtRest(state: SpringState, target: number) {
  "worklet"
  return (
    Math.abs(state.value - target) < REST_DISTANCE &&
    Math.abs(state.velocity) < REST_VELOCITY
  )
}

/**
 * The same spring played `timeScale` times slower (2 is twice as long): the
 * damping ratio, and so the overshoot, stays the same.
 */
export function retimeSpring(
  { stiffness, damping }: SpringConfig,
  timeScale: number
): SpringConfig {
  return {
    stiffness: stiffness / timeScale ** 2,
    damping: damping / timeScale,
  }
}

/** The same stiffness, critically damped: it arrives without overshooting. */
export function getCriticalSpring({ stiffness }: SpringConfig): SpringConfig {
  return { stiffness, damping: 2 * Math.sqrt(stiffness) }
}

const SAMPLE_STEP = 1 / 240
const SAMPLE_REST = 0.005

/**
 * A spring released from 0 towards 1, for CSS `linear()`: how long it takes
 * to settle within 0.5 %, in whole milliseconds, and `count + 1` evenly
 * spaced values over that time, ending exactly on 1.
 */
export function sampleSpring(config: SpringConfig, count = 40) {
  let state: SpringState = { value: 0, velocity: 0 }
  const trace = [0]
  let settledAt = 0
  for (let step = 1; step <= 4 / SAMPLE_STEP; step++) {
    state = stepSpring(state, 1, config, SAMPLE_STEP)
    trace.push(state.value)
    if (Math.abs(state.value - 1) > SAMPLE_REST) settledAt = step
  }
  const last = Math.max(settledAt, 1)
  const samples = Array.from({ length: count + 1 }, (_, index) => {
    if (index === count) return 1
    const value = trace[Math.round((index / count) * last)]
    return Math.round(value * 1000) / 1000
  })
  return { duration: Math.round(last * SAMPLE_STEP * 1000), samples }
}

/** A "stiffness damping" token, or null when it isn't one. */
export function parseSpring(token: string): SpringConfig | null {
  const parts = token.trim().split(/\s+/)
  if (parts.length !== 2) return null
  const [stiffness, damping] = parts.map(Number)
  if (!(stiffness > 0) || !(damping >= 0)) return null
  return { stiffness, damping }
}

/**
 * A spring token as the page sets it, stretched by `--motion-scale`; null
 * when motion is off (scale 0) or the token is missing, so the caller jumps
 * straight to the target.
 */
export function resolveSpring(
  token: string,
  motionScale: string
): SpringConfig | null {
  const scale = motionScale.trim() === "" ? 1 : Number(motionScale)
  if (!(scale > 0)) return null
  const spring = parseSpring(token)
  if (!spring) return null
  return scale === 1 ? spring : retimeSpring(spring, scale)
}

/**
 * A spring's CSS form (`--motion-spring-<name>-duration` and
 * `--motion-ease-<name>-spring`) as a Web Animations timing, stretched by
 * `--motion-scale`; null when motion is off or the tokens are missing.
 */
export function resolveSpringTransition(
  durationToken: string,
  easingToken: string,
  motionScale: string
) {
  const scale = motionScale.trim() === "" ? 1 : Number(motionScale)
  const duration = Number.parseFloat(durationToken)
  const easing = easingToken.trim()
  if (!(scale > 0) || !(duration > 0) || easing === "") return null
  return { duration: duration * scale, easing }
}

export type EdgeRect = {
  left: number
  top: number
  right: number
  bottom: number
}

type Edge = keyof EdgeRect

const EDGES: Edge[] = ["left", "top", "right", "bottom"]

export type RectMotion = Record<Edge, SpringState>

export type RectEdgeSprings = Record<Edge, SpringConfig>

export function createRectMotion(rect: EdgeRect): RectMotion {
  return {
    left: { value: rect.left, velocity: 0 },
    top: { value: rect.top, velocity: 0 },
    right: { value: rect.right, velocity: 0 },
    bottom: { value: rect.bottom, velocity: 0 },
  }
}

/**
 * Which spring drives each edge on the way from one rect to another: the edge
 * facing the move is stiff (`lead`) and the one behind it soft (`trail`), so
 * a highlight stretches toward its target and gathers when it lands. An axis
 * that only resizes moves both edges on `lead`.
 */
export function getRectEdgeSprings(
  from: EdgeRect,
  to: EdgeRect,
  lead: SpringConfig,
  trail: SpringConfig
): RectEdgeSprings {
  "worklet"
  const alongX = to.left + to.right - (from.left + from.right)
  const alongY = to.top + to.bottom - (from.top + from.bottom)
  return {
    left: alongX > 0 ? trail : lead,
    right: alongX < 0 ? trail : lead,
    top: alongY > 0 ? trail : lead,
    bottom: alongY < 0 ? trail : lead,
  }
}

export function stepRectMotion(
  motion: RectMotion,
  target: EdgeRect,
  springs: RectEdgeSprings,
  elapsedSeconds: number
): RectMotion {
  const next = { ...motion }
  for (const edge of EDGES) {
    next[edge] = stepSpring(
      motion[edge],
      target[edge],
      springs[edge],
      elapsedSeconds
    )
  }
  return next
}

export function isRectMotionAtRest(motion: RectMotion, target: EdgeRect) {
  return EDGES.every((edge) => isSpringAtRest(motion[edge], target[edge]))
}

/**
 * The box to draw, in whole hundredths of a pixel. A trailing edge that
 * overshoots past the leading one draws nothing rather than a negative box.
 */
export function readRectMotion(motion: RectMotion) {
  const round = (value: number) => Math.round(value * 100) / 100
  return {
    left: round(motion.left.value),
    top: round(motion.top.value),
    width: round(Math.max(0, motion.right.value - motion.left.value)),
    height: round(Math.max(0, motion.bottom.value - motion.top.value)),
  }
}
