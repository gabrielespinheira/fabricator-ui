import { describe, expect, it } from "vitest"

import {
  getCoastPosition,
  getDrumRowLayout,
  getDrumTransform,
  getFlickTarget,
  getKeyTarget,
  getLoopCycles,
  getLoopedIndex,
  getNearestTurn,
  getRecenteredRow,
  getRowTransform,
  getTapRows,
  getVisibleRows,
  getWheelGeometry,
  getWheelIndex,
  getWheelOverscroll,
} from "./time-wheel-model"

describe("getWheelGeometry", () => {
  it("bends the rows round a drum as tall as the wheel", () => {
    const geometry = getWheelGeometry(252, 36)

    expect(geometry.radius).toBe(126)
    // Neighbouring rows touch: a row's half-height over the radius is the
    // tangent of half a step.
    expect(Math.tan((geometry.rowAngle * Math.PI) / 360)).toBeCloseTo(18 / 126)
    expect(geometry.reach * geometry.rowAngle).toBeLessThan(90)
    expect(geometry.reach).toBe(4)
  })

  it("reaches at least one row either side of a short wheel", () => {
    expect(getWheelGeometry(36, 36).reach).toBeGreaterThanOrEqual(1)
  })
})

describe("getWheelIndex", () => {
  it("finds the row nearest a value off the step", () => {
    expect(getWheelIndex([0, 15, 30, 45], 18)).toBe(1)
    expect(getWheelIndex([0, 15, 30, 45], 44)).toBe(3)
  })
})

describe("getLoopedIndex", () => {
  it("wraps a position that spun past either end", () => {
    expect(getLoopedIndex(61, 60)).toBe(1)
    expect(getLoopedIndex(-1, 60)).toBe(59)
    expect(getLoopedIndex(-120.4, 60)).toBe(0)
  })
})

describe("getNearestTurn", () => {
  it("takes the short way round a looping wheel", () => {
    // From 58 to 2 is four rows forward, not 56 back.
    expect(getNearestTurn(58, 2, 60, true)).toBe(62)
    expect(getNearestTurn(122, 59, 60, true)).toBe(119)
  })

  it("goes straight to the row on a wheel with ends", () => {
    expect(getNearestTurn(1, 0, 2, false)).toBe(0)
  })
})

describe("getVisibleRows", () => {
  it("draws the rows within reach, round the loop", () => {
    expect(getVisibleRows(0, 2, 60, true)).toEqual([-2, -1, 0, 1, 2])
  })

  it("stops at the ends of a wheel that doesn't loop", () => {
    expect(getVisibleRows(0, 3, 2, false)).toEqual([0, 1])
  })

  it("repeats a short loop round the drum", () => {
    expect(getVisibleRows(0, 5, 4, true)).toHaveLength(11)
  })
})

describe("getWheelOverscroll", () => {
  it("leaves a looping position alone", () => {
    expect(getWheelOverscroll(-7, 12, true)).toBe(-7)
  })

  it("gives less and less past the ends of a wheel that doesn't loop", () => {
    const past = getWheelOverscroll(-3, 2, false)
    expect(past).toBeLessThan(0)
    expect(past).toBeGreaterThan(-1.5)
    expect(getWheelOverscroll(0.5, 2, false)).toBe(0.5)
    expect(getWheelOverscroll(4, 2, false)).toBeLessThan(2.5)
  })
})

describe("getRowTransform and getDrumTransform", () => {
  const geometry = getWheelGeometry(252, 36)

  it("sets each row round the drum, and turns the drum by the position", () => {
    expect(getRowTransform(2, geometry, false)).toBe(
      `rotateX(${-2 * geometry.rowAngle}deg) translateZ(126px)`
    )
    expect(getDrumTransform(1.5, geometry, false)).toBe(
      `translateZ(-126px) rotateX(${1.5 * geometry.rowAngle}deg)`
    )
  })

  it("lays rows flat when motion is reduced", () => {
    expect(getRowTransform(2, geometry, true)).toBe("translateY(72px)")
    expect(getDrumTransform(1.5, geometry, true)).toBe("translateY(-54px)")
  })
})

describe("getTapRows", () => {
  const geometry = getWheelGeometry(252, 36)

  it("undoes the drum's foreshortening, so edge rows are hit too", () => {
    expect(getTapRows(0, geometry, false)).toBe(0)
    expect(getTapRows(-36, geometry, false)).toBe(-1)
    // Three rows down sits less than 108px down on the drum.
    const third =
      geometry.radius * Math.sin((3 * geometry.rowAngle * Math.PI) / 180)
    expect(getTapRows(third, geometry, false)).toBe(3)
  })

  it("counts whole rows on a flat wheel", () => {
    expect(getTapRows(80, geometry, true)).toBe(2)
  })
})

