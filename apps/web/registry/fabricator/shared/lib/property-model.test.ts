import { describe, expect, it } from "vitest"

import {
  comparePropertyValues,
  formatDuration,
  formatPropertyDate,
  formatPropertyDateValue,
  formatPropertyValue,
  getChoiceGroups,
  getCoverProperty,
  getFileLink,
  getNumberControl,
  getPropertyCover,
  getPropertyDefaults,
  getPropertyGlyph,
  getPropertyProgress,
  getPropertyValueOptions,
  hasPropertyValue,
  isMultiProperty,
  isPropertyOverdue,
  isPropertyShown,
  matchesPropertyFilters,
  parseDuration,
  parsePropertyDay,
  parsePropertyInput,
  previewPropertyConversion,
  readPropertyFiles,
  suggestPropertyType,
  toggleOptionFilter,
  togglePropertyOption,
  toPropertyDate,
  toPropertyDay,
  validatePropertyValue,
  type PropertyDefinition,
} from "./property-model"
import { createPropertyTypes } from "./property-types"

const source: PropertyDefinition = {
  id: "estimate",
  name: "Estimate",
  type: "text",
}

describe("property conversion", () => {
  it("converts valid entries, preserves empty entries and reports invalid entries", () => {
    const preview = previewPropertyConversion(source, "number", [
      { recordId: "one", value: "12.5" },
      { recordId: "two", value: "very large" },
      { recordId: "three", value: null },
    ])
    expect(preview.values).toEqual([
      { recordId: "one", value: 12.5 },
      { recordId: "three", value: null },
    ])
    expect(preview.invalidRecordIds).toEqual(["two"])
  })

  it("preserves option IDs when converting to multiple choices", () => {
    const options = [{ value: "high", label: "High priority" }]
    const preview = previewPropertyConversion(
      { ...source, type: "select", options },
      "multi-select",
      [{ recordId: "one", value: "high" }]
    )
    expect(preview.property.options).toEqual(options)
    expect(preview.values[0]?.value).toEqual(["high"])
  })

  it("does not silently lose multiple choices when converting to one", () => {
    const options = [
      { value: "high", label: "High" },
      { value: "low", label: "Low" },
    ]
    const preview = previewPropertyConversion(
      { ...source, type: "multi-select", options },
      "status",
      [{ recordId: "one", value: ["high", "low"] }]
    )
    expect(preview.invalidRecordIds).toEqual(["one"])
    expect(preview.values).toEqual([])
  })
})

describe("property dates", () => {
  const today = new Date(2026, 10, 25)

  it("reads a date-only value as that local day, whatever the time zone", () => {
    expect(parsePropertyDay("2026-11-18")).toEqual(new Date(2026, 10, 18))
    expect(toPropertyDay(new Date(2026, 0, 3))).toBe("2026-01-03")
    expect(parsePropertyDay("not a date")).toBeNull()
  })

  it("names near days, drops this year and keeps others", () => {
    expect(formatPropertyDate("2026-11-25", today)).toBe("Today")
    expect(formatPropertyDate("2026-11-26", today)).toBe("Tomorrow")
    expect(formatPropertyDate("2026-11-24", today)).toBe("Yesterday")
    expect(formatPropertyDate("2026-11-18", today)).toBe("Nov 18")
    expect(formatPropertyDate("2027-01-02", today)).toBe("Jan 2, 2027")
  })

  it("stays the same on the server, which has no today", () => {
    expect(formatPropertyDate("2026-11-25", null)).toBe("Nov 25")
  })

  it("is overdue only before today", () => {
    expect(isPropertyOverdue("2026-11-24", today)).toBe(true)
    expect(isPropertyOverdue("2026-11-25", today)).toBe(false)
    expect(isPropertyOverdue("2026-11-24", null)).toBe(false)
  })
})

