import { UI_STROKE_WIDTH } from "@fabricator-ui/icons-static/svg"
import {
  createParser,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server"

const ICON_SETS = [
  "outline",
  "fill",
  "duotone",
  "animated",
  "brands",
  "files",
] as const

export const ICON_TABS = ["all", ...ICON_SETS] as const
export const ICON_TAB_LABELS: Record<(typeof ICON_TABS)[number], string> = {
  all: "All",
  outline: "Outline",
  fill: "Fill",
  duotone: "Duotone",
  animated: "Animated",
  brands: "Brands",
  files: "Files",
}

export const PREVIEW_SIZES = [14, 16, 18, 20, 24, 32, 48] as const
export const DEFAULT_STROKE_WIDTH = UI_STROKE_WIDTH
export const PREVIEW_STROKE = { min: 0.5, max: 3, step: 0.05 }
const BRAND_COLORS = ["mono", "brand"] as const

const parseAsStroke = createParser({
  parse(value) {
    const stroke = Number(value)
    return stroke >= PREVIEW_STROKE.min && stroke <= PREVIEW_STROKE.max
      ? stroke
      : null
  },
  serialize: String,
})

export const iconQueryParsers = {
  q: parseAsString.withDefault(""),
  set: parseAsStringLiteral(ICON_TABS).withDefault("all"),
  category: parseAsString,
  icon: parseAsString,
  iconSet: parseAsStringLiteral(ICON_SETS),
  page: parseAsInteger.withDefault(1),
  size: parseAsNumberLiteral(PREVIEW_SIZES).withDefault(24),
  stroke: parseAsStroke.withDefault(DEFAULT_STROKE_WIDTH),
  color: parseAsStringLiteral(BRAND_COLORS).withDefault("mono"),
}

export type IconQuery = inferParserType<typeof iconQueryParsers>

/** Links with just an icon name predate the All tab and refer to Outline. */
export function getPreviewSet({
  set,
  iconSet,
}: Pick<IconQuery, "set" | "iconSet">) {
  return set === "all" ? (iconSet ?? "outline") : set
}