describe("getFlickTarget", () => {
  it("lands a flick on a whole row further along", () => {
    expect(getFlickTarget(10.2, 20, 60, true)).toBeGreaterThan(14)
    expect(Number.isInteger(getFlickTarget(10.2, 20, 60, true))).toBe(true)
  })

  it("stops at the ends of a wheel that doesn't loop", () => {
    expect(getFlickTarget(0.4, 30, 2, false)).toBe(1)
    expect(getFlickTarget(0.4, -30, 2, false)).toBe(0)
  })
})

describe("getCoastPosition", () => {
  it("leaves at the flick's speed and slows into the target", () => {
    const early = getCoastPosition(0, 6, 20, 0.01)
    expect(early.position).toBeCloseTo(0.2, 1)
    expect(early.isDone).toBe(false)

    const late = getCoastPosition(0, 6, 20, 5)
    expect(late).toEqual({ position: 6, isDone: true })
  })

  it("arrives at once when there is no way to go", () => {
    expect(getCoastPosition(3, 3, 0, 0)).toEqual({ position: 3, isDone: true })
  })
})

describe("getKeyTarget", () => {
  it("steps up and down, and pages", () => {
    expect(getKeyTarget("ArrowUp", 5, 60, true, 5)).toBe(6)
    expect(getKeyTarget("ArrowDown", 5, 60, true, 5)).toBe(4)
    expect(getKeyTarget("PageUp", 5, 60, true, 5)).toBe(10)
    expect(getKeyTarget("PageDown", 5, 60, true, 5)).toBe(0)
  })

  it("wraps round a looping wheel", () => {
    expect(getKeyTarget("ArrowUp", 59, 60, true, 5)).toBe(60)
    expect(getKeyTarget("ArrowDown", 0, 60, true, 5)).toBe(-1)
  })

  it("stops at the ends of a wheel that doesn't loop", () => {
    expect(getKeyTarget("ArrowUp", 1, 2, false, 1)).toBe(1)
    expect(getKeyTarget("ArrowDown", 0, 2, false, 1)).toBe(0)
  })

  it("goes to the first and last rows of the current turn", () => {
    expect(getKeyTarget("Home", 65, 60, true, 5)).toBe(60)
    expect(getKeyTarget("End", 65, 60, true, 5)).toBe(119)
    expect(getKeyTarget("End", 0, 2, false, 1)).toBe(1)
  })

  it("ignores other keys", () => {
    expect(getKeyTarget("a", 5, 60, true, 5)).toBeNull()
  })
})

describe("getDrumRowLayout", () => {
  const geometry = getWheelGeometry(252, 36)

  it("leaves the band's row where it is, whole", () => {
    expect(getDrumRowLayout(0, geometry)).toEqual({
      translateY: 0,
      rotateX: 0,
      opacity: 1,
    })
  })

  it("pulls rows in round the drum, turns them away and fades them", () => {
    const below = getDrumRowLayout(3, geometry)
    const angle = 3 * geometry.rowAngle
    // Laid out flat 108px down, the row sits R·sin(angle) down on the drum.
    expect(108 + below.translateY).toBeCloseTo(
      126 * Math.sin((angle * Math.PI) / 180)
    )
    expect(below.rotateX).toBeCloseTo(-angle)
    expect(below.opacity).toBeLessThan(0.5)
    expect(getDrumRowLayout(-3, geometry).translateY).toBeCloseTo(
      -below.translateY
    )
  })

  it("hides rows past the drum's reach", () => {
    expect(getDrumRowLayout(geometry.reach + 1, geometry).opacity).toBe(0)
  })
})

describe("getLoopCycles and getRecenteredRow", () => {
  it("repeats a loop enough times to flick through, an odd number of turns", () => {
    expect(getLoopCycles(60)).toBe(3)
    expect(getLoopCycles(4) % 2).toBe(1)
    expect(getLoopCycles(4) * 4).toBeGreaterThanOrEqual(30)
  })

  it("brings a row back to the same value in the middle turn", () => {
    // Three turns of 60: rows 60 to 119 are the middle one.
    expect(getRecenteredRow(5, 60, 3)).toBe(65)
    expect(getRecenteredRow(170, 60, 3)).toBe(110)
    expect(getRecenteredRow(65, 60, 3)).toBe(65)
  })
})
