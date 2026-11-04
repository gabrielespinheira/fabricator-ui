import { describe, expect, it } from "vitest"

import {
  getSurfaceFrom,
  parseBezier,
  parseNumber,
} from "@/registry/native/lib/motion-tokens"

describe("parseBezier", () => {
  it("reads the theme's curves", () => {
    expect(parseBezier("cubic-bezier(0.23, 1, 0.32, 1)")).toEqual([
      0.23, 1, 0.32, 1,
    ])
  })

  it("falls back to linear for anything else", () => {
    expect(parseBezier("ease")).toEqual([0, 0, 1, 1])
    expect(parseBezier(undefined)).toEqual([0, 0, 1, 1])
    expect(parseBezier("cubic-bezier(1, 2)")).toEqual([0, 0, 1, 1])
  })
})

describe("parseNumber", () => {
  it("reads numbers however the theme wrote them", () => {
    expect(parseNumber(250, 0)).toBe(250)
    expect(parseNumber("250ms", 0)).toBe(250)
    expect(parseNumber("6px", 0)).toBe(6)
  })

  it("uses the fallback otherwise", () => {
    expect(parseNumber(undefined, 4)).toBe(4)
    expect(parseNumber("none", 4)).toBe(4)
  })
})

describe("getSurfaceFrom", () => {
  it("starts from the scale and travel", () => {
    expect(getSurfaceFrom({ scale: 0.94, translateY: 6 }, false)).toEqual({
      opacity: 0,
      scale: 0.94,
      translateY: 6,
    })
  })

  it("keeps only the fade with Reduce Motion", () => {
    expect(getSurfaceFrom({ scale: 0.94, translateY: 6 }, true)).toEqual({
      opacity: 0,
      scale: 1,
      translateY: 0,
    })
  })
})
