import { describe, expect, it } from "vitest"

import { getSnap, snapToGrid } from "./canvas-guides"

describe("snapToGrid", () => {
  it("rounds to the nearest grid point", () => {
    expect(snapToGrid({ x: 13, y: 26 }, 10)).toEqual({ x: 10, y: 30 })
    expect(snapToGrid({ x: 13, y: 26 }, 0)).toEqual({ x: 13, y: 26 })
  })
})

describe("getSnap", () => {
  const other = { x: 200, y: 0, width: 100, height: 40 }

  it("aligns left edges within the threshold and draws the guide", () => {
    const snap = getSnap({ x: 204, y: 120, width: 80, height: 40 }, [other])
    expect(snap.position).toEqual({ x: 200, y: 120 })
    expect(snap.guides).toEqual([
      { orientation: "vertical", position: 200, from: 0, to: 160 },
    ])
  })

  it("aligns centres", () => {
    const snap = getSnap({ x: 400, y: 2, width: 100, height: 40 }, [other])
    expect(snap.position.y).toBe(0)
    expect(snap.guides[0]).toMatchObject({
      orientation: "horizontal",
      position: 0,
    })
  })

  it("falls back to the grid when nothing is close", () => {
    expect(
      getSnap({ x: 607, y: 513, width: 10, height: 10 }, [other], { grid: 20 })
        .position
    ).toEqual({ x: 600, y: 520 })
  })

  it("picks the nearest of several lines", () => {
    const snap = getSnap({ x: 297, y: 300, width: 100, height: 40 }, [
      other,
      { x: 302, y: 600, width: 10, height: 10 },
    ])
    expect(snap.position.x).toBe(300)
  })
})
