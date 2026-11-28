import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  getArtworkViewBox,
  getBrandArtworkViewBox,
  loadUiIcons,
  parseSvg,
} from "@fabricator-ui/icons-core"
import { describe, expect, it } from "vitest"

import { Home, House } from "./index"
import { brandNodes, outlineNodes, outlineScales } from "./nodes"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outline = loadUiIcons()

describe("static outputs", () => {
  it("writes each canonical name at all three weights with matching source geometry", () => {
    for (const directory of ["icons", "fill", "duotone"]) {
      expect(fs.readdirSync(path.join(root, directory)).sort()).toEqual(
        outline.map(({ name }) => `${name}.svg`).sort()
      )
    }
    const data = outline.find(({ name }) => name === "bookmark")
    for (const directory of ["icons", "duotone"]) {
      const drawing = parseSvg(
        fs.readFileSync(path.join(root, directory, "bookmark.svg"), "utf8")
      )
      expect(drawing.node.at(-1)).toEqual(data?.node.at(-1))
    }
  })

  it("put one symbol per icon in the sprite", () => {
    const sprite = fs.readFileSync(path.join(root, "sprite.svg"), "utf8")
    expect(sprite.match(/<symbol /g)).toHaveLength(outline.length)
    const viewBox = getArtworkViewBox(24, 24, outlineScales.house)
    expect(sprite).toContain(
      `<symbol id="house" viewBox="${viewBox}" fill="none" stroke="currentColor"`
    )
  })

  it("exports SVG strings under the catalog names and aliases", () => {
    expect(House).toBe(
      fs.readFileSync(path.join(root, "icons", "house.svg"), "utf8")
    )
    expect(Home).toBe(House)
  })

  it("list tags per icon", () => {
    const tags: unknown = JSON.parse(
      fs.readFileSync(path.join(root, "tags.json"), "utf8")
    )
    expect(tags).toMatchObject({ house: expect.arrayContaining(["home"]) })
  })
})

describe("static brand outputs", () => {
  it("write one-colour marks with their optical correction", () => {
    const x = fs.readFileSync(path.join(root, "brands", "x.svg"), "utf8")
    const brand = brandNodes.x
    if (!brand) throw new Error("Missing X artwork")
    expect(x).toContain(`viewBox="${getBrandArtworkViewBox(brand)}"`)
    expect(x).toContain('fill="currentColor"')
  })

  it("write brand-colour marks, with art where the mark has it", () => {
    expect(
      fs.readFileSync(path.join(root, "brands", "color", "spotify.svg"), "utf8")
    ).toContain('fill="#1ED760"')
    const brand = brandNodes.google
    if (!brand?.art) throw new Error("Missing Google artwork")
    expect(
      fs.readFileSync(path.join(root, "brands", "color", "google.svg"), "utf8")
    ).toContain(`viewBox="${getBrandArtworkViewBox(brand, brand.art)}"`)
  })

  it("export brand strings in both colour modes", async () => {
    const { Github, GithubColor } = await import("./brands")
    expect(Github).toContain('fill="currentColor"')
    expect(GithubColor).toContain("<svg")
  })
})

describe("typed shape data", () => {
  it("exports shapes and calibrated scales alongside the SVGs", () => {
    expect(outlineNodes.house?.length).toBeGreaterThan(0)
    expect(brandNodes.google?.art?.width).toBe(256)
    const scales: unknown = JSON.parse(
      fs.readFileSync(path.join(root, "icon-scales.json"), "utf8")
    )
    expect(scales).toEqual(outlineScales)
  })
})

describe("gradient brand files", () => {
  it("carry their gradients with ids named after the brand", () => {
    const svg = fs.readFileSync(
      path.join(root, "brands", "color", "firefox.svg"),
      "utf8"
    )
    expect(svg).toContain('<radialGradient id="fab-firefox-g0"')
    expect(svg).toContain('fill="url(#fab-firefox-g0)"')
  })
})
