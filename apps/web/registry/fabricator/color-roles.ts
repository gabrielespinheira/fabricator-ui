// Colour roles: primary, secondary, info, success, warning and destructive.
// Each role is one base colour held by two variables, like the surface tint:
//
// - --<role>-hue     the colour's OKLCH hue, in degrees
// - --<role>-chroma  its strength: 0 is neutral, up to roleMaxChroma(hue)
//
// Primary and secondary take any hue. The statuses keep to their family
// (ROLE_HUE_RANGES): info blue, success green, warning orange to yellow,
// destructive red to orange. The CSS clamps the hue, so a hand-written value
// can't turn a warning purple.
//
// One recipe turns them into the same tokens for every role, in light and
// dark:
//
// - --<role>              the fill: a solid colour (secondary: a soft tint)
// - --<role>-foreground   text on the fill (≥ 4.5:1)
// - --<role>-text         coloured text on any surface (≥ 4.5:1)
// - --<role>-border       a tinted hairline
// - --<role>-surface-1…8  the tinted ladder, level for level with the neutral
//                         one: light lifts towards white, dark a step lighter
//
// At strength 0 a role is neutral: the fill is the foreground colour (near
// black, near white in dark) and the text is the foreground. As the chroma
// grows, the fill moves to a mid-tone (light) or a light tint (dark) and
// takes the colour; past RAMP_CHROMA only the chroma grows. Hover and press
// are the fill at 90% and 80% (`hover:bg-primary/90`), so they also work with
// any other palette.
//
// Plain oklch() with calc(), min() and var(), like the surfaces. The fill and
// text stay inside sRGB up to roleMaxChroma(hue), which the Colors page uses
// as 100% strength; __tests__/color-roles.test.ts checks gamut and contrast
// around the wheel.

import {
  oklchToHex,
  oklchToLinearRgb,
} from "@/registry/fabricator/surface-tint"

export const COLOR_ROLES = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "destructive",
] as const
export type ColorRole = (typeof COLOR_ROLES)[number]

export type RoleColor = { hue: number; chroma: number }

type Mode = "light" | "dark"

export const ROLE_DEFAULTS: Record<ColorRole, RoleColor> = {
  primary: { hue: 0, chroma: 0 },
  secondary: { hue: 0, chroma: 0 },
  info: { hue: 260, chroma: 0.18 },
  success: { hue: 150, chroma: 0.13 },
  warning: { hue: 70, chroma: 0.1 },
  destructive: { hue: 25, chroma: 0.19 },
}

/** The hues each role may take, in OKLCH degrees. */
export const ROLE_HUE_RANGES: Record<ColorRole, readonly [number, number]> = {
  primary: [0, 360],
  secondary: [0, 360],
  info: [215, 275],
  success: [125, 175],
  warning: [45, 100],
  destructive: [10, 50],
}

const isFullWheel = (role: ColorRole) => {
  const [from, to] = ROLE_HUE_RANGES[role]
  return from === 0 && to === 360
}

/** A hue moved into the role's range: wrapped for the wheel, else clamped. */
function roleHue(role: ColorRole, hue: number) {
  const [from, to] = ROLE_HUE_RANGES[role]
  const wrapped = ((hue % 360) + 360) % 360
  return isFullWheel(role) ? wrapped : Math.min(to, Math.max(from, wrapped))
}

function hueCss(role: ColorRole) {
  const [from, to] = ROLE_HUE_RANGES[role]
  const hue = `var(--${role}-hue)`
  return isFullWheel(role) ? hue : `clamp(${from}, ${hue}, ${to})`
}

/** The chroma at which a role reaches its full lightness. */
const RAMP_CHROMA = 0.06

/** How one token derives from a role's hue and chroma. */
type Slot = {
  /** Lightness at strength 0, and once the chroma reaches RAMP_CHROMA. */
  l: readonly [number, number]
  /** Share of the role's chroma, and the most chroma the slot takes. */
  share: number
  cap?: number
  /** Opacity at strength 0 and at full colour, for translucent slots. */
  alpha?: readonly [number, number]
}

