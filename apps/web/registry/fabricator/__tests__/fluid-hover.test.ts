import { describe, expect, it } from "vitest"

import { pickNearest } from "@/registry/fabricator/shared/lib/fluid-hover"

type Box = { top: number; left: number; width: number; height: number }

// Minimal stand-ins for laid-out elements: offsets relative to the container.
function container(width: number, height: number) {
  return {
    offsetWidth: width,
    offsetHeight: height,
    clientLeft: 0,
    clientTop: 0,
    scrollLeft: 0,
    scrollTop: 0,
    contains: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  } as unknown as HTMLElement
}

function item(box: Box) {
  return {
    offsetTop: box.top,
    offsetLeft: box.left,
    offsetWidth: box.width,
    offsetHeight: box.height,
    offsetParent: null,
  } as unknown as HTMLElement
}

const rows = [0, 40, 80].map((top) =>
  item({ top, left: 0, width: 200, height: 36 })
)

describe("pickNearest", () => {
  it("picks the item under the pointer", () => {
    expect(pickNearest(container(200, 120), rows, { x: 10, y: 50 }, "y")).toBe(
      rows[1]
    )
  })

  it("picks the nearest item in a gap, so the highlight never blinks", () => {
    // Between row 0 (0–36) and row 1 (40–76): 37 is closer to row 0's centre.
    expect(pickNearest(container(200, 120), rows, { x: 10, y: 37 }, "y")).toBe(
      rows[0]
    )
    expect(pickNearest(container(200, 120), rows, { x: 10, y: 39 }, "y")).toBe(
      rows[1]
    )
  })

  it("keeps the last item lit past the end of the list", () => {
    expect(pickNearest(container(200, 140), rows, { x: 10, y: 130 }, "y")).toBe(
      rows[2]
    )
  })

  it("measures along x for horizontal strips", () => {
    const tabs = [0, 80, 160].map((left) =>
      item({ top: 0, left, width: 76, height: 28 })
    )
    expect(pickNearest(container(240, 28), tabs, { x: 170, y: 5 }, "x")).toBe(
      tabs[2]
    )
  })

  it("keeps to the pointer's row when a strip wraps", () => {
    // Two rows: a wide first row, and a second row whose items sit under
    // the first row's first two.
    const chips = [
      item({ top: 0, left: 0, width: 90, height: 32 }),
      item({ top: 0, left: 94, width: 70, height: 32 }),
      item({ top: 0, left: 168, width: 70, height: 32 }),
      item({ top: 36, left: 0, width: 70, height: 32 }),
      item({ top: 36, left: 74, width: 70, height: 32 }),
    ]
    const strip = container(240, 68)
    expect(pickNearest(strip, chips, { x: 20, y: 16 }, "x")).toBe(chips[0])
    expect(pickNearest(strip, chips, { x: 100, y: 16 }, "x")).toBe(chips[1])
    expect(pickNearest(strip, chips, { x: 20, y: 50 }, "x")).toBe(chips[3])
    // Past the end of the second row: its last item, not one above.
    expect(pickNearest(strip, chips, { x: 200, y: 50 }, "x")).toBe(chips[4])
  })

  it("uses straight-line distance for grids", () => {
    const cells = [
      item({ top: 0, left: 0, width: 100, height: 100 }),
      item({ top: 0, left: 120, width: 100, height: 100 }),
      item({ top: 120, left: 0, width: 100, height: 100 }),
    ]
    expect(
      pickNearest(container(220, 220), cells, { x: 40, y: 200 }, "xy")
    ).toBe(cells[2])
  })

  it("returns null when there are no items", () => {
    expect(
      pickNearest(container(200, 100), [], { x: 10, y: 10 }, "y")
    ).toBeNull()
  })
})
