// The Fabricator tokens as data: the foundations' variables and the palette.
// No selectors or utilities, so a React Native project can install it without
// the website's CSS (native-theme.ts resolves these to literal values).
// foundations.ts adds the CSS and turns them into the registry item.

import {
  ROLE_CSS_VARS,
  ROLE_PALETTE_LINKS,
  rolePalette,
} from "@/registry/fabricator/color-roles"
import { DENSITY_ROOT_VARS } from "@/registry/fabricator/density"
import { MOTION_ROOT_VARS, MOTION_THEME } from "@/registry/fabricator/motion"
import {
  MUTED_FOREGROUND_STEP,
  NEUTRAL_TINT,
  SURFACE_STEPS,
  surfaceLadder,
  TINTED_NEUTRALS,
  tintedCss,
} from "@/registry/fabricator/surface-tint"

export type CssVars = {
  theme: Record<string, string>
  light: Record<string, string>
  dark: Record<string, string>
}

// --- Surfaces ---------------------------------------------------------------
// An eight-level ladder. Light: two tinted steps, then flat white separated by
// shadow. Dark: each level lifts the background and adds an inset highlight.
// Every level derives from the surface tint (--surface-hue, --surface-chroma;
// see surface-tint.ts), which is neutral by default.

const SURFACE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

// The neutral ladder as literal colours, for the palette below.
const LIGHT_SURFACES = surfaceLadder("light", NEUTRAL_TINT)
const DARK_SURFACES = surfaceLadder("dark", NEUTRAL_TINT)

// Drops double in size per level; spread is minus half the blur.
const DROPS = [1, 3, 6, 12, 24, 48, 96]

function drops(level: number, color: string) {
  return DROPS.slice(0, level - 1).map(
    (blur) => `0 ${blur}px ${blur}px -${blur / 2}px ${color}`
  )
}

function lightShadow(level: number) {
  return [
    "0 0 0 1px var(--shadow-color)",
    ...drops(level, "var(--shadow-color)"),
  ].join(", ")
}

// [top highlight, inset ring, outer black ring alpha] per level.
const DARK_SHADOW_PARTS: Record<
  number,
  [string | null, string, number | null]
> = {
  1: [null, "--dm-ring-base", null],
  2: ["--dm-hi-base", "--dm-ring-base", null],
  3: ["--dm-hi-mid", "--dm-ring-base", 0.12],
  4: ["--dm-hi-mid", "--dm-ring-mid", 0.14],
  5: ["--dm-hi-high", "--dm-ring-mid", 0.16],
  6: ["--dm-hi-high", "--dm-ring-high", 0.18],
  7: ["--dm-hi-peak", "--dm-ring-high", 0.2],
  8: ["--dm-hi-peak", "--dm-ring-high", 0.22],
}

function darkShadow(level: number) {
  const [highlight, ring, outer] = DARK_SHADOW_PARTS[level]
  return [
    highlight && `inset 0 1px 0 0 var(${highlight})`,
    `inset 0 0 0 1px var(${ring})`,
    outer !== null && `0 0 0 1px oklch(0 0 0 / ${outer})`,
    ...drops(level, "var(--dm-drop)"),
  ]
    .filter(Boolean)
    .join(", ")
}

// --- Tokens -----------------------------------------------------------------

