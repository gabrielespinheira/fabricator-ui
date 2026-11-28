import type { IconData, IconElement } from "@fabricator-ui/icons"
import { renderUiSvg } from "@fabricator-ui/icons-static/svg"
import {
  getBrandArtworkViewBox,
  prefixGradientFills,
  renderGradientMarkup,
  type BrandIconData,
} from "@fabricator-ui/icons/brands"
import type {
  CatalogEntry,
  IconCategory,
  IconSet,
} from "@fabricator-ui/icons/catalog"
import {
  renderFileSvg,
  type FileIconData,
  type FilePalette,
} from "@fabricator-ui/icons/files"

import { DEFAULT_STROKE_WIDTH } from "./icon-query"

export const DEFAULT_SIZE = 24

export function hasStrokeWidth(set: IconSet) {
  return (
    set === "outline" ||
    set === "fill" ||
    set === "duotone" ||
    set === "animated"
  )
}

/** `arrow-up-0-1` → `ArrowUp01Icon`, as the packages export it. */
export function toComponentName(name: string) {
  const pascal = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
  return `${pascal}Icon`
}

const IMPORT_PATHS: Record<IconSet, string> = {
  outline: "@fabricator-ui/icons",
  brands: "@fabricator-ui/icons/brands",
  animated: "@fabricator-ui/icons/animated",
  fill: "@fabricator-ui/icons/fill",
  duotone: "@fabricator-ui/icons/duotone",
  files: "@fabricator-ui/icons/files",
}

/** One line on where an icon comes from, for its detail panel. */
export function getIconDescription(entry: CatalogEntry) {
  if (entry.set === "files")
    return "Charmed Icons file and folder artwork, by Littensy (MIT)."
  if (entry.set === "brands") return `${entry.title}, a trademark of its owner.`
  if (entry.set === "animated")
    return `Fabricator’s ${entry.name} icon, animated.`
  return `Fabricator’s ${entry.name} icon in ${entry.set}.`
}

export function getImportLine(entry: CatalogEntry) {
  return `import { ${toComponentName(entry.name)} } from "${IMPORT_PATHS[entry.set]}"`
}

/** What a set needs installed: only the animated icons use Motion. */
export function getPackages(set: IconSet) {
  return set === "animated"
    ? ["@fabricator-ui/icons", "motion"]
    : ["@fabricator-ui/icons"]
}

export type SnippetOptions = {
  size: number
  strokeWidth: number
  brandColor: boolean
}

/** The JSX for an icon, with only the props that differ from the defaults. */
export function getJsxSnippet(
  entry: CatalogEntry,
  { size, strokeWidth, brandColor }: SnippetOptions
) {
  const props = [
    size !== (entry.set === "files" ? 16 : DEFAULT_SIZE) && `size={${size}}`,
    hasStrokeWidth(entry.set) &&
      strokeWidth !== DEFAULT_STROKE_WIDTH &&
      `strokeWidth={${strokeWidth}}`,
    entry.set === "brands" && brandColor && 'color="brand"',
  ].filter(Boolean)
  return `<${[toComponentName(entry.name), ...props].join(" ")} />`
}

export type PreviewIcon =
  | { set: "outline"; node: IconElement[]; opticalScale?: number }
  | { set: "fill"; data: IconData }
  | { set: "duotone"; data: IconData }
  | { set: "brands"; name: string; data: Omit<BrandIconData, "name"> }
  | { set: "files"; data: FileIconData; palette: FilePalette }

export type SvgOptions = SnippetOptions & {
  /** The paint for strokes and one-colour marks; currentColor when copying. */
  color: string
  scheme?: "light" | "dark"
}

function attributes(values: Record<string, string>) {
  return Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
}

function shapes(node: IconElement[], replaceCurrentColor?: string) {
  return node
    .map(([tag, values]) => {
      const paint =
        replaceCurrentColor && values.fill === "currentColor"
          ? { ...values, fill: replaceCurrentColor }
          : values
      return `<${tag} ${attributes(paint)}/>`
    })
    .join("")
}

/** A standalone SVG of the icon as previewed, for copying and downloads. */
export function buildSvgMarkup(
  icon: PreviewIcon,
  { size, strokeWidth, color, brandColor, scheme = "light" }: SvgOptions
) {
  if (icon.set === "files")
    return renderFileSvg(icon.data, icon.palette, scheme, size)
  const box = {
    xmlns: "http://www.w3.org/2000/svg",
    width: String(size),
    height: String(size),
  }
  if (icon.set === "outline")
    return renderUiSvg(
      { name: "outline", node: icon.node, opticalScale: icon.opticalScale },
      { size, strokeWidth, color }
    )
  if (icon.set === "fill" || icon.set === "duotone")
    return renderUiSvg(icon.data, { size, strokeWidth, color })
  const { data } = icon
  const art = brandColor ? data.art : undefined
  const viewBox = getBrandArtworkViewBox(data, art)
  const brandFill = data.colors.inherit ? color : data.colors.light
  const fill = brandColor && !art ? brandFill : color
  // Ids carry the brand's name, so pasted marks never share a gradient.
  const prefix = `fab-${icon.name}-`
  const defs = renderGradientMarkup(art?.gradients, prefix)
  const node = prefixGradientFills(art?.node ?? data.node, defs ? prefix : "")
  return `<svg ${attributes({ ...box, viewBox, fill })}>${defs}${shapes(node)}</svg>`
}

export type CategoryOption = { value: string; label: string; count: number }

/** Categories for a set or the whole catalog, with a count for each. */
export function getCategoryOptions(
  entries: CatalogEntry[],
  titles: IconCategory[],
  set?: IconSet
): CategoryOption[] {
  const labels = new Map(
    set === "brands" || set === "files"
      ? []
      : titles.map(({ name, title }) => [name, title])
  )
  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (set && entry.set !== set) continue
    const keys = entry.set === "brands" ? [entry.group] : entry.categories
    for (const key of keys) {
      if (!labels.has(key)) {
        if (entry.set === "brands") labels.set(key, key)
        if (entry.set === "files")
          labels.set(key, key === "folders" ? "Folders" : "Files")
      }
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...labels].flatMap(([value, label]) => {
    const count = counts.get(value)
    return count ? [{ value, label, count }] : []
  })
}

export function filterByCategory<Entry extends CatalogEntry>(
  entries: Entry[],
  category: string | null
) {
  if (!category) return entries
  return entries.filter((entry) =>
    entry.set === "brands"
      ? entry.group === category
      : entry.categories.includes(category)
  )
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export function getInstallCommand(
  packageManager: PackageManager,
  packages: string[]
) {
  const command =
    packageManager === "npm" ? "npm install" : `${packageManager} add`
  return `${command} ${packages.join(" ")}`
}

/** The static shape data uses SVG attribute names; React wants camelCase (`fillRule`). */
export function toReactAttributes(node: IconElement[]): IconElement[] {
  return node.map(([tag, values]) => [
    tag,
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
      ])
    ),
  ])
}
