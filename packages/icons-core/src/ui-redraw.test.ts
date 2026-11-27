import { describe, expect, it } from "vitest"

import { getBounds } from "./geometry"
import type { IconElement } from "./types"
import { redrawUiOutline } from "./ui-redraw"

describe("UI optical proportions", () => {
  it("draws continuous shoulders for closed faces", () => {
    const node: IconElement[] = [["circle", { r: "8", cx: "12", cy: "12" }]]
    const [face] = redrawUiOutline({
      name: "circle",
      categories: ["shapes"],
      node,
    })
    expect(face?.[0]).toBe("path")
    expect(face?.[1].d?.match(/c/gi)).toHaveLength(4)
  })

  it("uses a wider proportion for panels than controls", () => {
    const node: IconElement[] = [
      ["rect", { x: "3", y: "3", width: "18", height: "18" }],
    ]
    const panel = getBounds(
      redrawUiOutline({ name: "panel", categories: ["layout"], node })
    )
    const control = getBounds(
      redrawUiOutline({ name: "square", categories: ["shapes"], node })
    )
    expect(panel.maxX - panel.minX).toBeGreaterThan(control.maxX - control.minX)
  })
})
