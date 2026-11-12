import { describe, expect, it } from "vitest"

import {
  getRatingKeyValue,
  getRatingStarFill,
  getRatingValueAtPoint,
  getRatingValueText,
  snapRatingValue,
  type RatingKeyOptions,
} from "./rating-model"

// Five 20px stars with 4px gaps: 0-20, 24-44, 48-68, 72-92, 96-116.
const STARS = [0, 24, 48, 72, 96].map((start) => ({ start, end: start + 20 }))

describe("getRatingValueAtPoint", () => {
  it("fills up to the star under the point in whole steps", () => {
    expect(getRatingValueAtPoint(2, STARS, 1)).toBe(1)
    expect(getRatingValueAtPoint(30, STARS, 1)).toBe(2)
    expect(getRatingValueAtPoint(115, STARS, 1)).toBe(5)
  })

  it("picks the half under the point in half steps", () => {
    expect(getRatingValueAtPoint(5, STARS, 0.5)).toBe(0.5)
    expect(getRatingValueAtPoint(10, STARS, 0.5)).toBe(0.5)
    expect(getRatingValueAtPoint(11, STARS, 0.5)).toBe(1)
    expect(getRatingValueAtPoint(60, STARS, 0.5)).toBe(3)
    expect(getRatingValueAtPoint(74, STARS, 0.5)).toBe(3.5)
  })

  it("counts a gap as the star before it", () => {
    expect(getRatingValueAtPoint(22, STARS, 0.5)).toBe(1)
    expect(getRatingValueAtPoint(46, STARS, 1)).toBe(2)
  })

  it("clears before the first star and fills all past the last", () => {
    expect(getRatingValueAtPoint(-4, STARS, 1)).toBe(0)
    expect(getRatingValueAtPoint(140, STARS, 0.5)).toBe(5)
  })
})

describe("getRatingStarFill", () => {
  it("is the share of each star the value covers", () => {
    expect(getRatingStarFill(0, 3.5)).toBe(1)
    expect(getRatingStarFill(2, 3.5)).toBe(1)
    expect(getRatingStarFill(3, 3.5)).toBe(0.5)
    expect(getRatingStarFill(4, 3.5)).toBe(0)
  })

  it("keeps a display value's fraction", () => {
    expect(getRatingStarFill(4, 4.3)).toBeCloseTo(0.3)
  })
})

describe("snapRatingValue", () => {
  it("rounds to the step and keeps within 0 and max", () => {
    expect(snapRatingValue(3.3, 0.5, 5)).toBe(3.5)
    expect(snapRatingValue(3.2, 0.5, 5)).toBe(3)
    expect(snapRatingValue(3.5, 1, 5)).toBe(4)
    expect(snapRatingValue(7, 1, 5)).toBe(5)
    expect(snapRatingValue(-1, 1, 5)).toBe(0)
  })
})

describe("getRatingKeyValue", () => {
  const options: RatingKeyOptions = { step: 0.5, max: 5 }

  it("steps with the arrows", () => {
    expect(getRatingKeyValue("ArrowRight", 3, options)).toBe(3.5)
    expect(getRatingKeyValue("ArrowUp", 3, options)).toBe(3.5)
    expect(getRatingKeyValue("ArrowLeft", 3, options)).toBe(2.5)
    expect(getRatingKeyValue("ArrowDown", 3, options)).toBe(2.5)
  })

  it("moves a whole star with Page Up and Page Down", () => {
    expect(getRatingKeyValue("PageUp", 3.5, options)).toBe(4.5)
    expect(getRatingKeyValue("PageDown", 0.5, options)).toBe(0)
  })

  it("goes to the ends with Home and End", () => {
    expect(getRatingKeyValue("Home", 3, options)).toBe(0)
    expect(getRatingKeyValue("End", 3, options)).toBe(5)
  })

  it("sets a whole value with a digit up to max", () => {
    expect(getRatingKeyValue("4", 1.5, options)).toBe(4)
    expect(getRatingKeyValue("0", 3, options)).toBe(0)
    expect(getRatingKeyValue("8", 3, options)).toBeNull()
  })

  it("stays within 0 and max", () => {
    expect(getRatingKeyValue("ArrowRight", 5, options)).toBe(5)
    expect(getRatingKeyValue("ArrowLeft", 0, options)).toBe(0)
  })

  it("snaps an off-step value before stepping", () => {
    expect(getRatingKeyValue("ArrowRight", 4.3, { step: 1, max: 5 })).toBe(5)
  })

  it("ignores other keys", () => {
    expect(getRatingKeyValue("Enter", 3, options)).toBeNull()
  })
})

describe("getRatingValueText", () => {
  it("reads the value out of max", () => {
    expect(getRatingValueText(3.5, 5)).toBe("3.5 out of 5 stars")
    expect(getRatingValueText(4, 5)).toBe("4 out of 5 stars")
    expect(getRatingValueText(0, 10)).toBe("0 out of 10 stars")
  })

  it("rounds a display value to one decimal", () => {
    expect(getRatingValueText(4.27, 5)).toBe("4.3 out of 5 stars")
  })
})
