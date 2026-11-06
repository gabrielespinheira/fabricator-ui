import { describe, expect, it } from "vitest"

import {
  formatCaption,
  formatWeekdayName,
  getDayModifiers,
  getDisplayMonths,
  getMonthOptions,
  getMonthWeeks,
  getNavBounds,
  getNextMonth,
  getPreviousMonth,
  getStartingMonth,
  getWeekdays,
  getYearOptions,
  isStretchedCalendar,
  matchesDate,
  selectMultiple,
  selectRange,
  selectSingle,
} from "@/registry/native/lib/calendar-model"

const day = (month: number, date: number, year = 2026) =>
  new Date(year, month, date)

describe("getMonthWeeks", () => {
  // June 2026 starts on a Monday and ends on a Tuesday.
  it("fills whole weeks and marks outside days", () => {
    const weeks = getMonthWeeks(day(5, 15))
    expect(weeks[0]?.days[0]).toMatchObject({
      date: day(4, 31),
      outside: true,
    })
    expect(weeks[0]?.days[1]).toMatchObject({ date: day(5, 1), outside: false })
    expect(weeks.at(-1)?.days.at(-1)).toMatchObject({
      date: day(6, 4),
      outside: true,
    })
    expect(weeks.every((week) => week.days.length === 7)).toBe(true)
  })

  it("starts the week where it's told", () => {
    const monday = getMonthWeeks(day(9, 1), { weekStartsOn: 1 })
    expect(monday[0]?.days[0]?.date).toEqual(day(8, 28))
    const sunday = getMonthWeeks(day(10, 1), { weekStartsOn: 0 })
    expect(sunday[0]?.days[0]?.date).toEqual(day(10, 1))
  })

  it("uses ISO weeks when asked", () => {
    const weeks = getMonthWeeks(day(9, 1), { ISOWeek: true })
    expect(weeks[0]?.days[0]?.date).toEqual(day(8, 28))
    expect(weeks[0]?.weekNumber).toBe(40)
  })

  it("always has six weeks with fixedWeeks", () => {
    expect(getMonthWeeks(day(1, 1, 2026))).toHaveLength(4)
    expect(getMonthWeeks(day(1, 1, 2026), { fixedWeeks: true })).toHaveLength(6)
  })

  it("numbers weeks", () => {
    expect(getMonthWeeks(day(0, 1))[0]?.weekNumber).toBe(1)
  })
})

describe("getWeekdays", () => {
  it("starts on the week start", () => {
    const weekdays = getWeekdays({ weekStartsOn: 1 })
    expect(weekdays).toHaveLength(7)
    expect(weekdays[0]?.getDay()).toBe(1)
    expect(formatWeekdayName(weekdays[0] ?? new Date())).toBe("Mo")
  })
})

describe("matchesDate", () => {
  const date = day(5, 15)

  it("handles every matcher react-day-picker has", () => {
    expect(matchesDate(date, true)).toBe(true)
    expect(matchesDate(date, false)).toBe(false)
    expect(matchesDate(date, day(5, 15))).toBe(true)
    expect(matchesDate(date, [day(5, 14), day(5, 15)])).toBe(true)
    expect(matchesDate(date, { from: day(5, 10), to: day(5, 20) })).toBe(true)
    expect(matchesDate(date, { from: day(5, 16), to: day(5, 20) })).toBe(false)
    expect(matchesDate(date, { before: day(5, 16) })).toBe(true)
    expect(matchesDate(date, { after: day(5, 14) })).toBe(true)
    expect(matchesDate(date, { after: day(5, 15) })).toBe(false)
    expect(matchesDate(date, { dayOfWeek: date.getDay() })).toBe(true)
    expect(matchesDate(date, { dayOfWeek: [(date.getDay() + 1) % 7] })).toBe(
      false
    )
    expect(matchesDate(date, (candidate) => candidate.getDate() === 15)).toBe(
      true
    )
  })

  it("reads before and after together as an interval", () => {
    const closed = { after: day(5, 10), before: day(5, 20) }
    expect(matchesDate(day(5, 15), closed)).toBe(true)
    expect(matchesDate(day(5, 25), closed)).toBe(false)
    const open = { after: day(5, 20), before: day(5, 10) }
    expect(matchesDate(day(5, 25), open)).toBe(true)
    expect(matchesDate(day(5, 15), open)).toBe(false)
  })

  it("is true when any of a list matches, and false for none", () => {
    expect(matchesDate(date, [false, day(5, 15)])).toBe(true)
    expect(matchesDate(date, undefined)).toBe(false)
  })
})

