import { describe, expect, it } from "vitest"

import { getFieldErrorMessages } from "@/registry/native/lib/field-model"

describe("getFieldErrorMessages", () => {
  it("has nothing to say without errors", () => {
    expect(getFieldErrorMessages(undefined)).toEqual([])
    expect(getFieldErrorMessages([])).toEqual([])
    expect(getFieldErrorMessages([undefined, {}])).toEqual([])
  })

  it("keeps each message once, in order", () => {
    expect(
      getFieldErrorMessages([
        { message: "Too short" },
        undefined,
        { message: "No digits" },
        { message: "Too short" },
      ])
    ).toEqual(["Too short", "No digits"])
  })
})