export const FABRICATOR_TOKENS: CssVars = {
  theme: {
    ...Object.fromEntries(
      SURFACE_LEVELS.flatMap((level) => [
        [`color-surface-${level}`, `var(--surface-${level})`],
        [`shadow-surface-${level}`, `var(--shadow-${level})`],
      ])
    ),
    "color-hover": "var(--hover)",
    "color-active": "var(--active)",
    "color-selected": "var(--selected)",
    "color-tint": "var(--tint)",
    "color-tint-hover": "var(--tint-hover)",
    // Every colour role's text, border and surface ladder, and the status
    // fills (info, success, warning) with their foregrounds.
    ...ROLE_CSS_VARS.theme,
    "color-focus-ring": "var(--focus-ring)",
    // Motion: duration-<role>, delay-<role> and ease-<curve> (motion.ts).
    ...MOTION_THEME,
  },
  light: {
    "surface-hue": String(NEUTRAL_TINT.hue),
    "surface-chroma": String(NEUTRAL_TINT.chroma),
    // The default motion speed; the others switch with data-motion.
    ...MOTION_ROOT_VARS,
    // The default density; the others switch with data-density.
    ...DENSITY_ROOT_VARS,
    ...Object.fromEntries(
      SURFACE_LEVELS.flatMap((level) => [
        [`surface-${level}`, tintedCss(SURFACE_STEPS.light[level - 1])],
        [`shadow-${level}`, lightShadow(level)],
      ])
    ),
    "shadow-color": "oklch(0 0 0 / 0.06)",
    overlay: "0 0 0",
    hover: "oklch(0 0 0 / 0.04)",
    active: "oklch(0 0 0 / 0.07)",
    selected: tintedCss(TINTED_NEUTRALS.light.selected),
    tint: "oklch(0 0 0 / 0.08)",
    "tint-hover": "oklch(0 0 0 / 0.065)",
    ...ROLE_CSS_VARS.light,
    "focus-ring": "oklch(0.693 0.161 265.2)",
  },
  dark: {
    ...Object.fromEntries(
      SURFACE_LEVELS.flatMap((level) => [
        [`surface-${level}`, tintedCss(SURFACE_STEPS.dark[level - 1])],
        [`shadow-${level}`, darkShadow(level)],
      ])
    ),
    "dm-hi-base": "oklch(1 0 0 / 0.01)",
    "dm-hi-mid": "oklch(1 0 0 / 0.02)",
    "dm-hi-high": "oklch(1 0 0 / 0.04)",
    "dm-hi-peak": "oklch(1 0 0 / 0.06)",
    "dm-ring-base": "oklch(1 0 0 / 0.02)",
    "dm-ring-mid": "oklch(1 0 0 / 0.04)",
    "dm-ring-high": "oklch(1 0 0 / 0.06)",
    "dm-drop": "oklch(0 0 0 / 0.18)",
    overlay: "255 255 255",
    hover: "oklch(1 0 0 / 0.06)",
    active: "oklch(1 0 0 / 0.1)",
    selected: tintedCss(TINTED_NEUTRALS.dark.selected),
    tint: "oklch(1 0 0 / 0.25)",
    "tint-hover": "oklch(1 0 0 / 0.2)",
    ...ROLE_CSS_VARS.dark,
    "focus-ring": "oklch(0.693 0.161 265.2)",
  },
}

// --- Palette ----------------------------------------------------------------
// The Fabricator colours for the shadcn token names. Neutral, with the page on
// surface-1 and raised containers on surface-3; primary, secondary and
// destructive are the colour roles at their defaults. Applied by the
// `fabricator` preset only, so other presets keep their own colours.
//
// Colour tokens hold literal colours, never var() or color-mix(): the CLI only
// maps a token to `--color-<name>` in `@theme inline` when its value is a
// colour, so `bg-background` and `border-border` would not exist otherwise.

const LIGHT_ROLES = rolePalette("light")
const DARK_ROLES = rolePalette("dark")

