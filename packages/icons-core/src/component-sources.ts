import { loadAnimatedIcons, type AnimatedIcon } from "./animated"
import { loadBrands } from "./brands"
import { loadDuotoneIcons } from "./duotone"
import { buildFileComponentSources } from "./file-component-sources"
import { loadFileIcons } from "./file-icons"
import { getExportNames } from "./names"
import { loadOutlineIcons, readCategoryTitles } from "./outline"
import {
  readRuntimeFiles,
  toCamelCaseAttributes,
  withGeneratedHeader,
} from "./output"
import type {
  AnimatedCatalogEntry,
  BrandCatalogEntry,
  OutlineCatalogEntry,
} from "./runtime/types"
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

function animatedBarrel(animated: AnimatedIcon[], icons: OutlineIcon[]) {
  const outline = new Map(icons.map((icon) => [icon.name, icon]))
  const lines = animated.map(({ name }) => {
    const [component, ...others] = [
      name,
      ...(outline.get(name)?.aliases.map((alias) => alias.name) ?? []),
    ].flatMap(getExportNames)
    const specifiers = [
      component,
      ...new Set(others.filter((other) => other !== component)),
    ].map((exportName) =>
      exportName === component ? exportName : `${component} as ${exportName}`
    )
    return `export { ${specifiers.join(", ")} } from "./animated/${name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

function catalogData(
  icons: OutlineIcon[],
  brands: BrandIcon[],
  animated: AnimatedIcon[]
) {
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
    ...(mark.credit && { credit: mark.credit }),
  }))
  const moving: AnimatedCatalogEntry[] = outline.flatMap((entry) => {
    const icon = animated.find(({ name }) => name === entry.name)
    if (!icon) return []
    return {
      ...entry,
      set: "animated" as const,
      ...(icon.isOlderDrawing && { isOlderDrawing: true }),
    }
  })
  const {
    icons: fileIcons,
    fileNames,
    fileExtensions,
    folderNames,
  } = loadFileIcons()
  const fileEntries = fileIcons.map(({ name }) => ({
    name,
    set: "files",
    aliases: [],
    categories: [name.includes("folder") ? "folders" : "files"],
    tags: [
      ...Object.entries(fileNames),
      ...Object.entries(fileExtensions),
      ...Object.entries(folderNames),
    ]
      .filter(([, id]) => id === name || `${id}-open` === name)
      .map(([association]) => association),
  }))
  return withGeneratedHeader(`import type { AnimatedCatalogEntry, BrandCatalogEntry, FileCatalogEntry, IconCategory, OutlineCatalogEntry } from "./runtime/types.js"

export const outlineCategories: IconCategory[] = ${JSON.stringify(readCategoryTitles())}

export const outlineCatalog: OutlineCatalogEntry[] = ${JSON.stringify(outline)}

export const brandCatalog: BrandCatalogEntry[] = ${JSON.stringify(brand)}

export const animatedCatalog: AnimatedCatalogEntry[] = ${JSON.stringify(moving)}

export const fileCatalog: FileCatalogEntry[] = ${JSON.stringify(fileEntries)}
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
  /** The Motion-animated icons, which only web targets can run. */
  animated?: boolean
}

/**
 * The generated sources a component package compiles: one module per icon
 * and brand, the barrels, and the shared runtime. Each package supplies its
 * own create-icon.ts and brand-icon.ts, which the modules import.
 */
export function buildComponentSources({
  dynamic,
  catalog,
  animated,
}: ComponentSourceOptions) {
  const icons = loadOutlineIcons()
  const brands = loadBrands()
  const duotone = loadDuotoneIcons()
  const files = new Map<string, string>()
  for (const [name, source] of buildFileComponentSources())
    files.set(name, source)
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
  const moving = animated ? loadAnimatedIcons(icons) : []
  for (const icon of moving) files.set(`animated/${icon.name}.tsx`, icon.source)
  if (animated) files.set("animated.ts", animatedBarrel(moving, icons))
  if (dynamic) files.set("dynamic-imports.ts", dynamicImports(icons, brands))
  if (catalog) files.set("catalog-data.ts", catalogData(icons, brands, moving))
  return { files, icons, brands, duotone, animated: moving }
}
