import { describe, expect, it } from "vitest"

import {
  formatAmount,
  formatLongDate,
  formatTimeIn,
  getZoneCity,
  getZoneOffset,
  getZoneOptions,
} from "./settings-format-model"

const NOW = "2026-11-24T14:20:00Z"
const plain = (text: string) => text.replace(/[  ]/g, " ")

describe("formatAmount", () => {
  it("writes money in the chosen style and currency", () => {
    const amount = (
      currency: string,
      numberStyle: "comma" | "period" | "space"
    ) => plain(formatAmount(12480.5, { currency, numberStyle }))
    expect(amount("USD", "comma")).toBe("$12,480.50")
    expect(amount("EUR", "period")).toBe("12.480,50 €")
    expect(amount("EUR", "space")).toBe("12 480,50 €")
  })

  it("leaves out cents a currency doesn't have", () => {
    expect(
      plain(formatAmount(1200, { currency: "JPY", numberStyle: "comma" }))
    ).toBe("¥1,200")
  })
})

describe("dates and times", () => {
  it("follows the language and the time zone", () => {
    expect(formatLongDate(NOW, "en-US", "UTC")).toBe(
      "Tuesday, November 24, 2026"
    )
    expect(formatLongDate(NOW, "pt-PT", "UTC")).toContain("novembro")
    expect(formatLongDate(NOW, "en-US", "Pacific/Auckland")).toContain("25")
    expect(plain(formatTimeIn("America/New_York", NOW))).toBe("9:20 AM")
  })

  it("names a zone by its city", () => {
    expect(getZoneCity("America/New_York")).toBe("New York")
    expect(getZoneCity("UTC")).toBe("UTC")
  })

  it("gives each zone its offset, and sorts by it", () => {
    expect(getZoneOffset("Asia/Kolkata", NOW)).toBe("+05:30")
    expect(getZoneOffset("UTC", NOW)).toBe("+00:00")
    expect(
      getZoneOptions(
        ["Asia/Kolkata", "Europe/Lisbon", "America/New_York"],
        NOW
      ).map(({ label }) => label)
    ).toEqual(["New York", "Lisbon", "Kolkata"])
  })
})
