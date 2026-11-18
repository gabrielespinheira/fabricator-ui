import { describe, expect, it } from "vitest"

import {
  BOT_FACE_MAX_TILT,
  BOT_FACE_STATES,
  createBotFaceMotion,
  getBotFaceBlinkOpening,
  getBotFaceEyeContours,
  getBotFaceEyeGeometry,
  getBotFaceEyePath,
  getBotFaceTarget,
  stepBotFaceMotion,
  stepBotFacePlayback,
} from "./bot-face-motion"

describe("BotFace expressions", () => {
  it("keeps every expression bounded and distinguishes permissions from questions", () => {
    expect(BOT_FACE_STATES).toHaveLength(10)
    for (const state of BOT_FACE_STATES) {
      for (let elapsed = 0; elapsed < 20000; elapsed += 83) {
        const pose = getBotFaceTarget(state, elapsed)
        expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(BOT_FACE_MAX_TILT)
        expect(Math.hypot(pose.gazeX, pose.gazeY)).toBeLessThanOrEqual(1)
        for (const value of Object.values(pose))
          expect(Number.isFinite(value)).toBe(true)
      }
    }
    expect(getBotFaceTarget("awaiting-permission", 0)).not.toEqual(
      getBotFaceTarget("questioning", 0)
    )
    expect(getBotFaceTarget("happy", 0).leftCurve).toBeLessThan(0)
    expect(getBotFaceTarget("sad", 0).gazeY).toBeGreaterThan(0)
  })

  it("gives every state a readable gesture instead of a static pose", () => {
    for (const state of BOT_FACE_STATES) {
      const frames = Array.from({ length: 45 }, (_, index) =>
        getBotFaceTarget(state, index * 100)
      )
      expect(
        new Set(frames.map((pose) => JSON.stringify(pose))).size,
        state
      ).toBeGreaterThan(8)
    }
    const working = Array.from(
      { length: 30 },
      (_, index) => getBotFaceTarget("working", index * 100).gazeX
    )
    expect(Math.max(...working) - Math.min(...working)).toBeGreaterThan(1.4)
    const speaking = Array.from(
      { length: 20 },
      (_, index) => getBotFaceTarget("speaking", index * 100).leftOpening
    )
    expect(Math.max(...speaking) - Math.min(...speaking)).toBeGreaterThan(0.4)
  })

  it("reads emotion through all three eye styles, including still poses", () => {
    for (const style of ["slant", "dots", "square"] as const) {
      const shapes = BOT_FACE_STATES.map((state) =>
        getBotFaceEyeGeometry(getBotFaceTarget(state), style, "left")
      )
      expect(new Set(shapes).size).toBe(BOT_FACE_STATES.length)
    }
    expect(getBotFaceTarget("questioning").question).toBe(1)
    const happy = getBotFaceTarget("happy")
    expect(happy.leftWidth).toBeGreaterThan(1)
    expect(happy.slant).toBe(0)
  })

  it("makes speaking a six-bar waveform with independently moving bars", () => {
    const frames = Array.from({ length: 12 }, (_, index) =>
      getBotFaceTarget("speaking", index * 80)
    )
    for (const pose of frames) {
      expect(pose.waveform).toBe(1)
      expect(pose.question + pose.error).toBe(0)
      for (const side of ["left", "right"] as const) {
        expect(
          getBotFaceEyeGeometry(pose, "dots", side).match(/M/g)
        ).toHaveLength(3)
      }
    }
    expect(
      new Set(frames.map((pose) => pose.leftOuterOpening)).size
    ).toBeGreaterThan(8)
    expect(
      frames.some(
        (pose) => Math.abs(pose.leftOuterOpening - pose.leftOpening) > 0.3
      )
    ).toBe(true)
  })

  it("holds upper-corner thinking glances with staggered eye articulation", () => {
    const frames = Array.from({ length: 40 }, (_, index) =>
      getBotFaceTarget("thinking", index * 100)
    )
    expect(Math.min(...frames.map((pose) => pose.gazeX))).toBeLessThan(-0.6)
    expect(Math.max(...frames.map((pose) => pose.gazeX))).toBeGreaterThan(0.6)
    expect(frames.every((pose) => pose.gazeY < -0.6)).toBe(true)
    expect(getBotFaceTarget("thinking", 0).gazeX).toBe(
      getBotFaceTarget("thinking", 700).gazeX
    )
    expect(
      frames.every(
        (pose) =>
          pose.leftOpening >= 0.4 &&
          pose.leftOpening <= 0.95 &&
          pose.rightOpening >= 0.4 &&
          pose.rightOpening <= 0.95
      )
    ).toBe(true)
    expect(
      Math.max(...frames.map((pose) => pose.leftOpening - pose.rightOpening))
    ).toBeGreaterThan(0.2)
    expect(
      Math.min(...frames.map((pose) => pose.leftOpening - pose.rightOpening))
    ).toBeLessThan(-0.2)
    expect(
      new Set(
        frames.map((pose) => getBotFaceEyeGeometry(pose, "slant", "left"))
      ).size
    ).toBeGreaterThan(12)
  })

  it("retains the selected eye shape in the still thinking expression", () => {
    const shapes = []
    for (const style of ["slant", "dots", "square"] as const) {
      const thinking = getBotFaceEyeContours(
        getBotFaceTarget("thinking"),
        style,
        "left"
      )
      const idle = getBotFaceEyeContours(
        getBotFaceTarget("idle"),
        style,
        "left"
      )
      const height = (contour: number[]) => {
        const vertical = contour.filter((_, index) => index % 2 === 1)
        return Math.max(...vertical) - Math.min(...vertical)
      }
      expect(height(thinking[0])).toBeLessThan(height(idle[0]) * 0.85)
      shapes.push(
        getBotFaceEyeGeometry(getBotFaceTarget("thinking"), style, "left")
      )
    }
    expect(new Set(shapes).size).toBe(3)
  })

  it("keeps waveform and error eyes open while thinking and curious eyes blink", () => {
    for (const state of ["error", "speaking"] as const) {
      expect(getBotFaceBlinkOpening(getBotFaceTarget(state), 0.06)).toBe(1)
    }
    expect(
      getBotFaceBlinkOpening(getBotFaceTarget("thinking"), 0.06)
    ).toBeCloseTo(0.06)
    expect(getBotFaceBlinkOpening(getBotFaceTarget("idle"), 0.06)).toBeCloseTo(
      0.06
    )
    expect(
      getBotFaceBlinkOpening(getBotFaceTarget("questioning"), 0.06)
    ).toBeCloseTo(0.06)
    expect(getBotFaceTarget("error").error).toBe(1)
  })

  function outlineBands(contour: number[]) {
    const points = [[contour[0], contour[1]]]
    for (let segment = 2; segment < contour.length; segment += 6) {
      const start = points[points.length - 1]
      for (let step = 1; step <= 10; step++) {
        const time = step / 10
        const inverse = 1 - time
        points.push([
          inverse ** 3 * start[0] +
            3 * inverse ** 2 * time * contour[segment] +
            3 * inverse * time ** 2 * contour[segment + 2] +
            time ** 3 * contour[segment + 4],
          inverse ** 3 * start[1] +
            3 * inverse ** 2 * time * contour[segment + 1] +
            3 * inverse * time ** 2 * contour[segment + 3] +
            time ** 3 * contour[segment + 5],
        ])
      }
    }
    const minY = Math.min(...points.map((point) => point[1]))
    const maxY = Math.max(...points.map((point) => point[1]))
    const height = maxY - minY
    return Array.from({ length: 6 }, (_, band) => {
      const start = minY + (height * band) / 6
      const end = minY + (height * (band + 1)) / 6
      const xs = points
        .filter((point) => point[1] >= start && point[1] <= end)
        .map((point) => point[0])
      return xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs)
    })
  }

  it("keeps questioning as compact connected eyes in the selected style", () => {
    const shapes = []
    for (const style of ["slant", "dots", "square"] as const) {
      for (const side of ["left", "right"] as const) {
        const question = getBotFaceEyeContours(
          getBotFaceTarget("questioning"),
          style,
          side
        )
        const idle = getBotFaceEyeContours(
          getBotFaceTarget("idle"),
          style,
          side
        )
        const height = (contour: number[]) => {
          const vertical = contour.filter((_, index) => index % 2 === 1)
          return Math.max(...vertical) - Math.min(...vertical)
        }
        expect(height(question[0])).toBeLessThan(height(idle[0]) * 1.35)
        const bands = outlineBands(question[0])
        const widest = Math.max(...bands)
        expect(bands[4]).toBeGreaterThan(widest * 0.78)
        expect(bands[5]).toBeGreaterThan(widest * 0.62)
        for (const contour of question.slice(1)) {
          expect(
            new Set(contour.filter((_, index) => index % 2 === 0)).size
          ).toBe(1)
          expect(
            new Set(contour.filter((_, index) => index % 2 === 1)).size
          ).toBe(1)
        }
      }
      shapes.push(
        getBotFaceEyeGeometry(getBotFaceTarget("questioning"), style, "left")
      )
    }
    expect(new Set(shapes).size).toBe(3)
    const times = Array.from({ length: 34 }, (_, index) => index * 100)
    const low = times.reduce((best, time) =>
      getBotFaceTarget("questioning", time).leftCurve <
      getBotFaceTarget("questioning", best).leftCurve
        ? time
        : best
    )
    const high = times.reduce((best, time) =>
      getBotFaceTarget("questioning", time).leftCurve >
      getBotFaceTarget("questioning", best).leftCurve
        ? time
        : best
    )
    expect(
      getBotFaceTarget("questioning", high).leftCurve -
        getBotFaceTarget("questioning", low).leftCurve
    ).toBeGreaterThan(0.4)
    const ratio = (bands: number[]) => bands[0] / Math.max(bands[2], 0.001)
    const resting = outlineBands(
      getBotFaceEyeContours(
        getBotFaceTarget("questioning", low),
        "slant",
        "left"
      )[0]
    )
    const asking = outlineBands(
      getBotFaceEyeContours(
        getBotFaceTarget("questioning", high),
        "slant",
        "left"
      )[0]
    )
    expect(Math.abs(ratio(asking) - ratio(resting))).toBeGreaterThan(0.12)
  })

  it("lets one eye lead the other inside a gesture", () => {
    for (const state of [
      "listening",
      "questioning",
      "happy",
      "sad",
      "awaiting-permission",
    ] as const) {
      const frames = Array.from({ length: 36 }, (_, index) =>
        getBotFaceTarget(state, index * 90)
      )
      expect(
        frames.some(
          (pose) =>
            Math.abs(pose.leftOpening - pose.rightOpening) > 0.04 ||
            Math.abs(pose.leftCurve - pose.rightCurve) > 0.12
        ),
        state
      ).toBe(true)
    }
  })

  it("coordinates nodding and working turns without changing layout or scale", () => {
    const listening = Array.from({ length: 36 }, (_, index) =>
      getBotFaceTarget("listening", index * 100)
    )
    expect(Math.max(...listening.map((pose) => pose.pitch))).toBeGreaterThan(9)
    expect(Math.min(...listening.map((pose) => pose.pitch))).toBeLessThan(-2)
    const working = Array.from({ length: 36 }, (_, index) =>
      getBotFaceTarget("working", index * 100)
    )
    expect(
      Math.max(...working.map((pose) => pose.yaw)) -
        Math.min(...working.map((pose) => pose.yaw))
    ).toBeGreaterThan(10)
    expect(
      Math.max(...working.map((pose) => pose.tilt)) -
        Math.min(...working.map((pose) => pose.tilt))
    ).toBeGreaterThan(4)
    for (const pose of [...listening, ...working]) {
      expect(Math.abs(pose.pitch)).toBeLessThanOrEqual(14)
      expect(Math.abs(pose.yaw)).toBeLessThanOrEqual(12)
      expect(pose).not.toHaveProperty("scale")
      expect(pose).not.toHaveProperty("translateX")
      expect(pose).not.toHaveProperty("translateY")
    }
  })

  it("uses the same closed eye geometry commands for every expression and eye style", () => {
    for (const style of ["slant", "dots", "square"] as const) {
      const commands = getBotFaceEyeGeometry(
        getBotFaceTarget("idle"),
        style,
        "left"
      ).match(/[A-Z]/g)
      for (const state of BOT_FACE_STATES) {
        const pose = getBotFaceTarget(state, 0)
        const path = getBotFaceEyeGeometry(pose, style, "left")
        expect(path.match(/[A-Z]/g)).toEqual(commands)
        expect(path).toMatch(/Z$/)
        expect(path).not.toMatch(/NaN|undefined|Infinity/)
      }
      expect(getBotFaceEyePath(style, 1, 0)).not.toMatch(
        /NaN|undefined|Infinity/
      )
    }
  })
})

