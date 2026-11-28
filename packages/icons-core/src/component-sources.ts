import { loadBrands } from "./brands"
import { buildFileComponentSources } from "./file-component-sources"
import { loadFileIcons } from "./file-icons"
import { getExportNames } from "./names"
import { readCategoryTitles } from "./outline"
import {
  readRuntimeFiles,
  toCamelCaseAttributes,
  withGeneratedHeader,
} from "./output"
import { getArtworkViewBox, getBrandArtworkViewBox } from "./runtime/attributes"
import { renderGradientMarkup } from "./runtime/gradients"
import type {
  AnimatedCatalogEntry,
  BrandCatalogEntry,
  OutlineCatalogEntry,
} from "./runtime/types"
import { renderSvgInline } from "./svg"
import type { BrandIcon, BrandIconData, IconData, OutlineIcon } from "./types"
import {
  getUiIconData,
  loadUiIcons,
  UI_STROKE_WIDTH,
  type UiIcon,
} from "./ui-icons"
import { OUTLINE_ROOT_ATTRIBUTES } from "./validate"

const SITE = "https://fabricator-ui.vercel.app/icons"

const PREVIEW_STYLE = "background-color: #fff; border-radius: 2px"

function preview(icon: UiIcon) {
  const svg = renderSvgInline(
    {
      ...OUTLINE_ROOT_ATTRIBUTES,
      viewBox: getArtworkViewBox(24, 24, icon.opticalScales.outline),
      "stroke-width": String(UI_STROKE_WIDTH),
      stroke: "#000",
      style: PREVIEW_STYLE,
    },
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
          viewBox: getBrandArtworkViewBox(brand, brand.art),
          style: PREVIEW_STYLE,
        },
        brand.art.node
      ).replace(">", `>${renderGradientMarkup(brand.art.gradients)}`)
    : renderSvgInline(
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "24",
          height: "24",
          viewBox: getBrandArtworkViewBox(brand),
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
    ...(brand.opticalScale !== undefined && {
      opticalScale: brand.opticalScale,
    }),
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

function animatedBarrel(icons: OutlineIcon[]) {
  const lines = icons.map(({ name, aliases }) => {
    const [component, ...others] = [
      name,
      ...aliases.map((alias) => alias.name),
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

function catalogData(icons: UiIcon[], brands: BrandIcon[], animated: boolean) {
  const outline = icons.map(
    (icon): OutlineCatalogEntry => ({
      name: icon.name,
      set: "outline",
      aliases: icon.aliases.map((alias) => alias.name),
      categories: icon.categories,
      tags: icon.tags,
    })
  )
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
  const moving: AnimatedCatalogEntry[] = animated
    ? icons.map(({ name, aliases, categories, tags, motion }) => ({
        name,
        aliases: aliases.map((alias) => alias.name),
        categories,
        tags,
        motion,
        set: "animated",
      }))
    : []
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

function iconModule(icon: UiIcon) {
  const [componentName] = getExportNames(icon.name)
  const data: IconData = {
    ...getUiIconData(icon),
    strokeWidth: UI_STROKE_WIDTH,
    node: toCamelCaseAttributes(icon.node),
  }
  const origin = `Fabricator’s \`${icon.name}\``
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

function weightBarrel(icons: OutlineIcon[], folder: string) {
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
    return `export { ${specifiers} } from "./${folder}/${icon.name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

function weightModule(icon: UiIcon, weight: "fill" | "duotone") {
  const shapes = getUiIconData(icon, weight)
  const data: IconData = {
    ...shapes,
    node: toCamelCaseAttributes(shapes.node),
    ...(shapes.cutout && { cutout: toCamelCaseAttributes(shapes.cutout) }),
    ...(shapes.secondary && {
      secondary: toCamelCaseAttributes(shapes.secondary),
    }),
  }
  return withGeneratedHeader(`import { createIcon } from "../../create-icon.js"
import type { IconData } from "../runtime/types.js"

export const iconData: IconData = ${JSON.stringify(data)}

/** @see ${SITE}?set=${weight}&icon=${icon.name} */
export default createIcon(iconData)
`)
}

function animatedModule(icon: UiIcon) {
  if (icon.motion === "sidebar-toggle") {
    return withGeneratedHeader(`"use client"

export { SidebarToggleIcon } from "../../sidebar-toggle.js"
`)
  }
  const [componentName] = getExportNames(icon.name)
  const panel =
    icon.motion === "panel-left"
      ? "left"
      : icon.motion === "panel-right"
        ? "right"
        : undefined
  const factory = panel ? "createAnimatedPanelIcon" : "createAnimatedIcon"
  const module = panel ? "animated-panel" : "create-animated-icon"
  return withGeneratedHeader(`"use client"

import { ${factory} } from "../../${module}.js"
import { iconData as outline } from "../icons/${icon.name}.js"
import { iconData as fill } from "../fill/${icon.name}.js"
import { iconData as duotone } from "../duotone/${icon.name}.js"

export const ${componentName} = ${factory}({ outline, fill, duotone }, ${JSON.stringify(panel ?? icon.motion)})
`)
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
  const icons = loadUiIcons()
  const brands = loadBrands()
  const duotone = icons.map((icon) => icon.duotone)
  const files = new Map<string, string>()
  for (const [name, source] of buildFileComponentSources())
    files.set(name, source)
  for (const [file, content] of readRuntimeFiles())
    files.set(`runtime/${file}`, content)
  for (const icon of icons) files.set(`icons/${icon.name}.ts`, iconModule(icon))
  for (const brand of brands)
    files.set(`brands/${brand.name}.ts`, brandModule(brand))
  files.set("outline.ts", weightBarrel(icons, "icons"))
  for (const weight of ["fill", "duotone"] as const) {
    for (const icon of icons)
      files.set(`${weight}/${icon.name}.ts`, weightModule(icon, weight))
    files.set(`${weight}.ts`, weightBarrel(icons, weight))
  }
  files.set("brands.ts", brandBarrel(brands))
  if (animated) {
    for (const icon of icons)
      files.set(`animated/${icon.name}.tsx`, animatedModule(icon))
    files.set("animated.ts", animatedBarrel(icons))
  }
  if (dynamic) files.set("dynamic-imports.ts", dynamicImports(icons, brands))
  if (catalog)
    files.set("catalog-data.ts", catalogData(icons, brands, Boolean(animated)))
  return { files, icons, brands, duotone, animated: animated ? icons : [] }
}
