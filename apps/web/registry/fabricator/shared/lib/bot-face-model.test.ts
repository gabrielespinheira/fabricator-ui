import { describe, expect, it } from "vitest"

import {
  BOT_FACE_COLORS,
  BOT_FACE_SHAPES,
  getBotFaceBlink,
  getBotFaceCustomColors,
  getBotFaceGaze,
  getBotFaceIdleGaze,
  getBotFacePath,
  getBotFacePhase,
  isBotFaceNamedColor,
} from "./bot-face-model"

describe("BotFace custom colors", () => {
  it("supports gray without removing any named theme colors", () => {
    expect(BOT_FACE_COLORS).toContain("gray")
    expect(isBotFaceNamedColor("gray")).toBe(true)
    expect(isBotFaceNamedColor("primary")).toBe(true)
    expect(isBotFaceNamedColor("#abcdef")).toBe(false)
  })

  it("accepts CSS hex lengths, including shorthand and alpha", () => {
    for (const color of ["#abc", "#AbCd", "#12abEF", "#12abEF80"]) {
      expect(getBotFaceCustomColors(color).fill).toBe(color)
    }
    for (const color of [
      "#12",
      "#12345",
      "#1234567",
      "#gggggg",
      "red",
      "rgb(0 0 0)",
      "abcdef",
    ]) {
      expect(() => getBotFaceCustomColors(color)).toThrow(RangeError)
    }
  })

  it("selects readable eyes for dark, light and midtone custom colors", () => {
    expect(getBotFaceCustomColors("#000").eyes).toBe("#ffffff")
    expect(getBotFaceCustomColors("#fff").eyes).toBe("#000000")
    for (const color of [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#777777",
      "#fab123",
    ]) {
      const { eyes } = getBotFaceCustomColors(color)
      const channels = [1, 3, 5].map(
        (index) => parseInt(color.slice(index, index + 2), 16) / 255
      )
      const linear = channels.map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      )
      const luminance =
        linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
      const ratio =
        eyes === "#000000"
          ? (luminance + 0.05) / 0.05
          : 1.05 / (luminance + 0.05)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("BotFace gaze", () => {
  it("looks at the pointer relative to the face and stays within an ellipse", () => {
    expect(
      getBotFaceGaze(50, 50, { x: 0, y: 0, width: 100, height: 100 })
    ).toEqual({ x: 0, y: 0 })
    const right = getBotFaceGaze(10000, 50, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    expect(right.x).toBe(1)
    expect(right.y).toBe(0)
    const corner = getBotFaceGaze(-1000, -1000, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(1)
    expect(corner.x).toBeLessThan(0)
    expect(corner.y).toBeLessThan(0)
  })

  it("clamps explicit gaze and handles a zero-sized face", () => {
    expect(getBotFaceGaze(0, 0, { x: 0, y: 0, width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    })
    expect(
      getBotFaceGaze(150, 100, { x: 50, y: 50, width: 100, height: 100 }).x
    ).toBeGreaterThan(0)
  })

  it("gives idle glances pauses and bounded, varied directions", () => {
    const first = getBotFaceIdleGaze(0)
    expect(getBotFaceIdleGaze(500)).toEqual(first)
    expect(getBotFaceIdleGaze(4000)).not.toEqual(first)
    for (let time = 0; time < 30000; time += 100) {
      const gaze = getBotFaceIdleGaze(time)
      expect(Math.hypot(gaze.x, gaze.y)).toBeLessThanOrEqual(0.8)
    }
  })
})

describe("BotFace blink", () => {
  it("stably staggers each instance's blink and glance phase", () => {
    expect(getBotFacePhase("assistant-a")).toBe(getBotFacePhase("assistant-a"))
    expect(getBotFacePhase("assistant-a")).not.toBe(
      getBotFacePhase("assistant-b")
    )
    expect(getBotFacePhase("assistant-a")).toBeGreaterThanOrEqual(0)
    expect(getBotFacePhase("assistant-a")).toBeLessThan(4700)
  })
  it("starts open, closes briefly, and opens again", () => {
    expect(getBotFaceBlink(0)).toBe(1)
    expect(getBotFaceBlink(3280)).toBeLessThan(0.15)
    expect(getBotFaceBlink(3500)).toBe(1)
    expect(getBotFaceBlink(4000, false)).toBe(1)
  })
})

it("provides distinct closed geometry for all fourteen silhouettes", () => {
  expect(BOT_FACE_SHAPES).toHaveLength(14)
  const paths = BOT_FACE_SHAPES.map(getBotFacePath)
  expect(new Set(paths).size).toBe(14)
  for (const path of paths) {
    expect(path).toMatch(/^M/)
    expect(path).toMatch(/Z$/)
    expect(path).not.toMatch(/NaN|undefined/)
  }
})
