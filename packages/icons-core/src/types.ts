import type { BrandArt, BrandColors, IconElement } from "./runtime/types"

export type {
  BrandArt,
  BrandColors,
  BrandGradient,
  BrandIconData,
  GradientStop,
  IconData,
  IconElement,
  IconTag,
} from "./runtime/types"

export const ICON_TAGS = [
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
] as const

export type IconAlias = {
  name: string
  deprecated?: boolean
  deprecationReason?: string
  toBeRemovedInVersion?: string
}

export type IconOrigin = "lucide" | "fabricator"

export type OutlineIcon = {
  name: string
  origin: IconOrigin
  node: IconElement[]
  aliases: IconAlias[]
  categories: string[]
  tags: string[]
}

export type DuotoneIcon = {
  name: string
  node: IconElement[]
  secondary: IconElement[]
}

export const BRAND_GROUPS = [
  "Social",
  "Marketing & commerce",
  "Product & dev",
] as const

export type BrandGroup = (typeof BRAND_GROUPS)[number]

export type BrandIcon = {
  name: string
  title: string
  group: BrandGroup
  tags: string[]
  aliases: string[]
  hex: string
  colors: BrandColors
  node: IconElement[]
  art?: BrandArt
  scale?: number
  source: string
  license: string
  guidelines?: string
  /** Where the multi-colour art comes from, when it differs from `source`. */
  artSource?: string
  /** The credit the mark's licence asks for. */
  credit?: string
}
