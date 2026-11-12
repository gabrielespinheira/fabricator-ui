import { describe, expect, it } from "vitest"

import { getUsernameError } from "./username"

describe("getUsernameError", () => {
  it("accepts a free username of three or more characters", () => {
    expect(getUsernameError("ana.silva")).toBeUndefined()
  })

  it("asks for a username when the field is empty", () => {
    expect(getUsernameError("  ")).toBe("Enter a username.")
  })

  it("asks for at least three characters", () => {
    expect(getUsernameError("an")).toBe("Use at least 3 characters.")
  })

  it("rejects a taken username, ignoring case and spaces", () => {
    expect(getUsernameError(" Ana ")).toBe(
      "That username is taken. Add a number."
    )
  })
})
