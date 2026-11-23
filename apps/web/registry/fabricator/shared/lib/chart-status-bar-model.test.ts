import { describe, expect, it } from "vitest"

import {
  getStatusBarModel,
  getStatusBarTable,
  getStatusBarTooltip,
  interpolateStatusPills,
  STATUS_PILL_MIN,
} from "./chart-status-bar-model"

const days = (
  statuses: (string | null)[],
  notes: Record<number, string> = {}
) =>
  statuses.map((status, index) => ({
    day: `2026-11-${String(index + 1).padStart(2, "0")}`,
    status,
    note: notes[index],
  }))

const size = { width: 600, height: 32 }

function model(options: Partial<Parameters<typeof getStatusBarModel>[0]> = {}) {
  return getStatusBarModel({
    data: days(["operational", "degraded", "outage", "maintenance", null]),
    index: "day",
    size,
    ...options,
  })
}

describe("getStatusBarModel", () => {
  it("draws a pill per day across the width, tall and evenly spaced", () => {
    const { pills } = model()
    expect(pills).toHaveLength(5)
    expect(pills[0].x).toBe(0)
    const last = pills.at(-1)
    expect((last?.x ?? 0) + (last?.width ?? 0)).toBe(600)
    expect(pills[1].x - (pills[0].x + pills[0].width)).toBe(3)
    for (const pill of pills) {
      expect(pill.height).toBe(32)
      expect(Number.isInteger(pill.x)).toBe(true)
    }
  })

  it("narrows the gap to 2px for thin pills", () => {
    const { pills } = model({
      data: days(Array.from({ length: 30 }, () => "operational")),
      size: { width: 200, height: 32 },
    })
    expect(pills[1].x - (pills[0].x + pills[0].width)).toBe(2)
  })

  it("shows only the latest days that fit once pills reach their minimum", () => {
    const data = days(Array.from({ length: 90 }, () => "operational")).map(
      (datum, index) => ({ ...datum, day: `day ${index}` })
    )
    const { pills, first } = model({ data, size: { width: 300, height: 32 } })
    expect(pills.length).toBeLessThan(90)
    expect(first).toBe(90 - pills.length)
    expect(pills.at(-1)?.index).toBe(89)
    for (const pill of pills) {
      expect(pill.width).toBeGreaterThanOrEqual(STATUS_PILL_MIN)
    }
  })

  it("colours the default statuses with the status roles", () => {
    const { pills } = model()
    expect(pills.map((pill) => pill.paint)).toEqual([
      { token: "success" },
      { token: "warning" },
      { token: "destructive" },
      { token: "info" },
      { token: "muted-foreground" },
    ])
    expect(pills[4]).toMatchObject({ status: "none" })
    expect(pills[4].opacity).toBeLessThan(1)
  })

  it("lets statuses be renamed, recoloured and added", () => {
    const { pills, statuses } = model({
      data: days(["operational", "partial", "degraded"]),
      statuses: {
        degraded: { label: "Slow" },
        partial: { label: "Partial outage", color: "chart-series-2" },
      },
    })
    expect(pills[1].paint).toEqual({ token: "chart-series-2" })
    expect(statuses.map((status) => status.label)).toEqual([
      "Operational",
      "Slow",
      "Partial outage",
    ])
    expect(statuses[1].paint).toEqual({ token: "warning" })
  })

  it("lists only the statuses present, in a fixed order", () => {
    const { statuses } = model({
      data: days(["outage", "operational", "operational", null]),
    })
    expect(statuses.map((status) => status.key)).toEqual([
      "operational",
      "outage",
      "none",
    ])
  })

  it("labels the first and last day and the uptime of the days with data", () => {
    const { startLabel, endLabel, uptime, uptimeLabel } = model()
    expect(startLabel).toBe("Nov 1")
    expect(endLabel).toBe("Nov 5")
    expect(uptime).toBeCloseTo(0.25)
    expect(uptimeLabel).toBe("25% uptime")
  })

  it("keeps labels that aren't dates, and formats them on request", () => {
    const data = [
      { week: "Week 1", status: "operational" },
      { week: "Week 2", status: "degraded" },
    ]
    expect(model({ data, index: "week" }).startLabel).toBe("Week 1")
    expect(
      model({
        data,
        index: "week",
        formatIndex: (value) => value.toUpperCase(),
      }).endLabel
    ).toBe("WEEK 2")
  })

  it("reads no uptime without data", () => {
    const { uptime, uptimeLabel } = model({ data: days([null, null]) })
    expect(uptime).toBeNull()
    expect(uptimeLabel).toBe("No data")
  })
})

describe("getStatusBarTooltip", () => {
  it("names the day, its status and its note", () => {
    const calendar = model({
      data: days(["operational", "degraded"], { 1: "Slow checkouts" }),
      noteKey: "note",
    })
    expect(getStatusBarTooltip(calendar, 1)).toEqual({
      title: "Mon, Nov 2",
      rows: [
        {
          key: "status",
          label: "Status",
          paint: { token: "warning" },
          dashed: false,
          value: "Degraded",
        },
      ],
      note: "Slow checkouts",
    })
    expect(getStatusBarTooltip(calendar, 0).note).toBeUndefined()
  })
})

describe("getStatusBarTable", () => {
  it("lists every day, shown or not, with its status and note", () => {
    const data = days(["operational", "outage"], { 1: "Database failover" })
    const table = getStatusBarTable(
      model({ data, noteKey: "note", size: { width: 2, height: 32 } })
    )
    expect(table.columns).toEqual(["Status", "Note"])
    expect(table.rows).toEqual([
      { header: "Sun, Nov 1", cells: ["Operational", ""] },
      { header: "Mon, Nov 2", cells: ["Outage", "Database failover"] },
    ])
  })
})

describe("interpolateStatusPills", () => {
  const before = model({ data: days(["operational", "operational", "outage"]) })
  const after = model({
    data: days(["operational", "degraded", "outage", "operational"]),
  })

  it("crossfades a pill whose status changes", () => {
    const halfway =
      interpolateStatusPills(before.pills, after.pills, 0.25) ?? []
    const changed = halfway.find((pill) => pill.id === "2026-11-02")
    expect(changed?.paint).toEqual({ token: "warning" })
    expect(changed?.previous).toEqual({
      paint: { token: "success" },
      opacity: 0.75,
    })
    const same = halfway.find((pill) => pill.id === "2026-11-01")
    expect(same?.previous).toBeUndefined()
  })

  it("moves pills to their new places and fades new days in", () => {
    const halfway = interpolateStatusPills(before.pills, after.pills, 0.5) ?? []
    const from = before.pills[0]
    const to = after.pills[0]
    const moved = halfway.find((pill) => pill.id === "2026-11-01")
    expect(moved?.width).toBeCloseTo((from.width + to.width) / 2)
    expect(halfway.find((pill) => pill.id === "2026-11-04")?.presence).toBe(0.5)
  })

  it("fades leaving days out and can't morph unrelated days", () => {
    const halfway = interpolateStatusPills(after.pills, before.pills, 0.5) ?? []
    expect(halfway.find((pill) => pill.id === "2026-11-04")).toMatchObject({
      presence: 0.5,
      isLeaving: true,
    })
    const other = model({
      data: [{ day: "2027-01-01", status: "operational" }],
    })
    expect(interpolateStatusPills(before.pills, other.pills, 0.5)).toBeNull()
  })
})
