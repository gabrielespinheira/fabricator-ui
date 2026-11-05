import { describe, expect, it } from "vitest"

import { getToastFeedback } from "@/registry/native/lib/toast-model"

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