export const FABRICATOR_PALETTE: CssVars = {
  theme: {
    // Inter's variable weights read heavier than their numbers; FF pairs a
    // lighter medium/semibold with optical size.
    "font-weight-medium": "450",
    "font-weight-semibold": "550",
  },
  light: {
    radius: "0.5rem",
    background: LIGHT_SURFACES[0],
    foreground: "oklch(0.205 0 0)",
    card: LIGHT_SURFACES[2],
    "card-foreground": "oklch(0.205 0 0)",
    popover: LIGHT_SURFACES[2],
    "popover-foreground": "oklch(0.205 0 0)",
    primary: LIGHT_ROLES.primary,
    "primary-foreground": LIGHT_ROLES["primary-foreground"],
    secondary: LIGHT_ROLES.secondary,
    "secondary-foreground": LIGHT_ROLES["secondary-foreground"],
    muted: "oklch(0.967 0.001 286.4)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0 0 0 / 0.04)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: LIGHT_ROLES.destructive,
    border: "oklch(0.205 0 0 / 0.12)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.693 0.161 265.2)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.264 0 0)",
    sidebar: LIGHT_SURFACES[1],
    "sidebar-foreground": "oklch(0.205 0 0)",
    "sidebar-primary": LIGHT_ROLES["sidebar-primary"],
    "sidebar-primary-foreground": LIGHT_ROLES["sidebar-primary-foreground"],
    "sidebar-accent": "oklch(0 0 0 / 0.04)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.205 0 0 / 0.12)",
    "sidebar-ring": "oklch(0.693 0.161 265.2)",
  },
  dark: {
    background: DARK_SURFACES[0],
    foreground: "oklch(0.97 0 0)",
    card: DARK_SURFACES[2],
    "card-foreground": "oklch(0.97 0 0)",
    popover: DARK_SURFACES[2],
    "popover-foreground": "oklch(0.97 0 0)",
    primary: DARK_ROLES.primary,
    "primary-foreground": DARK_ROLES["primary-foreground"],
    secondary: DARK_ROLES.secondary,
    "secondary-foreground": DARK_ROLES["secondary-foreground"],
    muted: "oklch(0.235 0 0)",
    "muted-foreground": "oklch(0.715 0 0)",
    accent: "oklch(1 0 0 / 0.06)",
    "accent-foreground": "oklch(0.97 0 0)",
    destructive: DARK_ROLES.destructive,
    border: "oklch(0.97 0 0 / 0.12)",
    input: "oklch(0.371 0 0)",
    ring: "oklch(0.693 0.161 265.2)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.715 0 0)",
    "chart-3": "oklch(0.556 0 0)",
    "chart-4": "oklch(0.439 0 0)",
    "chart-5": "oklch(0.371 0 0)",
    sidebar: DARK_SURFACES[1],
    "sidebar-foreground": "oklch(0.97 0 0)",
    "sidebar-primary": DARK_ROLES["sidebar-primary"],
    "sidebar-primary-foreground": DARK_ROLES["sidebar-primary-foreground"],
    "sidebar-accent": "oklch(1 0 0 / 0.06)",
    "sidebar-accent-foreground": "oklch(0.97 0 0)",
    "sidebar-border": "oklch(0.97 0 0 / 0.12)",
    "sidebar-ring": "oklch(0.693 0.161 265.2)",
  },
}

// --- Tinted palette ---------------------------------------------------------
// The palette above holds literal copies of the neutral surfaces and of the
// default roles. A project that tints its surfaces or sets its roles points
// these tokens at the live recipes instead, so the page, cards, popovers, the
// sidebar and muted fills follow the tint, and primary, secondary and
// destructive follow their roles (ROLE_PALETTE_LINKS). The website does this
// (toFabricatorStylesheet), and the Colors page copies it.

const linkPalette = (mode: "light" | "dark") => ({
  background: "var(--surface-1)",
  card: "var(--surface-3)",
  popover: "var(--surface-3)",
  sidebar: "var(--surface-2)",
  muted: tintedCss(TINTED_NEUTRALS[mode].muted),
})

export const SURFACE_PALETTE_LINKS = {
  light: {
    ...linkPalette("light"),
    "muted-foreground": tintedCss(MUTED_FOREGROUND_STEP),
  },
  dark: linkPalette("dark"),
}

/** Every link: the surfaces and the colour roles. */
export const PALETTE_LINKS = {
  light: { ...SURFACE_PALETTE_LINKS.light, ...ROLE_PALETTE_LINKS.light },
  dark: { ...SURFACE_PALETTE_LINKS.dark, ...ROLE_PALETTE_LINKS.dark },
}
