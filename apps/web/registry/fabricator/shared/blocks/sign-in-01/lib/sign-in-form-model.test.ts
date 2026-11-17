import { describe, expect, it } from "vitest"

import {
  getSignInErrors,
  hasSignInErrors,
} from "@/registry/fabricator/shared/blocks/sign-in-01/lib/sign-in-form-model"

describe("getSignInErrors", () => {
  it("asks for both fields when they are empty", () => {
    expect(getSignInErrors({ email: "", password: "" })).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    })
  })

  it("explains the email format with an example", () => {
    expect(getSignInErrors({ email: "ada@", password: "x" })).toEqual({
      email: "Enter an email address like ada@acme.com.",
    })
  })

  it("ignores spaces around the email", () => {
    expect(
      getSignInErrors({ email: "  ada@acme.com ", password: "secret" })
    ).toEqual({})
  })
})

describe("hasSignInErrors", () => {
  it("is true only when a field has a message", () => {
    expect(hasSignInErrors({})).toBe(false)
    expect(hasSignInErrors({ email: "Enter your email address." })).toBe(true)
  })
})
