import { loadBrands } from "./brands"
import { loadDuotoneIcons } from "./duotone"
import { getExportNames } from "./names"
import { loadOutlineIcons } from "./outline"
import {
  readRuntimeFiles,
  toCamelCaseAttributes,
  withGeneratedHeader,
} from "./output"
import type { BrandCatalogEntry, OutlineCatalogEntry } from "./runtime/types"
import { renderSvgInline } from "./svg"
import type {
  BrandIcon,
  BrandIconData,
  DuotoneIcon,
  IconData,
  OutlineIcon,
} from "./types"
import { OUTLINE_ROOT_ATTRIBUTES } from "./validate"

const SITE = "https://fabricator-ui.vercel.app/icons"

const PREVIEW_STYLE = "background-color: #fff; border-radius: 2px"

function preview(icon: OutlineIcon) {
  const svg = renderSvgInline(
    { ...OUTLINE_ROOT_ATTRIBUTES, stroke: "#000", style: PREVIEW_STYLE },
    icon.node
  )
  return Buffer.from(svg).toString("base64")
}

function brandPreview(brand: BrandIcon) {
  const svg = brand.art
    ? renderSvgInline(
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "24",
          height: "24",
          viewBox: `0 0 ${brand.art.width} ${brand.art.height}`,
          style: PREVIEW_STYLE,
        },
        brand.art.node
      )
    : renderSvgInline(
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "24",
          height: "24",
          viewBox: "0 0 24 24",
          fill: brand.colors.inherit ? "#000" : brand.hex,
          style: PREVIEW_STYLE,
        },
        brand.node
      )
  return Buffer.from(svg).toString("base64")
}

function brandModule(brand: BrandIcon) {
  const [componentName] = getExportNames(brand.name)
  const data: BrandIconData = {
    name: brand.name,
    node: toCamelCaseAttributes(brand.node),
    ...(brand.art && {
      art: { ...brand.art, node: toCamelCaseAttributes(brand.art.node) },
    }),
    colors: brand.colors,
    ...(brand.scale !== undefined && { scale: brand.scale }),
  }
  return withGeneratedHeader(`import { createBrandIcon } from "../../brand-icon.js"
import type { BrandIconData } from "../runtime/types.js"

export const brandData: BrandIconData = ${JSON.stringify(data)}

/**
 * ${brand.title} mark. ${brand.title} is a trademark of its owner; check its guidelines before use${brand.guidelines ? `: ${brand.guidelines}` : "."}
 *
 * @preview ![${brand.name}](data:image/svg+xml;base64,${brandPreview(brand)})
 * @see ${SITE}?set=brands&icon=${brand.name}
 */
const ${componentName} = createBrandIcon(brandData)

export default ${componentName}
`)
}

