import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { readLock } from "./lock"
import { loadOutlineIcons, readCategories, readCategoryTitles } from "./outline"
import { loadUiIcons } from "./ui-icons"

describe("loadOutlineIcons", () => {
  const icons = loadOutlineIcons()

  it("retains the imported names, aliases, and categories", () => {
    expect(readLock().lucide?.tag).toBeDefined()
    expect(
      icons.filter((icon) => icon.origin === "lucide").length
    ).toBeGreaterThan(2000)
    const house = icons.find((icon) => icon.name === "house")
    expect(house?.aliases.map((alias) => alias.name)).toContain("home")
    expect(house?.categories).toContain("buildings")
  })

  it("returns icons sorted by name", () => {
    const names = icons.map((icon) => icon.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe("the Custom category", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

  function loadOriginal(
    metadata: { tags: string[]; categories: string[] },
    strokeWidth = 2
  ) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-custom-"))
    try {
      fs.writeFileSync(
        path.join(directory, "custom-sample.svg"),
        svg.replace('stroke-width="2"', `stroke-width="${strokeWidth}"`)
      )
      fs.writeFileSync(
        path.join(directory, "custom-sample.json"),
        JSON.stringify(metadata)
      )
      return loadOutlineIcons({
        lucideDirectory: path.join(directory, "unused"),
        outlineDirectory: directory,
      })
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }

  it("puts every Fabricator original in it, on top of its own categories", () => {
    const original = loadOriginal({ tags: ["a"], categories: ["layout"] }).find(
      (icon) => icon.name === "custom-sample"
    )
    expect(original?.categories).toEqual(["custom", "layout"])
  })

  it("does not repeat it when the metadata already names it", () => {
    const original = loadOriginal({ tags: ["a"], categories: ["custom"] }).find(
      (icon) => icon.name === "custom-sample"
    )
    expect(original?.categories).toEqual(["custom"])
  })

  it("keeps the authored silhouette on its grid and derives the other weights", () => {
    const metadata = { tags: ["sample"], categories: ["layout"] }
    const icons = loadOriginal(metadata, 1.75)
    const [icon] = loadUiIcons(icons)
    expect(icon?.name).toBe("custom-sample")
    expect(icon?.node).toEqual([["circle", { cx: "12", cy: "12", r: "10" }]])
    expect(icon?.fill.node).not.toHaveLength(0)
    expect(icon?.duotone.secondary).not.toHaveLength(0)
    expect(icon?.motion).toBeDefined()
  })

  it("leaves Lucide's icons out of it", () => {
    const lucide = loadOutlineIcons().filter((icon) => icon.origin === "lucide")
    expect(lucide.some((icon) => icon.categories.includes("custom"))).toBe(
      false
    )
  })

  it("is listed first, with its title", () => {
    expect(readCategoryTitles()[0]).toEqual({
      name: "custom",
      title: "Custom",
    })
    expect(readCategories()).toContain("custom")
  })
})
