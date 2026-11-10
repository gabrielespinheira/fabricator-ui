import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  getRevealDragProgress,
  getRevealWidth,
  getToggleGlyphPanel,
  REVEAL_PAGE,
  REVEAL_RADIUS,
  REVEAL_SCALE,
  shouldRevealStayOpen,
  TOGGLE_GLYPH,
  TOGGLE_GLYPH_SCALE,
} from "@/registry/fabricator/shared/lib/sidebar-model"

describe("getToggleGlyphPanel", () => {
  it("is the closed and open shapes at its ends", () => {
    expect(getToggleGlyphPanel(0)).toBe(TOGGLE_GLYPH.panelClosed)
    expect(getToggleGlyphPanel(1)).toBe(TOGGLE_GLYPH.panelOpen)
  })

  it("keeps the commands and moves the numbers between them", () => {
    const halfway = getToggleGlyphPanel(0.5)
    expect(halfway.startsWith("M12 5.75 C12 ")).toBe(true)
    expect(halfway.replace(/[\d.-]+/g, "#")).toBe(
      TOGGLE_GLYPH.panelOpen.replace(/[\d.-]+/g, "#")
    )
  })

  it("stays on the shapes past its ends", () => {
    expect(getToggleGlyphPanel(-0.5)).toBe(TOGGLE_GLYPH.panelClosed)
    expect(getToggleGlyphPanel(1.5)).toBe(TOGGLE_GLYPH.panelOpen)
  })
})

describe("getRevealWidth", () => {
  it("gives the sidebar the screen but a strip of the page", () => {
    expect(getRevealWidth(440)).toBe(440 - REVEAL_PAGE)
    expect(getRevealWidth(320)).toBe(320 - REVEAL_PAGE)
  })

  it("leaves a thumb's width of the page in view, to tap or drag it back", () => {
    expect(REVEAL_PAGE).toBeGreaterThanOrEqual(44)
    expect(REVEAL_PAGE).toBeLessThan(96)
  })
})

describe("getRevealDragProgress", () => {
  it("follows the finger back towards closed", () => {
    expect(getRevealDragProgress({ deltaX: -144, width: 288 })).toBe(0.5)
  })

  it("stays between closed and open", () => {
    expect(getRevealDragProgress({ deltaX: 40, width: 288 })).toBe(1)
    expect(getRevealDragProgress({ deltaX: -400, width: 288 })).toBe(0)
  })
})

describe("shouldRevealStayOpen", () => {
  it("settles by how far the page was dragged", () => {
    expect(shouldRevealStayOpen({ progress: 0.8, velocity: 0 })).toBe(true)
    expect(shouldRevealStayOpen({ progress: 0.4, velocity: 0 })).toBe(false)
  })

  it("lets a flick close it from anywhere", () => {
    expect(shouldRevealStayOpen({ progress: 0.9, velocity: -0.8 })).toBe(false)
  })

  it("ignores a flick the finger then rested after", () => {
    expect(
      shouldRevealStayOpen({ progress: 0.8, velocity: -0.8, restedFor: 200 })
    ).toBe(true)
  })

  it("lets a flick back keep it open", () => {
    expect(shouldRevealStayOpen({ progress: 0.4, velocity: 0.8 })).toBe(true)
  })
})

describe("the Sidebar's style", () => {
  const styleMap = readFileSync(
    path.join(__dirname, "../../styles/fabricator/sidebar.css"),
    "utf8"
  )

  it("sizes the toggle's glyph the same", () => {
    expect(styleMap).toContain(
      `size-[calc(var(--density-icon-16)*${TOGGLE_GLYPH_SCALE})]`
    )
  })

  it("uses the same scale, page strip and corners", () => {
    expect(styleMap).toContain(`[--sidebar-reveal-scale:${REVEAL_SCALE}]`)
    expect(styleMap).toContain(
      `[--sidebar-reveal-width:calc(100%-${REVEAL_PAGE}px)]`
    )
    expect(styleMap).toContain(
      `group-data-[reveal=open]/sidebar-wrapper:rounded-[${REVEAL_RADIUS}px]`
    )
  })
})
