import { describe, expect, it } from "vitest"

import {
  getSurfaceFrom,
  getSurfaceOrigin,
  getSurfaceTravel,
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
      translateX: 0,
      translateY: 6,
    })
  })

  it("can slide in solid, as a toast does", () => {
    expect(
      getSurfaceFrom({ translateY: -120, hasFade: false }, false).opacity
    ).toBe(1)
  })

  it("fades a surface that would slide in solid, with Reduce Motion", () => {
    expect(getSurfaceFrom({ translateY: -120, hasFade: false }, true)).toEqual({
      opacity: 0,
      scale: 1,
      translateX: 0,
      translateY: 0,
    })
  })

  it("keeps only the fade with Reduce Motion", () => {
    expect(getSurfaceFrom({ scale: 0.94, translateY: 6 }, true)).toEqual({
      opacity: 0,
      scale: 1,
      translateX: 0,
      translateY: 0,
    })
  })
})

describe("getSurfaceOrigin", () => {
  it("grows from the trigger's side and alignment", () => {
    expect(getSurfaceOrigin("bottom", "start")).toBe("top left")
    expect(getSurfaceOrigin("bottom", "center")).toBe("top center")
    expect(getSurfaceOrigin("top", "end")).toBe("bottom right")
  })

  it("defaults to the centre", () => {
    expect(getSurfaceOrigin(undefined, undefined)).toBe("center")
  })
})

describe("getSurfaceTravel", () => {
  it("slides from the trigger's side", () => {
    expect(getSurfaceTravel("bottom", 6)).toEqual({
      translateX: 0,
      translateY: -6,
    })
    expect(getSurfaceTravel("top", 6)).toEqual({ translateX: 0, translateY: 6 })
    expect(getSurfaceTravel("right", 4)).toEqual({
      translateX: -4,
      translateY: 0,
    })
    expect(getSurfaceTravel("left", 4)).toEqual({
      translateX: 4,
      translateY: 0,
    })
  })

  it("doesn't move without a side", () => {
    expect(getSurfaceTravel(undefined, 6)).toEqual({
      translateX: 0,
      translateY: 0,
    })
  })
})
