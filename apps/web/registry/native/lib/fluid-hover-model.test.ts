import { describe, expect, it } from "vitest"

import {
  getFadeOutDelay,
  isNearRows,
  pickNearestRow,
  sameRect,
  shouldGlide,
} from "@/registry/native/lib/fluid-hover-model"

const a = { top: 0, left: 0, width: 100, height: 40 }
const b = { top: 40, left: 0, width: 100, height: 40 }

describe("sameRect", () => {
  it("compares by value", () => {
    expect(sameRect(a, { ...a })).toBe(true)
    expect(sameRect(a, b)).toBe(false)
    expect(sameRect(null, null)).toBe(true)
    expect(sameRect(a, null)).toBe(false)
  })
})

describe("shouldGlide", () => {
  it("slides between rows, and appears in place otherwise", () => {
    expect(shouldGlide(a, b)).toBe(true)
    expect(shouldGlide(null, b)).toBe(false)
    expect(shouldGlide(a, null)).toBe(false)
  })
})

const row = (key: string, top: number, left = 0, disabled = false) => ({
  key,
  rect: { top, left, width: 100, height: 40 },
  disabled,
})

describe("pickNearestRow", () => {
  const list = [row("a", 0), row("b", 44), row("c", 88)]

  it("takes the row under the finger", () => {
    expect(pickNearestRow(list, { x: 50, y: 60 }, "y")).toBe("b")
  })

  it("keeps the gaps between rows lit", () => {
    expect(pickNearestRow(list, { x: 50, y: 41 }, "y")).toBe("a")
    expect(pickNearestRow(list, { x: 50, y: 43 }, "y")).toBe("b")
  })

  it("skips disabled rows", () => {
    const rows = [row("a", 0), row("b", 44, 0, true), row("c", 88)]
    expect(pickNearestRow(rows, { x: 50, y: 60 }, "y")).toBe("a")
    expect(pickNearestRow(rows, { x: 50, y: 70 }, "y")).toBe("c")
  })

  it("measures strips along their axis", () => {
    const strip = [row("a", 0, 0), row("b", 0, 104), row("c", 0, 208)]
    expect(pickNearestRow(strip, { x: 150, y: 90 }, "x")).toBe("b")
  })

  it("takes the nearest centre in a grid", () => {
    const grid = [row("a", 0, 0), row("b", 0, 104), row("c", 44, 0)]
    expect(pickNearestRow(grid, { x: 50, y: 60 }, "xy")).toBe("c")
  })

  it("has nothing to light in an empty list", () => {
    expect(pickNearestRow([], { x: 0, y: 0 }, "y")).toBeNull()
  })
})

describe("isNearRows", () => {
  const list = [row("a", 0), row("b", 44)]

  it("is true inside the rows and just outside them", () => {
    expect(isNearRows(list, { x: 50, y: 60 }, 24)).toBe(true)
    expect(isNearRows(list, { x: 120, y: 60 }, 24)).toBe(true)
  })

  it("is false once the finger has left", () => {
    expect(isNearRows(list, { x: 200, y: 60 }, 24)).toBe(false)
    expect(isNearRows(list, { x: 50, y: 140 }, 24)).toBe(false)
  })
})

describe("getFadeOutDelay", () => {
  it("holds a quick tap until it has been seen", () => {
    expect(getFadeOutDelay(40, 150)).toBe(110)
  })

  it("lets a long press go at once", () => {
    expect(getFadeOutDelay(400, 150)).toBe(0)
  })
})
