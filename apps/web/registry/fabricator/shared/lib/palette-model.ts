// The colours a person gives a thing they own: an event, a property option, a
// board column. Each is a hue and a chroma drawn through the colour role recipe
// (color-roles.ts), so a palette colour keeps its contrast in both themes
// without a token of its own.

const PALETTE_ROLES = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "destructive",
] as const

type PaletteRole = (typeof PALETTE_ROLES)[number]

/** A hue and chroma drawn through the colour role recipe. */
type PaletteHue = { hue: number; chroma: number }

// A palette in the spirit of Google Calendar's, each colour inside the role
// recipe's sRGB gamut (the event calendar's model test checks it).
const PALETTE_COLORS = {
  red: { hue: 27, chroma: 0.17 },
  orange: { hue: 50, chroma: 0.125 },
  yellow: { hue: 85, chroma: 0.095 },
  green: { hue: 150, chroma: 0.12 },
  teal: { hue: 185, chroma: 0.08 },
  cyan: { hue: 225, chroma: 0.09 },
  blue: { hue: 260, chroma: 0.16 },
  indigo: { hue: 280, chroma: 0.14 },
  purple: { hue: 310, chroma: 0.14 },
  pink: { hue: 350, chroma: 0.14 },
  gray: { hue: 0, chroma: 0 },
} as const satisfies Record<string, PaletteHue>

type PaletteColorName = keyof typeof PALETTE_COLORS
type PaletteColor = PaletteColorName | PaletteRole | PaletteHue
type PaletteScheme = "light" | "dark"

// The role recipe's fill, text and foreground slots, for a colour that isn't a
// role. Past RAMP_CHROMA the lightness is fixed; below it a slot moves from the
// neutral towards the colour.
const RAMP_CHROMA = 0.06

type Slot = { l: readonly [number, number]; share: number; cap?: number }

const PALETTE_SLOTS = {
  fill: {
    light: { l: [0.205, 0.48], share: 1 },
    dark: { l: [0.97, 0.74], share: 1, cap: 0.13 },
  },
  text: {
    light: { l: [0.205, 0.45], share: 0.85 },
    dark: { l: [0.97, 0.85], share: 1, cap: 0.07 },
  },
  foreground: {
    light: { l: [0.985, 0.985], share: 0 },
    dark: { l: [0.205, 0.205], share: 0 },
  },
  // A dot or a glyph carries no text, so it needs 3:1 rather than the fill's
  // 4.5:1 and can be the colour people picked instead of a darker one.
  mark: {
    light: { l: [0.6, 0.6], share: 1.15 },
    dark: { l: [0.74, 0.74], share: 1, cap: 0.13 },
  },
} as const satisfies Record<string, Record<PaletteScheme, Slot>>

type PaletteSlot = keyof typeof PALETTE_SLOTS

const round = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getPaletteLiteral(
  slot: PaletteSlot,
  scheme: PaletteScheme,
  { hue, chroma }: PaletteHue
) {
  const { l: range, share, cap }: Slot = PALETTE_SLOTS[slot][scheme]
  const ramp = Math.min(1, chroma / RAMP_CHROMA)
  const ramps = range[0] !== range[1]
  const l = round(range[0] + (range[1] - range[0]) * ramp, 4)
  const c = round(
    Math.min(chroma * share, cap ?? Infinity) * (ramps ? ramp : 1),
    4
  )
  return c === 0 ? `oklch(${l} 0 0)` : `oklch(${l} ${c} ${round(hue, 1)})`
}

function isPaletteRole(color: unknown): color is PaletteRole {
  return PALETTE_ROLES.some((role) => role === color)
}

function isPaletteColorName(color: unknown): color is PaletteColorName {
  return typeof color === "string" && Object.hasOwn(PALETTE_COLORS, color)
}

/**
 * A palette colour's mark (a dot, a glyph) for each scheme: a role's token, a palette
 * name's literal, or the CSS colour as given. Gray is the muted text colour,
 * because the recipe's neutral is as strong as a heading.
 */
function getPaletteMark(color: string): Record<PaletteScheme, string> {
  if (color === "gray")
    return {
      light: "var(--muted-foreground)",
      dark: "var(--muted-foreground)",
    }
  if (isPaletteRole(color))
    return { light: `var(--${color})`, dark: `var(--${color})` }
  if (!isPaletteColorName(color)) return { light: color, dark: color }
  const hue = PALETTE_COLORS[color]
  return {
    light: getPaletteLiteral("mark", "light", hue),
    dark: getPaletteLiteral("mark", "dark", hue),
  }
}

/** The two variables a coloured part sets; the style map picks the scheme's. */
function getPaletteVariables(
  color: string
): Record<`--palette-${string}`, string> {
  const mark = getPaletteMark(color)
  return {
    "--palette-light": mark.light,
    "--palette-dark": mark.dark,
  }
}

export {
  getPaletteMark,
  getPaletteLiteral,
  getPaletteVariables,
  isPaletteColorName,
  isPaletteRole,
  PALETTE_COLORS,
  PALETTE_ROLES,
  type PaletteColor,
  type PaletteColorName,
  type PaletteHue,
  type PaletteRole,
  type PaletteScheme,
}
