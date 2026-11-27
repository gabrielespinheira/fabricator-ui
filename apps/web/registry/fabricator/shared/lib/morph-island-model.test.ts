import { describe, expect, it } from "vitest"

import {
  getIslandFrame,
  getIslandHeightSpring,
  isIslandGrowing,
  MORPH_ISLAND_SPRINGS,
} from "./morph-island-model"

describe("isIslandGrowing", () => {
  it("grows when the new shape covers more area", () => {
    expect(
      isIslandGrowing({ width: 126, height: 36 }, { width: 340, height: 84 })
    ).toBe(true)
    expect(
      isIslandGrowing({ width: 340, height: 84 }, { width: 230, height: 36 })
    ).toBe(false)
  })
})

describe("getIslandHeightSpring", () => {
  it("keeps the width stiffer than the height, so changes land sideways first", () => {
    expect(MORPH_ISLAND_SPRINGS.width.stiffness).toBeGreaterThan(
      getIslandHeightSpring(true).stiffness
    )
  })

  it("stiffens the height while shrinking", () => {
    expect(getIslandHeightSpring(false).stiffness).toBeGreaterThan(
      getIslandHeightSpring(true).stiffness
    )
  })
})

describe("getIslandFrame", () => {
  it("is a pill while short and stops at the corner limit when tall", () => {
    expect(
      getIslandFrame({ width: 126, height: 36, heightVelocity: 0 }, 32)
    ).toEqual({
      width: 126,
      height: 36,
      radius: 18,
    })
    expect(
      getIslandFrame({ width: 340, height: 84, heightVelocity: 0 }, 32).radius
    ).toBe(32)
  })

  it("gives width back while the height grows fast, up to 5%", () => {
    expect(
      getIslandFrame({ width: 200, height: 50, heightVelocity: 700 }, 32).width
    ).toBe(190)
    expect(
      getIslandFrame({ width: 200, height: 50, heightVelocity: 70000 }, 32)
        .width
    ).toBe(190)
    expect(
      getIslandFrame({ width: 200, height: 50, heightVelocity: -350 }, 32).width
    ).toBe(210)
  })

  it("never draws thinner than 20px while a spring overshoots", () => {
    expect(
      getIslandFrame({ width: 100, height: 4, heightVelocity: 0 }, 32).height
    ).toBe(20)
  })
})
