import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadOutlineIcons, LUCIDE_SOURCES } from "@fabricator-ui/icons-core"
import { describe, expect, it } from "vitest"

import { Home, House } from "./index"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outline = loadOutlineIcons()
const lucide = outline.filter((icon) => icon.origin === "lucide")

describe("static outputs", () => {
  it("write every Lucide icon byte for byte as Lucide ships it", () => {
    const different = lucide.filter(
      (icon) =>
        fs.readFileSync(
          path.join(root, "icons", `${icon.name}.svg`),
          "utf8"
        ) !==
        fs.readFileSync(
          path.join(LUCIDE_SOURCES, "icons", `${icon.name}.svg`),
          "utf8"
        )
    )
    expect(different.map((icon) => icon.name)).toEqual([])
  })

  it("put one symbol per icon in the sprite", () => {
    const sprite = fs.readFileSync(path.join(root, "sprite.svg"), "utf8")
    expect(sprite.match(/<symbol /g)).toHaveLength(outline.length)
    expect(sprite).toContain(
      '<symbol id="house" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    )
  })

  it("export SVG strings under Lucide's names and aliases", () => {
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
    expect(x).toContain('viewBox="-2.286 -2.286 28.571 28.571"')
    expect(x).toContain('fill="currentColor"')
  })

  it("write brand-colour marks, with art where the mark has it", () => {
    expect(
      fs.readFileSync(path.join(root, "brands", "color", "spotify.svg"), "utf8")
    ).toContain('fill="#1ED760"')
    expect(
      fs.readFileSync(path.join(root, "brands", "color", "google.svg"), "utf8")
    ).toContain('viewBox="0 0 256 262"')
  })

  it("export brand strings in both colour modes", async () => {
    const { Github, GithubColor } = await import("./brands")
    expect(Github).toContain('fill="currentColor"')
    expect(GithubColor).toContain("<svg")
  })
})

describe("typed shape data", () => {
  it("exports every outline icon and brand mark", async () => {
    const { brandNodes, outlineNodes } = await import("./nodes")
    expect(outlineNodes.house?.length).toBeGreaterThan(0)
    expect(brandNodes.google?.art?.width).toBe(256)
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