describe("property options", () => {
  const labels: PropertyDefinition = {
    id: "labels",
    name: "Labels",
    type: "multi-select",
    options: [
      { value: "web", label: "Web", color: "blue" },
      { value: "bug", label: "Bug", color: "red" },
    ],
  }

  it("draws every stored value, a stale one under its raw name", () => {
    expect(getPropertyValueOptions(labels, ["bug", "gone"])).toEqual([
      labels.options?.[1],
      { value: "gone", label: "gone" },
    ])
    expect(getPropertyValueOptions(labels, null)).toEqual([])
  })

  it("adds and removes in a list, and swaps or clears a single value", () => {
    expect(togglePropertyOption(labels, ["bug"], "web")).toEqual(["bug", "web"])
    expect(togglePropertyOption(labels, ["bug"], "bug")).toEqual([])
    const priority = { ...labels, type: "select" }
    expect(togglePropertyOption(priority, "bug", "web")).toBe("web")
    expect(togglePropertyOption(priority, "bug", "bug")).toBeNull()
    expect(
      togglePropertyOption({ ...priority, required: true }, "bug", "bug")
    ).toBe("bug")
  })

  it("builds a filter per property and drops it when nothing is picked", () => {
    const picked = toggleOptionFilter(undefined, labels, "bug")
    expect(picked).toEqual({
      match: "all",
      filters: [{ propertyId: "labels", operator: "hasAny", value: ["bug"] }],
    })
    expect(toggleOptionFilter(picked, labels, "bug")).toBeUndefined()
  })
})

describe("property progress", () => {
  const tasks: PropertyDefinition = {
    id: "tasks",
    name: "Sub-tasks",
    type: "progress",
  }

  it("reads, writes and orders done of total", () => {
    expect(getPropertyProgress({ done: 2, total: 4 })).toEqual({
      done: 2,
      total: 4,
      ratio: 0.5,
    })
    expect(getPropertyProgress({ done: 1, total: 0 })).toBeNull()
    expect(formatPropertyValue(tasks, { done: 2, total: 4 })).toBe("2/4")
    expect(
      comparePropertyValues(tasks, { done: 1, total: 4 }, { done: 1, total: 2 })
    ).toBeLessThan(0)
  })
})

describe("property values", () => {
  it("has nothing to show for an empty value of any type", () => {
    const field = { id: "field", name: "Field" }
    expect(hasPropertyValue({ ...field, type: "multi-select" }, [])).toBe(false)
    expect(hasPropertyValue({ ...field, type: "text" }, "")).toBe(false)
    expect(hasPropertyValue({ ...field, type: "checkbox" }, false)).toBe(false)
    expect(
      hasPropertyValue({ ...field, type: "progress" }, { done: 0, total: 0 })
    ).toBe(false)
    expect(hasPropertyValue({ ...field, type: "number" }, 0)).toBe(true)
  })
})

describe("property glyphs", () => {
  it("draws a status by its icon, or by its group", () => {
    expect(getPropertyGlyph({ icon: "status-review" })).toEqual({
      kind: "status",
      state: "active",
      ratio: 0.75,
    })
    expect(getPropertyGlyph({ group: "complete" })).toEqual({
      kind: "status",
      state: "done",
      ratio: 1,
    })
    expect(getPropertyGlyph({ icon: "priority-medium" })).toEqual({
      kind: "priority",
      level: 2,
    })
    expect(getPropertyGlyph({ icon: "rocket" })).toBeNull()
  })
})

describe("property types from a name", () => {
  it("suggests the likely type and falls back to text", () => {
    expect(suggestPropertyType("Due date")).toBe("date")
    expect(suggestPropertyType("Assignee")).toBe("person")
    expect(suggestPropertyType("Priority")).toBe("select")
    expect(suggestPropertyType("Labels")).toBe("multi-select")
    expect(suggestPropertyType("Work email")).toBe("email")
    expect(suggestPropertyType("Notes")).toBe("text")
  })
})

