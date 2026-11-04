import { describe, expect, it } from "vitest"

import {
  getFadeOpacity,
  withAlpha,
} from "@/registry/native/lib/scroll-fade-model"

describe("withAlpha", () => {
  it("handles every format the theme writes", () => {
    expect(withAlpha("#171717", 0)).toBe("rgba(23, 23, 23, 0)")
    expect(withAlpha("#abc", 0.5)).toBe("rgba(170, 187, 204, 0.5)")
    expect(withAlpha("#17171780", 0)).toBe("rgba(23, 23, 23, 0)")
    expect(withAlpha("rgb(1, 2, 3)", 0)).toBe("rgba(1, 2, 3, 0)")
    expect(withAlpha("rgba(1, 2, 3, 0.4)", 0)).toBe("rgba(1, 2, 3, 0)")
  })

  it("falls back to transparent for what it can't read", () => {
    expect(withAlpha("oklch(0.5 0.1 200)", 0)).toBe("transparent")
  })
})

describe("getFadeOpacity", () => {
  it("grows with the distance to the edge, up to the fade's size", () => {
    expect(getFadeOpacity(0, 24)).toBe(0)
    expect(getFadeOpacity(12, 24)).toBe(0.5)
    expect(getFadeOpacity(48, 24)).toBe(1)
  })

  it("is off past the edge, while bouncing", () => {
    expect(getFadeOpacity(-10, 24)).toBe(0)
  })
})