describe("selectSingle", () => {
  it("selects, and pressing the selected day clears it", () => {
    expect(selectSingle(undefined, day(5, 1))).toEqual(day(5, 1))
    expect(selectSingle(day(5, 1), day(5, 2))).toEqual(day(5, 2))
    expect(selectSingle(day(5, 1), day(5, 1))).toBeUndefined()
  })

  it("keeps it when required", () => {
    expect(selectSingle(day(5, 1), day(5, 1), { required: true })).toEqual(
      day(5, 1)
    )
  })
})

describe("selectMultiple", () => {
  it("adds and removes", () => {
    expect(selectMultiple(undefined, day(5, 1))).toEqual([day(5, 1)])
    expect(selectMultiple([day(5, 1)], day(5, 2))).toEqual([
      day(5, 1),
      day(5, 2),
    ])
    expect(selectMultiple([day(5, 1), day(5, 2)], day(5, 1))).toEqual([
      day(5, 2),
    ])
  })

  it("does nothing at the minimum or when the last is required", () => {
    expect(selectMultiple([day(5, 1)], day(5, 1), { min: 1 })).toBeNull()
    expect(
      selectMultiple([day(5, 1)], day(5, 1), { required: true })
    ).toBeNull()
  })

  it("starts over past the maximum", () => {
    expect(selectMultiple([day(5, 1)], day(5, 2), { max: 1 })).toEqual([
      day(5, 2),
    ])
  })
})

describe("selectRange", () => {
  it("starts with one day, then extends", () => {
    const first = selectRange(undefined, day(5, 10))
    expect(first).toEqual({ from: day(5, 10), to: day(5, 10) })
    expect(selectRange(first, day(5, 15))).toEqual({
      from: day(5, 10),
      to: day(5, 15),
    })
  })

  it("extends backwards past the start", () => {
    expect(
      selectRange({ from: day(5, 10), to: day(5, 15) }, day(5, 5))
    ).toEqual({ from: day(5, 5), to: day(5, 15) })
  })

  it("orders an open range", () => {
    expect(selectRange({ from: day(5, 10) }, day(5, 5))).toEqual({
      from: day(5, 5),
      to: day(5, 10),
    })
  })

  it("clears a one-day range, unless required", () => {
    const one = { from: day(5, 10), to: day(5, 10) }
    expect(selectRange(one, day(5, 10))).toBeUndefined()
    expect(selectRange(one, day(5, 10), { required: true })).toEqual(one)
  })

  it("shrinks when pressing an edge", () => {
    const range = { from: day(5, 10), to: day(5, 15) }
    expect(selectRange(range, day(5, 10))).toEqual({
      from: day(5, 10),
      to: day(5, 10),
    })
    expect(selectRange(range, day(5, 15))).toEqual({
      from: day(5, 15),
      to: day(5, 15),
    })
  })

  it("restarts past max and under min", () => {
    expect(selectRange({ from: day(5, 1) }, day(5, 20), { max: 5 })).toEqual({
      from: day(5, 20),
      to: undefined,
    })
    expect(selectRange({ from: day(5, 1) }, day(5, 2), { min: 3 })).toEqual({
      from: day(5, 2),
      to: undefined,
    })
  })

  it("restarts over disabled days with excludeDisabled", () => {
    expect(
      selectRange({ from: day(5, 1) }, day(5, 10), {
        excludeDisabled: true,
        disabled: day(5, 5),
      })
    ).toEqual({ from: day(5, 10), to: undefined })
  })

  it("restarts every time with resetOnSelect", () => {
    expect(
      selectRange({ from: day(5, 1), to: day(5, 5) }, day(5, 10), {
        resetOnSelect: true,
      })
    ).toEqual({ from: day(5, 10), to: undefined })
  })
})

