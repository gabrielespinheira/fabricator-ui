import fs from "node:fs"
import path from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { describe, expect, it } from "vitest"

import { loadFileIcons, transformFileSvg } from "./file-icons"
import { FILE_SOURCES } from "./paths"
import { renderFileSvg } from "./runtime/file-svg"

describe("file artwork", () => {
  it("preserves every source drawing, including clips, masks and opacity", () => {
    const { icons, palette } = loadFileIcons()
    for (const icon of icons) {
      const original = fs.readFileSync(
        path.join(FILE_SOURCES, "icons", `${icon.name}.svg`),
        "utf8"
      )
      const options = { font: { loadSystemFonts: false } }
      const expected = new Resvg(original, options).render().pixels
      const actual = new Resvg(
        renderFileSvg(icon, palette, "dark"),
        options
      ).render().pixels
      const difference = actual.reduce(
        (total, value, index) =>
          total + Math.abs(value - (expected[index] ?? 0)),
        0
      )
      // Flattening a viewport clip can change edge antialiasing by a few pixels.
      expect(difference / (actual.length * 255), icon.name).toBeLessThan(0.002)
    }
  })
  it("replaces palette fills with overridable theme colours and keeps geometry", () => {
    const node = transformFileSvg(
      '<svg viewBox="0 0 16 16"><path d="M1 1h4v4Z" fill="#5D80FF"/></svg>',
      {
        blue: { light: "#4565d6", dark: "#5D80FF" },
      }
    )
    expect(node).toEqual([
      [
        "path",
        {
          d: "M1 1h4v4Z",
          fill: "var(--file-icon-blue, light-dark(#4565d6, #5D80FF))",
        },
      ],
    ])
  })

  it("refuses unknown colours rather than silently losing them", () => {
    expect(() =>
      transformFileSvg(
        '<svg viewBox="0 0 16 16"><path fill="#abcdef"/></svg>',
        {}
      )
    ).toThrow("#abcdef")
  })
})
