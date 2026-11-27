import { describe, expect, it } from "vitest"

import { getStepState } from "./stepper-model"

describe("getStepState", () => {
  it("places each step against the current one", () => {
    expect(getStepState(1, 2)).toBe("complete")
    expect(getStepState(2, 2)).toBe("current")
    expect(getStepState(3, 2)).toBe("upcoming")
  })

  it("completes every step once current passes the last", () => {
    expect(getStepState(4, 5)).toBe("complete")
  })
})
