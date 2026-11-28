/**
 * Writes the static outputs: icons/*.svg, sprite.svg, icon-nodes.json and
 * tags.json at the package root, and the SVG-string modules in src/generated/.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  brandsText,
  getArtworkViewBox,
  getBrandArtworkViewBox,
  getUiIconData,
  licenseText,
  loadBrands,
  loadFileIcons,
  loadUiIcons,
  OUTLINE_ROOT_ATTRIBUTES,
  prefixGradientFills,
  readRuntimeFiles,
  renderFileSvg,
  renderGradients,
  renderSvg,
  renderSvgInline,
  renderUiSvg,
  toPascalCase,
  UI_STROKE_WIDTH,
  withGeneratedHeader,
  writeGeneratedDirectory,
  writeGeneratedFile,
  type BrandIcon,
  type IconData,
  type OutlineIcon,
  type UiIcon,
} from "@fabricator-ui/icons-core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function sprite(icons: UiIcon[]) {
  const symbolAttributes = Object.entries(OUTLINE_ROOT_ATTRIBUTES)
    .filter(([name]) => !["xmlns", "width", "height", "viewBox"].includes(name))
    .map(([name, value]) => [
      name,
      name === "stroke-width" ? String(UI_STROKE_WIDTH) : value,
    ])

  const attributes = symbolAttributes
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
  const symbols = icons.map((icon) => {
    const inner = renderSvgInline({}, icon.node).replace(
      /^<svg >|<\/svg>$/g,
      ""
    )
    return `  <symbol id="${icon.name}" viewBox="${getArtworkViewBox(24, 24, icon.opticalScales.outline)}" ${attributes}>${inner}</symbol>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`
}

function stringBarrel(icons: OutlineIcon[], folder = "icons") {
  const lines = icons.map((icon) => {
    const names = [
      ...new Set(
        [icon.name, ...icon.aliases.map((alias) => alias.name)].map(
          toPascalCase
        )
      ),
    ]
    return `export { ${names.map((name) => `default as ${name}`).join(", ")} } from "./${folder}/${icon.name}.js"`
  })
  return withGeneratedHeader(`${lines.join("\n")}\n`)
}

function brandSvg(brand: BrandIcon, color: "mono" | "brand") {
  const art = color === "brand" ? brand.art : undefined
  const viewBox = getBrandArtworkViewBox(brand, art)
  const fill =
    color === "mono" || art || brand.colors.inherit ? "currentColor" : brand.hex
  // Ids carry the brand's name, so different marks on one page never clash.
  const prefix = `fab-${brand.name}-`
  const svg = renderSvg(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox,
      fill,
    },
    prefixGradientFills(art?.node ?? brand.node, art?.gradients ? prefix : "")
  )
  return art?.gradients
    ? svg.replace(">\n", `>\n  ${renderGradients(art.gradients, prefix)}\n`)
    : svg
}

function brandSprite(brands: BrandIcon[]) {
  const symbols = brands.map((brand) => {
    const inner = renderSvgInline({}, brand.node).replace(
      /^<svg >|<\/svg>$/g,
      ""
    )
    return `  <symbol id="${brand.name}" viewBox="${getBrandArtworkViewBox(brand)}" fill="currentColor">${inner}</symbol>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`
}

const icons = loadUiIcons()
const brands = loadBrands()
const filePack = loadFileIcons()

const generated = new Map<string, string>()
const svgs = new Map<string, string>()
const weights = {
  fill: new Map<string, IconData>(),
  duotone: new Map<string, IconData>(),
}
for (const icon of icons) {
  const svg = renderUiSvg(getUiIconData(icon))
  svgs.set(`${icon.name}.svg`, svg)
  generated.set(
    `icons/${icon.name}.ts`,
    withGeneratedHeader(`export default ${JSON.stringify(svg)}\n`)
  )
}
generated.set("outline.ts", stringBarrel(icons))
for (const icon of icons) {
  weights.fill.set(icon.name, getUiIconData(icon, "fill"))
  weights.duotone.set(icon.name, getUiIconData(icon, "duotone"))
}
for (const weight of ["fill", "duotone"] as const) {
  const variantFiles = new Map<string, string>()
  for (const [name, data] of weights[weight]) {
    const svg = renderUiSvg(data)
    variantFiles.set(`${name}.svg`, svg)
    generated.set(
      `${weight}/${name}.ts`,
      withGeneratedHeader(`export default ${JSON.stringify(svg)}\n`)
    )
  }
  generated.set(`${weight}.ts`, stringBarrel(icons, weight))
  writeGeneratedDirectory(path.join(root, weight), variantFiles)
}
generated.set(
  "variant-nodes.ts",
  withGeneratedHeader(`import type { IconData } from "./runtime/types.js"
export const fillNodes: Record<string, IconData> = ${JSON.stringify(Object.fromEntries(weights.fill))}
export const duotoneNodes: Record<string, IconData> = ${JSON.stringify(Object.fromEntries(weights.duotone))}
`)
)
for (const [file, content] of readRuntimeFiles())
  generated.set(`runtime/${file}`, content)

const brandFiles = new Map<string, string>()
const brandLines: string[] = []
for (const brand of brands) {
  const mono = brandSvg(brand, "mono")
  const color = brandSvg(brand, "brand")
  brandFiles.set(`${brand.name}.svg`, mono)
  brandFiles.set(`color/${brand.name}.svg`, color)
  generated.set(
    `brands/${brand.name}.ts`,
    withGeneratedHeader(
      `export default ${JSON.stringify(mono)}\n\nexport const color = ${JSON.stringify(color)}\n`
    )
  )
  const name = toPascalCase(brand.name)
  brandLines.push(
    `export { default as ${name}, color as ${name}Color } from "./brands/${brand.name}.js"`
  )
}
generated.set("brands.ts", withGeneratedHeader(`${brandLines.join("\n")}\n`))
const outlineAliases = Object.fromEntries(
  icons.flatMap((icon) => icon.aliases.map((alias) => [alias.name, icon.name]))
)
const brandAliases = Object.fromEntries(
  brands.flatMap((brand) => brand.aliases.map((alias) => [alias, brand.name]))
)
generated.set(
  "aliases.ts",
  withGeneratedHeader(
    `export const outlineAliases: Record<string, string> = ${JSON.stringify(outlineAliases)}\n\nexport const brandAliases: Record<string, string> = ${JSON.stringify(brandAliases)}\n`
  )
)
const outlineScales = Object.fromEntries(
  icons.flatMap((icon) => {
    const scale = icon.opticalScales.outline
    return scale === undefined ? [] : [[icon.name, scale]]
  })
)
const brandNodes = Object.fromEntries(
  brands.map((brand) => [
    brand.name,
    {
      node: brand.node,
      ...(brand.art && { art: brand.art }),
      colors: brand.colors,
      ...(brand.scale !== undefined && { scale: brand.scale }),
      ...(brand.opticalScale !== undefined && {
        opticalScale: brand.opticalScale,
      }),
    },
  ])
)
generated.set(
  "nodes.ts",
  withGeneratedHeader(`import type { BrandIconData, IconElement } from "./runtime/types.js"
import type { FileIconData, FilePalette } from "./runtime/files.js"

export const fileNodes: Record<string, FileIconData> = ${JSON.stringify(Object.fromEntries(filePack.icons.map((icon) => [icon.name, icon])))}
export const filePalette: FilePalette = ${JSON.stringify(filePack.palette)}

export const outlineNodes: Record<string, IconElement[]> = ${JSON.stringify(Object.fromEntries(icons.map((icon) => [icon.name, icon.node])))}
export const outlineScales: Partial<Record<string, number>> = ${JSON.stringify(outlineScales)}

export const brandNodes: Record<string, Omit<BrandIconData, "name">> = ${JSON.stringify(brandNodes)}
`)
)
writeGeneratedDirectory(path.join(root, "brands"), brandFiles)

const fileSvgs = new Map<string, string>()
for (const icon of filePack.icons) {
  const svg = renderFileSvg(icon, filePack.palette)
  fileSvgs.set(`${icon.name}.svg`, svg)
  fileSvgs.set(
    `light/${icon.name}.svg`,
    renderFileSvg(icon, filePack.palette, "light")
  )
  fileSvgs.set(
    `dark/${icon.name}.svg`,
    renderFileSvg(icon, filePack.palette, "dark")
  )
  generated.set(
    `files/${icon.name}.ts`,
    withGeneratedHeader(`export default ${JSON.stringify(svg)}\n`)
  )
}
generated.set(
  "files.ts",
  withGeneratedHeader(
    filePack.icons
      .map(
        (icon) =>
          `export { default as ${toPascalCase(icon.name)} } from "./files/${icon.name}.js"`
      )
      .join("\n")
  )
)
writeGeneratedDirectory(path.join(root, "files"), fileSvgs)
writeGeneratedFile(
  path.join(root, "files-sprite.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg">${filePack.icons
    .map((icon) =>
      renderFileSvg(icon, filePack.palette)
        .replace(
          /^<svg[^>]*>/,
          `<symbol id="${icon.name}" viewBox="${getArtworkViewBox(16, 16, icon.opticalScale)}" fill="none">`
        )
        .replace(/<\/svg>$/, "</symbol>")
    )
    .join("")}</svg>\n`
)

writeGeneratedDirectory(path.join(root, "src/generated"), generated)
writeGeneratedDirectory(path.join(root, "icons"), svgs)
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
writeGeneratedFile(path.join(root, "sprite.svg"), sprite(icons))
writeGeneratedFile(
  path.join(root, "icon-nodes.json"),
  json(Object.fromEntries(icons.map((icon) => [icon.name, icon.node])))
)
writeGeneratedFile(path.join(root, "brands-sprite.svg"), brandSprite(brands))
writeGeneratedFile(path.join(root, "icon-scales.json"), json(outlineScales))
writeGeneratedFile(path.join(root, "brand-nodes.json"), json(brandNodes))
writeGeneratedFile(
  path.join(root, "tags.json"),
  json(Object.fromEntries(icons.map((icon) => [icon.name, icon.tags])))
)

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
writeGeneratedFile(path.join(packageRoot, "LICENSE.md"), licenseText())
writeGeneratedFile(path.join(packageRoot, "BRANDS.md"), brandsText())
