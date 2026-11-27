import { describe, expect, it } from "vitest"

import {
  createRectMotion,
  getCriticalSpring,
  getRectEdgeSprings,
  isRectMotionAtRest,
  isSpringAtRest,
  parseSpring,
  readRectMotion,
  resolveSpring,
  resolveSpringTransition,
  retimeSpring,
  sampleSpring,
  stepRectMotion,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "./spring-model"

const FRAME = 1 / 60

// Releases a spring from 0 towards 1 at 60 fps and reads how it moved.
function release(config: SpringConfig) {
  let state: SpringState = { value: 0, velocity: 0 }
  let peak = 0
  let reached = 0
  let settled = 0
  for (let frame = 1; frame <= 240; frame++) {
    state = stepSpring(state, 1, config, FRAME)
    peak = Math.max(peak, state.value)
    if (!reached && state.value >= 0.98) reached = frame * FRAME * 1000
    if (Math.abs(state.value - 1) > 0.005) settled = frame * FRAME * 1000
  }
  return { overshoot: (peak - 1) * 100, reached, settled }
}

describe("stepSpring", () => {
  it("moves like the reference presets", () => {
    const lead = release({ stiffness: 620, damping: 36 })
    expect(lead.overshoot).toBeCloseTo(2.8, 0)
    expect(lead.reached).toBeGreaterThan(115)
    expect(lead.reached).toBeLessThan(150)

    const trail = release({ stiffness: 190, damping: 19 })
    expect(trail.reached).toBeGreaterThan(200)
    expect(trail.reached).toBeLessThan(240)

    const pop = release({ stiffness: 520, damping: 16 })
    expect(pop.overshoot).toBeGreaterThan(25)
    expect(pop.overshoot).toBeLessThan(35)
  })

  it("keeps its velocity when the target changes mid-flight", () => {
    let state: SpringState = { value: 0, velocity: 0 }
    for (let frame = 0; frame < 4; frame++) {
      state = stepSpring(state, 100, { stiffness: 400, damping: 30 }, FRAME)
    }
    const before = state.value
    state = stepSpring(state, 0, { stiffness: 400, damping: 30 }, FRAME)
    expect(state.value).toBeGreaterThan(before)
  })

  it("treats a long pause as one short frame, so nothing is flung", () => {
    const config = { stiffness: 400, damping: 30 }
    const start = { value: 0, velocity: 0 }
    expect(stepSpring(start, 1, config, 2)).toEqual(
      stepSpring(start, 1, config, 1 / 30)
    )
  })
})

describe("isSpringAtRest", () => {
  it("rests only when close to the target and nearly still", () => {
    expect(isSpringAtRest({ value: 10, velocity: 0 }, 10)).toBe(true)
    expect(isSpringAtRest({ value: 10.2, velocity: 0 }, 10)).toBe(false)
    expect(isSpringAtRest({ value: 10, velocity: 5 }, 10)).toBe(false)
  })
})

describe("retimeSpring", () => {
  it("stretches time and keeps the feel", () => {
    const config = { stiffness: 620, damping: 36 }
    const slower = retimeSpring(config, 2)
    expect(slower.damping / (2 * Math.sqrt(slower.stiffness))).toBeCloseTo(
      config.damping / (2 * Math.sqrt(config.stiffness)),
      6
    )
    expect(release(slower).reached).toBeCloseTo(release(config).reached * 2, -1)
  })
})

describe("getCriticalSpring", () => {
  it("arrives at the same pace without overshooting", () => {
    const critical = getCriticalSpring({ stiffness: 520, damping: 16 })
    expect(critical.stiffness).toBe(520)
    expect(release(critical).overshoot).toBeLessThanOrEqual(0)
  })
})

describe("parseSpring", () => {
  it("reads 'stiffness damping' tokens", () => {
    expect(parseSpring("620 36")).toEqual({ stiffness: 620, damping: 36 })
    expect(parseSpring(" 190  19.5 ")).toEqual({
      stiffness: 190,
      damping: 19.5,
    })
  })

  it("rejects anything else", () => {
    expect(parseSpring("")).toBeNull()
    expect(parseSpring("620")).toBeNull()
    expect(parseSpring("fast slow")).toBeNull()
    expect(parseSpring("0 10")).toBeNull()
  })
})

describe("resolveSpring", () => {
  it("reads the token as the page sets it", () => {
    expect(resolveSpring("620 36", "1")).toEqual({
      stiffness: 620,
      damping: 36,
    })
    expect(resolveSpring("620 36", "")).toEqual({ stiffness: 620, damping: 36 })
  })

  it("stretches it by --motion-scale", () => {
    expect(resolveSpring("400 40", "2")).toEqual({
      stiffness: 100,
      damping: 20,
    })
  })

  it("jumps when motion is off or the token is missing", () => {
    expect(resolveSpring("620 36", "0")).toBeNull()
    expect(resolveSpring("", "1")).toBeNull()
  })
})

const LEAD = { stiffness: 620, damping: 36 }
const TRAIL = { stiffness: 190, damping: 19 }

describe("getRectEdgeSprings", () => {
  const from = { left: 0, top: 0, right: 40, bottom: 20 }

  it("leads with the edge facing the move", () => {
    const right = getRectEdgeSprings(
      from,
      { left: 100, top: 0, right: 160, bottom: 20 },
      LEAD,
      TRAIL
    )
    expect(right).toMatchObject({ right: LEAD, left: TRAIL })

    const up = getRectEdgeSprings(
      { left: 0, top: 100, right: 40, bottom: 120 },
      from,
      LEAD,
      TRAIL
    )
    expect(up).toMatchObject({ top: LEAD, bottom: TRAIL })
  })

  it("moves both edges of an axis together when it only resizes", () => {
    const springs = getRectEdgeSprings(
      from,
      { left: -10, top: 0, right: 50, bottom: 20 },
      LEAD,
      TRAIL
    )
    expect(springs).toEqual({
      left: LEAD,
      right: LEAD,
      top: LEAD,
      bottom: LEAD,
    })
  })
})

describe("stepRectMotion", () => {
  it("stretches on the way and lands whole", () => {
    const from = { left: 0, top: 0, right: 40, bottom: 20 }
    const to = { left: 200, top: 0, right: 240, bottom: 20 }
    const springs = getRectEdgeSprings(from, to, LEAD, TRAIL)
    let motion = createRectMotion(from)
    let widest = 0
    for (let frame = 0; frame < 90; frame++) {
      motion = stepRectMotion(motion, to, springs, FRAME)
      widest = Math.max(widest, readRectMotion(motion).width)
    }
    expect(widest).toBeGreaterThan(80)
    expect(isRectMotionAtRest(motion, to)).toBe(true)
    expect(readRectMotion(motion)).toEqual({
      left: 200,
      top: 0,
      width: 40,
      height: 20,
    })
  })

  it("never draws a negative size while the trailing edge overshoots", () => {
    const from = { left: 0, top: 0, right: 4, bottom: 20 }
    const to = { left: 400, top: 0, right: 404, bottom: 20 }
    const springs = getRectEdgeSprings(from, to, LEAD, TRAIL)
    let motion = createRectMotion(from)
    for (let frame = 0; frame < 90; frame++) {
      motion = stepRectMotion(motion, to, springs, FRAME)
      expect(readRectMotion(motion).width).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("sampleSpring", () => {
  it("runs from rest to rest over the time the spring takes to settle", () => {
    const { duration, samples } = sampleSpring({ stiffness: 280, damping: 22 })
    expect(samples[0]).toBe(0)
    expect(samples.at(-1)).toBe(1)
    expect(duration).toBeGreaterThan(350)
    expect(duration).toBeLessThan(500)
  })

  it("keeps the overshoot of a bouncy spring", () => {
    const { samples } = sampleSpring({ stiffness: 520, damping: 16 })
    expect(Math.max(...samples)).toBeGreaterThan(1.25)
  })

  it("never passes the target when critically damped", () => {
    const { samples } = sampleSpring(
      getCriticalSpring({ stiffness: 520, damping: 0 })
    )
    expect(Math.max(...samples)).toBe(1)
    expect(samples).toEqual([...samples].sort((a, b) => a - b))
  })
})

describe("resolveSpringTransition", () => {
  it("reads a spring's CSS form as the page sets it", () => {
    expect(resolveSpringTransition("462ms", "linear(0, 1)", "1")).toEqual({
      duration: 462,
      easing: "linear(0, 1)",
    })
  })

  it("stretches it by --motion-scale", () => {
    expect(
      resolveSpringTransition("400ms", "linear(0, 1)", "1.5")?.duration
    ).toBe(600)
  })

  it("is null when motion is off or the tokens are missing", () => {
    expect(resolveSpringTransition("400ms", "linear(0, 1)", "0")).toBeNull()
    expect(resolveSpringTransition("", "linear(0, 1)", "1")).toBeNull()
    expect(resolveSpringTransition("400ms", "", "1")).toBeNull()
  })
})
