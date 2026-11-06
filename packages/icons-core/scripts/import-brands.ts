/**
 * Writes sources/brands/<name>.svg, .art.svg and .json from allowlist.json:
 *   bun run icons:brands            import every brand that isn't held
 *   bun run icons:brands --measure  also measure optical scales for brands
 *                                   that aren't SharpOS's (theirs stay pinned)
 */
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { parseArgs } from "node:util"

import {
  buildUnderlayArt,
  parseArtDocument,
  parseBrandArt,
  parseBrandArtWithGradients,
  renderGradients,
  toMonoPath,
  type BrandArtOptions,
} from "../src/brand-art"
import { getOpticalScale, measureReach } from "../src/brand-scale"
import type { BrandMetadata } from "../src/brands"
import { readLock, writeLock } from "../src/lock"
import { writeGeneratedDirectory } from "../src/output"
import { BRAND_SOURCES, PACKAGE_ROOT } from "../src/paths"
import {
  allowlistSchema,
  logosDataSchema,
  packageVersionSchema,
  readJson,
  sharposFixtureSchema,
  simpleIconsDataSchema,
  type AllowlistEntry,
  type SourceRef,
} from "../src/schemas"
import { renderSvg, renderSvgInline } from "../src/svg"
import type { IconElement } from "../src/types"

/** Median reach of SharpOS's 79 marks, frozen so new brands never resize old ones. */
const BRAND_REACH_MEDIAN = 0.992

const require = createRequire(import.meta.url)
const simpleIconsRoot = path.dirname(
  require.resolve("simple-icons/package.json")
)
const simpleIconsVersion = readJson(
  path.join(simpleIconsRoot, "package.json"),
  packageVersionSchema
).version
const simpleIcons = new Map(
  readJson(
    path.join(simpleIconsRoot, "data/simple-icons.json"),
    simpleIconsDataSchema
  ).map((icon) => [icon.slug, icon])
)
const logosRoot = path.dirname(
  require.resolve("@iconify-json/logos/package.json")
)
const logosVersion = readJson(
  path.join(logosRoot, "package.json"),
  packageVersionSchema
).version
const logos = readJson(path.join(logosRoot, "icons.json"), logosDataSchema)
const sharpos = new Map(
  readJson(
    path.join(PACKAGE_ROOT, "fixtures/sharpos-brands.json"),
    sharposFixtureSchema
  ).brands.map((brand) => [brand.slug, brand])
)

const SHARPOS_ART_SOURCES: Record<string, string> = {
  googlesearchconsole:
    "Google's logo_search_console.svg, via SharpOS @sharp/core-brand-icons 3.0.1",
  googlesheets: "SharpOS @sharp/core-brand-icons 3.0.1 (origin not recorded)",
  cal: "SharpOS @sharp/core-brand-icons 3.0.1 (origin not recorded)",
}

function simpleIcon(slug: string) {
  const data = simpleIcons.get(slug)
  if (!data)
    throw new Error(`Simple Icons ${simpleIconsVersion} has no ${slug}`)
  const svg = fs.readFileSync(
    path.join(simpleIconsRoot, "icons", `${slug}.svg`),
    "utf8"
  )
  const d = svg.match(/ d="([^"]+)"/)?.[1]
  if (!d) throw new Error(`Simple Icons ${slug} has no path`)
  return { data, d }
}

function logosIcon(icon: string, options: BrandArtOptions = {}) {
  const data = logos.icons[icon]
  if (!data)
    throw new Error(`@iconify-json/logos ${logosVersion} has no ${icon}`)
  const width = data.width ?? logos.width ?? 256
  const height = data.height ?? logos.height ?? 256
  const { node, gradients } = parseBrandArtWithGradients(
    data.body,
    width,
    height,
    options
  )
  return { width, height, node, ...(gradients.length > 0 && { gradients }) }
}

const KIT_SOURCES = path.join(BRAND_SOURCES, "kits")
const KIT_LICENSE = "The brand's terms"

function readKit(file: string) {
  return fs.readFileSync(path.join(KIT_SOURCES, file), "utf8")
}

type MonoMark = { d: string; hex: string; source: string; license: string }

function art(ref: SourceRef, mark?: MonoMark) {
  switch (ref.from) {
    case "underlay": {
      if (!mark) throw new Error("an underlay needs the one-colour mark")
      return {
        ...buildUnderlayArt(mark.d, mark.hex, ref.shape),
        source: `${mark.source}, over a white ${ref.shape}`,
        license: mark.license,
      }
    }
    case "logos":
      return {
        ...logosIcon(ref.icon, {
          ...(ref.unfilled && { unfilled: ref.unfilled }),
          ...(ref.recolor && { recolor: ref.recolor }),
          ...(ref.dropShadows && { dropShadows: true }),
        }),
        source: `gilbarbara/logos via @iconify-json/logos ${logosVersion}`,
        license: "CC0-1.0",
      }
    case "kit":
      return {
        ...parseArtDocument(readKit(ref.file)),
        source: ref.url,
        license: KIT_LICENSE,
        guidelines: ref.terms,
      }
    case "sharpos": {
      const brand = sharpos.get(ref.slug)
      if (!brand?.art) throw new Error(`SharpOS has no art for ${ref.slug}`)
      return {
        width: brand.art.width,
        height: brand.art.height,
        node: parseBrandArt(brand.art.body, brand.art.width, brand.art.height),
        source:
          SHARPOS_ART_SOURCES[ref.slug] ??
          "SharpOS @sharp/core-brand-icons 3.0.1",
        license: "unknown",
      }
    }
    case "simple-icons":
    case "art":
      throw new Error(`${ref.from} can't be a source of multi-colour art`)
  }
}