function brandBarrel(brands: BrandIcon[]) {
  const lines = brands.map((brand) => {
    const specifiers = getExportNames(brand.name)
      .map((exportName) => `default as ${exportName}`)
      .join(", ")
    return `export { ${specifiers} } from "./brands/${brand.name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

function dynamicImports(icons: OutlineIcon[], brands: BrandIcon[]) {
  const outline = icons.flatMap((icon) =>
    [icon.name, ...icon.aliases.map((alias) => alias.name)].map(
      (name) =>
        `  ${JSON.stringify(name)}: () => import("./icons/${icon.name}.js"),`
    )
  )
  const brand = brands.flatMap((mark) =>
    [mark.name, ...mark.aliases].map(
      (name) =>
        `  ${JSON.stringify(name)}: () => import("./brands/${mark.name}.js"),`
    )
  )
  return withGeneratedHeader(`import type { BrandIconComponent } from "../brand-icon.js"
import type { IconComponent } from "../icon.js"

export const outlineImports: Record<string, () => Promise<{ default: IconComponent }>> = {
${outline.join("\n")}
}

export const brandImports: Record<string, () => Promise<{ default: BrandIconComponent }>> = {
${brand.join("\n")}
}
`)
}

function catalogData(icons: OutlineIcon[], brands: BrandIcon[]) {
  const outline: OutlineCatalogEntry[] = icons.map((icon) => ({
    name: icon.name,
    set: "outline",
    aliases: icon.aliases.map((alias) => alias.name),
    categories: icon.categories,
    tags: icon.tags,
  }))
  const brand: BrandCatalogEntry[] = brands.map((mark) => ({
    name: mark.name,
    set: "brands",
    title: mark.title,
    group: mark.group,
    aliases: mark.aliases,
    tags: mark.tags,
    hex: mark.hex,
    source: mark.source,
    license: mark.license,
    ...(mark.guidelines && { guidelines: mark.guidelines }),
    ...(mark.artSource && { artSource: mark.artSource }),
  }))
  return withGeneratedHeader(`import type { BrandCatalogEntry, OutlineCatalogEntry } from "./runtime/types.js"

export const outlineCatalog: OutlineCatalogEntry[] = ${JSON.stringify(outline)}

export const brandCatalog: BrandCatalogEntry[] = ${JSON.stringify(brand)}
`)
}

function iconModule(icon: OutlineIcon) {
  const [componentName] = getExportNames(icon.name)
  const data: IconData = {
    name: icon.name,
    node: toCamelCaseAttributes(icon.node),
  }
  const origin =
    icon.origin === "lucide"
      ? `Lucide's \`${icon.name}\``
      : `Fabricator's \`${icon.name}\``
  return withGeneratedHeader(`import { createIcon } from "../../create-icon.js"
import type { IconData } from "../runtime/types.js"

export const iconData: IconData = ${JSON.stringify(data)}

/**
 * ${origin} icon.
 *
 * @preview ![${icon.name}](data:image/svg+xml;base64,${preview(icon)})
 * @see ${SITE}?icon=${icon.name}
 */
const ${componentName} = createIcon(iconData)

export default ${componentName}
`)
}

function outlineBarrel(icons: OutlineIcon[]) {
  const seen = new Map<string, string>()
  const lines = icons.map((icon) => {
    const names = [
      ...new Set(
        [icon.name, ...icon.aliases.map((alias) => alias.name)].flatMap(
          getExportNames
        )
      ),
    ]
    for (const exportName of names) {
      const owner = seen.get(exportName)
      if (owner)
        throw new Error(
          `Export ${exportName} is claimed by ${owner} and ${icon.name}`
        )
      seen.set(exportName, icon.name)
    }
    const specifiers = names
      .map((exportName) => `default as ${exportName}`)
      .join(", ")
    return `export { ${specifiers} } from "./icons/${icon.name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

function duotoneModule(icon: DuotoneIcon) {
  const [componentName] = getExportNames(icon.name)
  const data: IconData = {
    name: icon.name,
    node: toCamelCaseAttributes(icon.node),
    secondary: toCamelCaseAttributes(icon.secondary),
  }
  return withGeneratedHeader(`import { createIcon } from "../../create-icon.js"
import type { IconData } from "../runtime/types.js"

export const iconData: IconData = ${JSON.stringify(data)}

/**
 * Duotone \`${icon.name}\`: the outline icon with a translucent secondary layer.
 *
 * @see ${SITE}?set=duotone&icon=${icon.name}
 */
const ${componentName} = createIcon(iconData)

export default ${componentName}
`)
}

function duotoneBarrel(icons: DuotoneIcon[]) {
  if (icons.length === 0) return withGeneratedHeader("export {}\n")
  const lines = icons.map((icon) => {
    const specifiers = getExportNames(icon.name)
      .map((exportName) => `default as ${exportName}`)
      .join(", ")
    return `export { ${specifiers} } from "./duotone/${icon.name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

export type ComponentSourceOptions = {
  /** Lazy-import maps for DynamicIcon. */
  dynamic: boolean
  /** The catalog of names, tags and provenance. */
  catalog: boolean
}

/**
 * The generated sources a component package compiles: one module per icon
 * and brand, the barrels, and the shared runtime. Each package supplies its
 * own create-icon.ts and brand-icon.ts, which the modules import.
 */
export function buildComponentSources({
  dynamic,
  catalog,
}: ComponentSourceOptions) {
  const icons = loadOutlineIcons()
  const brands = loadBrands()
  const duotone = loadDuotoneIcons()
  const files = new Map<string, string>()
  for (const [file, content] of readRuntimeFiles())
    files.set(`runtime/${file}`, content)
  for (const icon of icons) files.set(`icons/${icon.name}.ts`, iconModule(icon))
  for (const brand of brands)
    files.set(`brands/${brand.name}.ts`, brandModule(brand))
  files.set("outline.ts", outlineBarrel(icons))
  for (const icon of duotone)
    files.set(`duotone/${icon.name}.ts`, duotoneModule(icon))
  files.set("brands.ts", brandBarrel(brands))
  files.set("duotone.ts", duotoneBarrel(duotone))
  if (dynamic) files.set("dynamic-imports.ts", dynamicImports(icons, brands))
  if (catalog) files.set("catalog-data.ts", catalogData(icons, brands))
  return { files, icons, brands, duotone }
}
