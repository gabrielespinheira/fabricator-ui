import { describe, expect, it } from "vitest"

import { getAimTriangle } from "./aim-triangle"

const submenu = { top: 40, right: 400, bottom: 240, left: 260 }

describe("getAimTriangle", () => {
  it("joins the pointer to the near edge of a submenu on the right", () => {
    expect(getAimTriangle({ x: 200, y: 120 }, submenu, "right")).toEqual([
      { x: 200, y: 120 },
      { x: 260, y: 40 },
      { x: 260, y: 240 },
    ])
  })

  it("uses the right edge for a submenu on the left", () => {
    expect(getAimTriangle({ x: 460, y: 120 }, submenu, "left")).toEqual([
      { x: 460, y: 120 },
      { x: 400, y: 40 },
      { x: 400, y: 240 },
    ])
  })

  it("has no triangle once the pointer reaches the submenu", () => {
    expect(getAimTriangle({ x: 260, y: 120 }, submenu, "right")).toBeNull()
    expect(getAimTriangle({ x: 300, y: 120 }, submenu, "right")).toBeNull()
  })
})
