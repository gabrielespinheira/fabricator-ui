import fs from "node:fs"
import path from "node:path"
import type { z } from "zod"

import { LUCIDE_SOURCES, OUTLINE_SOURCES } from "./paths"
import { brandStopwordsSchema, iconMetadataSchema, readJson } from "./schemas"
import { parseSvg } from "./svg"
import type { IconOrigin, OutlineIcon } from "./types"
import { validateOutlineSvg } from "./validate"

export type IconMetadata = z.infer<typeof iconMetadataSchema>

export class IconSourceError extends Error {
  override name = "IconSourceError"
}

function readIcons(directory: string, origin: IconOrigin): OutlineIcon[] {
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".svg"))
    .sort()
    .map((file) => {
      const name = file.slice(0, -4)
      const svgFile = path.join(directory, file)
      const metadataFile = path.join(directory, `${name}.json`)
      if (!fs.existsSync(metadataFile)) {
        throw new IconSourceError(
          `${name}: missing ${path.basename(metadataFile)}`
        )
      }
      const parsed = parseSvg(fs.readFileSync(svgFile, "utf8"))
      const errors = validateOutlineSvg(parsed, { strict: false })
      if (errors.length > 0) {
        throw new IconSourceError(`${name}: ${errors.join("; ")}`)
      }
      const metadata = readJson(metadataFile, iconMetadataSchema)
      return {
        name,
        origin,
        node: parsed.node,
        aliases: metadata.aliases ?? [],
        categories: metadata.categories,
        tags: metadata.tags,
      }
    })
}

/** Lucide's icons and Fabricator's originals, sorted by name. */
export function loadOutlineIcons({
  lucideDirectory = path.join(LUCIDE_SOURCES, "icons"),
  outlineDirectory = OUTLINE_SOURCES,
} = {}): OutlineIcon[] {
  const icons = [
    ...readIcons(lucideDirectory, "lucide"),
    ...readIcons(outlineDirectory, "fabricator"),
  ]
  const seen = new Set<string>()
  for (const icon of icons) {
    if (seen.has(icon.name)) {
      throw new IconSourceError(
        `${icon.name}: the name is used by Lucide and by a Fabricator original`
      )
    }
    seen.add(icon.name)
  }
  return icons.sort((a, b) => a.name.localeCompare(b.name))
}

export function readCategories() {
  return fs
    .readdirSync(path.join(LUCIDE_SOURCES, "categories"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .sort()
}

export function readBrandStopwords() {
  return Object.keys(
    readJson(
      path.join(LUCIDE_SOURCES, "brand-stopwords.json"),
      brandStopwordsSchema
    )
  )
}
