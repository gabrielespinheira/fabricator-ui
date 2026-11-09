import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { TimeWheel } from "@/registry/fabricator/shared/ui/time-wheel"

function getColumns(html: string) {
  return Array.from(html.matchAll(/role="spinbutton"[^>]*>/g), ([tag]) => ({
    label: /aria-label="([^"]*)"/.exec(tag)?.[1],
    text: /aria-valuetext="([^"]*)"/.exec(tag)?.[1],
  }))
}

const noop = () => {}

describe("TimeWheel", () => {
  it("has hours, minutes and AM or PM on a 12-hour clock", () => {
    const html = renderToStaticMarkup(
      <TimeWheel value="21:05" hourCycle={12} onValueChange={noop} />
    )

    expect(getColumns(html)).toEqual([
      { label: "Hours", text: "9" },
      { label: "Minutes", text: "05" },
      { label: "AM or PM", text: "PM" },
    ])
  })

  it("adds seconds, and drops AM or PM on a 24-hour clock", () => {
    const html = renderToStaticMarkup(
      <TimeWheel
        value="21:05:09"
        hourCycle={24}
        hasSeconds
        onValueChange={noop}
      />
    )

    expect(getColumns(html)).toEqual([
      { label: "Hours", text: "21" },
      { label: "Minutes", text: "05" },
      { label: "Seconds", text: "09" },
    ])
  })

  it("puts a minute off the step on the nearest row", () => {
    const html = renderToStaticMarkup(
      <TimeWheel value="10:07" hourCycle={24} step={5} onValueChange={noop} />
    )

    expect(getColumns(html)[1]).toEqual({ label: "Minutes", text: "05" })
  })

  it("is a labelled group with a band behind the columns", () => {
    const html = renderToStaticMarkup(
      <TimeWheel
        value="10:00"
        hourCycle={24}
        label="Start time"
        onValueChange={noop}
      />
    )

    expect(html).toMatch(/role="group" aria-label="Start time"/)
    expect(html).toContain('data-slot="time-wheel-band"')
  })
})
