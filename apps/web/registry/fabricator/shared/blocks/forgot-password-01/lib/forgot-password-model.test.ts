import { describe, expect, it } from "vitest"

import {
  formatCountdown,
  getCodeError,
  getEmailError,
  getNewPasswordError,
  getPasswordChecks,
  getStepPosition,
} from "@/registry/fabricator/shared/blocks/forgot-password-01/lib/forgot-password-model"

describe("getStepPosition", () => {
  it("numbers the three steps and leaves the end out", () => {
    expect(getStepPosition("email")).toEqual({ step: 1, total: 3 })
    expect(getStepPosition("code")).toEqual({ step: 2, total: 3 })
    expect(getStepPosition("password")).toEqual({ step: 3, total: 3 })
    expect(getStepPosition("done")).toBeNull()
  })
})

describe("getEmailError", () => {
  it("asks for an address, then for a valid one", () => {
    expect(getEmailError("")).toBe("Enter the email you sign in with.")
    expect(getEmailError("ada")).toBe(
      "Enter an email address like ada@acme.com."
    )
    expect(getEmailError(" ada@acme.com ")).toBeUndefined()
  })
})

describe("getCodeError", () => {
  it("wants all six digits", () => {
    expect(getCodeError("12345")).toBe("Enter all 6 digits of the code.")
    expect(getCodeError("123456")).toBeUndefined()
  })
})

describe("getNewPasswordError", () => {
  it("follows the password rules", () => {
    expect(getNewPasswordError("")).toBe("Choose a new password.")
    expect(getNewPasswordError("abcdefgh")).toBe(
      "Use 8 or more characters, with a number or a symbol."
    )
    expect(getNewPasswordError("abcdefg1")).toBeUndefined()
  })

  it("lists which rules are met", () => {
    expect(getPasswordChecks("abc1").map((check) => check.isMet)).toEqual([
      false,
      true,
    ])
  })
})

describe("formatCountdown", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(formatCountdown(30)).toBe("0:30")
    expect(formatCountdown(5)).toBe("0:05")
    expect(formatCountdown(65)).toBe("1:05")
  })
})
