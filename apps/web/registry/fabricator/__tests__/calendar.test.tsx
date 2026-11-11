import * as React from "react"
import type * as DayPickerModule from "react-day-picker"
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

const { calendarParts } = vi.hoisted(() => {
  const calendarParts: Record<string, unknown>[] = []
  return { calendarParts }
})

vi.mock("react-day-picker", async (importOriginal) => {
  const original = await importOriginal<typeof DayPickerModule>()
  return {
    ...original,
    DayPicker: (props: React.ComponentProps<typeof original.DayPicker>) => {
      calendarParts.push({ ...props.components })
      return <original.DayPicker {...props} />
    },
  }
})

describe.each(BASES)("%s calendar", (_, { Calendar }) => {
  it("keeps the root and day component types when selection changes", () => {
    calendarParts.length = 0
    renderToStaticMarkup(<Calendar mode="single" month={month} />)
    renderToStaticMarkup(
      <Calendar mode="single" month={month} selected={month} />
    )
    const [before, after] = calendarParts
    for (const part of ["Root", "Chevron", "DayButton", "WeekNumber"]) {
      expect(after[part], `${part} must keep its mounted subtree`).toBe(
        before[part]
      )
    }
  })

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
