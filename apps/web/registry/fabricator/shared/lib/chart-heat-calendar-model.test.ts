import { describe, expect, it } from "vitest"

import {
  getHeatCalendarIndexAt,
  getHeatCalendarModel,
  getHeatCalendarStep,
  getHeatCalendarTable,
  getHeatCalendarThresholds,
  getHeatCalendarTooltip,
  getHeatLevel,
  HEAT_LEVEL_OPACITY,
  interpolateHeatCells,
} from "./chart-heat-calendar-model"

const size = { width: 800, height: 200 }

function model(
  options: Partial<Parameters<typeof getHeatCalendarModel>[0]> = {}
) {
  return getHeatCalendarModel({
    data: [],
    size,
    fontSize: 11,
    ...options,
  })
}

describe("getHeatCalendarThresholds", () => {
  it("splits the non-zero values at their quartiles", () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1)
    expect(getHeatCalendarThresholds([0, 0, ...values])).toEqual([
      25.75, 50.5, 75.25,
    ])
  })

  it("ignores zeros and gaps", () => {
    expect(getHeatCalendarThresholds([0, 0, 4])).toEqual([4, 4, 4])
    expect(getHeatCalendarThresholds([])).toEqual([0, 0, 0])
  })
})

describe("getHeatLevel", () => {
  const thresholds = [5, 10, 20]

  it("keeps level 0 for no data, zero and less", () => {
    expect(getHeatLevel(null, thresholds)).toBe(0)
    expect(getHeatLevel(0, thresholds)).toBe(0)
    expect(getHeatLevel(-3, thresholds)).toBe(0)
  })

  it("reads thresholds as the most each of levels 1 to 3 holds", () => {
    expect(getHeatLevel(1, thresholds)).toBe(1)
    expect(getHeatLevel(5, thresholds)).toBe(1)
    expect(getHeatLevel(6, thresholds)).toBe(2)
    expect(getHeatLevel(20, thresholds)).toBe(3)
    expect(getHeatLevel(21, thresholds)).toBe(4)
  })

  it("gives the smallest value level 1 when values repeat", () => {
    const repeated = getHeatCalendarThresholds([1, 1, 1, 2, 2, 3, 5, 8])
    expect(getHeatLevel(1, repeated)).toBe(1)
    expect(getHeatLevel(8, repeated)).toBe(4)
  })
})

