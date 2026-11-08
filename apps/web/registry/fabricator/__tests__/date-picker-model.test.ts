import { fr } from "date-fns/locale"
import { describe, expect, it } from "vitest"

import {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  formatIsoDate,
  formatIsoDateTime,
  isDateInRange,
  isSameDateValue,
  parseDateText,
  setDateTime,
  splitDateTimeText,
} from "@/registry/fabricator/shared/lib/date-picker-model"

// Sunday 15 June 2025, mid-afternoon: relative words must land on whole days.
const REFERENCE_DATE = new Date(2025, 5, 15, 15, 30)

function day(year: number, month: number, date: number) {
  return new Date(year, month - 1, date)
}

describe("formatDateValue", () => {
  it("writes the default display format", () => {
    expect(DEFAULT_DATE_FORMAT).toBe("MMM d, yyyy")
    expect(formatDateValue(day(2025, 6, 1))).toBe("Jun 1, 2025")
  })

  it("writes a custom format and locale", () => {
    expect(formatDateValue(day(2025, 6, 1), { format: "dd/MM/yyyy" })).toBe(
      "01/06/2025"
    )
    expect(
      formatDateValue(day(2025, 6, 1), { format: "d MMMM yyyy", locale: fr })
    ).toBe("1 juin 2025")
  })

  it("writes nothing for no date or an invalid one", () => {
    expect(formatDateValue(undefined)).toBe("")
    expect(formatDateValue(new Date(Number.NaN))).toBe("")
  })
})

describe("formatIsoDate", () => {
  it("writes the local calendar day as yyyy-MM-dd", () => {
    expect(formatIsoDate(day(2025, 6, 1))).toBe("2025-06-01")
    expect(formatIsoDate(new Date(2025, 11, 31, 23, 59))).toBe("2025-12-31")
    expect(formatIsoDate(undefined)).toBe("")
  })
})

describe("parseDateText", () => {
  const options = { referenceDate: REFERENCE_DATE }

  it("reads the display format", () => {
    expect(parseDateText("Jun 1, 2025", options)).toEqual(day(2025, 6, 1))
  })

  it("ignores case and extra spaces", () => {
    expect(parseDateText("  jun   1,  2025 ", options)).toEqual(day(2025, 6, 1))
  })

  it("reads ISO dates whatever the display format", () => {
    expect(parseDateText("2025-06-01", options)).toEqual(day(2025, 6, 1))
    expect(
      parseDateText("2025-06-01", { ...options, format: "dd/MM/yyyy" })
    ).toEqual(day(2025, 6, 1))
  })

  it("reads a custom format and locale", () => {
    expect(
      parseDateText("01/06/2025", { ...options, format: "dd/MM/yyyy" })
    ).toEqual(day(2025, 6, 1))
    expect(
      parseDateText("1 juin 2025", {
        ...options,
        format: "d MMMM yyyy",
        locale: fr,
      })
    ).toEqual(day(2025, 6, 1))
  })

  it("reads today, tomorrow and yesterday from the reference date", () => {
    expect(parseDateText("today", options)).toEqual(day(2025, 6, 15))
    expect(parseDateText("Tomorrow", options)).toEqual(day(2025, 6, 16))
    expect(parseDateText(" YESTERDAY ", options)).toEqual(day(2025, 6, 14))
  })

  it("rejects text that isn't a whole date", () => {
    expect(parseDateText("", options)).toBeUndefined()
    expect(parseDateText("soon", options)).toBeUndefined()
    expect(parseDateText("Jun 1", options)).toBeUndefined()
    expect(parseDateText("Jun 1, 2025 at noon", options)).toBeUndefined()
  })

  it("rejects days that don't exist", () => {
    expect(parseDateText("Feb 30, 2025", options)).toBeUndefined()
    expect(parseDateText("2025-13-01", options)).toBeUndefined()
  })

  it("rejects years without four digits", () => {
    expect(parseDateText("Jun 1, 25", options)).toBeUndefined()
  })
})

