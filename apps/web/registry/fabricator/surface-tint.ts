// The surface tint: one base colour, carried by two numbers, that every
// surface derives from in CSS.
//
// - --surface-hue     the base colour's OKLCH hue, in degrees
// - --surface-chroma  how strongly surfaces lean towards it, 0 (neutral) to
//                     SURFACE_MAX_CHROMA
//
// Each level takes a share of the chroma. Dark mode keeps every level's
// lightness and carries the tint fully, tapering towards the top. Light mode
// tints every level, most at the page and least at the top, and lowers each
// level's lightness a little as the tint grows: colour needs room below white
// to exist. Muted text darkens to match, so it stays AA on the page. The
// shares keep every level inside sRGB for any hue at the maximum chroma, and
// __tests__/surface-tint.test.ts checks gamut and contrast across the wheel.
//
// Plain oklch() with calc() and var(), so it works everywhere oklch() does
// (no relative colour syntax). At the defaults (0, 0) every value is the
// neutral ladder.

export type SurfaceTint = { hue: number; chroma: number }

export const NEUTRAL_TINT: SurfaceTint = { hue: 0, chroma: 0 }

export const SURFACE_MAX_CHROMA = 0.04

/**
 * One colour derived from the tint: neutral lightness `l`, the share of
 * --surface-chroma it takes, and how much lightness it loses per unit of
 * chroma (`drop`).
 */
type Step = { l: number; share: number; drop?: number }

// Lightness and chroma per level, 1 to 8. Light: off-white page and sidebar,
// then white from level 3, separated by shadow. Tinted, every level moves
// into a band just below white (0.962 to 0.981 at full strength), still
// lighter level by level, because colour needs room below white; chroma
// tapers from 44% at the page to 21.5% at the top, about half, as in dark.
// Dark: each level lifts the background, and the tint tapers from 90% to 55%
// so the top of the ladder stays calm.
export const SURFACE_STEPS: Record<"light" | "dark", Step[]> = {
  light: [
    { l: 0.985, share: 0.44, drop: 0.575 },
    { l: 0.991, share: 0.395, drop: 0.625 },
    { l: 1, share: 0.36, drop: 0.775 },
    { l: 1, share: 0.325, drop: 0.7 },
    { l: 1, share: 0.29, drop: 0.625 },
    { l: 1, share: 0.265, drop: 0.575 },
    { l: 1, share: 0.24, drop: 0.525 },
    { l: 1, share: 0.215, drop: 0.475 },
  ],
  dark: [
    { l: 0.205, share: 0.9 },
    { l: 0.235, share: 0.85 },
    { l: 0.264, share: 0.8 },
    { l: 0.293, share: 0.75 },
    { l: 0.321, share: 0.7 },
    { l: 0.348, share: 0.65 },
    { l: 0.375, share: 0.6 },
    { l: 0.402, share: 0.55 },
  ],
}

// Other solid neutrals that sit next to the surfaces and follow the tint:
// the opaque selection fill and the muted fill (tab lists, skeletons).
export const TINTED_NEUTRALS: Record<
  "light" | "dark",
  Record<"selected" | "muted", Step>
> = {
  light: {
    selected: { l: 0.87, share: 0.3 },
    muted: { l: 0.967, share: 0.4, drop: 0.5 },
  },
  dark: {
    selected: { l: 0.439, share: 0.6 },
    muted: SURFACE_STEPS.dark[1],
  },
}

// Muted text on light surfaces: a neutral grey that darkens as the page
// does, so it keeps 4.5:1 on a fully tinted page.
export const MUTED_FOREGROUND_STEP: Step = { l: 0.556, share: 0, drop: 0.4 }

/** A step as CSS that reads --surface-hue and --surface-chroma. */
export function tintedCss({ l, share, drop = 0 }: Step) {
  const lightness = drop
    ? `calc(${l} - var(--surface-chroma) * ${drop})`
    : String(l)
  if (share === 0) return `oklch(${lightness} 0 0)`
  return `oklch(${lightness} calc(var(--surface-chroma) * ${share}) var(--surface-hue))`
}

/** A step as a literal colour for one tint (tests, previews, copied CSS). */
export function tintedLiteral({ l, share, drop = 0 }: Step, tint: SurfaceTint) {
  const lightness = round(l - tint.chroma * drop, 4)
  const chroma = round(tint.chroma * share, 4)
  if (chroma === 0) return `oklch(${lightness} 0 0)`
  return `oklch(${lightness} ${chroma} ${round(tint.hue, 1)})`
}

/** The eight surfaces for one tint, as literal colours. */
export function surfaceLadder(mode: "light" | "dark", tint: SurfaceTint) {
  return SURFACE_STEPS[mode].map((step) => tintedLiteral(step, tint))
}

// --- Swatches ---------------------------------------------------------------
// A tint drawn as a mid-tone dot: the hue at three times the tint's chroma,
// so a full-strength tint reads as a clear colour.

const SWATCH_CHROMA = 3

/** A mid-tone swatch that stands for a tint (what a colour input shows). */
export function tintToHex(tint: SurfaceTint) {
  return oklchToHex(0.62, tint.chroma * SWATCH_CHROMA, tint.hue)
}

/** Parses the two vars from storage; anything invalid is neutral. */
export function normalizeTint(value: unknown): SurfaceTint {
  if (!value || typeof value !== "object") return NEUTRAL_TINT
  const { hue, chroma } = value as Partial<SurfaceTint>
  if (typeof hue !== "number" || typeof chroma !== "number") return NEUTRAL_TINT
  if (!Number.isFinite(hue) || !Number.isFinite(chroma)) return NEUTRAL_TINT
  return {
    hue: round(((hue % 360) + 360) % 360, 1),
    chroma: round(Math.min(SURFACE_MAX_CHROMA, Math.max(0, chroma)), 4),
  }
}

export function isNeutralTint(tint: SurfaceTint) {
  return tint.chroma === 0
}

export function sameTint(a: SurfaceTint, b: SurfaceTint) {
  return (
    (isNeutralTint(a) && isNeutralTint(b)) ||
    (a.hue === b.hue && a.chroma === b.chroma)
  )
}

function round(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

// --- Colour maths (OKLab, Björn Ottosson) ----------------------------------

function fromLinear(channel: number) {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055
}

/** OKLCH to linear sRGB, unclamped (out of gamut when a channel leaves 0–1). */
export function oklchToLinearRgb(l: number, c: number, h: number) {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ] as const
}

function oklchToHex(l: number, c: number, h: number) {
  // Reduce chroma until the colour fits sRGB, so the hue stays true.
  let chroma = c
  let rgb = oklchToLinearRgb(l, chroma, h)
  while (chroma > 0 && rgb.some((v) => v < 0 || v > 1)) {
    chroma = Math.max(0, chroma - 0.005)
    rgb = oklchToLinearRgb(l, chroma, h)
  }
  return `#${rgb
    .map((v) =>
      Math.round(fromLinear(Math.min(1, Math.max(0, v))) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}
