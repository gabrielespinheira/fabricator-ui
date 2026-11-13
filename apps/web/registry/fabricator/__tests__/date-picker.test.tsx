import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import * as AriaDatePicker from "@/registry/fabricator/aria/ui/date-picker"
import * as BaseDatePicker from "@/registry/fabricator/base/ui/date-picker"
import * as RadixDatePicker from "@/registry/fabricator/radix/ui/date-picker"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const BASES = [
  ["base", BaseDatePicker],
  ["radix", RadixDatePicker],
  ["aria", AriaDatePicker],
] as const

const day = new Date(2026, 10, 12, 10, 30)

function getTextInputs(html: string) {
  return html.match(/<input(?![^>]*type="hidden")[^>]*>/g) ?? []
}

describe.each(BASES)("%s date picker", (_, { DatePicker }) => {
  it("is a button that opens the calendar, not a text field", () => {
    const html = renderToStaticMarkup(<DatePicker aria-label="Due date" />)

    expect(html).toMatch(/<button[^>]*aria-expanded="false"/)
    expect(html).toContain("Pick a date")
    expect(getTextInputs(html)).toHaveLength(0)
  })

  it("shows the date and the time, and submits both", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        aria-label="Starts"
        hasTime
        hourCycle={12}
        defaultValue={day}
        name="starts"
      />
    )

    expect(html).toContain("Nov 12, 2026, 10:30 AM")
    expect(html).toMatch(/name="starts"[^>]*value="2026-11-12T10:30"/)
  })

  it("asks for a date and a time while empty", () => {
    const html = renderToStaticMarkup(
      <DatePicker aria-label="Starts" hasTime />
    )

    expect(html).toContain("Pick a date and time")
  })

  it("takes typed text when editable", () => {
    const html = renderToStaticMarkup(
      <DatePicker aria-label="Due date" editable defaultValue={day} />
    )

    expect(getTextInputs(html)).toHaveLength(1)
    expect(html).toMatch(/<input[^>]*value="Nov 12, 2026"/)
  })

  it("picks a month, shown in its format and submitted as yyyy-MM", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        aria-label="Card expiry"
        granularity="month"
        defaultValue={new Date(2028, 2, 18)}
        name="expiry"
      />
    )

    expect(html).toContain("Mar 2028")
    expect(html).toMatch(/name="expiry"[^>]*value="2028-03"/)
  })

  it("asks for a month, and types one when editable", () => {
    const empty = renderToStaticMarkup(
      <DatePicker aria-label="Card expiry" granularity="month" />
    )
    const editable = renderToStaticMarkup(
      <DatePicker
        aria-label="Card expiry"
        granularity="month"
        editable
        defaultValue={new Date(2028, 2, 1)}
      />
    )

    expect(empty).toContain("Pick a month")
    expect(editable).toMatch(/<input[^>]*value="Mar 2028"/)
    expect(editable).toContain('aria-label="Choose month"')
  })

  it("picks a year, submitted as yyyy", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        aria-label="Graduation"
        granularity="year"
        defaultValue={new Date(2028, 5, 1)}
        name="graduation"
      />
    )

    expect(html).toMatch(/name="graduation"[^>]*value="2028"/)
    expect(
      renderToStaticMarkup(
        <DatePicker aria-label="Graduation" granularity="year" />
      )
    ).toContain("Pick a year")
  })

  it("has no time at month granularity", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        aria-label="Statement"
        granularity="month"
        hasTime
        defaultValue={new Date(2026, 10, 1)}
      />
    )

    expect(html).toContain("Nov 2026")
    expect(html).not.toContain("AM")
  })
})
