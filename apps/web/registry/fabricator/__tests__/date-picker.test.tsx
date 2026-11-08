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
})
