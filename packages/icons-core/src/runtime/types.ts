// Runtime data shapes shared by every icon package. Files in runtime/ are
// copied into each package at build time, so they import nothing else.

export type IconTag =
  | "path"
  | "circle"
  | "rect"
  | "line"
  | "polyline"
  | "polygon"
  | "ellipse"

export type IconElement = [tag: IconTag, attributes: Record<string, string>]

/** Outline and duotone icons: stroke paint. */
export type IconData = {
  name: string
  node: IconElement[]
  /** Duotone only: filled, translucent shapes drawn under the outline. */
  secondary?: IconElement[]
}

export type BrandColors = {
  /** Achromatic marks follow `currentColor` instead of a hex. */
  inherit: boolean
  light: string
  dark: string
}

export type BrandArt = {
  width: number
  height: number
  node: IconElement[]
}

/** Brand marks: fill paint. */
export type BrandIconData = {
  name: string
  /** Single-colour geometry on a 24 × 24 box. */
  node: IconElement[]
  /** The brand's own colours, for marks unrecognisable in one colour. */
  art?: BrandArt
  colors: BrandColors
  /** Optical correction below 1: widens the viewBox so the mark shrinks. */
  scale?: number
}

export type OutlineCatalogEntry = {
  name: string
  set: "outline"
  aliases: string[]
  categories: string[]
  tags: string[]
}

export type BrandCatalogEntry = {
  name: string
  set: "brands"
  title: string
  group: string
  aliases: string[]
  tags: string[]
  hex: string
  source: string
  license: string
  guidelines?: string
  /** Where the multi-colour art comes from, when the mark has art. */
  artSource?: string
}

/** An outline category, with Lucide's title for it. */
export type IconCategory = {
  name: string
  title: string
}

export type CatalogEntry = OutlineCatalogEntry | BrandCatalogEntry

export type IconSet = CatalogEntry["set"]
