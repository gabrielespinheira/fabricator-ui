import { describe, expect, it } from "vitest"

import {
  getDropIndex,
  getRowCollisionValue,
  getRowShift,
  type SortableRow,
} from "@/registry/native/lib/sortable-model"

const rows: SortableRow[] = [
  { index: 0, start: 0, size: 40 },
  { index: 1, start: 40, size: 40 },
  { index: 2, start: 80, size: 120 },
  { index: 3, start: 200, size: 40 },
]

describe("getRowCollisionValue", () => {
  it("keeps the source's own place", () => {
    expect(
      getRowCollisionValue({
        pointerY: 10,
        rowCenterY: 20,
        rowIndex: 1,
        sourceIndex: 1,
      })
    ).toBe(0)
  })

  it("counts a row once the pointer passes its centre", () => {
    const below = { rowCenterY: 100, rowIndex: 2, sourceIndex: 0 }
    expect(getRowCollisionValue({ ...below, pointerY: 99 })).toBeNull()
    expect(getRowCollisionValue({ ...below, pointerY: 100 })).toBe(2)
    const above = { rowCenterY: 20, rowIndex: 0, sourceIndex: 2 }
    expect(getRowCollisionValue({ ...above, pointerY: 21 })).toBeNull()
    expect(getRowCollisionValue({ ...above, pointerY: 20 })).toBe(2)
  })
})

describe("getDropIndex", () => {
  it("stays put until a centre is crossed", () => {
    expect(getDropIndex(rows, 0, 50)).toBe(0)
  })

  it("lands on the farthest row crossed", () => {
    expect(getDropIndex(rows, 0, 65)).toBe(1)
    expect(getDropIndex(rows, 0, 150)).toBe(2)
    expect(getDropIndex(rows, 0, 230)).toBe(3)
  })

  it("works upwards", () => {
    expect(getDropIndex(rows, 3, 130)).toBe(2)
    expect(getDropIndex(rows, 3, 10)).toBe(0)
  })
})

describe("getRowShift", () => {
  const drag = { sourceIndex: 1, targetIndex: 3, sourceSize: 40 }

  it("slides rows between the source and the target back", () => {
    expect(getRowShift({ ...drag, index: 2 })).toBe(-40)
    expect(getRowShift({ ...drag, index: 3 })).toBe(-40)
  })

  it("leaves the rest and the source alone", () => {
    expect(getRowShift({ ...drag, index: 0 })).toBe(0)
    expect(getRowShift({ ...drag, index: 1 })).toBe(0)
  })

  it("slides forward when dragging up", () => {
    expect(
      getRowShift({ index: 1, sourceIndex: 3, targetIndex: 0, sourceSize: 40 })
    ).toBe(40)
  })

  it("does nothing with no drag", () => {
    expect(
      getRowShift({ index: 1, sourceIndex: -1, targetIndex: -1, sourceSize: 0 })
    ).toBe(0)
  })
})
