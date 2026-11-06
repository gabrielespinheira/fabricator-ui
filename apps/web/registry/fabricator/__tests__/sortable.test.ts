import { describe, expect, it } from "vitest"

import { getRowCollisionValue } from "../shared/lib/sortable"

type Row = { id: string; height: number }

// The rows from the top of the list, with the centre each one has there.
function layOut(rows: Row[]) {
  let top = 0
  return rows.map((row, index) => {
    const centerY = top + row.height / 2
    top += row.height
    return { ...row, index, centerY }
  })
}

// One pass of what dnd-kit does: the highest value wins, and the source moves
// to the winner's place.
function moveSource(rows: Row[], sourceId: string, pointerY: number) {
  const laidOut = layOut(rows)
  const sourceIndex = laidOut.findIndex((row) => row.id === sourceId)
  const winner = laidOut
    .map((row) => ({
      index: row.index,
      value: getRowCollisionValue({
        pointerY,
        rowCenterY: row.centerY,
        rowIndex: row.index,
        sourceIndex,
      }),
    }))
    .filter((row) => row.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  if (!winner || winner.index === sourceIndex) return rows
  const next = rows.filter((row) => row.id !== sourceId)
  next.splice(winner.index, 0, rows[sourceIndex])
  return next
}

const ids = (rows: Row[]) => rows.map((row) => row.id)

describe("getRowCollisionValue", () => {
  it("is the row's own place until the pointer crosses another row", () => {
    expect(
      getRowCollisionValue({
        pointerY: 100,
        rowCenterY: 100,
        rowIndex: 2,
        sourceIndex: 2,
      })
    ).toBe(0)
  })

  it("counts a row above only once the pointer is above its centre", () => {
    const row = { rowCenterY: 85, rowIndex: 0, sourceIndex: 1 }
    expect(getRowCollisionValue({ ...row, pointerY: 86 })).toBeNull()
    expect(getRowCollisionValue({ ...row, pointerY: 84 })).toBe(1)
  })

  it("counts a row below only once the pointer is below its centre", () => {
    const row = { rowCenterY: 187, rowIndex: 3, sourceIndex: 1 }
    expect(getRowCollisionValue({ ...row, pointerY: 186 })).toBeNull()
    expect(getRowCollisionValue({ ...row, pointerY: 188 })).toBe(2)
  })

  it("moves a short row above a tall one and leaves it there", () => {
    const rows = [
      { id: "tall", height: 170 },
      { id: "short", height: 34 },
    ]
    // Past the tall row's centre, but still inside it.
    const moved = moveSource(rows, "short", 80)
    expect(ids(moved)).toEqual(["short", "tall"])
    expect(ids(moveSource(moved, "short", 80))).toEqual(["short", "tall"])
  })

  it("settles at every pointer position, for rows of any height", () => {
    const rows = [
      { id: "short", height: 34 },
      { id: "tall", height: 170 },
      { id: "medium", height: 68 },
      { id: "last", height: 34 },
    ]
    for (const sourceId of ids(rows)) {
      for (let pointerY = -20; pointerY <= 330; pointerY += 1) {
        const once = moveSource(rows, sourceId, pointerY)
        const twice = moveSource(once, sourceId, pointerY)
        expect(ids(twice)).toEqual(ids(once))
      }
    }
  })

  it("jumps straight to the farthest row crossed", () => {
    const rows = [
      { id: "first", height: 34 },
      { id: "second", height: 34 },
      { id: "third", height: 34 },
    ]
    expect(ids(moveSource(rows, "third", 0))).toEqual([
      "third",
      "first",
      "second",
    ])
  })
})
