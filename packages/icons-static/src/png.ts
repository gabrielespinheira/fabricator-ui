import fs from "node:fs"
import path from "node:path"

import { brandAliases, outlineAliases } from "./generated/aliases.js"
import { brandNodes, outlineNodes, outlineScales } from "./generated/nodes.js"
import { getBrandArtworkViewBox } from "./generated/runtime/attributes.js"
import { renderGradientMarkup } from "./generated/runtime/gradients.js"
import type { IconElement } from "./generated/runtime/types.js"
import { renderUiSvg } from "./generated/runtime/ui-svg.js"
import { duotoneNodes, fillNodes } from "./generated/variant-nodes.js"
import { renderSvgPng } from "./render-svg-png.js"

export { MissingRendererError, renderSvgPng } from "./render-svg-png.js"

export type IconSet = "outline" | "fill" | "duotone" | "brands"

export function isIconSet(value: string): value is IconSet {
  return (
    value === "outline" ||
    value === "fill" ||
    value === "duotone" ||
    value === "brands"
  )
}

export type PngOptions = {
  set: IconSet
  /** Size in points: the @1x width and height. */
  size: number
  /** Pixel densities to write: 1 → name.png, 2 → name@2x.png. */
  scales: number[]
  /** Any CSS colour; for brands, `brand` paints the brand's own colours. */
  color: string
  strokeWidth: number
  /** macOS template images: black on transparent, names ending in Template. */
  template: boolean
  outDir: string
}

export class UnknownIconError extends Error {
  override name = "UnknownIconError"
}

function attributes(values: Record<string, string>) {
  return Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
}

function shapes(node: IconElement[]) {
  return node.map(([tag, values]) => `<${tag} ${attributes(values)}/>`).join("")
}

function unknown(name: string, set: IconSet) {
  return new UnknownIconError(
    `There is no ${set === "brands" ? "brand" : "icon"} named "${name}"`
  )
}

/** Resolves a name or alias to the icon's canonical name, or throws. */
export function resolveName(name: string, set: IconSet) {
  const canonical =
    (set === "brands" ? brandAliases : outlineAliases)[name] ?? name
  if (!(canonical in (set === "brands" ? brandNodes : outlineNodes)))
    throw unknown(name, set)
  return canonical
}

/** The SVG an icon renders to with these options. */
export function buildSvg(
  name: string,
  {
    set,
    color,
    strokeWidth,
    template,
  }: Omit<PngOptions, "outDir" | "scales" | "size">
) {
  const paint = template ? "#000000" : color
  if (set === "fill" || set === "duotone") {
    const icon = (set === "fill" ? fillNodes : duotoneNodes)[name]
    if (!icon) throw unknown(name, set)
    return renderUiSvg(icon, { color: paint, strokeWidth })
  }
  if (set === "outline") {
    const node = outlineNodes[name]
    if (!node) throw unknown(name, set)
    return renderUiSvg(
      { name, node, opticalScale: outlineScales[name] },
      { color: paint, strokeWidth }
    )
  }
  const brand = brandNodes[name]
  if (!brand) throw unknown(name, set)
  const art = paint === "brand" ? brand.art : undefined
  // Art carries its own colours; its unfilled parts take the light-mode foreground.
  const brandFill = art || brand.colors.inherit ? "#000000" : brand.colors.light
  const fill = paint === "brand" ? brandFill : paint
  const box = getBrandArtworkViewBox(brand, art)
  const defs = renderGradientMarkup(art?.gradients)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" fill="${fill}">${defs}${shapes(art?.node ?? brand.node)}</svg>`
}

function fileName(name: string, scale: number, template: boolean) {
  const base = template ? `${name}Template` : name
  return scale === 1 ? `${base}.png` : `${base}@${scale}x.png`
}

/** Writes one PNG per icon and scale, named as given, and returns the files written. */
export async function exportPngs(names: string[], options: PngOptions) {
  const icons = names.map((name) => ({
    name,
    canonical: resolveName(name, options.set),
  }))
  fs.mkdirSync(options.outDir, { recursive: true })
  const written: string[] = []
  for (const { name, canonical } of icons) {
    const svg = buildSvg(canonical, options)
    for (const scale of options.scales) {
      const png = await renderSvgPng(svg, options.size * scale)
      const file = path.join(
        options.outDir,
        fileName(name, scale, options.template)
      )
      fs.writeFileSync(file, png)
      written.push(file)
    }
  }
  return written
}
