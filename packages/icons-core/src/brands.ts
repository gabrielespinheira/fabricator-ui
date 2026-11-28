import fs from "node:fs"
import path from "node:path"
import type { z } from "zod"

import { parseArtDocument } from "./brand-art"
import { resolveBrandColors } from "./brand-colors"
import { getArtworkScale, measureIconFootprint } from "./icon-footprint"
import { BRAND_SOURCES } from "./paths"
import { renderGradientMarkup } from "./runtime/gradients"
import { brandMetadataSchema, readJson } from "./schemas"
import { parseSvg, renderSvgInline } from "./svg"
import type { BrandArt, BrandIcon, IconElement } from "./types"

export type BrandMetadata = z.infer<typeof brandMetadataSchema>

export class BrandSourceError extends Error {
  override name = "BrandSourceError"
}

function readArt(file: string) {
  if (!fs.existsSync(file)) return undefined
  return parseArtDocument(fs.readFileSync(file, "utf8"))
}

function measureBrandScale(node: IconElement[], art?: BrandArt) {
  const svg = renderSvgInline(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "96",
      height: "96",
      viewBox: `0 0 ${art?.width ?? 24} ${art?.height ?? 24}`,
      fill: "black",
    },
    node
  )
  const framed = svg.replace(">", `>${renderGradientMarkup(art?.gradients)}`)
  return getArtworkScale(measureIconFootprint(framed), { preserveSmall: false })
}

/** Every brand mark in sources/brands, sorted by name. */
export function loadBrands(directory = BRAND_SOURCES): BrandIcon[] {
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json") && file !== "allowlist.json")
    .sort()
    .map((file) => {
      const name = file.slice(0, -5)
      const metadata = readJson(path.join(directory, file), brandMetadataSchema)
      const mono = parseSvg(
        fs.readFileSync(path.join(directory, `${name}.svg`), "utf8")
      )
      if (mono.attributes.viewBox !== "0 0 24 24") {
        throw new BrandSourceError(
          `${name}: the one-colour mark must use a 0 0 24 24 viewBox`
        )
      }
      const art = readArt(path.join(directory, `${name}.art.svg`))
      return {
        name,
        title: metadata.title,
        group: metadata.group,
        tags: metadata.tags,
        aliases: metadata.aliases,
        hex: metadata.hex,
        colors: resolveBrandColors(metadata.hex),
        node: mono.node,
        ...(art && {
          art: { ...art, opticalScale: measureBrandScale(art.node, art) },
        }),
        opticalScale: measureBrandScale(mono.node),
        ...(metadata.scale !== undefined && { scale: metadata.scale }),
        source: metadata.source,
        license: metadata.license,
        ...(metadata.guidelines && { guidelines: metadata.guidelines }),
        ...(metadata.artSource && { artSource: metadata.artSource }),
        ...(metadata.credit && { credit: metadata.credit }),
      }
    })
}
