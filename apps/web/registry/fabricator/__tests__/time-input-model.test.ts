import { describe, expect, it } from "vitest"

import {
  addMinutesToTime,
  clampTime,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  fromHour12,
  getHourValues,
  getLocaleHourCycle,
  getMinuteValues,
  getNearestTimeOption,
  getTimeDuration,
  getTimeOfDay,
  getTimeOptions,
  getWidestTimeText,
  isTimeInRange,
  joinTime,
  parseTimeText,
  shiftEndTime,
  splitTime,
  toHour12,
} from "@/registry/fabricator/shared/lib/time-input-model"

describe("parseTimeText", () => {
  it.each([
    ["9", "09:00"],
    ["9:30", "09:30"],
    ["09:05", "09:05"],
    ["930", "09:30"],
    ["2130", "21:30"],
    ["9.30", "09:30"],
    ["21:30", "21:30"],
    ["9pm", "21:00"],
    ["9:30 pm", "21:30"],
    ["9:30PM", "21:30"],
    ["12am", "00:00"],
    ["12 pm", "12:00"],
    ["9 a.m.", "09:00"],
    ["noon", "12:00"],
    ["Midnight", "00:00"],
    ["  7:45  ", "07:45"],
  ])("reads %s as %s", (text, expected) => {
    expect(parseTimeText(text)).toBe(expected)
  })

  it.each(["", "25:00", "9:60", "13pm", "0pm", "abc", "9:3", "12345"])(
    "rejects %s",
    (text) => {
      expect(parseTimeText(text)).toBeUndefined()
    }
  )
})

describe("formatTimeValue", () => {
  it("writes 12-hour time with a meridiem", () => {
    expect(formatTimeValue("09:05", { hourCycle: 12 })).toBe("9:05 AM")
    expect(formatTimeValue("00:00", { hourCycle: 12 })).toBe("12:00 AM")
    expect(formatTimeValue("12:30", { hourCycle: 12 })).toBe("12:30 PM")
    expect(formatTimeValue("21:45", { hourCycle: 12 })).toBe("9:45 PM")
  })

  it("writes 24-hour time with two-digit hours", () => {
    expect(formatTimeValue("09:05", { hourCycle: 24 })).toBe("09:05")
    expect(formatTimeValue("21:45", { hourCycle: 24 })).toBe("21:45")
  })

  it("writes nothing without a value", () => {
    expect(formatTimeValue(undefined, { hourCycle: 12 })).toBe("")
  })
})

describe("isTimeInRange", () => {
  it("includes both ends", () => {
    const range = { minTime: "09:00", maxTime: "17:00" }
    expect(isTimeInRange("09:00", range)).toBe(true)
    expect(isTimeInRange("17:00", range)).toBe(true)
    expect(isTimeInRange("08:59", range)).toBe(false)
    expect(isTimeInRange("17:01", range)).toBe(false)
  })

  it("is open without a range", () => {
    expect(isTimeInRange("03:00", {})).toBe(true)
  })
})

describe("getTimeOptions", () => {
  it("lists the day in steps", () => {
    const options = getTimeOptions({ step: 60 })
    expect(options).toHaveLength(24)
    expect(options[0]).toBe("00:00")
    expect(options[23]).toBe("23:00")
  })

  it("keeps to the range", () => {
    expect(
      getTimeOptions({ step: 30, minTime: "09:00", maxTime: "10:30" })
    ).toEqual(["09:00", "09:30", "10:00", "10:30"])
  })

  it("starts the steps at the range's start", () => {
    expect(
      getTimeOptions({ step: 30, minTime: "09:15", maxTime: "10:15" })
    ).toEqual(["09:15", "09:45", "10:15"])
  })
})

describe("commitTimeText", () => {
  it("rewrites a time in the display format", () => {
    expect(commitTimeText("930pm", { hourCycle: 12 })).toEqual({
      value: "21:30",
      text: "9:30 PM",
      isInvalid: false,
    })
  })

  it("keeps text that isn't a time and marks it invalid", () => {
    expect(commitTimeText("later", { hourCycle: 12 })).toEqual({
      value: undefined,
      text: "later",
      isInvalid: true,
    })
  })

  it("rewrites a time outside the range and marks it invalid", () => {
    expect(commitTimeText("8", { hourCycle: 24, minTime: "09:00" })).toEqual({
      value: undefined,
      text: "08:00",
      isInvalid: true,
    })
  })

  it("clears on empty text", () => {
    expect(commitTimeText("  ", { hourCycle: 12 })).toEqual({
      value: undefined,
      text: "",
      isInvalid: false,
    })
  })
})

describe("getTimeOfDay", () => {
  it("reads the clock time of a date as HH:mm", () => {
    expect(getTimeOfDay(new Date(2026, 10, 7, 16, 5))).toBe("16:05")
  })
})

describe("getNearestTimeOption", () => {
  const options = ["09:00", "09:30", "10:00"]

  it("is the time itself when listed", () => {
    expect(getNearestTimeOption(options, "09:30")).toBe("09:30")
  })

  it("is the next listed time after it", () => {
    expect(getNearestTimeOption(options, "09:10")).toBe("09:30")
  })

  it("is the last listed time after the list ends", () => {
    expect(getNearestTimeOption(options, "23:00")).toBe("10:00")
  })
})

