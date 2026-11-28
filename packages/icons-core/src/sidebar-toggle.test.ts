import { describe, expect, it } from "vitest"

import { getBounds } from "./geometry"
import { loadOutlineIcons } from "./outline"
import {
  getSidebarToggleDivider,
  getSidebarToggleFill,
  getSidebarTogglePanel,
  SIDEBAR_TOGGLE_FRAME,
} from "./runtime/sidebar-toggle"
import { loadUiIcons } from "./ui-icons"

describe("sidebar toggle", () => {
  it("moves the opening horizontally inside a slightly taller, centered frame", () => {
    expect(getBounds([["path", { d: SIDEBAR_TOGGLE_FRAME }]])).toEqual({
      minX: 3.25,
      minY: 2.75,
      maxX: 20.75,
      maxY: 21.25,
    })
    for (const [progress, edge] of [
      [0, 9.5],
      [0.5, 11.375],
      [1, 13.25],
    ] as const) {
      const panel = getSidebarTogglePanel(progress)
      expect(getBounds([["path", { d: panel }]])).toEqual({
        minX: 4.375,
        minY: 3.875,
        maxX: edge,
        maxY: 20.125,
      })
      expect(getSidebarToggleFill(progress)).toBe(
        `${SIDEBAR_TOGGLE_FRAME} ${panel}`
      )
      expect(getSidebarToggleDivider(progress)).toBe(`M${edge} 2.75V21.25`)
    }
  })

  it("ships the closed drawing in all weights with its own motion recipe", () => {
    const sources = loadOutlineIcons()
    const source = sources.find(({ name }) => name === "sidebar-toggle")
    const icon = loadUiIcons(sources).find(
      ({ name }) => name === "sidebar-toggle"
    )
    expect(icon?.motion).toBe("sidebar-toggle")
    expect(icon?.node).toEqual(source?.node)
    expect(icon?.node[1]?.[1].d).toBe(getSidebarToggleDivider(0))
    expect(icon?.fill.node[0]?.[1].d).toBe(getSidebarToggleFill(0))
    expect(icon?.duotone.secondary[0]?.[1].d).toBe(getSidebarTogglePanel(0))
  })
})
