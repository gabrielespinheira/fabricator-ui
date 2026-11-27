import { describe, expect, it } from "vitest"

import { getNumberRollDirection } from "./number-roll-model"

describe("getNumberRollDirection", () => {
  it("rolls up when the value grows and down when it shrinks", () => {
    expect(getNumberRollDirection("4", "5")).toBe("up")
    expect(getNumberRollDirection("5", "4")).toBe("down")
  })

  it("reads formatted numbers", () => {
    expect(getNumberRollDirection("$1,234.50", "$1,235.50")).toBe("up")
    expect(getNumberRollDirection("12 %", "-3 %")).toBe("down")
    expect(getNumberRollDirection("1.234,5", "1.235,5")).toBe("up")
  })

  it("stays still when nothing comparable changed", () => {
    expect(getNumberRollDirection("5", "5")).toBeNull()
    expect(getNumberRollDirection("", "5")).toBeNull()
    expect(getNumberRollDirection("5", "")).toBeNull()
  })
})
