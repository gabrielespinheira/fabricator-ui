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

/** UI icons share the same geometry format across renderers. */
export type IconData = {
  name: string
  node: IconElement[]
  paint?: "fill"
  /** Uniform optical correction around the source drawing's centre. */
  opticalScale?: number
  strokeWidth?: number
  /** Fill only: line work that punches transparent detail out of a solid face. */
  cutout?: IconElement[]
  /** Duotone only: filled, translucent shapes drawn under the outline. */
  secondary?: IconElement[]
}

export type IconWeight = "outline" | "fill" | "duotone"
export type IconDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right"

export type IconMotion =
  | IconDirection
  | "exchange-horizontal"
  | "exchange-vertical"
  | "expand"
  | "contract"
  | "receive"
  | "dispatch"
  | "exit-diagonal"
  | "send"
  | "rotate-back"
  | "rotate-forward"
  | "blink"
  | "envelope"
  | "shutter"
  | "clock"
  | "heartbeat"
  | "radiate"
  | "sound"
  | "shackle"
  | "check"
  | "drag"
  | "rows"
  | "bars"
  | "stack"
  | "bookmark"
  | "pencil"
  | "bell"
  | "toggle"
  | "sidebar-toggle"
  | "panel-left"
  | "panel-right"
  | "turn"
  | "open"
  | "pulse"
  | "mark"
  | "lift"
  | "settle"
  | "press"
  | "scan"
  | "swing"
  | "sweep"
  | "widen"
  | "rise"
  | "spark"
  | "hop"
  | "nod"
  | "lean"

export type BrandColors = {
  /** Achromatic marks follow `currentColor` instead of a hex. */
  inherit: boolean
  light: string
  dark: string
}

export type GradientStop = {
  offset: string
  color: string
  opacity?: string
}

/** A gradient that art fills reference as `url(#<id>)`; renderers make the id unique per instance. */
export type BrandGradient = {
  type: "linearGradient" | "radialGradient"
  id: string
  attributes: Record<string, string>
  stops: GradientStop[]
}

export type BrandArt = {
  width: number
  height: number
  opticalScale?: number
  node: IconElement[]
  /** For logos whose colours are gradients (Firefox, Telegram). */
  gradients?: BrandGradient[]
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
  opticalScale?: number
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
  /** The credit the mark's licence asks for. */
  credit?: string
}

/** A label for filtering the Fabricator catalog. */
export type IconCategory = {
  name: string
  title: string
}

/** An icon in the Fabricator Animated set. */
export type AnimatedCatalogEntry = Omit<OutlineCatalogEntry, "set"> & {
  set: "animated"
  motion?: IconMotion
  /** Compatibility flag for archived animations with older geometry. */
  isOlderDrawing?: boolean
}

export type VariantCatalogEntry = Omit<OutlineCatalogEntry, "set"> & {
  set: "fill" | "duotone"
}

export type CatalogEntry =
  | OutlineCatalogEntry
  | VariantCatalogEntry
  | BrandCatalogEntry
  | AnimatedCatalogEntry
  | FileCatalogEntry

export type FileCatalogEntry = Omit<OutlineCatalogEntry, "set"> & {
  set: "files"
}

export type IconSet = CatalogEntry["set"]