describe("isDateInRange", () => {
  const range = { minDate: day(2025, 6, 10), maxDate: day(2025, 6, 20) }

  it("includes both ends, whatever the time of day", () => {
    expect(isDateInRange(day(2025, 6, 10), range)).toBe(true)
    expect(isDateInRange(new Date(2025, 5, 20, 23, 59), range)).toBe(true)
    expect(
      isDateInRange(day(2025, 6, 10), {
        minDate: new Date(2025, 5, 10, 18),
      })
    ).toBe(true)
  })

  it("excludes days before the minimum and after the maximum", () => {
    expect(isDateInRange(day(2025, 6, 9), range)).toBe(false)
    expect(isDateInRange(day(2025, 6, 21), range)).toBe(false)
  })

  it("accepts every day without bounds", () => {
    expect(isDateInRange(day(1999, 1, 1), {})).toBe(true)
  })
})

describe("commitDateText", () => {
  const options = { referenceDate: REFERENCE_DATE }

  it("clears the value for empty text", () => {
    expect(commitDateText("   ", options)).toEqual({
      value: undefined,
      text: "",
      isInvalid: false,
    })
  })

  it("rewrites a date in the display format", () => {
    expect(commitDateText("2025-06-01", options)).toEqual({
      value: day(2025, 6, 1),
      text: "Jun 1, 2025",
      isInvalid: false,
    })
    expect(commitDateText("tomorrow", options)).toEqual({
      value: day(2025, 6, 16),
      text: "Jun 16, 2025",
      isInvalid: false,
    })
  })

  it("keeps text that isn't a date, and marks it invalid", () => {
    expect(commitDateText("next week", options)).toEqual({
      value: undefined,
      text: "next week",
      isInvalid: true,
    })
  })

  it("marks a date outside the range invalid, without a value", () => {
    expect(
      commitDateText("2025-07-01", { ...options, maxDate: day(2025, 6, 30) })
    ).toEqual({ value: undefined, text: "Jul 1, 2025", isInvalid: true })
    expect(
      commitDateText("yesterday", { ...options, minDate: REFERENCE_DATE })
    ).toEqual({ value: undefined, text: "Jun 14, 2025", isInvalid: true })
  })
})

describe("isSameDateValue", () => {
  it("compares calendar days, and treats two empty values as equal", () => {
    expect(isSameDateValue(day(2025, 6, 1), new Date(2025, 5, 1, 12))).toBe(
      true
    )
    expect(isSameDateValue(day(2025, 6, 1), day(2025, 6, 2))).toBe(false)
    expect(isSameDateValue(undefined, undefined)).toBe(true)
    expect(isSameDateValue(undefined, day(2025, 6, 1))).toBe(false)
  })
})

describe("setDateTime", () => {
  it("puts the time on the day, keeping the day", () => {
    const date = setDateTime(new Date(2026, 10, 12, 8, 5, 30), "14:45")
    expect(date).toEqual(new Date(2026, 10, 12, 14, 45))
  })
})

describe("formatIsoDateTime", () => {
  it("writes the day and the time as a datetime-local value", () => {
    expect(formatIsoDateTime(new Date(2026, 10, 2, 9, 5))).toBe(
      "2026-11-02T09:05"
    )
  })

  it("is empty without a date", () => {
    expect(formatIsoDateTime(undefined)).toBe("")
  })
})

describe("splitDateTimeText", () => {
  it.each([
    ["Nov 12, 2026, 10:30 AM", "Nov 12, 2026", "10:30 AM"],
    ["2026-11-12, 21:30", "2026-11-12", "21:30"],
    ["tomorrow at 9pm", "tomorrow", "9pm"],
    ["Nov 12, 2026", "Nov 12, 2026", undefined],
    ["tomorrow", "tomorrow", undefined],
  ])("splits %s", (text, dateText, timeText) => {
    expect(splitDateTimeText(text)).toEqual({ dateText, timeText })
  })
})

describe("seconds", () => {
  it("puts a time with seconds on the day", () => {
    expect(setDateTime(new Date(2026, 10, 12), "14:45:30")).toEqual(
      new Date(2026, 10, 12, 14, 45, 30)
    )
  })

  it("writes the seconds when asked", () => {
    expect(
      formatIsoDateTime(new Date(2026, 10, 2, 9, 5, 7), { hasSeconds: true })
    ).toBe("2026-11-02T09:05:07")
  })
})
