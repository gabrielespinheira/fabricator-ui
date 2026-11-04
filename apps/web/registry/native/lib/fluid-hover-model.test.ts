import { describe, expect, it } from "vitest"

import { sameRect, shouldGlide } from "@/registry/native/lib/fluid-hover-model"

const a = { top: 0, left: 0, width: 100, height: 40 }
const b = { top: 40, left: 0, width: 100, height: 40 }

describe("sameRect", () => {
  it("compares by value", () => {
    expect(sameRect(a, { ...a })).toBe(true)
    expect(sameRect(a, b)).toBe(false)
    expect(sameRect(null, null)).toBe(true)
    expect(sameRect(a, null)).toBe(false)
  })
})

describe("shouldGlide", () => {
  it("slides between rows, and appears in place otherwise", () => {
    expect(shouldGlide(a, b)).toBe(true)
    expect(shouldGlide(null, b)).toBe(false)
    expect(shouldGlide(a, null)).toBe(false)
  })
})
