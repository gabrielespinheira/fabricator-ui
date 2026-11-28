import { describe, expect, it } from "vitest"

import { getCornerPath } from "./corner-path"

function readPoints(path: string) {
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  const points: { x: number; y: number }[] = []
  for (let index = 0; index < numbers.length; index += 2) {
    points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 })
  }
  return points
}

// Points on the top-right corner, whose curve is centred at (size - radius, radius).
function readTopRightCorner(path: string, size: number, radius: number) {
  return readPoints(path).filter(
    (point) => point.x > size - radius && point.y < radius
  )
}

describe("getCornerPath", () => {
  it("starts where the top-left corner meets the top edge and closes", () => {
    const path = getCornerPath({ size: 200, radius: 40, exponent: 2 })
    expect(path.startsWith("M40 0")).toBe(true)
    expect(path.endsWith("Z")).toBe(true)
  })

  it("draws circular corners at exponent 2", () => {
    const corner = readTopRightCorner(
      getCornerPath({ size: 200, radius: 40, exponent: 2 }),
      200,
      40
    )
    expect(corner.length).toBeGreaterThan(4)
    for (const point of corner) {
      expect(Math.hypot(point.x - 160, point.y - 40)).toBeCloseTo(40, 1)
    }
  })

  it("draws superellipse corners at higher exponents", () => {
    const exponent = 2 ** 1.5
    const corner = readTopRightCorner(
      getCornerPath({ size: 200, radius: 54, exponent }),
      200,
      54
    )
    for (const point of corner) {
      const x = Math.abs(point.x - 146) / 54
      const y = Math.abs(point.y - 54) / 54
      expect(x ** exponent + y ** exponent).toBeCloseTo(1, 1)
    }
  })

  it("never lets a corner grow past half the side", () => {
    const path = getCornerPath({ size: 100, radius: 80, exponent: 2 })
    expect(path.startsWith("M50 0")).toBe(true)
  })
})
