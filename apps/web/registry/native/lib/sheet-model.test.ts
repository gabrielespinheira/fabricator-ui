import { describe, expect, it } from "vitest"

import {
  getClosedOffset,
  getDismissDuration,
  getDragOffset,
  getSideForSwipe,
  getSwipeAxis,
  shouldDismissSheet,
  type SheetSide,
} from "@/registry/native/lib/sheet-model"

// Toward closing: down for a bottom sheet, up for a top one, and so on.
const CLOSING: Record<SheetSide, number> = {
  bottom: 1,
  top: -1,
  right: 1,
  left: -1,
}
const SIDES: SheetSide[] = ["bottom", "top", "right", "left"]

describe("shouldDismissSheet", () => {
  const release = (
    side: SheetSide,
    translation: number,
    velocity = 0,
    size = 400
  ) =>
    shouldDismissSheet({
      side,
      size,
      translation: translation * CLOSING[side],
      velocity: velocity * CLOSING[side],
    })

  it.each(SIDES)("stays when released short of half way: %s", (side) => {
    expect(release(side, 199)).toBe(false)
  })

  it.each(SIDES)("dismisses when released past half way: %s", (side) => {
    expect(release(side, 200)).toBe(true)
  })

  it.each(SIDES)(
    "a flick toward closing dismisses from anywhere: %s",
    (side) => {
      expect(release(side, 20, 500)).toBe(true)
    }
  )

  it.each(SIDES)("a slow drag doesn't count as a flick: %s", (side) => {
    expect(release(side, 20, 499)).toBe(false)
  })

  it.each(SIDES)("a flick back keeps it open past half way: %s", (side) => {
    expect(release(side, 300, -500)).toBe(false)
  })

  it.each(SIDES)("dragging the wrong way never dismisses: %s", (side) => {
    expect(release(side, -300)).toBe(false)
  })

  it("needs a real drag on a small surface", () => {
    expect(release("bottom", 9, 0, 10)).toBe(false)
    expect(release("bottom", 10, 0, 10)).toBe(true)
  })

  it("a flick without travel isn't a swipe", () => {
    expect(release("bottom", 0, 900)).toBe(false)
    expect(release("bottom", -40, 900)).toBe(false)
  })

  it("doesn't dismiss before it has been measured", () => {
    expect(release("bottom", 300, 0, 0)).toBe(false)
  })
})

describe("getDragOffset", () => {
  it("follows the finger toward closing", () => {
    expect(getDragOffset("bottom", 120)).toBe(120)
    expect(getDragOffset("right", 120)).toBe(120)
    expect(getDragOffset("top", -120)).toBe(-120)
    expect(getDragOffset("left", -120)).toBe(-120)
  })

  it("resists the other way, and never reaches the finger", () => {
    const pulled = getDragOffset("bottom", -100)
    expect(pulled).toBeLessThan(0)
    expect(pulled).toBeGreaterThan(-100)
    expect(getDragOffset("top", 100)).toBe(-pulled)
    expect(Math.abs(getDragOffset("bottom", -1000))).toBeLessThan(100)
  })

  it("stays put with no movement", () => {
    expect(Math.abs(getDragOffset("bottom", 0))).toBe(0)
  })
})

describe("getClosedOffset", () => {
  it("sits past the edge the sheet is attached to", () => {
    expect(getClosedOffset("bottom", 300)).toBeGreaterThan(300)
    expect(getClosedOffset("right", 300)).toBeGreaterThan(300)
    expect(getClosedOffset("top", 300)).toBeLessThan(-300)
    expect(getClosedOffset("left", 300)).toBeLessThan(-300)
  })
})

describe("getDismissDuration", () => {
  it("takes the role's duration without a flick", () => {
    expect(
      getDismissDuration({ remaining: 300, velocity: 0, duration: 250 })
    ).toBe(250)
    expect(
      getDismissDuration({ remaining: 300, velocity: -800, duration: 250 })
    ).toBe(250)
  })

  it("is quicker the harder the flick", () => {
    const soft = getDismissDuration({
      remaining: 300,
      velocity: 1500,
      duration: 250,
    })
    const hard = getDismissDuration({
      remaining: 300,
      velocity: 3000,
      duration: 250,
    })
    expect(soft).toBe(200)
    expect(hard).toBe(100)
  })

  it("never runs longer than the role, or instantly", () => {
    expect(
      getDismissDuration({ remaining: 300, velocity: 100, duration: 250 })
    ).toBe(250)
    expect(
      getDismissDuration({ remaining: 1, velocity: 9000, duration: 250 })
    ).toBe(25)
  })

  it("stays zero when motion is off", () => {
    expect(
      getDismissDuration({ remaining: 300, velocity: 2000, duration: 0 })
    ).toBe(0)
  })
})

describe("swipe directions", () => {
  it("names the side a drawer swipes away toward", () => {
    expect(getSideForSwipe("down")).toBe("bottom")
    expect(getSideForSwipe("up")).toBe("top")
    expect(getSideForSwipe("left")).toBe("left")
    expect(getSideForSwipe("right")).toBe("right")
  })

  it("names the axis a side moves on", () => {
    expect(getSwipeAxis("top")).toBe("y")
    expect(getSwipeAxis("bottom")).toBe("y")
    expect(getSwipeAxis("left")).toBe("x")
    expect(getSwipeAxis("right")).toBe("x")
  })
})
