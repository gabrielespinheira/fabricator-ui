import { describe, expect, it } from "vitest"

import {
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

describe("getStrokeWidth", () => {
  it("keeps the given width by default", () => {
    expect(getStrokeWidth({ strokeWidth: 1.5, size: 16 })).toBe(1.5)
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