describe("getHeatCalendarModel", () => {
  const data = [
    { date: "2026-11-02", value: 3 },
    { date: "2026-11-03", value: 12 },
    { date: "2026-11-15", value: 1 },
  ]

  it("defaults to the 52 weeks ending at the latest date", () => {
    const { cells, columns } = model({ data })
    expect(cells).toHaveLength(364)
    expect(cells[0].id).toBe("2025-11-17")
    expect(cells.at(-1)?.id).toBe("2026-11-15")
    expect(columns).toBe(52)
  })

  it("puts weeks in columns and weekdays in rows, Monday first", () => {
    const { cells } = model({ data })
    // 2025-11-17 is a Monday, 2026-11-15 a Sunday.
    expect(cells[0]).toMatchObject({ week: 0, day: 0 })
    expect(cells.at(-1)).toMatchObject({ week: 51, day: 6 })
  })

  it("starts weeks on Sunday when asked, leaving the first column partial", () => {
    const { cells, columns, weekdayLabels } = model({
      data,
      weekStartsOn: 0,
      range: { start: "2026-07-27", end: "2026-11-15" },
    })
    // 2026-07-27 is a Monday: the second row of its Sunday-first week.
    expect(cells[0]).toMatchObject({ id: "2026-07-27", week: 0, day: 1 })
    expect(cells.at(-1)).toMatchObject({ id: "2026-11-15", day: 0 })
    expect(columns).toBe(17)
    expect(weekdayLabels.map((item) => item.label)).toEqual([
      "Mon",
      "Wed",
      "Fri",
    ])
    expect(weekdayLabels[0].y).toBeLessThan(weekdayLabels[1].y)
  })

  it("reads Date objects and adds up rows on the same day", () => {
    const { cells } = model({
      data: [
        { day: new Date(Date.UTC(2026, 10, 3)), count: 2 },
        { day: "2026-11-03", count: 5 },
      ],
      dateKey: "day",
      valueKey: "count",
    })
    expect(cells.at(-1)).toMatchObject({
      id: "2026-11-03",
      value: 7,
      datumIndex: 0,
    })
    expect(cells[0].datumIndex).toBeNull()
  })

  it("reads days in UTC, so every reader gets the same day", () => {
    const { cells } = model({
      data: [
        { date: "2026-11-03T23:30:00-05:00", value: 1 },
        { date: Date.UTC(2026, 10, 1, 12), value: 1 },
      ],
    })
    expect(cells.at(-1)?.id).toBe("2026-11-04")
    expect(cells.find((cell) => cell.id === "2026-11-01")?.value).toBe(1)
  })

  it("levels each day and paints levels in opacity steps of one hue", () => {
    const { cells, paint, levels } = model({ data })
    const byId = new Map(cells.map((cell) => [cell.id, cell]))
    expect(byId.get("2026-11-01")).toMatchObject({ value: null, level: 0 })
    expect(byId.get("2026-11-03")?.level).toBe(4)
    expect(byId.get("2026-11-15")?.level).toBe(1)
    expect(byId.get("2026-11-03")?.opacity).toBe(HEAT_LEVEL_OPACITY[4])
    expect(paint).toEqual({ token: "chart-series-1" })
    expect(levels.map((level) => level.opacity)).toEqual([
      ...HEAT_LEVEL_OPACITY,
    ])
  })

  it("takes explicit thresholds and a colour", () => {
    const { cells, paint } = model({
      data,
      thresholds: [2, 4, 100],
      color: "success",
    })
    expect(cells.find((cell) => cell.id === "2026-11-03")?.level).toBe(3)
    expect(paint).toEqual({ token: "success" })
  })

  it("sizes square cells to the width, 3px apart, within bounds", () => {
    const fitted = model({ data })
    expect(fitted.gap).toBe(3)
    expect(fitted.cellSize).toBeGreaterThanOrEqual(8)
    expect(fitted.cellSize).toBeLessThanOrEqual(16)
    expect(fitted.gutter + fitted.width).toBeLessThanOrEqual(size.width)
    expect(fitted.overflows).toBe(false)
    const [first, second] = fitted.cells
    expect(second.y - first.y).toBe(fitted.cellSize + 3)

    const narrow = model({ data, size: { width: 340, height: 200 } })
    expect(narrow.cellSize).toBe(8)
    expect(narrow.overflows).toBe(true)
    expect(narrow.gutter + narrow.width).toBeGreaterThan(340)

    const short = model({
      data,
      range: { start: "2026-10-01", end: "2026-11-15" },
    })
    expect(short.cellSize).toBe(16)
  })

  it("leaves the weekday names room for wide letters at any size", () => {
    for (const fontSize of [11, 15]) {
      const { gutter } = model({ data, fontSize })
      // "Wed" with every letter as wide as a W, then the gap to the grid.
      expect(gutter).toBeGreaterThanOrEqual(3 * fontSize * 0.75 + 8)
    }
  })

  it("labels months only where they start and there's room", () => {
    const { monthLabels, cells, cellSize, gap } = model({ data })
    expect(monthLabels[0].label).toBe("Dec")
    expect(monthLabels.at(-1)?.label).toBe("Nov")
    // Each label starts at its column and ends before the next one.
    for (const [index, item] of monthLabels.entries()) {
      const next = monthLabels[index + 1]
      if (next) expect(item.x + 3 * 11 * 0.6).toBeLessThan(next.x)
      expect(item.x % (cellSize + gap)).toBeCloseTo(
        cells[0].x % (cellSize + gap)
      )
    }
  })

  it("writes the range, with years when it spans two", () => {
    expect(model({ data }).rangeLabel).toBe("Nov 17, 2025 – Nov 15, 2026")
    expect(
      model({ data, range: { start: "2026-07-27", end: "2026-11-15" } })
        .rangeLabel
    ).toBe("Jul 27 – Nov 15")
  })

  it("draws nothing without data or a range", () => {
    expect(model().cells).toEqual([])
  })
})

describe("getHeatCalendarTooltip and table", () => {
  const data = [
    { date: "2026-11-03", value: 12 },
    { date: "2026-11-04", value: 0 },
  ]
  const calendar = model({
    data,
    range: { start: "2026-11-02", end: "2026-11-05" },
  })

  it("reads the value on the day", () => {
    expect(getHeatCalendarTooltip(calendar, 1).title).toBe("12 on Tue, Nov 3")
    expect(getHeatCalendarTooltip(calendar, 2).title).toBe("0 on Wed, Nov 4")
    expect(getHeatCalendarTooltip(calendar, 0).title).toBe(
      "No data on Mon, Nov 2"
    )
    expect(
      getHeatCalendarTooltip(calendar, 1, (value) => `${value} commits`).title
    ).toBe("12 commits on Tue, Nov 3")
  })

  it("lists every day in the table", () => {
    const table = getHeatCalendarTable(calendar)
    expect(table.rows).toHaveLength(4)
    expect(table.rows[1]).toEqual({
      header: "Tue, Nov 3, 2026",
      cells: ["12"],
    })
    expect(table.rows[0].cells).toEqual(["–"])
  })
})