describe("getTimeOptions after a start", () => {
  it("starts one step after the start and runs to the end of the day", () => {
    const options = getTimeOptions({ step: 15, after: "11:00" })
    expect(options[0]).toBe("11:15")
    expect(options.at(-1)).toBe("23:45")
  })

  it("stops at maxTime", () => {
    expect(
      getTimeOptions({ step: 30, after: "09:00", maxTime: "10:00" })
    ).toEqual(["09:30", "10:00"])
  })

  it("offers the last minute when no step fits after a late start", () => {
    expect(getTimeOptions({ step: 15, after: "23:50" })).toEqual(["23:59"])
  })

  it("offers nothing after the last minute", () => {
    expect(getTimeOptions({ step: 15, after: "23:59" })).toEqual([])
  })
})

describe("getTimeDuration", () => {
  it("counts the minutes from the start to the end", () => {
    expect(getTimeDuration("11:00", "12:45")).toBe(105)
  })

  it("is undefined when the end isn't after the start", () => {
    expect(getTimeDuration("11:00", "11:00")).toBeUndefined()
    expect(getTimeDuration("11:00", "10:00")).toBeUndefined()
  })
})

describe("formatTimeDuration", () => {
  it.each([
    [15, "15min"],
    [60, "1h"],
    [105, "1h 45min"],
    [600, "10h"],
  ])("writes %i minutes as %s", (minutes, expected) => {
    expect(formatTimeDuration(minutes)).toBe(expected)
  })
})

describe("shiftEndTime", () => {
  it("moves the end with the start, keeping the duration", () => {
    expect(shiftEndTime("11:00", "12:45", "14:00")).toBe("15:45")
  })

  it("stops at the end of the day", () => {
    expect(shiftEndTime("11:00", "12:45", "23:00")).toBe("23:59")
  })

  it("puts the end one step after the start when there was no end", () => {
    expect(shiftEndTime("11:00", undefined, "14:00", 30)).toBe("14:30")
  })
})

describe("addMinutesToTime", () => {
  it("adds minutes, stopping at the end of the day", () => {
    expect(addMinutesToTime("11:00", 1)).toBe("11:01")
    expect(addMinutesToTime("23:50", 30)).toBe("23:59")
  })
})

describe("getLocaleHourCycle", () => {
  it.each([
    ["en-US", 12],
    ["en-GB", 24],
    ["pt-BR", 24],
    ["de-DE", 24],
  ] as const)("reads %s as a %i-hour clock", (locale, expected) => {
    expect(getLocaleHourCycle(locale)).toBe(expected)
  })
})

describe("getWidestTimeText", () => {
  it("is eight characters on a 12-hour clock", () => {
    expect(getWidestTimeText(getTimeOptions({ step: 15 }), 12)).toHaveLength(8)
  })

  it("is five characters on a 24-hour clock", () => {
    expect(getWidestTimeText(getTimeOptions({ step: 15 }), 24)).toHaveLength(5)
  })
})

describe("seconds", () => {
  it.each([
    ["10:30:15", "10:30:15"],
    ["9:05:09 pm", "21:05:09"],
  ])("reads %s as %s", (text, expected) => {
    expect(parseTimeText(text)).toBe(expected)
  })

  it("rejects 60 seconds", () => {
    expect(parseTimeText("10:30:60")).toBeUndefined()
  })

  it("writes the seconds when the time has them", () => {
    expect(formatTimeValue("21:05:09", { hourCycle: 12 })).toBe("9:05:09 PM")
    expect(formatTimeValue("21:05:09", { hourCycle: 24 })).toBe("21:05:09")
  })
})

describe("splitTime and joinTime", () => {
  it("splits a time into its parts", () => {
    expect(splitTime("21:05:09")).toEqual({ hours: 21, minutes: 5, seconds: 9 })
    expect(splitTime("21:05")).toEqual({ hours: 21, minutes: 5, seconds: 0 })
  })

  it("joins the parts, with seconds only when asked", () => {
    const parts = { hours: 7, minutes: 3, seconds: 4 }
    expect(joinTime(parts, { hasSeconds: true })).toBe("07:03:04")
    expect(joinTime(parts, { hasSeconds: false })).toBe("07:03")
  })
})

describe("12-hour clock", () => {
  it.each([
    [0, 12, "AM"],
    [9, 9, "AM"],
    [12, 12, "PM"],
    [23, 11, "PM"],
  ] as const)("writes hour %i as %i %s", (hours, hour, meridiem) => {
    expect(toHour12(hours)).toEqual({ hour, meridiem })
    expect(fromHour12(hour, meridiem)).toBe(hours)
  })
})

describe("wheel values", () => {
  it("lists the hours of each clock", () => {
    expect(getHourValues(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(getHourValues(24)).toHaveLength(24)
    expect(getHourValues(24)[0]).toBe(0)
  })

  it("lists the minutes every step", () => {
    expect(getMinuteValues(15)).toEqual([0, 15, 30, 45])
    expect(getMinuteValues(1)).toHaveLength(60)
  })
})

describe("clampTime", () => {
  it("keeps a time inside the range", () => {
    const range = { minTime: "09:00", maxTime: "17:00" }
    expect(clampTime("08:15", range)).toBe("09:00")
    expect(clampTime("18:30:20", range)).toBe("17:00:00")
    expect(clampTime("12:30", range)).toBe("12:30")
  })

  it("writes the bound with seconds when the time has them", () => {
    expect(clampTime("08:15:30", { minTime: "09:00" })).toBe("09:00:00")
  })
})

describe("getTimeOfDay with seconds", () => {
  it("reads the seconds when asked", () => {
    const date = new Date(2026, 10, 12, 9, 5, 7)
    expect(getTimeOfDay(date)).toBe("09:05")
    expect(getTimeOfDay(date, { hasSeconds: true })).toBe("09:05:07")
  })
})
