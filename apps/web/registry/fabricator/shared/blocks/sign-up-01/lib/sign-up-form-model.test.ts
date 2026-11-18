import { describe, expect, it } from "vitest"

import {
  getPasswordChecks,
  getSignUpErrors,
  isPasswordStrong,
} from "@/registry/fabricator/shared/blocks/sign-up-01/lib/sign-up-form-model"

describe("getPasswordChecks", () => {
  it("marks each rule as the password meets it", () => {
    expect(getPasswordChecks("abc")).toEqual([
      { id: "length", label: "8 or more characters", isMet: false },
      { id: "number", label: "A number or a symbol", isMet: false },
    ])
    expect(getPasswordChecks("correct horse 9")).toEqual([
      { id: "length", label: "8 or more characters", isMet: true },
      { id: "number", label: "A number or a symbol", isMet: true },
    ])
  })

  it("counts a symbol as well as a digit", () => {
    expect(isPasswordStrong("longenough!")).toBe(true)
    expect(isPasswordStrong("longenough")).toBe(false)
  })
})

describe("getSignUpErrors", () => {
  it("asks for every empty field", () => {
    expect(getSignUpErrors({ name: " ", email: "", password: "" })).toEqual({
      name: "Enter your name.",
      email: "Enter your work email.",
      password: "Choose a password.",
    })
  })

  it("says which password rule is missing", () => {
    expect(
      getSignUpErrors({ name: "Ada", email: "ada@acme.com", password: "short" })
    ).toEqual({
      password: "Use 8 or more characters, with a number or a symbol.",
    })
  })

  it("accepts a complete form", () => {
    expect(
      getSignUpErrors({
        name: "Ada Lovelace",
        email: "ada@acme.com",
        password: "analytical-engine-1",
      })
    ).toEqual({})
  })
})