describe("getDayModifiers", () => {
  const inJune = (date: Date, month = day(5, 1)) => ({
    date,
    displayMonth: month,
    outside: date.getMonth() !== month.getMonth(),
  })

  it("marks today, outside and disabled", () => {
    const modifiers = getDayModifiers(inJune(day(6, 1)), {
      today: day(6, 1),
      disabled: day(6, 1),
    })
    expect(modifiers).toMatchObject({
      today: true,
      outside: true,
      disabled: true,
      selected: false,
    })
  })

  it("marks a single selection, but not on a disabled day", () => {
    const selected = day(5, 10)
    expect(
      getDayModifiers(inJune(day(5, 10)), { mode: "single", selected }).selected
    ).toBe(true)
    expect(
      getDayModifiers(inJune(day(5, 10)), {
        mode: "single",
        selected,
        disabled: day(5, 10),
      }).selected
    ).toBe(false)
  })

  it("marks multiple selection", () => {
    expect(
      getDayModifiers(inJune(day(5, 10)), {
        mode: "multiple",
        selected: [day(5, 10), day(5, 11)],
      }).selected
    ).toBe(true)
  })

  it("marks the parts of a range", () => {
    const selected = { from: day(5, 10), to: day(5, 12) }
    const of = (date: Date) =>
      getDayModifiers(inJune(date), { mode: "range", selected })
    expect(of(day(5, 10))).toMatchObject({
      selected: true,
      range_start: true,
      range_middle: false,
      range_end: false,
    })
    expect(of(day(5, 11))).toMatchObject({
      selected: true,
      range_start: false,
      range_middle: true,
      range_end: false,
    })
    expect(of(day(5, 12))).toMatchObject({
      selected: true,
      range_end: true,
    })
    expect(of(day(5, 13)).selected).toBe(false)
  })

  it("marks a one-day range as both ends", () => {
    const selected = { from: day(5, 10), to: day(5, 10) }
    expect(
      getDayModifiers(inJune(day(5, 10)), { mode: "range", selected })
    ).toMatchObject({ range_start: true, range_end: true, range_middle: false })
  })

  it("adds custom modifiers", () => {
    expect(
      getDayModifiers(inJune(day(5, 10)), { modifiers: { booked: day(5, 10) } })
    ).toMatchObject({ booked: true })
  })
})

describe("months", () => {
  it("lists the displayed months", () => {
    expect(getDisplayMonths(day(11, 15), 2)).toEqual([
      day(11, 1),
      day(0, 1, 2027),
    ])
    expect(getDisplayMonths(day(11, 15), 2, { reverse: true })).toEqual([
      day(0, 1, 2027),
      day(11, 1),
    ])
  })

  it("moves by one, or by a page", () => {
    expect(getNextMonth(day(5, 1), { numberOfMonths: 2 })).toEqual(day(6, 1))
    expect(
      getNextMonth(day(5, 1), { numberOfMonths: 2, pagedNavigation: true })
    ).toEqual(day(7, 1))
    expect(getPreviousMonth(day(5, 1))).toEqual(day(4, 1))
  })

  it("stops at the bounds", () => {
    expect(
      getNextMonth(day(5, 1), { numberOfMonths: 1, endMonth: day(5, 20) })
    ).toBeUndefined()
    expect(
      getPreviousMonth(day(5, 1), { startMonth: day(5, 20) })
    ).toBeUndefined()
  })

  it("keeps the starting month in bounds", () => {
    expect(getStartingMonth({ defaultMonth: day(1, 10) })).toEqual(day(1, 1))
    expect(
      getStartingMonth({ defaultMonth: day(1, 10), startMonth: day(4, 1) })
    ).toEqual(day(4, 1))
    expect(
      getStartingMonth({
        defaultMonth: day(8, 1),
        endMonth: day(5, 1),
        numberOfMonths: 2,
      })
    ).toEqual(day(4, 1))
  })

  it("gives year dropdowns a hundred years to today by default", () => {
    const today = day(5, 15)
    const [start, end] = getNavBounds({ captionLayout: "dropdown", today })
    expect(start).toEqual(day(0, 1, 1926))
    expect(end).toEqual(day(11, 31))
    expect(getNavBounds({ captionLayout: "label", today })).toEqual([
      undefined,
      undefined,
    ])
  })

  it("lists years and months inside the bounds", () => {
    expect(getYearOptions(day(0, 1, 2024), day(5, 1, 2026))).toEqual([
      2024, 2025, 2026,
    ])
    expect(
      getMonthOptions(2026, { startMonth: day(3, 1), endMonth: day(5, 1) })
    ).toEqual([3, 4, 5])
    expect(getMonthOptions(2025, { startMonth: day(3, 1) })).toEqual([])
    expect(getMonthOptions(2026)).toHaveLength(12)
  })
})

describe("formatters", () => {
  it("writes the caption", () => {
    expect(formatCaption(day(5, 1))).toBe("June 2026")
  })
})

describe("isStretchedCalendar", () => {
  it("is what `w-full` asks for", () => {
    expect(isStretchedCalendar("w-full")).toBe(true)
    expect(isStretchedCalendar("mt-2 w-full rounded-lg")).toBe(true)
  })

  it("isn't anything else", () => {
    expect(isStretchedCalendar(undefined)).toBe(false)
    expect(isStretchedCalendar("")).toBe(false)
    expect(isStretchedCalendar("sm:w-full")).toBe(false)
    expect(isStretchedCalendar("w-fullish")).toBe(false)
  })
})
