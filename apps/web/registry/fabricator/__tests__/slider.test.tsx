import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import * as AriaSlider from "@/registry/fabricator/aria/ui/slider"
import * as BaseSlider from "@/registry/fabricator/base/ui/slider"
import * as RadixSlider from "@/registry/fabricator/radix/ui/slider"

const BASES = [
  ["base", BaseSlider],
  ["radix", RadixSlider],
  ["aria", AriaSlider],
] as const

function renderSlider(
  { Slider }: (typeof BASES)[number][1],
  props: Record<string, unknown>
) {
  // Each base types its value props differently; the shared ones are enough.
  const Root = Slider as React.ComponentType<Record<string, unknown>>
  return renderToStaticMarkup(<Root aria-label="Volume" {...props} />)
}

function getSteps(html: string) {
  return Array.from(
    html.matchAll(/<span[^>]*data-slot="slider-step"[^>]*>/g),
    ([tag]) => tag
  )
}

describe.each(BASES)("%s slider", (_, slider) => {
  it("keeps the upstream parts", () => {
    const html = renderSlider(slider, { defaultValue: [50] })
    for (const slot of [
      "slider",
      "slider-track",
      "slider-range",
      "slider-thumb",
    ]) {
      expect(html).toContain(`data-slot="${slot}"`)
    }
  })

  it("draws no steps unless asked", () => {
    const html = renderSlider(slider, { defaultValue: [50], step: 25 })
    expect(getSteps(html)).toEqual([])
  })

  it("draws a dot on every step, hidden from assistive tech", () => {
    const html = renderSlider(slider, {
      defaultValue: [50],
      step: 25,
      showSteps: true,
    })
    const steps = getSteps(html)
    expect(steps).toHaveLength(5)
    expect(html).toMatch(/data-slot="slider-steps"[^>]*aria-hidden="true"/)
  })

  it("marks the steps the range covers", () => {
    const html = renderSlider(slider, {
      defaultValue: [50],
      step: 25,
      showSteps: true,
    })
    expect(getSteps(html).map((tag) => tag.includes("data-filled"))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
  })

  it("names its size", () => {
    expect(renderSlider(slider, { defaultValue: [50], size: "sm" })).toMatch(
      /data-slot="slider"[^>]*data-size="sm"|data-size="sm"[^>]*data-slot="slider"/
    )
    expect(renderSlider(slider, { defaultValue: [50] })).toContain(
      'data-size="default"'
    )
  })
})

// React Aria names its thumbs from the slider itself; the other primitives
// leave a thumb unnamed unless it gets the label.
describe.each(BASES.filter(([name]) => name !== "aria"))(
  "%s slider thumbs",
  (_, slider) => {
    it("take the slider's name", () => {
      // The root keeps it too, so the thumb's is the second.
      const html = renderSlider(slider, { defaultValue: [50] })
      expect(html.match(/aria-label="Volume"/g)).toHaveLength(2)
    })

    it("number the thumbs of a range", () => {
      const html = renderSlider(slider, { defaultValue: [20, 80] })
      expect(html).toContain('aria-label="Volume, 1 of 2"')
      expect(html).toContain('aria-label="Volume, 2 of 2"')
    })
  }
)
