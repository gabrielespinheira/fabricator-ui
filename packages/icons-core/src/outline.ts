import fs from "node:fs"
import path from "node:path"
import type { z } from "zod"

import { ICON_CATEGORIES, LUCIDE_SOURCES, OUTLINE_SOURCES } from "./paths"
import {
  brandStopwordsSchema,
  iconCategoriesSchema,
  iconMetadataSchema,
  readJson,
} from "./schemas"
import { parseSvg } from "./svg"
import type { IconOrigin, OutlineIcon } from "./types"
import { UI_STROKE_WIDTH, validateOutlineSvg } from "./validate"

export type IconMetadata = z.infer<typeof iconMetadataSchema>

/** Maintained originals also appear in Custom. */
export const CUSTOM_CATEGORY = { name: "custom", title: "Custom" }

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
      const isFabricatorSource = origin === "fabricator"
      const errors = validateOutlineSvg(parsed, {
        strict: false,
        isFabricatorSource,
      })
      if (errors.length > 0) {
        throw new IconSourceError(`${name}: ${errors.join("; ")}`)
      }
      const metadata = readJson(metadataFile, iconMetadataSchema)
      const isPublishedDrawing =
        isFabricatorSource &&
        parsed.attributes["stroke-width"] === String(UI_STROKE_WIDTH)
      return {
        name,
        origin,
        node: parsed.node,
        ...(isPublishedDrawing && { strokeWidth: UI_STROKE_WIDTH }),
        aliases: metadata.aliases ?? [],
        categories:
          origin === "fabricator"
            ? [...new Set([CUSTOM_CATEGORY.name, ...metadata.categories])]
            : metadata.categories,
        tags: metadata.tags,
      }
    })
}

/** The frozen SVG and metadata snapshot used to seed the catalog. */
export function loadImportedIcons(
  directory = path.join(LUCIDE_SOURCES, "icons")
) {
  return readIcons(directory, "lucide")
}

/** Fabricator's catalog includes the frozen import and original entries. */
export function loadOutlineIcons({
  lucideDirectory,
  outlineDirectory = OUTLINE_SOURCES,
}: {
  lucideDirectory?: string
  outlineDirectory?: string
} = {}): OutlineIcon[] {
  const icons = [
    ...loadImportedIcons(lucideDirectory),
    ...readIcons(outlineDirectory, "fabricator"),
  ]
  const seen = new Set<string>()
  for (const icon of icons) {
    if (seen.has(icon.name)) {
      throw new IconSourceError(
        `${icon.name}: the name already exists in the Fabricator catalog`
      )
    }
    seen.add(icon.name)
  }
  return icons.sort((a, b) => a.name.localeCompare(b.name))
}

export function readCategories() {
  return readCategoryTitles().map(({ name }) => name)
}

export function readCategoryTitles() {
  return [CUSTOM_CATEGORY, ...readJson(ICON_CATEGORIES, iconCategoriesSchema)]
}

export function readBrandStopwords() {
  return Object.keys(
    readJson(
      path.join(LUCIDE_SOURCES, "brand-stopwords.json"),
      brandStopwordsSchema
    )
  )
}
