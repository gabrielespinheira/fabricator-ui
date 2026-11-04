import fs from "node:fs"
import path from "node:path"

import { AnimatedTransformError, loadAnimatedIcons } from "./animated"
import { contrast, DARK_SURFACE } from "./brand-colors"
import { SCALE_FLOOR } from "./brand-scale"
import { loadBrands } from "./brands"
import { getBounds, type Bounds } from "./geometry"
import { isKebabCase } from "./names"
import { loadOutlineIcons, readBrandStopwords, readCategories } from "./outline"
import { DUOTONE_SOURCES, OUTLINE_SOURCES } from "./paths"
import { iconMetadataSchema, readJson } from "./schemas"
import { parseSvg } from "./svg"
import type { BrandGradient, IconElement } from "./types"
import { validateElements, validateOutlineSvg } from "./validate"

function isClosed([tag, attributes]: IconElement) {
  if (tag === "path") return /z\s*$/i.test(attributes.d ?? "")
  return (
    tag === "circle" || tag === "ellipse" || tag === "rect" || tag === "polygon"
  )
}

export function checkOriginals(directory = OUTLINE_SOURCES) {
  if (!fs.existsSync(directory)) return []
  const errors: string[] = []
  const lucide = loadOutlineIcons({
    outlineDirectory: path.join(directory, "__none__"),
  })
  const taken = new Set(
    lucide.flatMap((icon) => [
      icon.name,
      ...icon.aliases.map((alias) => alias.name),
    ])
  )
  const categories = new Set(readCategories())
  const stopwords = readBrandStopwords()

  for (const file of fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".svg"))) {
    const name = file.slice(0, -4)
    const report = (message: string) =>
      errors.push(`outline/${name}: ${message}`)
    if (!isKebabCase(name)) report("the name must be kebab-case")
    if (taken.has(name))
      report(
        "Lucide already uses this name; make ours an alias of Lucide's or rename it"
      )
    const stopword = stopwords.find((word) => name.split("-").includes(word))
    if (stopword)
      report(`"${stopword}" is a brand; brand marks go in sources/brands`)
    for (const error of validateOutlineSvg(
      parseSvg(fs.readFileSync(path.join(directory, file), "utf8")),
      { strict: true }
    )) {
      report(error)
    }
    const metadataFile = path.join(directory, `${name}.json`)
    if (!fs.existsSync(metadataFile)) {
      report("missing metadata JSON")
      continue
    }
    const metadata = readJson(metadataFile, iconMetadataSchema)
    if (metadata.tags.length === 0) report("give it at least one tag")
    for (const category of metadata.categories) {
      if (!categories.has(category)) report(`unknown category ${category}`)
    }
  }
  return errors
}

const isLegible = (fill: string) => contrast(fill, DARK_SURFACE) > 1.5

function overlaps(a: Bounds, b: Bounds) {
  return (
    a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY
  )
}

/**
 * Art fills that would vanish on the dark surface: near-black fills that
 * don't touch any legible shape. Details on a coloured shape (JavaScript's
 * letters) and outlines around one (Bun's) keep the mark visible.
 */
export function exposedDarkFills(
  node: IconElement[],
  gradients: BrandGradient[] = []
) {
  const stopsLegible = new Map(
    gradients.map((gradient) => [
      `url(#${gradient.id})`,
      gradient.stops.some((stop) => isLegible(stop.color)),
    ])
  )
  const fillIsLegible = (fill: string) =>
    fill.startsWith("url(")
      ? (stopsLegible.get(fill) ?? false)
      : isLegible(fill)
  const legible = node
    .filter(([, { fill }]) => fill !== undefined && fillIsLegible(fill))
    .map((element) => getBounds([element]))
  return node.flatMap(([tag, attributes]) => {
    const fill = attributes.fill
    if (!fill?.startsWith("#") || isLegible(fill)) return []
    const bounds = getBounds([[tag, attributes]])
    return legible.some((other) => overlaps(other, bounds)) ? [] : [fill]
  })
}

export function checkBrands() {
  const errors: string[] = []
  for (const brand of loadBrands()) {
    const report = (message: string) =>
      errors.push(`brands/${brand.name}: ${message}`)
    if (!isKebabCase(brand.name)) report("the name must be kebab-case")
    if (!brand.source || !brand.license) report("record a source and a licence")
    if (brand.node.some(([tag]) => tag !== "path"))
      report("the one-colour mark must be paths only")
    if (
      brand.scale !== undefined &&
      (brand.scale >= 1 || brand.scale < SCALE_FLOOR)
    ) {
      report(`scale ${brand.scale} must be below 1 and at least ${SCALE_FLOOR}`)
    }
    if (
      !brand.colors.inherit &&
      contrast(brand.colors.dark, DARK_SURFACE) < 3
    ) {
      report("the dark-mode colour is illegible on the dark surface")
    }
    for (const fill of exposedDarkFills(
      brand.art?.node ?? [],
      brand.art?.gradients
    )) {
      report(
        `art fill ${fill} vanishes on the dark surface; leave it unfilled to follow currentColor, or draw it on a legible shape`
      )
    }
  }
  return errors
}

export function checkDuotone(directory = DUOTONE_SOURCES) {
  if (!fs.existsSync(directory)) return []
  const errors: string[] = []
  const outline = new Map(loadOutlineIcons().map((icon) => [icon.name, icon]))
  for (const file of fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".svg"))) {
    const name = file.slice(0, -4)
    const report = (message: string) =>
      errors.push(`duotone/${name}: ${message}`)
    const base = outline.get(name)
    if (!base) {
      report("there is no outline icon with this name")
      continue
    }
    const parsed = parseSvg(fs.readFileSync(path.join(directory, file), "utf8"))
    if (JSON.stringify(parsed.node) !== JSON.stringify(base.node))
      report("the outline part must equal the outline icon")
    const secondary = parsed.groups.filter(
      (group) => group.attributes.id === "secondary"
    )
    if (parsed.groups.length !== 1 || secondary.length !== 1)
      report('use exactly one <g id="secondary">')
    for (const element of secondary[0]?.node ?? []) {
      if (!isClosed(element))
        report(`<${element[0]}> in the secondary layer must be a closed shape`)
    }
    errors.push(
      ...validateElements(secondary[0]?.node ?? []).map(
        (error) => `duotone/${name}: ${error}`
      )
    )
  }
  return errors
}

/** Every vendored animated icon must ship under a Lucide name, or say why not. */
export function checkAnimated() {
  try {
    loadAnimatedIcons()
    return []
  } catch (error) {
    if (error instanceof AnimatedTransformError)
      return [`animated: ${error.message}`]
    throw error
  }
}

export function checkSources() {
  return [
    ...checkOriginals(),
    ...checkBrands(),
    ...checkDuotone(),
    ...checkAnimated(),
  ]
}