describe("number properties", () => {
  const read = (settings: PropertyDefinition["settings"], value: number) =>
    formatPropertyValue({ ...source, type: "number", settings }, value)

  it("reads in the chosen format", () => {
    expect(read(undefined, 1234.5)).toBe("1,234.5")
    expect(read({ numberFormat: "plain" }, 1234.5)).toBe("1234.5")
    expect(read({ numberFormat: "compact" }, 12_400)).toBe("12.4K")
    expect(read({ numberFormat: "percent" }, 42)).toBe("42%")
    expect(read({ numberFormat: "currency", currency: "EUR" }, 1200)).toBe(
      "€1,200"
    )
    expect(read({ numberFormat: "currency", decimals: "2" }, 1200)).toBe(
      "$1,200.00"
    )
  })

  it("edits in full, with its limits, step and suffix", () => {
    const control = (settings: PropertyDefinition["settings"]) =>
      getNumberControl({ ...source, type: "number", settings })
    expect(control(undefined)).toMatchObject({
      min: undefined,
      max: undefined,
      step: undefined,
      suffix: "",
    })
    expect(
      control({ minimum: 0, maximum: 13, step: 0.5, unit: "points" })
    ).toMatchObject({ min: 0, max: 13, step: 0.5, suffix: "points" })
    expect(control({ numberFormat: "percent", unit: "x" }).suffix).toBe("%")
    expect(
      new Intl.NumberFormat(
        "en-US",
        control({ numberFormat: "compact" }).format
      ).format(12_400)
    ).toBe("12,400")
    expect(
      new Intl.NumberFormat(
        "en-US",
        control({ numberFormat: "currency", currency: "EUR" }).format
      ).format(5)
    ).toBe("€5")
  })

  it("is read back from how people type it", () => {
    const money: PropertyDefinition = {
      ...source,
      type: "number",
      settings: { numberFormat: "currency" },
    }
    expect(parsePropertyInput(money, "$1,200.50")).toBe(1200.5)
    expect(parsePropertyInput(money, "-40%")).toBe(-40)
    expect(parsePropertyInput(money, "lots")).toBeUndefined()
    expect(parsePropertyInput(money, "1 2 x")).toBeUndefined()
  })
})

describe("durations", () => {
  it("are minutes, typed in several ways", () => {
    expect(parseDuration("90")).toBe(90)
    expect(parseDuration("1h 30m")).toBe(90)
    expect(parseDuration("1.5h")).toBe(90)
    expect(parseDuration("1:30")).toBe(90)
    expect(parseDuration("45 min")).toBe(45)
    expect(parseDuration("soon")).toBeUndefined()
  })

  it("read in hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m")
    expect(formatDuration(120)).toBe("2h")
    expect(formatDuration(20)).toBe("20m")
    expect(formatDuration(0)).toBe("0m")
  })
})

describe("date values", () => {
  const due: PropertyDefinition = { id: "due", name: "Due", type: "date" }
  const today = new Date(2026, 10, 25)

  it("holds a day, a time, or a range", () => {
    expect(toPropertyDate("2026-11-27")).toMatchObject({
      start: "2026-11-27",
      end: null,
      hasTime: false,
    })
    expect(toPropertyDate("2026-11-27T14:30")).toMatchObject({
      hasTime: true,
    })
    expect(
      toPropertyDate({ start: "2026-11-27", end: "2026-12-02" })
    ).toMatchObject({ start: "2026-11-27", end: "2026-12-02" })
    expect(toPropertyDate({ start: "never" })).toBeNull()
    expect(toPropertyDate(null)).toBeNull()
  })

  it("reads in the chosen format", () => {
    const read = (settings: PropertyDefinition["settings"], value: unknown) =>
      formatPropertyDateValue({ ...due, settings }, value, today)
    expect(read(undefined, "2026-11-26")).toBe("Tomorrow")
    expect(read({ dateFormat: "short" }, "2026-11-26")).toBe("Nov 26")
    expect(read({ dateFormat: "long" }, "2026-11-26")).toBe("November 26, 2026")
    expect(read({ dateFormat: "numeric" }, "2026-11-26")).toBe("11/26/2026")
    expect(read({ dateFormat: "iso" }, "2026-11-26")).toBe("2026-11-26")
    expect(read({ hourCycle: "24" }, "2026-11-27T14:30")).toBe("Nov 27, 14:30")
    expect(read(undefined, { start: "2026-11-27", end: "2026-12-02" })).toBe(
      "Nov 27 – Dec 2"
    )
  })

  it("sorts, filters and goes overdue by the right end", () => {
    const range = { start: "2026-11-20", end: "2026-11-28" }
    expect(comparePropertyValues(due, range, "2026-11-21")).toBeLessThan(0)
    expect(isPropertyOverdue(range, today)).toBe(false)
    expect(
      isPropertyOverdue({ start: "2026-11-20", end: "2026-11-24" }, today)
    ).toBe(true)
  })
})

