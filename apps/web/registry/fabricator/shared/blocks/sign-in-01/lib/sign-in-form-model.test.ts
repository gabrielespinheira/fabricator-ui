import { describe, expect, it } from "vitest"

import {
  getProviderMessage,
  getSignInErrors,
  getSignInFailure,
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

describe("getSignInFailure", () => {
  it("puts an unknown address on the email field and returns there", () => {
    expect(getSignInFailure("unknown-email")).toEqual({
      place: "email",
      message: "No account uses this email.",
      focus: "email",
    })
  })

  it("puts a wrong password above the button and returns to the password", () => {
    expect(getSignInFailure("wrong-password")).toMatchObject({
      place: "form",
      focus: "password",
    })
  })

  it("keeps a problem with neither field above the button", () => {
    expect(getSignInFailure("too-many-attempts").place).toBe("form")
    expect(getSignInFailure("network").place).toBe("form")
  })
})

describe("getProviderMessage", () => {
  it("names the provider", () => {
    expect(getProviderMessage("apple", "cancelled")).toBe(
      "Apple sign-in was closed before it finished."
    )
  })

  it("says when the provider can't be reached", () => {
    expect(getProviderMessage("google", "network")).toBe(
      "We couldn't reach Google. Check your connection."
    )
  })
})
