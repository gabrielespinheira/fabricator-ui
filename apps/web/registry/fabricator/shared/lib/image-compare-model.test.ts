import { describe, expect, it } from "vitest"

import {
  createImageCompareMotion,
  getImageCompareCurve,
  getImageCompareKeyValue,
  getImageCompareLabelOpacity,
  getImageCompareMaxBend,
  getImageCompareNotch,
  getImageCompareReleaseValue,
  getImageCompareValueAtPoint,
  getImageCompareValueText,
  getImageCompareVelocity,
  IMAGE_COMPARE_FLICK_SPEED,
  isImageCompareSettled,
  stepImageCompareMotion,
  type ImageCompareMotion,
} from "./image-compare-model"

const FRAME = 1 / 120
const MAX_BEND = 9

function run(
  motion: ImageCompareMotion,
  target: number,
  mode: "glide" | "drag",
  seconds: number
) {
  let next = motion
  const frames: ImageCompareMotion[] = []
  for (let time = 0; time < seconds; time += FRAME) {
    next = stepImageCompareMotion(next, {
      target,
      mode,
      delta: FRAME,
      maxBend: MAX_BEND,
    })
    frames.push(next)
  }
  return { last: next, frames }
}

describe("ImageCompare values", () => {
  it("reads a point as a percentage of the width, clamped", () => {
    expect(getImageCompareValueAtPoint(135, 270)).toBe(50)
    expect(getImageCompareValueAtPoint(-20, 270)).toBe(0)
    expect(getImageCompareValueAtPoint(400, 270)).toBe(100)
    expect(getImageCompareValueAtPoint(10, 0)).toBe(0)
  })

  it("steps with the arrows, pages by a quarter and jumps with Home and End", () => {
    expect(getImageCompareKeyValue("ArrowRight", 50, 10)).toBe(60)
    expect(getImageCompareKeyValue("ArrowUp", 50, 10)).toBe(60)
    expect(getImageCompareKeyValue("ArrowLeft", 50, 10)).toBe(40)
    expect(getImageCompareKeyValue("ArrowDown", 5, 10)).toBe(0)
    expect(getImageCompareKeyValue("PageUp", 50, 10)).toBe(75)
    expect(getImageCompareKeyValue("PageDown", 50, 10)).toBe(25)
    expect(getImageCompareKeyValue("Home", 50, 10)).toBe(0)
    expect(getImageCompareKeyValue("End", 50, 10)).toBe(100)
    expect(getImageCompareKeyValue("Enter", 50, 10)).toBeNull()
  })

  it("notches every step, higher in pitch towards the end, as a slider does", () => {
    expect(getImageCompareNotch(14, 10)).toEqual({ index: 1, pitch: 0.884 })
    expect(getImageCompareNotch(16, 10).index).toBe(2)
    expect(getImageCompareNotch(0, 10).pitch).toBe(0.8)
    expect(getImageCompareNotch(100, 10).pitch).toBeCloseTo(1.4)
  })

  it("names both pictures' shares for screen readers", () => {
    expect(getImageCompareValueText(30, "Before", "After")).toBe(
      "Before 30%, After 70%"
    )
    expect(getImageCompareValueText(33.333, "Raw", "Graded")).toBe(
      "Raw 33%, Graded 67%"
    )
  })
})

describe("ImageCompare release", () => {
  it("stays where it was let go at an ordinary speed", () => {
    expect(getImageCompareReleaseValue(62, 300)).toBe(62)
    expect(getImageCompareReleaseValue(62, -300)).toBe(62)
  })

  it("glides to the edge it was flicked towards", () => {
    expect(getImageCompareReleaseValue(62, IMAGE_COMPARE_FLICK_SPEED)).toBe(100)
    expect(getImageCompareReleaseValue(62, -IMAGE_COMPARE_FLICK_SPEED)).toBe(0)
  })

  it("measures the pointer's speed over its last moments", () => {
    const samples = [
      { x: 0, time: 0 },
      { x: 10, time: 50 },
      { x: 30, time: 100 },
      { x: 60, time: 150 },
    ]
    // Only the last 100ms count: 50px in 100ms.
    expect(getImageCompareVelocity(samples, 150)).toBe(500)
    // A pointer that rested before letting go has no speed.
    expect(getImageCompareVelocity(samples, 400)).toBe(0)
    expect(getImageCompareVelocity([{ x: 4, time: 0 }], 0)).toBe(0)
  })
})

