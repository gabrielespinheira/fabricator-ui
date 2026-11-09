import { describe, expect, it } from "vitest"

import {
  commitMonthText,
  formatMonthValue,
  getMonthOptions,
  isMonthInRange,
  moveMonth,
  parseMonthText,
} from "@/registry/fabricator/shared/lib/month-input-model"

const referenceDate = new Date(2026, 10, 7)

describe("parseMonthText", () => {
  it.each([
    ["Nov 2026", "2026-11"],
    ["november 2026", "2026-11"],
    ["2026-03", "2026-03"],
    ["3/2026", "2026-03"],
    ["03/2026", "2026-03"],
    ["  Mar   2027 ", "2027-03"],
    ["this month", "2026-11"],
    ["next month", "2026-12"],
    ["last month", "2026-10"],
  ])("reads %s as %s", (text, expected) => {
    expect(parseMonthText(text, { referenceDate })).toBe(expected)
  })

  it.each(["", "13/2026", "2026-13", "Nov 26", "soon", "Nov"])(
    "rejects %s",
    (text) => {
      expect(parseMonthText(text, { referenceDate })).toBeUndefined()
    }
  )
})

describe("formatMonthValue", () => {
  it("writes the month in the display format", () => {
    expect(formatMonthValue("2026-11")).toBe("Nov 2026")
    expect(formatMonthValue("2026-11", { format: "MMMM yyyy" })).toBe(
      "November 2026"
    )
  })

  it("writes nothing without a value", () => {
    expect(formatMonthValue(undefined)).toBe("")
  })
})

describe("isMonthInRange", () => {
  it("includes both ends", () => {
    const range = { minMonth: "2026-03", maxMonth: "2026-09" }
    expect(isMonthInRange("2026-03", range)).toBe(true)
    expect(isMonthInRange("2026-09", range)).toBe(true)
    expect(isMonthInRange("2026-02", range)).toBe(false)
    expect(isMonthInRange("2026-10", range)).toBe(false)
  })
})

describe("getMonthOptions", () => {
  it("lists the twelve months of a year, marking those out of range", () => {
    const options = getMonthOptions(2026, { minMonth: "2026-03" })
    expect(options).toHaveLength(12)
    expect(options[0]).toEqual({
      value: "2026-01",
      label: "Jan",
      isDisabled: true,
    })
    expect(options[2]).toEqual({
      value: "2026-03",
      label: "Mar",
      isDisabled: false,
    })
  })
})

describe("moveMonth", () => {
  it("moves by months across years", () => {
    expect(moveMonth("2026-11", 3)).toBe("2027-02")
    expect(moveMonth("2026-01", -1)).toBe("2025-12")
    expect(moveMonth("2026-05", 12)).toBe("2027-05")
  })
})

describe("commitMonthText", () => {
  it("rewrites a month in the display format", () => {
    expect(commitMonthText("2026-03", { referenceDate })).toEqual({
      value: "2026-03",
      text: "Mar 2026",
      isInvalid: false,
    })
  })

  it("keeps text that isn't a month and marks it invalid", () => {
    expect(commitMonthText("someday", { referenceDate })).toEqual({
      value: undefined,
      text: "someday",
      isInvalid: true,
    })
  })

  it("rewrites a month outside the range and marks it invalid", () => {
    expect(
      commitMonthText("Jan 2026", { referenceDate, minMonth: "2026-03" })
    ).toEqual({ value: undefined, text: "Jan 2026", isInvalid: true })
  })

  it("clears on empty text", () => {
    expect(commitMonthText("", { referenceDate })).toEqual({
      value: undefined,
      text: "",
      isInvalid: false,
    })
  })
})
