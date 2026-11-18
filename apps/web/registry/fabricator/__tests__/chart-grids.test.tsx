import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ChartTooltip } from "../shared/ui/chart-kit"
import { HeatCalendar } from "../shared/ui/heat-calendar"
import { StatusBar } from "../shared/ui/status-bar"

// What Heat Calendar and Status Bar render on the server, before the plot is
// measured: the frame at its final height and every value in the hidden
// table, so the page doesn't jump and a screen reader has the data at once.

describe("HeatCalendar", () => {
  const data = [
    { date: "2026-11-02", value: 3 },
    { date: "2026-11-03", value: 12 },
  ]

  it("renders a labelled frame with every day in the hidden table", () => {
    const markup = renderToStaticMarkup(
      <HeatCalendar
        data={data}
        label="Deploys per day"
        range={{ start: "2026-11-02", end: "2026-11-08" }}
      />
    )
    expect(markup).toContain('data-slot="heat-calendar"')
    expect(markup).toContain('role="slider"')
    expect(markup).toContain('aria-label="Deploys per day: inspect values"')
    expect(markup).toContain('<th scope="row">Tue, Nov 3, 2026</th><td>12</td>')
    expect(markup.match(/<th scope="row">/g)).toHaveLength(7)
    expect(markup).toContain("Nov 2 – Nov 8")
    expect(markup).toMatch(/data-slot="chart-plot"[^>]*style="height:\d+px"/)
  })

  it("shows the empty content without data", () => {
    const markup = renderToStaticMarkup(
      <HeatCalendar data={[]} label="Deploys per day" empty="No deploys" />
    )
    expect(markup).toContain('data-slot="chart-empty"')
    expect(markup).toContain("No deploys")
    expect(markup).not.toContain('role="slider"')
  })
})

describe("StatusBar", () => {
  const data = [
    { date: "2026-11-14", status: "operational" },
    { date: "2026-11-15", status: "outage", note: "Database failover" },
  ]

  it("renders the dates, the uptime, the legend and the hidden table", () => {
    const markup = renderToStaticMarkup(
      <StatusBar data={data} index="date" noteKey="note" label="API status" />
    )
    expect(markup).toContain('data-slot="status-bar"')
    expect(markup).toContain('aria-label="API status: inspect values"')
    expect(markup).toContain(">50% uptime<")
    expect(markup).toContain('data-slot="status-bar-legend"')
    expect(markup).toContain(">Outage<")
    expect(markup).toContain(
      '<th scope="row">Sun, Nov 15</th><td>Outage</td><td>Database failover</td>'
    )
  })
})

describe("ChartTooltip", () => {
  it("shows a mark's note under its rows", () => {
    const markup = renderToStaticMarkup(
      <ChartTooltip
        content={{ title: "Sun, Nov 15", rows: [], note: "Database failover" }}
        anchor={{ x: 10, y: 10 }}
        frame={{ width: 200, height: 100 }}
      />
    )
    expect(markup).toContain(
      '<div data-slot="chart-tooltip-note" class="cn-chart-tooltip-note">Database failover</div>'
    )
  })
})