describe("ImageCompare motion", () => {
  it("glides the knob towards its target and settles exactly on it", () => {
    const { last, frames } = run(createImageCompareMotion(0), 230, "glide", 2)
    // About half way after 90ms, like an ease-out.
    const early = frames[Math.round(0.09 / FRAME)]
    expect(early?.knob).toBeGreaterThan(90)
    expect(early?.knob).toBeLessThan(140)
    expect(last).toEqual(createImageCompareMotion(230))
    expect(isImageCompareSettled(last, 230)).toBe(true)
  })

  it("bends the line: the ends trail the knob by at most the bend, then catch up without a wobble past it", () => {
    const { frames } = run(createImageCompareMotion(100), 300, "glide", 1.5)
    const lag = frames.map((frame) => frame.knob - frame.ends)
    expect(Math.max(...lag)).toBe(MAX_BEND)
    // The soft spring may overshoot a little, never by much.
    expect(Math.min(...lag)).toBeGreaterThan(-1)
    const last = frames.at(-1)
    expect(last && isImageCompareSettled(last, 300)).toBe(true)
  })

  it("catches up with a drag that started away from the knob, then follows it exactly", () => {
    let motion = createImageCompareMotion(135)
    const caught = run(motion, 40, "drag", 0.12).last
    expect(caught.knob).toBe(40)
    expect(caught.isFollowing).toBe(true)
    motion = stepImageCompareMotion(caught, {
      target: 90,
      mode: "drag",
      delta: FRAME,
      maxBend: MAX_BEND,
    })
    expect(motion.knob).toBe(90)
    expect(motion.ends).toBeLessThan(90)
  })

  it("stays stable on a long frame", () => {
    const motion = stepImageCompareMotion(createImageCompareMotion(0), {
      target: 200,
      mode: "drag",
      delta: 0.5,
      maxBend: MAX_BEND,
    })
    expect(Number.isFinite(motion.ends)).toBe(true)
    expect(Math.abs(motion.ends)).toBeLessThan(400)
  })
})

describe("ImageCompare curve", () => {
  it("bends at most a thirtieth of the frame's shorter side", () => {
    expect(getImageCompareMaxBend(270, 360)).toBe(9)
    expect(getImageCompareMaxBend(600, 400)).toBeCloseTo(13.33)
  })

  it("cuts the picture along a curve through the knob", () => {
    expect(getImageCompareCurve(135, 135, 360)).toEqual({
      line: "M135 0Q135 180 135 360",
      clip: "M0 0L135 0Q135 180 135 360L0 360Z",
    })
    // Ends trailing at 120 put the control point at 150, so the curve's
    // middle, (ends + control) / 2, is the knob.
    expect(getImageCompareCurve(135, 120, 360).line).toBe(
      "M120 0Q150 180 120 360"
    )
    expect(getImageCompareCurve(10.256, 8.1, 200).line).toBe(
      "M8.1 0Q12.41 100 8.1 200"
    )
  })
})

describe("ImageCompare labels", () => {
  it("fades a label as the line reaches it", () => {
    expect(getImageCompareLabelOpacity("before", 200, 40)).toBe(1)
    expect(getImageCompareLabelOpacity("before", 40, 40)).toBe(0)
    expect(getImageCompareLabelOpacity("before", 72, 40)).toBeCloseTo(0.5)
    expect(getImageCompareLabelOpacity("after", 100, 230)).toBe(1)
    expect(getImageCompareLabelOpacity("after", 260, 230)).toBe(0)
  })
})
