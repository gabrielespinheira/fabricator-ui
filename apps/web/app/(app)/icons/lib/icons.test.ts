import type {
  BrandCatalogEntry,
  OutlineCatalogEntry,
} from "@fabricator-ui/icons/catalog"
import { describe, expect, it } from "vitest"

import {
  buildSvgMarkup,
  filterByCategory,
  getCategoryOptions,
  getImportLine,
  getInstallCommand,
  getJsxSnippet,
  toComponentName,
  toReactAttributes,
} from "./icons"

const house: OutlineCatalogEntry = {
  name: "house",
  set: "outline",
  aliases: ["home"],
  categories: ["buildings", "home"],
  tags: ["living"],
}
const bell: OutlineCatalogEntry = {
  name: "bell",
  set: "outline",
  aliases: [],
  categories: ["notifications"],
  tags: [],
}
const github: BrandCatalogEntry = {
  name: "github",
  set: "brands",
  title: "GitHub",
  group: "Product & dev",
  aliases: [],
  tags: ["git"],
  hex: "#181717",
  source: "Simple Icons",
  license: "CC0-1.0",
}

describe("snippets", () => {
  it("names components the way the package exports them", () => {
    expect(toComponentName("arrow-up-0-1")).toBe("ArrowUp01Icon")
  })

  it("imports outline icons and brands from their own entries", () => {
    expect(getImportLine(house)).toBe(
      'import { HouseIcon } from "@fabricator-ui/icons"'
    )
    expect(getImportLine(github)).toBe(
      'import { GithubIcon } from "@fabricator-ui/icons/brands"'
    )
  })

  it("writes only the props that differ from the defaults", () => {
    expect(
      getJsxSnippet(house, { size: 24, strokeWidth: 2, brandColor: false })
    ).toBe("<HouseIcon />")
    expect(
      getJsxSnippet(house, { size: 16, strokeWidth: 1.5, brandColor: false })
    ).toBe("<HouseIcon size={16} strokeWidth={1.5} />")
    expect(
      getJsxSnippet(github, { size: 24, strokeWidth: 1.5, brandColor: true })
    ).toBe('<GithubIcon color="brand" />')
  })
})

describe("buildSvgMarkup", () => {
  const options = {
    size: 24,
    strokeWidth: 2,
    color: "currentColor",
    brandColor: false,
  }

  it("writes a standalone outline SVG with Lucide's attributes", () => {
    expect(
      buildSvgMarkup(
        {
          set: "outline",
          node: [
            ["circle", { cx: "12", cy: "12", r: "1", fill: "currentColor" }],
          ],
        },
        {
          ...options,
          color: "#171717",
        }
      )
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1" fill="#171717"/></svg>'
    )
  })

  it("widens a brand's viewBox by its optical scale", () => {
    const markup = buildSvgMarkup(
      {
        set: "brands",
        name: "demo",
        data: {
          node: [["path", { d: "M0 0h24v24H0z" }]],
          colors: { inherit: false, light: "#0866FF", dark: "#0866FF" },
          scale: 0.8,
        },
      },
      options
    )
    expect(markup).toContain('viewBox="-3 -3 30 30"')
    expect(markup).toContain('fill="currentColor"')
  })

  it("uses the brand's art or hex in brand colour", () => {
    const art = buildSvgMarkup(
      {
        set: "brands",
        name: "demo",
        data: {
          node: [["path", { d: "M0 0h24v24H0z" }]],
          art: {
            width: 256,
            height: 180,
            node: [["path", { fill: "#ff0000", d: "M0 0h1" }]],
          },
          colors: { inherit: false, light: "#FF0000", dark: "#FF0000" },
        },
      },
      { ...options, brandColor: true }
    )
    expect(art).toContain('viewBox="0 0 256 180"')
    expect(art).toContain('<path fill="#ff0000" d="M0 0h1"/>')
    const hex = buildSvgMarkup(
      {
        set: "brands",
        name: "demo",
        data: {
          node: [["path", { d: "M0 0h1" }]],
          colors: { inherit: false, light: "#1ED760", dark: "#1ED760" },
        },
      },
      { ...options, brandColor: true }
    )
    expect(hex).toContain('fill="#1ED760"')
  })

  it("carries gradient art's definitions, with ids named after the brand", () => {
    const markup = buildSvgMarkup(
      {
        set: "brands",
        name: "firefox",
        data: {
          node: [["path", { d: "M0 0h1" }]],
          art: {
            width: 256,
            height: 256,
            node: [["path", { fill: "url(#g0)", d: "M0 0h1" }]],
            gradients: [
              {
                type: "linearGradient",
                id: "g0",
                attributes: { x1: "0", x2: "1" },
                stops: [
                  { offset: "0", color: "#FFE226" },
                  { offset: "1", color: "#FF3647" },
                ],
              },
            ],
          },
          colors: { inherit: false, light: "#FF7139", dark: "#FF7139" },
        },
      },
      { ...options, brandColor: true }
    )
    expect(markup).toContain(
      '<defs><linearGradient id="fab-firefox-g0" x1="0" x2="1"><stop offset="0" stop-color="#FFE226"/><stop offset="1" stop-color="#FF3647"/></linearGradient></defs>'
    )
    expect(markup).toContain('<path fill="url(#fab-firefox-g0)" d="M0 0h1"/>')
  })
})

describe("categories", () => {
  const titles = [
    { name: "buildings", title: "Buildings" },
    { name: "home", title: "Home" },
    { name: "notifications", title: "Notifications" },
  ]

  it("lists outline categories with their counts, skipping empty ones", () => {
    expect(getCategoryOptions([house, bell], titles, "outline")).toEqual([
      { value: "buildings", label: "Buildings", count: 1 },
      { value: "home", label: "Home", count: 1 },
      { value: "notifications", label: "Notifications", count: 1 },
    ])
  })

  it("uses brand groups as the brands' categories", () => {
    expect(getCategoryOptions([github], titles, "brands")).toEqual([
      { value: "Product & dev", label: "Product & dev", count: 1 },
    ])
  })

  it("filters by category, or not at all", () => {
    expect(filterByCategory([house, bell, github], "home")).toEqual([house])
    expect(filterByCategory([github], "Product & dev")).toEqual([github])
    expect(filterByCategory([house, bell], null)).toEqual([house, bell])
  })
})

describe("getInstallCommand", () => {
  it("writes each package manager's add command", () => {
    expect(getInstallCommand("npm", ["@fabricator-ui/icons"])).toBe(
      "npm install @fabricator-ui/icons"
    )
    expect(getInstallCommand("bun", ["@fabricator-ui/icons"])).toBe(
      "bun add @fabricator-ui/icons"
    )
    expect(getInstallCommand("pnpm", ["a", "b"])).toBe("pnpm add a b")
    expect(getInstallCommand("yarn", ["a"])).toBe("yarn add a")
  })
})

describe("toReactAttributes", () => {
  it("renames SVG attributes for React", () => {
    expect(
      toReactAttributes([["path", { d: "M0 0", "fill-rule": "evenodd" }]])
    ).toEqual([["path", { d: "M0 0", fillRule: "evenodd" }]])
  })
})
