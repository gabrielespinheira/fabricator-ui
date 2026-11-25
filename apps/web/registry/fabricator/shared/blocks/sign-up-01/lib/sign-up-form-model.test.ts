import { describe, expect, it } from "vitest"

import {
  formatCountdown,
  getInbox,
  getPasswordChecks,
  getProviderMessage,
  getSignUpErrors,
  getSignUpFailure,
  isPasswordStrong,
} from "@/registry/fabricator/shared/blocks/sign-up-01/lib/sign-up-form-model"

describe("getPasswordChecks", () => {
  it("marks each rule as the password meets it", () => {
    expect(getPasswordChecks("abc")).toEqual([
      { id: "length", label: "8 characters or more", isMet: false },
      { id: "number", label: "A number or symbol", isMet: false },
    ])
    expect(getPasswordChecks("correct horse 9")).toEqual([
      { id: "length", label: "8 characters or more", isMet: true },
      { id: "number", label: "A number or symbol", isMet: true },
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
      password: "Use 8 characters or more, with a number or symbol.",
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

describe("getSignUpFailure", () => {
  it("puts a taken address on the email field", () => {
    expect(getSignUpFailure("email-taken")).toEqual({
      place: "email",
      message: "This email already has an account.",
    })
  })

  it("puts anything else above the button", () => {
    expect(getSignUpFailure("network").place).toBe("form")
  })
})

describe("getProviderMessage", () => {
  it("names the provider", () => {
    expect(getProviderMessage("apple", "cancelled")).toBe(
      "Apple sign-up was closed before it finished."
    )
  })
})

describe("getInbox", () => {
  it("knows the inbox of a personal address", () => {
    expect(getInbox("ada@gmail.com")).toEqual({
      name: "Gmail",
      href: "https://mail.google.com",
    })
    expect(getInbox(" Ada@Outlook.com")?.name).toBe("Outlook")
  })

  it("doesn't guess where a company keeps its mail", () => {
    expect(getInbox("ada@acme.com")).toBeNull()
    expect(getInbox("ada@gmail.com.evil.io")).toBeNull()
  })
})

describe("formatCountdown", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(formatCountdown(30)).toBe("0:30")
    expect(formatCountdown(5)).toBe("0:05")
    expect(formatCountdown(65)).toBe("1:05")
  })
})