const FILL: Record<Mode, Slot> = {
  light: { l: [0.205, 0.48], share: 1 },
  dark: { l: [0.97, 0.74], share: 1, cap: 0.13 },
}

const FOREGROUND: Record<Mode, Slot> = {
  light: { l: [0.985, 0.985], share: 0 },
  dark: { l: [0.205, 0.205], share: 0 },
}

const TEXT: Record<Mode, Slot> = {
  light: { l: [0.205, 0.45], share: 0.85 },
  dark: { l: [0.97, 0.85], share: 1, cap: 0.07 },
}

const BORDER: Record<Mode, Slot> = {
  light: { ...FILL.light, alpha: [0.12, 0.3] },
  dark: { ...FILL.dark, alpha: [0.12, 0.32] },
}

// Secondary is the soft role, as in shadcn: its fill is a translucent tint
// (8% black, 25% white when neutral) and its foreground is its text.
const SECONDARY_FILL: Record<Mode, Slot> = {
  light: { l: [0, 0.48], share: 1, alpha: [0.08, 0.12] },
  dark: { l: [1, 0.74], share: 1, cap: 0.13, alpha: [0.25, 0.22] },
}

const SECONDARY_FOREGROUND: Record<Mode, Slot> = {
  light: TEXT.light,
  dark: { l: [0.97, 0.89], share: 1, cap: 0.045 },
}

// The tinted ladders: the lightness of each level, 1 to 8, and a chroma that
// tapers as surfaces rise, so the top of the ladder stays calm.
const LADDER_L: Record<Mode, number[]> = {
  light: [0.97, 0.978, 0.986, 0.99, 0.993, 0.995, 0.997, 0.999],
  dark: [0.215, 0.245, 0.274, 0.303, 0.331, 0.358, 0.385, 0.412],
}
const LADDER_TAPER = [1, 0.85, 0.72, 0.62, 0.54, 0.48, 0.43, 0.39]
const LADDER_CHROMA: Record<Mode, { share: number; cap: number }> = {
  light: { share: 0.35, cap: 0.035 },
  dark: { share: 0.4, cap: 0.04 },
}

const SURFACE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

function ladderSlot(mode: Mode, level: number): Slot {
  const l = LADDER_L[mode][level - 1]
  const taper = LADDER_TAPER[level - 1]
  const { share, cap } = LADDER_CHROMA[mode]
  return {
    l: [l, l],
    share: round(share * taper, 4),
    cap: round(cap * taper, 4),
  }
}

/** Every token of a role, as the slot that makes it. */
function roleSlots(role: ColorRole, mode: Mode): Record<string, Slot> {
  const soft = role === "secondary"
  return {
    [role]: soft ? SECONDARY_FILL[mode] : FILL[mode],
    [`${role}-foreground`]: soft
      ? SECONDARY_FOREGROUND[mode]
      : FOREGROUND[mode],
    [`${role}-text`]: TEXT[mode],
    [`${role}-border`]: BORDER[mode],
    ...Object.fromEntries(
      SURFACE_LEVELS.map((level) => [
        `${role}-surface-${level}`,
        ladderSlot(mode, level),
      ])
    ),
  }
}

// A slot whose lightness moves with the strength also fades its chroma in
// over the same ramp: it starts at the neutral (near black or near white),
// where there is little room for colour.
const ramps = (slot: Slot) => slot.l[0] !== slot.l[1]

// --- CSS ---------------------------------------------------------------------

function lerpCss([from, to]: readonly [number, number], ramp: string) {
  if (from === to) return String(from)
  const sign = to > from ? "+" : "-"
  return `calc(${from} ${sign} ${round(Math.abs(to - from), 4)} * ${ramp})`
}

