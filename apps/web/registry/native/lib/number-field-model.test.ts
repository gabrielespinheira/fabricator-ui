import { describe, expect, it } from "vitest"

import {
  canDecrement,
  canIncrement,
  clampValue,
  commitNumberText,
  formatNumberValue,
  parseNumberText,
  stepValue,
} from "@/registry/native/lib/number-field-model"

describe("clampValue", () => {
  it("keeps a value inside min and max", () => {
    expect(clampValue(12, { min: 0, max: 10 })).toBe(10)
    expect(clampValue(-3, { min: 0, max: 10 })).toBe(0)
    expect(clampValue(4, { min: 0, max: 10 })).toBe(4)
  })

  it("leaves an open side alone", () => {
    expect(clampValue(1000, { min: 0 })).toBe(1000)
    expect(clampValue(-1000, { max: 10 })).toBe(-1000)
  })
})

describe("stepValue", () => {
  it("adds or subtracts one step", () => {
    expect(stepValue(2, 1, { step: 1 })).toBe(3)
    expect(stepValue(2, -1, { step: 1 })).toBe(1)
  })

  it("stops at min and max", () => {
    expect(stepValue(10, 1, { min: 0, max: 10, step: 1 })).toBe(10)
    expect(stepValue(0, -1, { min: 0, max: 10, step: 1 })).toBe(0)
    expect(stepValue(9.5, 1, { max: 10, step: 2 })).toBe(10)
  })

  it("keeps fractional steps free of float noise", () => {
    expect(stepValue(0.1, 1, { step: 0.2 })).toBe(0.3)
    expect(stepValue(0.15, 1, { step: 0.05 })).toBe(0.2)
    expect(stepValue(4.5, -1, { step: 0.1 })).toBe(4.4)
  })

  it("starts an empty field from min, or from zero", () => {
    expect(stepValue(null, 1, { min: 5, step: 1 })).toBe(5)
    expect(stepValue(null, 1, { step: 1 })).toBe(1)
    expect(stepValue(null, -1, { step: 1 })).toBe(-1)
  })

  it("steps by 1 when the step is any", () => {
    expect(stepValue(2, 1, { step: "any" })).toBe(3)
  })

  it("takes a custom amount", () => {
    expect(stepValue(2, 1, { step: 1 }, 10)).toBe(12)
  })
})

describe("parseNumberText", () => {
  it("reads an empty or unfinished entry as no value", () => {
    expect(parseNumberText("")).toBeNull()
    expect(parseNumberText("   ")).toBeNull()
    expect(parseNumberText("-")).toBeNull()
    expect(parseNumberText(".")).toBeNull()
  })

  it("reads grouping and decimals in English", () => {
    expect(parseNumberText("1,234.5")).toBe(1234.5)
    expect(parseNumberText("-42")).toBe(-42)
  })

  it("reads the locale's separators", () => {
    expect(parseNumberText("1.234,5", { locale: "de-DE" })).toBe(1234.5)
  })

  it("ignores currency signs and units", () => {
    expect(
      parseNumberText("$49.50", {
        format: { style: "currency", currency: "USD" },
      })
    ).toBe(49.5)
    expect(
      parseNumberText("5 km", { format: { style: "unit", unit: "kilometer" } })
    ).toBe(5)
  })

  it("reads a percent as a fraction", () => {
    expect(parseNumberText("15%", { format: { style: "percent" } })).toBe(0.15)
    expect(parseNumberText("15", { format: { style: "percent" } })).toBe(0.15)
    expect(parseNumberText("12.5%", { format: { style: "percent" } })).toBe(
      0.125
    )
  })
})

describe("formatNumberValue", () => {
  it("formats with the options", () => {
    expect(
      formatNumberValue(49, {
        locale: "en-US",
        format: { style: "currency", currency: "USD" },
      })
    ).toBe("$49.00")
    expect(
      formatNumberValue(0.15, { locale: "en-US", format: { style: "percent" } })
    ).toBe("15%")
    expect(formatNumberValue(1234.5, { locale: "en-US" })).toBe("1,234.5")
  })

  it("shows nothing for no value", () => {
    expect(formatNumberValue(null, { locale: "en-US" })).toBe("")
  })
})

describe("commitNumberText", () => {
  it("parses and clamps", () => {
    expect(commitNumberText("12", { min: 0, max: 10 })).toBe(10)
    expect(commitNumberText("-4", { min: 0, max: 10 })).toBe(0)
    expect(commitNumberText("7", { min: 0, max: 10 })).toBe(7)
  })

  it("commits an empty entry as no value", () => {
    expect(commitNumberText("", { min: 0, max: 10 })).toBeNull()
  })

  it("parses with the format", () => {
    expect(
      commitNumberText("150%", { min: 0, max: 1, format: { style: "percent" } })
    ).toBe(1)
  })
})

describe("canDecrement and canIncrement", () => {
  it("turn off at the limits", () => {
    expect(canDecrement(0, { min: 0 })).toBe(false)
    expect(canDecrement(1, { min: 0 })).toBe(true)
    expect(canIncrement(10, { max: 10 })).toBe(false)
    expect(canIncrement(9, { max: 10 })).toBe(true)
  })

  it("stay on with no limit or no value", () => {
    expect(canDecrement(-100, {})).toBe(true)
    expect(canIncrement(null, { max: 10 })).toBe(true)
  })

  it("turn off when the field is disabled or read-only", () => {
    expect(canIncrement(1, { disabled: true })).toBe(false)
    expect(canDecrement(1, { readOnly: true })).toBe(false)
  })
})
