import { describe, expect, it } from "vitest"

import { formatChangelogDate, sortNewestFirst } from "./changelog-order"

describe("formatChangelogDate", () => {
  it("writes the full day for entry pages", () => {
    expect(formatChangelogDate("2026-11-12")).toBe("November 12, 2026")
  })

  it("writes the month and day for the sidebar", () => {
    expect(formatChangelogDate("2026-11-02", "short")).toBe("Nov 2")
  })

  it("keeps the calendar day whatever the reader's time zone", () => {
    expect(formatChangelogDate(new Date("2026-10-01"))).toBe("October 1, 2026")
  })
})

describe("sortNewestFirst", () => {
  it("puts unreleased changes first, then the latest release", () => {
    const entries = [
      { title: "Version 0.4.0", date: "2026-10-28" },
      { title: "Unreleased", date: undefined },
      { title: "Version 0.8.0", date: "2026-11-13" },
      { title: "Version 0.7.0", date: "2026-11-11" },
    ]
    expect(sortNewestFirst(entries).map((entry) => entry.title)).toEqual([
      "Unreleased",
      "Version 0.8.0",
      "Version 0.7.0",
      "Version 0.4.0",
    ])
  })

  it("orders entries from the same day by title", () => {
    const entries = [
      { title: "Rating", date: "2026-11-12" },
      { title: "Audio Player", date: "2026-11-12" },
    ]
    expect(sortNewestFirst(entries).map((entry) => entry.title)).toEqual([
      "Audio Player",
      "Rating",
    ])
  })

  it("leaves the input untouched", () => {
    const entries = [
      { title: "Old", date: "2026-10-01" },
      { title: "New", date: "2026-11-01" },
    ]
    sortNewestFirst(entries)
    expect(entries[0]?.title).toBe("Old")
  })
})