/** A slot as CSS that reads --<role>-hue and --<role>-chroma. */
function slotCss(role: ColorRole, slot: Slot) {
  const chroma = `var(--${role}-chroma)`
  const ramp = `min(1, ${chroma} / ${RAMP_CHROMA})`
  const lightness = lerpCss(slot.l, ramp)
  if (slot.share === 0) return `oklch(${lightness} 0 0)`
  let c = chroma
  let isProduct = false
  if (slot.share !== 1) {
    c = `${c} * ${slot.share}`
    isProduct = true
  }
  if (slot.cap !== undefined) {
    c = `min(${c}, ${slot.cap})`
    isProduct = false
  }
  if (ramps(slot)) {
    c = `${c} * ${ramp}`
    isProduct = true
  }
  const alpha = slot.alpha ? ` / ${lerpCss(slot.alpha, ramp)}` : ""
  return `oklch(${lightness} ${isProduct ? `calc(${c})` : c} ${hueCss(role)}${alpha})`
}

/** A role's tokens as CSS that follows its two variables. */
export function roleCss(role: ColorRole, mode: Mode) {
  return Object.fromEntries(
    Object.entries(roleSlots(role, mode)).map(([name, slot]) => [
      name,
      slotCss(role, slot),
    ])
  )
}

// --- Literal colours ---------------------------------------------------------

type Oklch = { l: number; c: number; h: number; alpha?: number }

function slotValue(slot: Slot, color: RoleColor): Oklch {
  const ramp = Math.min(1, color.chroma / RAMP_CHROMA)
  const lerp = ([from, to]: readonly [number, number]) =>
    from + (to - from) * ramp
  const c =
    Math.min(color.chroma * slot.share, slot.cap ?? Infinity) *
    (ramps(slot) ? ramp : 1)
  return {
    l: round(lerp(slot.l), 4),
    c: round(c, 4),
    h: c === 0 ? 0 : round(color.hue, 1),
    ...(slot.alpha ? { alpha: round(lerp(slot.alpha), 3) } : {}),
  }
}

function formatOklch({ l, c, h, alpha }: Oklch) {
  const base = c === 0 ? `${l} 0 0` : `${l} ${c} ${h}`
  return alpha === undefined ? `oklch(${base})` : `oklch(${base} / ${alpha})`
}

/** A role's tokens as literal colours for one setting. */
export function roleLiterals(role: ColorRole, mode: Mode, color: RoleColor) {
  const inRange = { ...color, hue: roleHue(role, color.hue) }
  return Object.fromEntries(
    Object.entries(roleSlots(role, mode)).map(([name, slot]) => [
      name,
      formatOklch(slotValue(slot, inRange)),
    ])
  )
}

// --- Strength -----------------------------------------------------------------
// The most chroma a hue can take with every fill, text and border inside sRGB,
// in both modes. The Colors page shows strength as a share of it. The tinted
// ladders are not limited by it: they take at most a fixed chroma.

const GAMUT_SLOTS = [
  FILL,
  TEXT,
  BORDER,
  SECONDARY_FILL,
  SECONDARY_FOREGROUND,
].flatMap((slots) => [slots.light, slots.dark])

const CHROMA_STEP = 0.0025
const CHROMA_LIMIT = 0.4

function inSrgb({ l, c, h }: Oklch) {
  return oklchToLinearRgb(l, c, h).every((v) => v >= -0.0005 && v <= 1.0005)
}

export function roleMaxChroma(hue: number) {
  let chroma = 0
  while (chroma + CHROMA_STEP <= CHROMA_LIMIT) {
    const next = round(chroma + CHROMA_STEP, 4)
    const fits = GAMUT_SLOTS.every((slot) =>
      inSrgb(slotValue(slot, { hue, chroma: next }))
    )
    if (!fits) break
    chroma = next
  }
  return chroma
}

/** Strength as a share of the hue's maximum, 0 to 1. */
export function roleStrength(color: RoleColor) {
  const max = roleMaxChroma(color.hue)
  return max === 0 ? 0 : Math.min(1, color.chroma / max)
}

/**
 * Parses a stored colour for a role: the hue moved into the role's range, the
 * chroma capped at that hue's maximum. Anything invalid is the role's default.
 */