describe("getHeatCalendarStep", () => {
  it("steps a day down and up, a week sideways", () => {
    expect(getHeatCalendarStep(10, "ArrowDown", 30)).toBe(11)
    expect(getHeatCalendarStep(10, "ArrowUp", 30)).toBe(9)
    expect(getHeatCalendarStep(10, "ArrowRight", 30)).toBe(17)
    expect(getHeatCalendarStep(10, "ArrowLeft", 30)).toBe(3)
  })

  it("stays put at the edges and jumps with Home and End", () => {
    expect(getHeatCalendarStep(25, "ArrowRight", 30)).toBe(25)
    expect(getHeatCalendarStep(3, "ArrowLeft", 30)).toBe(3)
    expect(getHeatCalendarStep(29, "ArrowDown", 30)).toBe(29)
    expect(getHeatCalendarStep(0, "ArrowUp", 30)).toBe(0)
    expect(getHeatCalendarStep(12, "Home", 30)).toBe(0)
    expect(getHeatCalendarStep(12, "End", 30)).toBe(29)
  })

  it("lands on the first or last day from nothing", () => {
    expect(getHeatCalendarStep(-1, "ArrowRight", 30)).toBe(0)
    expect(getHeatCalendarStep(-1, "ArrowDown", 30)).toBe(0)
    expect(getHeatCalendarStep(-1, "ArrowLeft", 30)).toBe(29)
    expect(getHeatCalendarStep(-1, "ArrowUp", 30)).toBe(29)
    expect(getHeatCalendarStep(-1, "Enter", 30)).toBeNull()
    expect(getHeatCalendarStep(0, "ArrowDown", 0)).toBeNull()
  })
})

describe("getHeatCalendarIndexAt", () => {
  const calendar = model({
    data: [{ date: "2026-11-15", value: 1 }],
    weekStartsOn: 0,
    range: { start: "2026-07-27", end: "2026-11-15" },
  })
  const step = calendar.cellSize + calendar.gap

  it("finds the cell under a point", () => {
    const cell = calendar.cells[20]
    expect(
      getHeatCalendarIndexAt(calendar, {
        x: cell.x + calendar.cellSize / 2,
        y: cell.y + calendar.cellSize / 2,
      })
    ).toBe(20)
  })

  it("snaps to the nearest day in range outside the cells", () => {
    // The first column's Sunday is before the range starts.
    expect(
      getHeatCalendarIndexAt(calendar, { x: calendar.cells[0].x, y: 0 })
    ).toBe(0)
    expect(
      getHeatCalendarIndexAt(calendar, {
        x: calendar.width + step * 4,
        y: calendar.height,
      })
    ).toBe(calendar.cells.length - 1)
  })
})

describe("interpolateHeatCells", () => {
  const before = model({
    data: [
      { date: "2026-11-02", value: 1 },
      { date: "2026-11-03", value: 4 },
    ],
    range: { start: "2026-11-02", end: "2026-11-04" },
  })
  const after = model({
    data: [
      { date: "2026-11-02", value: 4 },
      { date: "2026-11-03", value: 1 },
    ],
    range: { start: "2026-11-03", end: "2026-11-05" },
  })

  it("moves levels by opacity, keyed by day", () => {
    const halfway = interpolateHeatCells(before.cells, after.cells, 0.5)
    const day = halfway?.find((cell) => cell.id === "2026-11-03")
    const from = before.cells.find((cell) => cell.id === "2026-11-03")
    const to = after.cells.find((cell) => cell.id === "2026-11-03")
    expect(day?.opacity).toBeCloseTo(
      ((from?.opacity ?? 0) + (to?.opacity ?? 0)) / 2
    )
  })

  it("fades entering days in and leaving days out", () => {
    const halfway = interpolateHeatCells(before.cells, after.cells, 0.5) ?? []
    expect(halfway.find((cell) => cell.id === "2026-11-05")?.presence).toBe(0.5)
    const leaving = halfway.find((cell) => cell.id === "2026-11-02")
    expect(leaving).toMatchObject({ presence: 0.5, isLeaving: true })
  })

  it("can't morph between ranges with no day in common", () => {
    const later = model({
      data: [{ date: "2027-01-02", value: 1 }],
      range: { start: "2027-01-01", end: "2027-01-03" },
    })
    expect(interpolateHeatCells(before.cells, later.cells, 0.5)).toBeNull()
  })
})
