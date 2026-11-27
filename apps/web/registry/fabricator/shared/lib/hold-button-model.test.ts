import { describe, expect, it } from "vitest"

import { getHoldOutcome, isHoldKey } from "./hold-button-model"

describe("isHoldKey", () => {
  it("holds with the keys that press a button", () => {
    expect(isHoldKey(" ")).toBe(true)
    expect(isHoldKey("Enter")).toBe(true)
    expect(isHoldKey("a")).toBe(false)
  })
})

describe("getHoldOutcome", () => {
  it("confirms only a press held for the whole duration", () => {
    expect(getHoldOutcome(1200, 1200)).toBe("complete")
    expect(getHoldOutcome(1199, 1200)).toBe("released")
  })
})