export function normalizeRoleColor(role: ColorRole, value: unknown): RoleColor {
  const fallback = ROLE_DEFAULTS[role]
  if (!value || typeof value !== "object") return fallback
  const hue = "hue" in value ? value.hue : undefined
  const chroma = "chroma" in value ? value.chroma : undefined
  if (typeof hue !== "number" || typeof chroma !== "number") return fallback
  if (!Number.isFinite(hue) || !Number.isFinite(chroma)) return fallback
  const normalizedHue = round(roleHue(role, hue), 1)
  return {
    hue: normalizedHue,
    chroma: round(
      Math.min(roleMaxChroma(normalizedHue), Math.max(0, chroma)),
      4
    ),
  }
}

export function sameRoleColor(a: RoleColor, b: RoleColor) {
  return (
    (a.chroma === 0 && b.chroma === 0) ||
    (a.hue === b.hue && a.chroma === b.chroma)
  )
}

/** The role's light fill as hex, for swatches and colour inputs. */
export function roleToHex(color: RoleColor) {
  const { l, c, h } = slotValue(FILL.light, color)
  return oklchToHex(l, c, h)
}

// --- Tokens for the registry ---------------------------------------------------
// shadcn already owns five of these names. The foundations never define them
// (installing them must not overwrite a project's palette, AGENTS.md contract
// item 4): the `fabricator` preset writes them as literal colours at the
// defaults, and a project that sets its roles points them at the recipe
// (ROLE_PALETTE_LINKS), as the website and the Colors page do.

export const SHADCN_ROLE_TOKENS = [
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "destructive",
] as const

const isShadcnToken = (name: string) =>
  (SHADCN_ROLE_TOKENS as readonly string[]).includes(name)

function foundationTokens(mode: Mode) {
  return Object.fromEntries(
    COLOR_ROLES.flatMap((role) =>
      Object.entries(roleCss(role, mode)).filter(
        ([name]) => !isShadcnToken(name)
      )
    )
  )
}

/** The variables that set each role, at their defaults. */
export function roleVariables(
  colors: Record<ColorRole, RoleColor> = ROLE_DEFAULTS
) {
  return Object.fromEntries(
    COLOR_ROLES.flatMap((role) => [
      [`${role}-hue`, String(colors[role].hue)],
      [`${role}-chroma`, String(colors[role].chroma)],
    ])
  )
}

/** cssVars for the foundations item: Tailwind colours plus light/dark values. */
export const ROLE_CSS_VARS = {
  theme: Object.fromEntries(
    Object.keys(foundationTokens("light")).map((name) => [
      `color-${name}`,
      `var(--${name})`,
    ])
  ),
  light: { ...roleVariables(), ...foundationTokens("light") },
  dark: foundationTokens("dark"),
}

// The shadcn names, plus the sidebar's copies of primary.
type PaletteToken =
  | (typeof SHADCN_ROLE_TOKENS)[number]
  | "sidebar-primary"
  | "sidebar-primary-foreground"

function paletteEntries(
  tokens: Record<string, string>
): Record<PaletteToken, string> {
  return {
    primary: tokens.primary,
    "primary-foreground": tokens["primary-foreground"],
    secondary: tokens.secondary,
    "secondary-foreground": tokens["secondary-foreground"],
    destructive: tokens.destructive,
    "sidebar-primary": tokens.primary,
    "sidebar-primary-foreground": tokens["primary-foreground"],
  }
}

function allRoleCss(mode: Mode) {
  return Object.assign({}, ...COLOR_ROLES.map((role) => roleCss(role, mode)))
}

function allRoleLiterals(mode: Mode, colors: Record<ColorRole, RoleColor>) {
  return Object.assign(
    {},
    ...COLOR_ROLES.map((role) => roleLiterals(role, mode, colors[role]))
  )
}

/** The shadcn role tokens pointed at the recipe, so they follow the roles. */
export const ROLE_PALETTE_LINKS = {
  light: paletteEntries(allRoleCss("light")),
  dark: paletteEntries(allRoleCss("dark")),
}

/** The shadcn role tokens as literal colours, for the `fabricator` preset. */
export function rolePalette(
  mode: Mode,
  colors: Record<ColorRole, RoleColor> = ROLE_DEFAULTS
) {
  return paletteEntries(allRoleLiterals(mode, colors))
}

function round(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
