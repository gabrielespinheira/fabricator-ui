import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import * as BaseCalendar from "@/registry/fabricator/base/ui/calendar"
import * as RadixCalendar from "@/registry/fabricator/radix/ui/calendar"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const BASES = [
  ["base", BaseCalendar],
  ["radix", RadixCalendar],
] as const

const month = new Date(2026, 10, 1)

describe.each(BASES)("%s calendar", (_, { Calendar }) => {
  it("picks the month and the year with the library's Select", () => {
    const html = renderToStaticMarkup(
      <Calendar
        mode="single"
        captionLayout="dropdown"
        defaultMonth={month}
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2030, 11)}
      />
    )

    const triggers = html.match(/data-slot="select-trigger"/g) ?? []
    expect(triggers).toHaveLength(2)
    expect(html).toContain("Nov")
    expect(html).toContain("2026")
    const nativeSelects = html.match(/<select[^>]*>/g) ?? []
    // Only hidden ones: DayPicker's change handler, and Radix's form select.
    expect(nativeSelects.length).toBeGreaterThan(0)
    for (const tag of nativeSelects) {
      expect(tag).toMatch(/ hidden=""| aria-hidden="true"/)
    }
  })

  it("keeps the plain caption by default", () => {
    const html = renderToStaticMarkup(
      <Calendar mode="single" defaultMonth={month} />
    )

    expect(html).not.toContain('data-slot="select-trigger"')
    expect(html).toContain("November 2026")
  })
})
