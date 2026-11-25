import { describe, expect, it } from "vitest"

import {
  formatCountdown,
  getCodeError,
  getEmailError,
  getNewPasswordError,
  getPasswordChecks,
  getResetFailure,
  getStepPosition,
  normalizeCode,
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

describe("normalizeCode", () => {
  it("keeps the digits of a code pasted the way emails write it", () => {
    expect(normalizeCode("482 913")).toBe("482913")
    expect(normalizeCode("482-913\n")).toBe("482913")
    expect(normalizeCode("Your code is 482913.")).toBe("482913")
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
      "Use 8 characters or more, with a number or symbol."
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

describe("getResetFailure", () => {
  it("keeps a problem with the code on the code step", () => {
    expect(getResetFailure("code", "invalid-code")).toEqual({
      step: "code",
      place: "code",
      message: "That code doesn't match. Check the newest email.",
      canResendNow: false,
    })
  })

  it("lets people ask for a new code the moment theirs expires", () => {
    expect(getResetFailure("code", "expired-code")).toMatchObject({
      step: "code",
      place: "code",
      canResendNow: true,
    })
  })

  it("returns to the code step when it expires while choosing a password", () => {
    expect(getResetFailure("password", "expired-code")).toMatchObject({
      step: "code",
      place: "code",
      canResendNow: true,
    })
  })

  it("stays on the step when the server can't be reached", () => {
    expect(getResetFailure("password", "network")).toMatchObject({
      step: "password",
      place: "form",
    })
    expect(getResetFailure("email", "network").step).toBe("email")
  })
})

describe("formatCountdown", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(formatCountdown(30)).toBe("0:30")
    expect(formatCountdown(5)).toBe("0:05")
    expect(formatCountdown(65)).toBe("1:05")
  })
})
