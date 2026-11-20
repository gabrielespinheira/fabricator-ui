import { describe, expect, it } from "vitest"

import {
  getGooeyFrame,
  GOOEY_EFFECTS,
  resolveGooeyOptions,
} from "./gooey-model"

describe("Gooey", () => {
  it("allows explicit composition and root, region, and component overrides", () => {
    expect(resolveGooeyOptions(undefined, undefined, false)).toBeNull()
    expect(resolveGooeyOptions(undefined, undefined, true)?.effect).toBe("move")
    const scope = { mode: "expressive", waviness: 0.4 } as const
    expect(resolveGooeyOptions(scope, { effect: "bend" }, false)).toEqual({
      effect: "bend",
      intensity: 1,
      waviness: 0.4,
    })
    expect(resolveGooeyOptions({ mode: "off" }, true, true)).toBeNull()
    expect(resolveGooeyOptions(scope, false, true)).toBeNull()
    expect(resolveGooeyOptions(scope, { waviness: 4 }, true)?.waviness).toBe(1)
  })

  it("uses one resting shape and distinct silhouettes for every recipe", () => {
    const frames = GOOEY_EFFECTS.map((effect) => getGooeyFrame(effect, 1, 1, 0))
    expect(new Set(frames.map(String)).size).toBe(GOOEY_EFFECTS.length)
    const resting = GOOEY_EFFECTS.map((effect) =>
      getGooeyFrame(effect, 0, 1, 1)
    )
    expect(new Set(resting.map(String)).size).toBe(1)
    expect(getGooeyFrame("move", 1, 0, 1)).toEqual(resting[0])
    expect(getGooeyFrame("bend", 1, 1, 1)).not.toEqual(frames[2])
  })

  it("mirrors travel and supports the vertical axis", () => {
    const right = getGooeyFrame("move", 1, 1, 0)
    const left = getGooeyFrame("move", 1, 1, 0, "left")
    const down = getGooeyFrame("move", 1, 1, 0, "down")
    expect(left[0]).toBe(100 - right[0])
    expect(down[1]).toBeCloseTo(right[0] * 0.4)
    expect(getGooeyFrame("move", Number.NaN, 1, 1)).toEqual(
      getGooeyFrame("move", 0, 1, 1)
    )
  })
})
