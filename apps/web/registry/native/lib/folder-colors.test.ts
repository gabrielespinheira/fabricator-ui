import { describe, expect, it } from "vitest"

import { FolderColorError, getFolderColors } from "./folder-colors"

const LIGHT = {
  mark: "#808080",
  foreground: "#000000",
  surface1: "#fafafa",
  surface3: "#ffffff",
  surface4: "#ffffff",
  surface5: "#ffffff",
  isDark: false,
}

const DARK = {
  mark: "#808080",
  foreground: "#ffffff",
  surface1: "#000000",
  surface3: "#202020",
  surface4: "#303030",
  surface5: "#404040",
  isDark: true,
}

describe("getFolderColors", () => {
  it("tints the surfaces with a share of the mark, never the mark itself", () => {
    const colors = getFolderColors({ ...LIGHT, mark: "#0000ff" })
    // 20% of the way from white to blue, and 30% from the page to blue.
    expect(colors.front).toBe("#ccccff")
    expect(colors.back).toBe("#afaffc")
  })

  it("lights the front's top edge with less tint in light", () => {
    expect(getFolderColors({ ...LIGHT, mark: "#0000ff" }).frontTop).toBe(
      "#e0e0ff"
    )
  })

  it("tints lighter surfaces more in dark, so the front stays above the back", () => {
    const colors = getFolderColors(DARK)
    expect(colors.back).toBe("#1f1f1f")
    expect(colors.front).toBe("#4d4d4d")
    expect(colors.frontTop).toBe("#5c5c5c")
  })

  it("uses the brightest surface for paper in light and a soft light grey in dark", () => {
    expect(getFolderColors(LIGHT).paper).toBe("#ffffff")
    expect(getFolderColors(DARK).paper).toBe("#c9c9c9")
  })

  it("frosts the glass front, denser than the website's, which blurs", () => {
    const colors = getFolderColors({ ...LIGHT, mark: "#0000ff" })
    expect(colors.glassTop).toBe("#e0e0ffcc")
    expect(colors.glassBottom).toBe("#ccccfff2")
  })

  it("draws lines in a faint tint of the mark", () => {
    expect(getFolderColors({ ...LIGHT, mark: "#0000ff" }).line).toBe(
      "#0000ff4d"
    )
  })

  it("throws on a colour it can't read", () => {
    expect(() => getFolderColors({ ...LIGHT, mark: "rebeccapurple" })).toThrow(
      FolderColorError
    )
  })
})
