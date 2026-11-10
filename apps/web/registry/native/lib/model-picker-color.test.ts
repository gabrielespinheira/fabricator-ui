import { describe, expect, it } from "vitest"

import { oklchToHex } from "@/registry/fabricator/surface-tint"
import {
  parseColor,
  saturateColor,
  shiftHue,
} from "@/registry/native/lib/model-picker-color"

function channels(color: string | null) {
  const parsed = color === null ? null : parseColor(color)
  if (!parsed) throw new Error(`Not a colour: ${color}`)
  return parsed
}

/** Equal within a step of rounding on each channel. */
function expectClose(actual: string | null, expected: string) {
  const a = channels(actual)
  const b = channels(expected)
  expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(1)
  expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(1)
  expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(1)
  expect(a.a).toBeCloseTo(b.a)
}

describe("parseColor", () => {
  it("reads the hex the native theme writes", () => {
    expect(parseColor("#1156c1")).toEqual({ r: 17, g: 86, b: 193, a: 1 })
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 })
    expect(parseColor("#11223380")).toEqual({
      r: 17,
      g: 34,
      b: 51,
      a: 128 / 255,
    })
  })

  it("reads rgb() and rgba()", () => {
    expect(parseColor("rgba(0, 0, 0, 0.04)")).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0.04,
    })
    expect(parseColor("rgb(255 128 0)")).toEqual({ r: 255, g: 128, b: 0, a: 1 })
    expect(parseColor("rgb(255 128 0 / 0.5)")).toEqual({
      r: 255,
      g: 128,
      b: 0,
      a: 0.5,
    })
  })

  it("gives up on anything else", () => {
    expect(parseColor("transparent")).toBeNull()
    expect(parseColor("oklch(0.5 0.1 250)")).toBeNull()
    expect(parseColor("#12")).toBeNull()
  })
})

describe("shiftHue", () => {
  it("turns the OKLCH hue, as the website's relative colour does", () => {
    expectClose(
      shiftHue(oklchToHex(0.55, 0.15, 250), 60),
      oklchToHex(0.55, 0.15, 310)
    )
    expectClose(
      shiftHue(oklchToHex(0.8, 0.08, 255), 30),
      oklchToHex(0.8, 0.08, 285)
    )
  })

  it("leaves a colour alone at no shift", () => {
    expectClose(shiftHue("#1156c1", 0), "#1156c1")
    expectClose(shiftHue("#1156c1", 360), "#1156c1")
  })

  it("keeps greys grey and alpha as it was", () => {
    expectClose(shiftHue("#808080", 45), "#808080")
    expectClose(shiftHue("rgba(17, 86, 193, 0.5)", 0), "rgba(17, 86, 193, 0.5)")
  })

  it("gives up on a colour it can't read", () => {
    expect(shiftHue("transparent", 30)).toBeNull()
  })
})

describe("saturateColor", () => {
  it("applies CSS's saturate() filter", () => {
    expect(saturateColor("#808040", 1.5)).toBe("#828222")
  })

  it("leaves a colour alone at 1 and greys at any amount", () => {
    expect(saturateColor("#1156c1", 1)).toBe("#1156c1")
    expect(saturateColor("#808080", 1.5)).toBe("#808080")
  })

  it("clamps to the sRGB range", () => {
    expect(saturateColor("#ff0000", 1.5)).toBe("#ff0000")
  })

  it("keeps alpha", () => {
    expect(saturateColor("rgba(128, 128, 64, 0.5)", 1.5)).toBe(
      "rgba(130, 130, 34, 0.5)"
    )
  })
})
