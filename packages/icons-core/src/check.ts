import fs from "node:fs"
import path from "node:path"

import { contrast, DARK_SURFACE } from "./brand-colors"
import { SCALE_FLOOR } from "./brand-scale"
import { loadBrands } from "./brands"
import { isKebabCase } from "./names"
import { loadOutlineIcons, readBrandStopwords, readCategories } from "./outline"
import { DUOTONE_SOURCES, OUTLINE_SOURCES } from "./paths"
import { iconMetadataSchema, readJson } from "./schemas"
import { parseSvg } from "./svg"
import type { IconElement } from "./types"
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
    for (const [, attributes] of brand.art?.node ?? []) {
      if (
        attributes.fill?.startsWith("#") &&
        contrast(attributes.fill, DARK_SURFACE) <= 1.5
      ) {
        report(
          `art fill ${attributes.fill} vanishes on the dark surface; leave it unfilled to follow currentColor`
        )
      }
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

export function checkSources() {
  return [...checkOriginals(), ...checkBrands(), ...checkDuotone()]
}
