import path from "node:path"
import { describe, expect, it } from "vitest"

import { parseBrandArt } from "./brand-art"
import { contrast, DARK_SURFACE } from "./brand-colors"
import { SCALE_FLOOR } from "./brand-scale"
import { loadBrands } from "./brands"
import { exposedDarkFills } from "./check"
import { brandsText } from "./notices"
import { BRAND_SOURCES, PACKAGE_ROOT } from "./paths"
import { getBrandViewBox } from "./runtime/attributes"
import { allowlistSchema, readJson, sharposFixtureSchema } from "./schemas"

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

/**
 * Marks SharpOS draws in one flat colour that Fabricator draws in their real
 * colours with `color="brand"`; their art has its own box, so the viewBox differs.
 */
const NEW_ART = [
  "airtable",
  "cloudflare",
  "facebook",
  "messenger",
  "meta",
  "miro",
  "posthog",
  "reddit",
  "shopify",
  "supabase",
  "telegram",
]
/** SharpOS's path predates Simple Icons' current one, or is a placeholder for art-only marks. */
const NEWER_MONO = ["openrouter", "cal", "linkedin"]
/**
 * SharpOS keeps the hex Simple Icons still lists, from an identity the brand
 * has since replaced: Miro's 2019 navy, where its logo has been yellow since 2023.
 */
const NEWER_HEX: Record<string, string> = { miro: "#FFDD33" }

describe("SharpOS parity", () => {
  const shared = fixture.brands

  it("ships every SharpOS mark", () => {
    expect(
      shared
        .filter((brand) => !bySharposSlug.has(brand.slug))
        .map((brand) => brand.slug)
    ).toEqual([])
  })

  it("keeps SharpOS's titles, groups, keywords, hexes and resolved colours", () => {
    for (const expected of shared) {
      const brand = sharedBrand(expected.slug)
      const isNewerHex = expected.slug in NEWER_HEX
      expect({
        title: brand.title,
        group: brand.group,
        tags: brand.tags,
        ...(!isNewerHex && { hex: brand.hex, colors: brand.colors }),
      }).toEqual({
        title: expected.label,
        group: expected.group,
        tags: expected.keywords,
        ...(!isNewerHex && { hex: expected.hex, colors: expected.colors }),
      })
    }
  })

  it("uses the brand's current colour where SharpOS keeps a retired one", () => {
    for (const [slug, hex] of Object.entries(NEWER_HEX)) {
      expect(sharedBrand(slug).hex, slug).toBe(hex)
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
  it("ships the mark of every AI assistant the setup page offers", () => {
    const assistantMarks = ["claude", "cursor", "github", "openai", "opencode"]
    const shipped = new Set(brands.map((brand) => brand.name))
    expect(assistantMarks.filter((name) => !shipped.has(name))).toEqual([])
  })

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
      expect(
        exposedDarkFills(brand.art?.node ?? [], brand.art?.gradients),
        brand.name
      ).toEqual([])
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

describe("Miro", () => {
  it("draws its M in Miro's near-black, as miro.com does", () => {
    const miro = brands.find((brand) => brand.name === "miro")
    expect(miro?.art?.node.map(([, attributes]) => attributes.fill)).toEqual([
      "#fd3",
      "#1C1C1E",
    ])
  })
})

describe("marks copied from a brand's own files", () => {
  const allowlist = readJson(
    path.join(BRAND_SOURCES, "allowlist.json"),
    allowlistSchema
  )
  const kitEntries = allowlist.brands.filter(
    (entry) =>
      !entry.held && (entry.mono?.from === "kit" || entry.art?.from === "kit")
  )

  it("record where they came from and the terms they ship under", () => {
    expect(kitEntries.length).toBeGreaterThan(0)
    for (const entry of kitEntries) {
      const kit = [entry.mono, entry.art].find((ref) => ref?.from === "kit")
      const brand = brands.find((candidate) => candidate.name === entry.name)
      if (kit?.from !== "kit") throw new Error(`${entry.name} has no kit`)
      expect(brand?.source, entry.name).toBe(kit.url)
      expect(brand?.guidelines, entry.name).toBe(kit.terms)
    }
  })

  it("include Motion's mark and its yellow tile", () => {
    const motion = brands.find((brand) => brand.name === "motion")
    expect(motion?.node).toHaveLength(1)
    expect(motion?.art?.node.map(([, attributes]) => attributes.fill)).toEqual([
      "#FBD509",
      "#080B08",
    ])
  })
})

describe("marks whose licence asks for credit", () => {
  it("carry the credit into the catalog and BRANDS.md", () => {
    const notice = brandsText()
    for (const [name, credit] of [
      ["php", "PHP logo by Colin Viebrock"],
      ["linux", "Tux by Larry Ewing (lewing@isc.tamu.edu) and The GIMP"],
    ]) {
      const brand = brands.find((candidate) => candidate.name === name)
      expect(brand?.credit, name).toContain(credit)
      expect(notice, name).toContain(credit)
    }
  })
})

describe("Safari", () => {
  it("draws its real compass in brand colour, without filters", () => {
    const safari = brands.find((brand) => brand.name === "safari")
    const fills = safari?.art?.node.map(([, attributes]) => attributes.fill)
    expect(fills).toContain("#cd151e")
    expect(safari?.art?.gradients?.map(({ type }) => type)).toContain(
      "radialGradient"
    )
    expect(JSON.stringify(safari?.art)).not.toContain("filter")
  })
})
