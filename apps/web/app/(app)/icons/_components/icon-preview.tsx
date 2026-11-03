import { Icon, type IconData } from "@fabricator-ui/icons"
import { BrandIcon, type BrandIconData } from "@fabricator-ui/icons/brands"
import type {
  BrandCatalogEntry,
  OutlineCatalogEntry,
} from "@fabricator-ui/icons/catalog"

import type { PreviewIcon } from "../lib/icons"

/** An icon with its catalog entry, its React data and its SVG source data. */
export type LoadedIcon =
  | {
      set: "outline"
      entry: OutlineCatalogEntry
      data: IconData
      source: PreviewIcon
    }
  | {
      set: "brands"
      entry: BrandCatalogEntry
      data: BrandIconData
      source: PreviewIcon
    }

export type PreviewOptions = {
  size: number
  strokeWidth: number
  brandColor: boolean
}

/** Renders an icon with the real package components. */
export function IconPreview({
  icon,
  size,
  strokeWidth,
  brandColor,
  className,
}: { icon: LoadedIcon; className?: string } & PreviewOptions) {
  if (icon.set === "outline") {
    return (
      <Icon
        data={icon.data}
        size={size}
        strokeWidth={strokeWidth}
        className={className}
      />
    )
  }
  return (
    <BrandIcon
      data={icon.data}
      size={size}
      color={brandColor ? "brand" : undefined}
      className={className}
    />
  )
}
