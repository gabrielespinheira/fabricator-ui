import { describe, expect, it } from "vitest"

import { contrast, DARK_SURFACE, resolveBrandColors } from "./brand-colors"

describe("resolveBrandColors", () => {
  it("keeps the exact official hex in light mode", () => {
    expect(resolveBrandColors("#FF0069").light).toBe("#FF0069")
  })

  it("lifts a dark hue until it is legible on the dark surface", () => {
    const { dark, inherit } = resolveBrandColors("#BD081C")
    expect(inherit).toBe(false)
    expect(contrast(dark, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it("hands black and near-black marks to the foreground", () => {
    expect(resolveBrandColors("#000000").inherit).toBe(true)
    expect(resolveBrandColors("#181717").inherit).toBe(true)
  })

  it("leaves already-legible marks untouched in dark mode", () => {
    expect(resolveBrandColors("#1ED760").dark).toBe("#1ED760")
  })

  it("is deterministic", () => {
    expect(resolveBrandColors("#0A66C2")).toEqual(resolveBrandColors("#0A66C2"))
  })
})