describe("BotFace continuity", () => {
  it("starts a gesture on state entry and never restarts it on repeated session updates", () => {
    const playing = stepBotFacePlayback(
      { state: "working", elapsed: 850 },
      "working",
      50
    )
    expect(playing).toEqual({ state: "working", elapsed: 900 })
    const changed = stepBotFacePlayback(playing, "questioning", 16)
    expect(changed).toEqual({ state: "questioning", elapsed: 0 })
    expect(stepBotFacePlayback(changed, "questioning", 16).elapsed).toBe(16)
  })
  it("lets the eyes arrive ahead of the head", () => {
    const motion = createBotFaceMotion("idle")
    const target = getBotFaceTarget("happy", 0)
    let next = motion
    for (let index = 0; index < 8; index++)
      next = stepBotFaceMotion(next, target, 16, 250, 380)
    const shape =
      Math.abs(next.pose.leftCurve - motion.pose.leftCurve) /
      Math.abs(target.leftCurve - motion.pose.leftCurve)
    const head =
      Math.abs(next.pose.tilt - motion.pose.tilt) /
      Math.abs(target.tilt - motion.pose.tilt)
    expect(shape).toBeGreaterThan(head + 0.05)
  })

  it("retargets from the current pose and retains velocity without resetting", () => {
    let motion = createBotFaceMotion("idle")
    for (let index = 0; index < 8; index++)
      motion = stepBotFaceMotion(
        motion,
        getBotFaceTarget("happy", 0),
        16,
        250,
        380
      )
    const before = motion.pose
    const next = stepBotFaceMotion(
      motion,
      getBotFaceTarget("questioning", 0),
      0,
      250,
      380
    )
    expect(next.pose).toEqual(before)
    expect(next.velocity).toEqual(motion.velocity)
    expect(next.pose).not.toEqual(getBotFaceTarget("idle", 0))
  })

  it("is independent of frame rate for the same elapsed time", () => {
    const target = getBotFaceTarget("questioning", 0)
    function sample(rate: number) {
      let motion = createBotFaceMotion("idle")
      for (let index = 0; index < rate; index++)
        motion = stepBotFaceMotion(motion, target, 1000 / rate, 250, 380)
      return motion.pose
    }
    const slow = sample(60)
    const fast = sample(120)
    Object.values(slow).forEach((value, index) =>
      expect(value).toBeCloseTo(Object.values(fast)[index], 8)
    )
  })

  it("settles instantly when motion timing is zero", () => {
    const target = getBotFaceTarget("error", 0)
    const next = stepBotFaceMotion(
      createBotFaceMotion("working"),
      target,
      16,
      0,
      0
    )
    expect(next.pose).toEqual(target)
    expect(Object.values(next.velocity).every((value) => value === 0)).toBe(
      true
    )
  })

  it("keeps eye geometry finite and motion bounded during rapid interruptions", () => {
    let motion = createBotFaceMotion("idle")
    for (let index = 0; index < 720; index++) {
      const state =
        BOT_FACE_STATES[Math.floor(index / 9) % BOT_FACE_STATES.length]
      motion = stepBotFaceMotion(
        motion,
        getBotFaceTarget(state, index * 16),
        16,
        250,
        380
      )
      expect(Math.abs(motion.pose.tilt)).toBeLessThanOrEqual(BOT_FACE_MAX_TILT)
      expect(
        Math.hypot(motion.pose.gazeX, motion.pose.gazeY)
      ).toBeLessThanOrEqual(1.000001)
      for (const style of ["slant", "dots", "square"] as const) {
        expect(getBotFaceEyeGeometry(motion.pose, style, "left")).not.toMatch(
          /NaN|undefined|Infinity/
        )
      }
    }
  })
})
