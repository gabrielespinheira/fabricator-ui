import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { Rating } from "../shared/ui/rating"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg data-icon-placeholder="" />,
}))

function getFillWidths(markup: string) {
  return [...markup.matchAll(/clip-path:inset\(0 ([\d.]+)% 0 0\)/g)].map(
    (match) => 100 - Number(match[1])
  )
}

describe("Rating", () => {
  it("is a labelled slider from 0 to max with one star each", () => {
    const markup = renderToStaticMarkup(<Rating defaultValue={3} />)
    expect(markup).toMatch(/^<div[^>]*role="slider"/)
    expect(markup).toContain('data-slot="rating"')
    expect(markup).toContain('aria-label="Rating"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="5"')
    expect(markup).toContain('aria-valuenow="3"')
    expect(markup).toContain('aria-valuetext="3 out of 5 stars"')
    expect(markup).toContain('tabindex="0"')
    expect(markup.match(/data-slot="rating-star"/g)).toHaveLength(5)
  })

  it("fills stars up to the value, half a star for a half", () => {
    const markup = renderToStaticMarkup(
      <Rating defaultValue={2.5} step={0.5} />
    )
    expect(getFillWidths(markup)).toEqual([100, 100, 50, 0, 0])
    expect(markup.match(/data-state="full"/g)).toHaveLength(2)
    expect(markup.match(/data-state="half"/g)).toHaveLength(1)
    expect(markup.match(/data-state="empty"/g)).toHaveLength(2)
  })

  it("snaps an interactive value to the step", () => {
    const markup = renderToStaticMarkup(<Rating value={3.4} />)
    expect(markup).toContain('aria-valuenow="3"')
  })

  it("takes max", () => {
    const markup = renderToStaticMarkup(<Rating max={10} defaultValue={7} />)
    expect(markup.match(/data-slot="rating-star"/g)).toHaveLength(10)
    expect(markup).toContain('aria-valuetext="7 out of 10 stars"')
  })

  it("shows a read-only value's exact fraction as an image", () => {
    const markup = renderToStaticMarkup(<Rating value={4.3} readOnly />)
    expect(markup).toMatch(/^<div[^>]*role="img"/)
    expect(markup).toContain('aria-label="Rating: 4.3 out of 5 stars"')
    expect(markup).not.toContain("tabindex")
    expect(markup).not.toContain("aria-valuenow")
    expect(markup).toContain("data-readonly")
    expect(getFillWidths(markup).map(Math.round)).toEqual([
      100, 100, 100, 100, 30,
    ])
  })

  it("takes no focus when disabled", () => {
    const markup = renderToStaticMarkup(<Rating defaultValue={2} disabled />)
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain("data-disabled")
    expect(markup).not.toContain("tabindex")
  })

  it("sets its variant and size on the root", () => {
    const markup = renderToStaticMarkup(
      <Rating variant="primary" size="lg" defaultValue={1} />
    )
    expect(markup).toContain('data-variant="primary"')
    expect(markup).toContain('data-size="lg"')
    expect(markup).toContain("cn-rating-variant-primary")
    expect(markup).toContain("cn-rating-size-lg")
  })

  it("submits its value with a form under name", () => {
    const markup = renderToStaticMarkup(
      <Rating name="score" defaultValue={4} />
    )
    expect(markup).toContain('<input type="hidden" name="score" value="4"/>')
  })

  it("takes its own label and value text", () => {
    const markup = renderToStaticMarkup(
      <Rating
        aria-label="Quality"
        defaultValue={2}
        getAriaValueText={(value, max) => `${value} de ${max}`}
      />
    )
    expect(markup).toContain('aria-label="Quality"')
    expect(markup).toContain('aria-valuetext="2 de 5"')
  })
})
