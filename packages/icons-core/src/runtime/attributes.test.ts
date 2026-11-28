import { describe, expect, it } from "vitest"

import {
  getAutoStrokeWidth,
  getBrandViewBox,
  getStrokeWidth,
  hasA11yProp,
  mergeClasses,
} from "./attributes"

describe("mergeClasses", () => {
  it("drops empty and repeated classes", () => {
    expect(mergeClasses("fab-icon", "", undefined, "size-4", "fab-icon")).toBe(
      "fab-icon size-4"
    )
  })
})

describe("hasA11yProp", () => {
  it("spots aria attributes, role and title", () => {
    expect(hasA11yProp({ "aria-label": "Home" })).toBe(true)
    expect(hasA11yProp({ role: "img" })).toBe(true)
    expect(hasA11yProp({ title: "Home" })).toBe(true)
    expect(hasA11yProp({ className: "x" })).toBe(false)
  })
})

describe("getAutoStrokeWidth", () => {
  it("keeps the drawn stroke at the 24px grid", () => {
    expect(getAutoStrokeWidth(1.75, 24)).toBe(1.75)
  })

  it.each([
    [12, 2.5],
    [16, 2.125],
    [18, 2],
    [20, 1.9],
    [32, 1.5625],
    [48, 1.375],
  ])("thickens the stroke of a %dpx icon to %d grid units", (size, width) => {
    expect(getAutoStrokeWidth(1.75, size)).toBeCloseTo(width, 5)
  })

  it("draws a heavier line on screen as the icon grows", () => {
    const onScreen = [12, 16, 18, 24, 32, 48].map(
      (size) => (getAutoStrokeWidth(1.75, size) * size) / 24
    )
    expect(onScreen).toEqual([...onScreen].sort((a, b) => a - b))
  })

  it("scales an icon's own drawn stroke the same way", () => {
    expect(getAutoStrokeWidth(1.5, 24)).toBe(1.5)
    expect(getAutoStrokeWidth(1.5, 16)).toBeCloseTo((1.5 * 2.125) / 1.75, 5)
  })
})

describe("getStrokeWidth", () => {
  it("keeps the given width by default", () => {
    expect(getStrokeWidth({ strokeWidth: 1.5, size: 16 })).toBe(1.5)
  })

  it("picks the stroke from the size when none is given", () => {
    expect(getStrokeWidth({ baseStrokeWidth: 1.75, size: 16 })).toBe(2.125)
    expect(getStrokeWidth({ baseStrokeWidth: 1.75, size: "16" })).toBe(2.125)
  })

  it("keeps the drawn stroke for a size with a unit, or none", () => {
    expect(getStrokeWidth({ baseStrokeWidth: 1.75, size: "16px" })).toBe(1.75)
    expect(getStrokeWidth({ baseStrokeWidth: 1.75, size: "1em" })).toBe(1.75)
    expect(getStrokeWidth({ baseStrokeWidth: 1.75 })).toBe(1.75)
  })

  it("compensates for the size with absoluteStrokeWidth", () => {
    expect(
      getStrokeWidth({ strokeWidth: 2, size: 48, absoluteStrokeWidth: true })
    ).toBe(1)
  })
})

describe("getBrandViewBox", () => {
  it("returns the plain box for an uncorrected mark", () => {
    expect(getBrandViewBox(24, 24)).toBe("0 0 24 24")
  })

  it("widens the box around its centre, so a correction can never clip", () => {
    expect(getBrandViewBox(24, 24, 0.8)).toBe("-3 -3 30 30")
  })

  it("uses the art's own box", () => {
    expect(getBrandViewBox(256, 180, 0.9)).toBe("-14.222 -10 284.444 200")
  })
})
