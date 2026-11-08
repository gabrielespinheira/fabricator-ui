import * as React from "react"
import * as AriaDateTime from "@/examples/aria/date-picker-date-time"
import * as AriaDateTimeRange from "@/examples/aria/date-picker-date-time-range"
import * as BaseDateTime from "@/examples/base/date-picker-date-time"
import * as BaseDateTimeRange from "@/examples/base/date-picker-date-time-range"
import * as RadixDateTime from "@/examples/radix/date-picker-date-time"
import * as RadixDateTimeRange from "@/examples/radix/date-picker-date-time-range"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

const BASES = [
  ["base", BaseDateTime, BaseDateTimeRange],
  ["radix", RadixDateTime, RadixDateTimeRange],
  ["aria", AriaDateTime, AriaDateTimeRange],
] as const

function getComboboxValues(html: string) {
  return Array.from(
    html.matchAll(/<input[^>]*aria-haspopup="dialog"[^>]*>/g),
    ([tag]) => /value="([^"]*)"/.exec(tag)?.[1]
  )
}

describe.each(BASES)("%s date and time pickers", (_, single, range) => {
  it("shows the day and the time in one field", () => {
    const html = renderToStaticMarkup(<single.DatePickerDateTime />)

    expect(html).toMatch(
      /<label[^>]*for="date-picker-date-time"[^>]*>Date and time</
    )
    expect(html).toMatch(
      /id="date-picker-date-time"[^]*?[A-Z][a-z]{2} 12, \d{4}, 10:30\sAM/u
    )
    expect(getComboboxValues(html)).toEqual([])
    expect(html).not.toContain('type="time"')
  })

  it("picks the days in a range calendar and a start and end time", () => {
    const html = renderToStaticMarkup(<range.DatePickerDateTimeRange />)

    expect(html).toMatch(
      /<label[^>]*for="date-picker-date-time-range"[^>]*>Starts and ends</
    )
    expect(html).toMatch(/[A-Z][a-z]{2} 12\b[^<]*?[-–][^<]*?\b15\b/u)
    expect(getComboboxValues(html)).toEqual(["9:00 AM", "5:30 PM"])
    expect(html).not.toContain('type="time"')
  })
})
