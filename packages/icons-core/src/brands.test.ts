import path from "node:path"
import { describe, expect, it } from "vitest"

import { parseBrandArt } from "./brand-art"
import { contrast, DARK_SURFACE } from "./brand-colors"
import { SCALE_FLOOR } from "./brand-scale"
import { loadBrands } from "./brands"
import { exposedDarkFills } from "./check"
import { PACKAGE_ROOT } from "./paths"
import { getBrandViewBox } from "./runtime/attributes"
import { readJson, sharposFixtureSchema } from "./schemas"

const fixture = readJson(
  path.join(PACKAGE_ROOT, "fixtures/sharpos-brands.json"),
  sharposFixtureSchema
)
const brands = loadBrands()
const bySharposSlug = new Map(
  brands.map((brand) => [brand.aliases[0] ?? brand.name, brand])
)

function sharedBrand(slug: string) {
  const brand = bySharposSlug.get(slug)
  if (!brand) throw new Error(`SharpOS's ${slug} is missing`)
  return brand
}

/** OpenAI's terms forbid redistributing its logo; see allowlist.json. */
const HELD = ["openai"]
/**
 * Marks SharpOS draws in one flat colour that Fabricator draws in their real
 * colours with `color="brand"`; their art has its own box, so the viewBox differs.
 */
const NEW_ART = [
  "airtable",
  "cloudflare",
  "facebook",
  "miro",
  "posthog",
  "reddit",
  "shopify",
]
/** SharpOS's path predates Simple Icons' current one, or is a placeholder for art-only marks. */
const NEWER_MONO = ["openrouter", "cal", "linkedin"]

describe("SharpOS parity", () => {
  const shared = fixture.brands.filter((brand) => !HELD.includes(brand.slug))

  it("ships every SharpOS mark that isn't held", () => {
    expect(
      shared
        .filter((brand) => !bySharposSlug.has(brand.slug))
        .map((brand) => brand.slug)
    ).toEqual([])
  })

  it("keeps SharpOS's titles, groups, keywords, hexes and resolved colours", () => {
    for (const expected of shared) {
      const brand = sharedBrand(expected.slug)
      expect({
        title: brand.title,
        group: brand.group,
        tags: brand.tags,
        hex: brand.hex,
        colors: brand.colors,
      }).toEqual({
        title: expected.label,
        group: expected.group,
        tags: expected.keywords,
        hex: expected.hex,
        colors: expected.colors,
      })
    }
  })

  it("keeps SharpOS's geometry, apart from paths Simple Icons has since updated", () => {
    const different = shared.filter((expected) => {
      if (NEWER_MONO.includes(expected.slug)) return false
      return sharedBrand(expected.slug).node[0]?.[1].d !== expected.path
    })
    expect(different.map((brand) => brand.slug)).toEqual([])
  })

  it("keeps SharpOS's multi-colour art", () => {
    for (const expected of shared) {
      const art = expected.art
      if (!art) continue
      expect(sharedBrand(expected.slug).art, expected.slug).toEqual({
        width: art.width,
        height: art.height,
        node: parseBrandArt(art.body, art.width, art.height),
      })
    }
  })

  it("adds brand-colour art to the marks SharpOS flattens", () => {
    expect(NEW_ART.filter((slug) => !sharedBrand(slug).art)).toEqual([])
  })

  it("keeps SharpOS's optical scales and viewBoxes", () => {
    for (const expected of shared.filter(
      (brand) => !NEW_ART.includes(brand.slug)
    )) {
      const brand = sharedBrand(expected.slug)
      expect(brand.scale, expected.slug).toBe(expected.scale)
      expect(
        getBrandViewBox(
          brand.art?.width ?? 24,
          brand.art?.height ?? 24,
          brand.scale
        ),
        expected.slug
      ).toBe(expected.viewBox)
    }
  })
})

describe("brand rules", () => {
  it("records a source and licence for every mark", () => {
    expect(
      brands
        .filter((brand) => !brand.source || !brand.license)
        .map((brand) => brand.name)
    ).toEqual([])
  })

  it("only ever shrinks, and never past the floor", () => {
    for (const { name, scale } of brands) {
      if (scale === undefined) continue
      expect(scale, name).toBeLessThan(1)
      expect(scale, name).toBeGreaterThanOrEqual(SCALE_FLOOR)
    }
  })

  it("makes every colour-bearing brand legible on the dark surface", () => {
    for (const brand of brands.filter(
      (candidate) => !candidate.colors.inherit
    )) {
      expect(
        contrast(brand.colors.dark, DARK_SURFACE),
        brand.name
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it("keeps every declared art fill visible on the dark surface", () => {
    for (const brand of brands) {
      expect(exposedDarkFills(brand.art?.node ?? []), brand.name).toEqual([])
    }
  })

  it("draws single-colour marks as paths only", () => {
    expect(
      brands
        .filter((brand) => brand.node.some(([tag]) => tag !== "path"))
        .map((brand) => brand.name)
    ).toEqual([])
  })
})
