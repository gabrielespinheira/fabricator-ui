import { describe, expect, it } from "vitest"

import {
  getStackSizes,
  getToastFeedback,
} from "@/registry/native/lib/toast-model"

describe("getToastFeedback", () => {
  it("plays a status's own sound", () => {
    expect(getToastFeedback("success")).toBe("success")
    expect(getToastFeedback("warning")).toBe("warning")
    expect(getToastFeedback("error")).toBe("error")
  })

  it("plays notify for everything else, as on the website", () => {
    expect(getToastFeedback("info")).toBe("notify")
    expect(getToastFeedback("custom")).toBe("notify")
    expect(getToastFeedback(undefined)).toBe("notify")
  })

  it("stays silent while loading, so it plays when it settles", () => {
    expect(getToastFeedback("loading")).toBeNull()
  })
})

describe("getStackSizes", () => {
  const SMALL = { width: 120, height: 40 }
  const LARGE = { width: 300, height: 90 }

  it("has none until a toast is laid out", () => {
    expect(getStackSizes([])).toEqual([])
    expect(getStackSizes([{}, {}])).toEqual([])
  })

  it("lends a new toast the size of the one it covers", () => {
    expect(getStackSizes([{}, { size: SMALL }, { size: LARGE }])).toEqual([
      SMALL,
      SMALL,
      LARGE,
    ])
  })
})