function mono(entry: AllowlistEntry) {
  const ref = entry.mono
  if (!ref) throw new Error(`${entry.name}: no mono source`)
  switch (ref.from) {
    case "art": {
      if (!entry.art) throw new Error(`${entry.name}: mono from art needs art`)
      const { width, height, node, source, license } = art(entry.art)
      return {
        d: toMonoPath(node, width, height),
        hex: undefined,
        source,
        license,
      }
    }
    case "simple-icons": {
      const { data, d } = simpleIcon(ref.slug)
      return {
        d,
        hex: `#${data.hex}`,
        source: `Simple Icons ${simpleIconsVersion} (${data.source})`,
        license: data.license?.type ?? "CC0-1.0",
        ...(data.guidelines && { guidelines: data.guidelines }),
      }
    }
    case "kit": {
      const { width, height, node } = parseArtDocument(readKit(ref.file))
      return {
        d: toMonoPath(node, width, height),
        hex: undefined,
        source: ref.url,
        license: KIT_LICENSE,
        guidelines: ref.terms,
      }
    }
    case "logos":
      throw new Error(
        'use { from: "art" } to make a one-colour mark from logos art'
      )
    case "underlay":
      throw new Error("an underlay is art, not a one-colour mark")
    case "sharpos": {
      const brand = sharpos.get(ref.slug)
      if (!brand) throw new Error(`SharpOS has no ${ref.slug}`)
      return {
        d: brand.path,
        hex: undefined,
        source: "SharpOS @sharp/core-brand-icons 3.0.1",
        license: "unknown",
      }
    }
  }
}

function squareSvg(width: number, height: number, node: IconElement[]) {
  const side = Math.max(width, height)
  return renderSvgInline(
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `${(width - side) / 2} ${(height - side) / 2} ${side} ${side}`,
      fill: "#000",
    },
    node.map(([tag, attributes]) => [
      tag,
      { ...attributes, ...(attributes.fill && { fill: "#000" }) },
    ])
  )
}

const { values } = parseArgs({
  options: { measure: { type: "boolean", default: false } },
})
const allowlistFile = path.join(BRAND_SOURCES, "allowlist.json")
const allowlist = readJson(allowlistFile, allowlistSchema)

const files = new Map<string, string>([
  ["allowlist.json", fs.readFileSync(allowlistFile, "utf8")],
  // Kit files are sources, not output: keep them as they are.
  ...fs
    .readdirSync(KIT_SOURCES)
    .map((file): [string, string] => [`kits/${file}`, readKit(file)]),
])
const kept = new Map<string, string>()
for (const entry of allowlist.brands) {
  if (entry.held) {
    kept.set(entry.name, "held")
    continue
  }
  const one = mono(entry)
  const hex = entry.hex ?? one.hex
  if (!hex) throw new Error(`${entry.name}: no hex`)
  const multi = entry.art && art(entry.art, { ...one, hex })

  if (values.measure && !sharpos.has(entry.aliases[0] ?? entry.name)) {
    const svg = multi
      ? squareSvg(multi.width, multi.height, multi.node)
      : squareSvg(24, 24, [["path", { d: one.d }]])
    const scale = getOpticalScale(measureReach(svg), BRAND_REACH_MEDIAN)
    if (scale === undefined) delete entry.scale
    else entry.scale = scale
  }

  files.set(
    `${entry.name}.svg`,
    renderSvg(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
      },
      [["path", { d: one.d }]]
    )
  )
  if (multi) {
    files.set(
      `${entry.name}.art.svg`,
      renderSvg(
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: `0 0 ${multi.width} ${multi.height}`,
          fill: "currentColor",
        },
        multi.node
      ).replace(
        ">\n",
        `>\n${multi.gradients ? `  ${renderGradients(multi.gradients)}\n` : ""}`
      )
    )
  }
  const metadata: BrandMetadata = {
    title: entry.title,
    group: entry.group,
    tags: entry.tags,
    aliases: entry.aliases,
    hex,
    ...(entry.scale !== undefined && { scale: entry.scale }),
    source: one.source,
    license: one.license,
    ...("guidelines" in one &&
      one.guidelines && { guidelines: one.guidelines }),
    ...(multi &&
      "guidelines" in multi &&
      !("guidelines" in one) && { guidelines: multi.guidelines }),
    ...(multi && { artSource: `${multi.source} (${multi.license})` }),
    ...(entry.credit && { credit: entry.credit }),
  }
  files.set(`${entry.name}.json`, `${JSON.stringify(metadata, null, 2)}\n`)
  kept.set(entry.name, "included")
}

if (values.measure) {
  fs.writeFileSync(allowlistFile, `${JSON.stringify(allowlist, null, 2)}\n`)
  files.set("allowlist.json", fs.readFileSync(allowlistFile, "utf8"))
}
writeGeneratedDirectory(BRAND_SOURCES, files)
writeLock({
  ...readLock(),
  simpleIcons: { version: simpleIconsVersion },
  logos: { version: logosVersion },
})

const held = [...kept]
  .filter(([, status]) => status === "held")
  .map(([name]) => name)
console.log(
  `Brands: ${kept.size - held.length} imported, ${held.length} held (${held.join(", ")})`
)
