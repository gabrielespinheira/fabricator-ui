import { describe, expect, it } from "vitest"

import {
  formatCardNumber,
  formatExpiry,
  getCardBrand,
  getCardErrors,
  getCardOutcome,
  getExpiryState,
  isCardNumberValid,
} from "@/registry/fabricator/shared/blocks/billing-01/lib/billing-card-model"

const NOW = new Date("2026-11-24T15:00:00Z")

describe("formatCardNumber", () => {
  it("groups as it is typed, and drops what isn't a digit", () => {
    expect(formatCardNumber("42424242")).toBe("4242 4242")
    expect(formatCardNumber("4242-4242 4242x4242")).toBe("4242 4242 4242 4242")
    expect(formatCardNumber("4242424242424242999")).toBe("4242 4242 4242 4242")
  })

  it("groups Amex its own way", () => {
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005")
  })
})

describe("formatExpiry", () => {
  it("adds the slash and a leading zero", () => {
    expect(formatExpiry("1229")).toBe("12/29")
    expect(formatExpiry("4")).toBe("04")
    expect(formatExpiry("1")).toBe("1")
    expect(formatExpiry("12")).toBe("12")
    expect(formatExpiry("12/2029")).toBe("12/20")
  })
})

describe("getCardBrand", () => {
  it("reads it from the first digits", () => {
    expect(getCardBrand("4242")).toBe("visa")
    expect(getCardBrand("5555 5555")).toBe("mastercard")
    expect(getCardBrand("2223 0031")).toBe("mastercard")
    expect(getCardBrand("3782")).toBe("amex")
    expect(getCardBrand("6011")).toBe("card")
    expect(getCardBrand("")).toBe("card")
  })
})

describe("isCardNumberValid", () => {
  it("checks the length and the check digit", () => {
    expect(isCardNumberValid("4242 4242 4242 4242")).toBe(true)
    expect(isCardNumberValid("4242 4242 4242 4241")).toBe(false)
    expect(isCardNumberValid("4242")).toBe(false)
    expect(isCardNumberValid("3782 822463 10005")).toBe(true)
  })
})

describe("getExpiryState", () => {
  it("is good through the end of its month", () => {
    expect(getExpiryState({ month: 12, year: 2026 }, NOW)).toBe("soon")
    expect(getExpiryState({ month: 11, year: 2026 }, NOW)).toBe("soon")
    expect(getExpiryState({ month: 10, year: 2026 }, NOW)).toBe("expired")
    expect(getExpiryState({ month: 4, year: 2029 }, NOW)).toBe("ok")
  })
})

describe("getCardErrors", () => {
  it("says how to fix each field", () => {
    expect(getCardErrors({ number: "", expiry: "", code: "" }, NOW)).toEqual({
      number: "Enter the number on the card.",
      expiry: "Enter the month and year.",
      code: "Enter the 3 digits on the back.",
    })
    expect(
      getCardErrors(
        { number: "4242 4242 4242 4241", expiry: "10/26", code: "12" },
        NOW
      )
    ).toEqual({
      number: "That number has a typo. Check the digits.",
      expiry: "This card expired in October 2026.",
      code: "Enter the 3 digits on the back.",
    })
    expect(
      getCardErrors(
        { number: "3782 822463 10005", expiry: "13/29", code: "123" },
        NOW
      )
    ).toEqual({
      expiry: "Use a month from 01 to 12.",
      code: "Enter the 4 digits on the front.",
    })
  })

  it("has nothing to say about a good card", () => {
    expect(
      getCardErrors(
        { number: "4242 4242 4242 4242", expiry: "04/29", code: "123" },
        NOW
      )
    ).toEqual({})
  })
})

describe("getCardOutcome", () => {
  it("declines the sample card and asks the bank for the rest", () => {
    expect(getCardOutcome("4000 0000 0000 0002")).toBe("declined")
    expect(getCardOutcome("4242 4242 4242 4242")).toBe("approved")
  })
})
