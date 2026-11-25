import { describe, expect, it } from "vitest"

import {
  getBrandReport,
  getContrast,
  getReadableShade,
  getTextOn,
} from "./settings-color-model"

describe("getContrast", () => {
  it("goes from 1 to 21", () => {
    expect(getContrast("#000000", "#ffffff")).toBeCloseTo(21)
    expect(getContrast("#ffffff", "#ffffff")).toBe(1)
    expect(getContrast("nope", "#ffffff")).toBe(1)
  })
})

describe("getTextOn", () => {
  it("picks the more readable of black and white", () => {
    expect(getTextOn("#1d4ed8")).toBe("#ffffff")
    expect(getTextOn("#facc15")).toBe("#000000")
  })
})

describe("getReadableShade", () => {
  it("leaves a readable colour alone", () => {
    expect(getReadableShade("#1d4ed8", "#ffffff")).toBe("#1d4ed8")
  })

  it("darkens on light and lightens on dark until it reads", () => {
    for (const background of ["#ffffff", "#1c1c1c"]) {
      const shade = getReadableShade("#facc15", background)
      expect(getContrast(shade, background)).toBeGreaterThanOrEqual(4.5)
      const navy = getReadableShade("#1e1b4b", background)
      expect(getContrast(navy, background)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("getBrandReport", () => {
  it("says when the link had to change", () => {
    expect(getBrandReport("#1d4ed8").isLinkAdjusted).toBe(false)
    expect(getBrandReport("#facc15").isLinkAdjusted).toBe(true)
  })

  it("rounds the ratio down, so 4.49 never reads as 4.5", () => {
    expect(getBrandReport("#777777").ratio).toBeLessThanOrEqual(
      getContrast("#777777", getTextOn("#777777"))
    )
  })
})