describe("files", () => {
  const files: PropertyDefinition = {
    id: "media",
    name: "Media",
    type: "files",
  }

  it("reads addresses and records alike", () => {
    expect(
      readPropertyFiles([
        "https://example.com/a/photo.jpg?w=200",
        { id: "two", name: "Notes.pdf", url: "/notes.pdf" },
        { name: "" },
        4,
      ])
    ).toEqual([
      {
        id: "https://example.com/a/photo.jpg?w=200",
        name: "photo.jpg",
        url: "https://example.com/a/photo.jpg?w=200",
      },
      { id: "two", name: "Notes.pdf", url: "/notes.pdf" },
    ])
    expect(readPropertyFiles(null)).toEqual([])
  })

  it("takes the first picture as the cover", () => {
    expect(
      getPropertyCover(files, [
        { id: "1", name: "Notes.pdf", url: "/notes.pdf" },
        { id: "2", name: "Shot", url: "/shot", type: "image/webp" },
        "/other.png",
      ])
    ).toMatchObject({ id: "2" })
    expect(
      getPropertyCover(files, [{ id: "1", name: "a.pdf", url: "/a" }])
    ).toBeNull()
    expect(getPropertyCover({ ...files, type: "text" }, ["/a.png"])).toBeNull()
  })

  it("covers cards with the chosen property, or the first that can", () => {
    const properties = [source, files, { ...files, id: "extra" }]
    const pick = (id: string | null | undefined) =>
      getCoverProperty(properties, id)?.id
    expect(pick(undefined)).toBe("media")
    expect(pick("extra")).toBe("extra")
    expect(pick(null)).toBeUndefined()
    expect(pick("estimate")).toBeUndefined()
  })

  it("links only to addresses that open a file", () => {
    const link = (url: string) => getFileLink({ id: "1", name: "a", url })
    expect(link("https://example.com/a.pdf")).toBe("https://example.com/a.pdf")
    expect(link("/files/a.pdf")).toBe("/files/a.pdf")
    expect(link("blob:https://example.com/1")).toBe(
      "blob:https://example.com/1"
    )
    expect(link("javascript:alert(1)")).toBeUndefined()
    expect(link("data:text/html,hi")).toBeUndefined()
  })

  it("is searched by name", () => {
    expect(
      formatPropertyValue(files, [{ id: "1", name: "Notes.pdf", url: "/a" }])
    ).toBe("Notes.pdf")
  })

  it("keeps to the limits of its settings", () => {
    const one: PropertyDefinition = { ...files, settings: { maxFiles: 1 } }
    expect(validatePropertyValue(one, ["/a.png", "/b.png"])).toBe(
      "Media takes 1 file."
    )
  })
})

