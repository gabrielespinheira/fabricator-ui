import { describe, expect, it } from "vitest"

import { getIconMotion } from "./icon-motion"

describe("icon motion assignment", () => {
  it.each([
    ["arrow-up-right", "up-right"],
    ["arrow-down-left", "down-left"],
    ["circle-arrow-up-left", "up-left"],
    ["square-arrow-down-right-enter", "down-right"],
    ["arrow-left-from-line", "left"],
    ["arrow-up-a-z", "up"],
    ["corner-up-right", "right"],
    ["arrow-left-right", "exchange-horizontal"],
    ["arrow-down-up", "exchange-vertical"],
    ["chevrons-right", "right"],
    ["maximize", "expand"],
    ["minimize", "contract"],
    ["download", "receive"],
    ["upload", "dispatch"],
    ["external-link", "exit-diagonal"],
    ["rotate-ccw", "rotate-back"],
    ["refresh-cw", "rotate-forward"],
    ["chevrons-up-down", "exchange-vertical"],
    ["chart-no-axes-column", "bars"],
    ["layers-2", "stack"],
    ["eye", "blink"],
    ["mail", "envelope"],
    ["panel-left", "panel-left"],
    ["panel-right", "panel-right"],
  ])("assigns %s the %s gesture", (name, recipe) => {
    expect(getIconMotion(name)).toBe(recipe)
  })
})
