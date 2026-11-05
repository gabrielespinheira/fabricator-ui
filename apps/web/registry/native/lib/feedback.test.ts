import { describe, expect, it } from "vitest"

import { isAfterGesture } from "@/registry/native/lib/feedback"

describe("isAfterGesture", () => {
  it("lets a surface sound right after a touch", () => {
    expect(isAfterGesture(1500, 1000)).toBe(true)
  })

  it("keeps a surface that opened by itself quiet", () => {
    expect(isAfterGesture(2500, 1000)).toBe(false)
  })

  it("is quiet before any touch at all", () => {
    expect(isAfterGesture(100, null)).toBe(false)
  })
})