describe("property rules", () => {
  const check = (property: Partial<PropertyDefinition>, value: unknown) =>
    validatePropertyValue({ ...source, ...property }, value)

  it("says why a value can't be kept", () => {
    expect(check({ required: true }, null)).toBe("Estimate is required.")
    expect(check({ required: true }, "Two")).toBeNull()
    expect(check({ settings: { maxLength: 3 } }, "Four")).toBe(
      "Estimate takes 3 characters at most."
    )
    const range = { minimum: 1, maximum: 5 }
    expect(check({ type: "number", settings: range }, 0)).toBe(
      "Estimate is 1 at least."
    )
    expect(check({ type: "number", settings: range }, 9)).toBe(
      "Estimate is 5 at most."
    )
    expect(check({ type: "email" }, "maya")).toBe("Enter an email address.")
    expect(check({ type: "url" }, "https://example.com")).toBeNull()
    expect(check({ type: "color" }, "#12f")).toBeNull()
    expect(check({ type: "color" }, "blueish")).toBe("Enter a hex color.")
  })

  it("reads a bare site as an address", () => {
    expect(
      parsePropertyInput({ ...source, type: "url" }, "example.com/a")
    ).toBe("https://example.com/a")
  })

  it("lets an app's type make its own", () => {
    const types = createPropertyTypes([
      {
        type: "points",
        name: "Points",
        filterAs: "number",
        format: (value) => `${String(value)} pt`,
        parse: (text) => (/^\d+$/.test(text) ? Number(text) : undefined),
        validate: (value) => (value === 4 ? "Four isn’t in the scale." : null),
        isEmpty: (value) => value === 0,
      },
    ])
    const points: PropertyDefinition = { ...source, type: "points" }
    expect(formatPropertyValue(points, 8, types)).toBe("8 pt")
    expect(parsePropertyInput(points, "8", types)).toBe(8)
    expect(parsePropertyInput(points, "big", types)).toBeUndefined()
    expect(validatePropertyValue(points, 4, types)).toBe(
      "Four isn’t in the scale."
    )
    expect(hasPropertyValue(points, 0, types)).toBe(false)
    expect(comparePropertyValues(points, 10, 9, types)).toBeGreaterThan(0)
    expect(
      matchesPropertyFilters(
        {
          match: "all",
          filters: [{ propertyId: "estimate", operator: "gt", value: 5 }],
        },
        new Map([["estimate", points]]),
        () => 8,
        types
      )
    ).toBe(true)
  })
})

describe("rows and choices", () => {
  it("hides a row by its visibility", () => {
    const row = (
      visibility: PropertyDefinition["visibility"],
      value: unknown
    ) => isPropertyShown({ ...source, visibility }, value)
    expect(row(undefined, null)).toBe(true)
    expect(row("hide-empty", null)).toBe(false)
    expect(row("hide-empty", "Two")).toBe(true)
    expect(row("hide", "Two")).toBe(false)
  })

  it("groups a status's options by where they stand", () => {
    const groups = getChoiceGroups([
      { value: "a", label: "Todo", group: "todo" },
      { value: "b", label: "Review", group: "inProgress" },
      { value: "c", label: "Started", group: "inProgress" },
    ])
    expect(groups.map(({ name, options }) => [name, options.length])).toEqual([
      ["To do", 1],
      ["In progress", 2],
    ])
    expect(getChoiceGroups([{ value: "a", label: "Low" }])).toEqual([
      { id: "all", name: null, options: [{ value: "a", label: "Low" }] },
    ])
  })

  it("collects what a new record starts with", () => {
    expect(
      getPropertyDefaults([
        { ...source, id: "a", defaultValue: "high" },
        { ...source, id: "b" },
        { ...source, id: "c", defaultValue: false },
      ])
    ).toEqual({ a: "high", c: false })
  })

  it("takes several values by its setting", () => {
    const person: PropertyDefinition = { ...source, type: "person" }
    expect(isMultiProperty(person)).toBe(false)
    expect(isMultiProperty({ ...person, settings: { isMultiple: true } })).toBe(
      true
    )
    expect(isMultiProperty({ ...person, type: "relation" })).toBe(true)
  })
})
