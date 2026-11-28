import { describe, expect, it } from "vitest"

import {
  getSubmenuSide,
  initialSubmenuAim,
  isMovingTowardSubmenu,
  stepSubmenuAim,
  type SubmenuAim,
} from "./submenu-aim-model"

// A parent menu from x 0 to 200 with a submenu open on its right, from the
// Share row (y 100 to 132) down to y 260.
const trigger = { left: 0, right: 200, top: 100, bottom: 132 }
const submenu = { left: 204, right: 364, top: 96, bottom: 260 }
const leftSubmenu = { left: -164, right: -4, top: 96, bottom: 260 }

function walk(points: Array<[number, number]>, target = submenu) {
  const side = getSubmenuSide(trigger, target)
  return points.reduce<SubmenuAim>(
    (aim, [x, y]) => stepSubmenuAim(aim, { x, y }, target, side),
    initialSubmenuAim
  )
}

describe("getSubmenuSide", () => {
  it("reads the side the submenu opened on", () => {
    expect(getSubmenuSide(trigger, submenu)).toBe("right")
    expect(getSubmenuSide(trigger, leftSubmenu)).toBe("left")
  })
})

describe("isMovingTowardSubmenu", () => {
  const from = { x: 70, y: 116 }

  it("accepts a move into the triangle between the pointer and the submenu's near edge", () => {
    expect(
      isMovingTowardSubmenu(from, { x: 80, y: 116 }, submenu, "right")
    ).toBe(true)
    // Down and right, toward the submenu's last row.
    expect(
      isMovingTowardSubmenu(from, { x: 80, y: 124 }, submenu, "right")
    ).toBe(true)
    // Up and right, toward its first row.
    expect(
      isMovingTowardSubmenu(from, { x: 80, y: 115 }, submenu, "right")
    ).toBe(true)
  })

  it("rejects a move that misses the submenu", () => {
    // Straight down, to the next row of the parent menu.
    expect(
      isMovingTowardSubmenu(from, { x: 70, y: 126 }, submenu, "right")
    ).toBe(false)
    // Away from it.
    expect(
      isMovingTowardSubmenu(from, { x: 60, y: 116 }, submenu, "right")
    ).toBe(false)
    // Steeply down, below the submenu's bottom edge.
    expect(
      isMovingTowardSubmenu(from, { x: 72, y: 136 }, submenu, "right")
    ).toBe(false)
  })

  it("forgives a hand that drifts a little outside the triangle", () => {
    // About 5° steeper than the line to the submenu's bottom corner.
    expect(
      isMovingTowardSubmenu(from, { x: 80, y: 129 }, submenu, "right")
    ).toBe(true)
  })

  it("never counts a nearly vertical move, however close the submenu is", () => {
    const nearEdge = { x: 196, y: 116 }
    expect(
      isMovingTowardSubmenu(nearEdge, { x: 197, y: 128 }, submenu, "right")
    ).toBe(false)
  })

  it("mirrors for a submenu on the left", () => {
    expect(
      isMovingTowardSubmenu(
        { x: 130, y: 116 },
        { x: 120, y: 124 },
        leftSubmenu,
        "left"
      )
    ).toBe(true)
    expect(
      isMovingTowardSubmenu(
        { x: 130, y: 116 },
        { x: 140, y: 124 },
        leftSubmenu,
        "left"
      )
    ).toBe(false)
  })

  it("does not aim once the pointer is level with the submenu", () => {
    expect(
      isMovingTowardSubmenu(
        { x: 210, y: 116 },
        { x: 220, y: 120 },
        submenu,
        "right"
      )
    ).toBe(false)
  })
})

describe("stepSubmenuAim", () => {
  it("starts aiming on the first move toward the submenu", () => {
    expect(
      walk([
        [70, 116],
        [80, 120],
      ]).isAiming
    ).toBe(true)
  })

  it("keeps aiming along a diagonal that crosses the rows below", () => {
    const aim = walk([
      [70, 116],
      [90, 124],
      [110, 133],
      [130, 142],
      [150, 151],
      [170, 160],
    ])
    expect(aim.isAiming).toBe(true)
  })

  it("keeps aiming through a slow move", () => {
    const points: Array<[number, number]> = []
    for (let step = 0; step <= 40; step++)
      points.push([70 + step * 3, 116 + step * 1.2])
    expect(walk(points).isAiming).toBe(true)
  })

  it("ignores jitter shorter than a few pixels", () => {
    const aim = walk([
      [70, 116],
      [80, 120],
      [80, 121],
      [79, 122],
    ])
    expect(aim.isAiming).toBe(true)
    expect(aim.anchor).toEqual({ x: 80, y: 120 })
  })

  it("survives one stray move but stops after two in a row", () => {
    expect(
      walk([
        [70, 116],
        [80, 120],
        [80, 130],
      ]).isAiming
    ).toBe(true)
    expect(
      walk([
        [70, 116],
        [80, 120],
        [80, 130],
        [80, 140],
      ]).isAiming
    ).toBe(false)
  })

  it("never starts from a move away from the submenu", () => {
    expect(
      walk([
        [70, 116],
        [70, 130],
      ]).isAiming
    ).toBe(false)
  })
})
