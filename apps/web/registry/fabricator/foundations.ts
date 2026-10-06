// Fabricator UI foundations: surfaces, interaction overlays, focus, motion and
// scrollbars. Adapted from Fluid Functionalism by Micka Touillaud (MIT),
// https://github.com/mickadesign/fluid-functionalism.
//
// This module is the single source of truth. The registry build turns it into
// the `foundations` registry item (installed with every Fabricator-mode
// component), the /init payload adds it to new projects, and the website's
// app/fabricator.css is generated from it.
//
// Every token here has a new name, so installing it never overwrites a
// project's shadcn tokens (AGENTS.md, contract item 4). The Fabricator colour
// palette for the shadcn token names lives in FABRICATOR_PALETTE below and is
// only applied by the `fabricator` preset.

type CssVars = {
  theme: Record<string, string>
  light: Record<string, string>
  dark: Record<string, string>
}

// A CSS object in the shape of a shadcn registry item's `css` field.
export type CssObject = { [selector: string]: CssObject | string }

// --- Surfaces ---------------------------------------------------------------
// An eight-level ladder. Light: two tinted steps, then flat white separated by
// shadow. Dark: each level lifts the background and adds an inset highlight.

const SURFACE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

const LIGHT_SURFACES = [
  "oklch(0.985 0 0)",
  "oklch(0.991 0 0)",
  "oklch(1 0 0)",
  "oklch(1 0 0)",
  "oklch(1 0 0)",
  "oklch(1 0 0)",
  "oklch(1 0 0)",
  "oklch(1 0 0)",
]

const DARK_SURFACES = [
  "oklch(0.205 0 0)",
  "oklch(0.235 0 0)",
  "oklch(0.264 0 0)",
  "oklch(0.293 0 0)",
  "oklch(0.321 0 0)",
  "oklch(0.348 0 0)",
  "oklch(0.375 0 0)",
  "oklch(0.402 0 0)",
]

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

// --- Motion -----------------------------------------------------------------
// Spring tiers as CSS easing. `linear()` samples of a critically damped spring
// and of a spring with a 0.12 bounce (damping ratio 0.88), both settling at the
// end of the duration. Bigger moves use slower tiers; exits are plain tweens,
// one tier quicker.

export const EASE_SPRING =
  "linear(0, 0.055, 0.1734, 0.3101, 0.4422, 0.5591, 0.6575, 0.7374, 0.8009, 0.8503, 0.8883, 0.9172, 0.9389, 0.9551, 0.9672, 0.9761, 0.9826, 0.9874, 0.9909, 0.9935, 0.9953, 0.9966, 0.9976, 0.9983, 1)"

export const EASE_SPRING_BOUNCE =
  "linear(0, 0.0565, 0.1816, 0.3296, 0.4743, 0.6026, 0.7093, 0.7941, 0.8588, 0.9067, 0.9409, 0.9646, 0.9804, 0.9906, 0.9968, 1.0004, 1.0022, 1.0029, 1.0029, 1.0027, 1.0023, 1.0018, 1.0014, 1.0011, 1)"

export const MOTION = {
  fast: { duration: 80, exit: 60 },
  moderate: { duration: 160, exit: 120 },
  slow: { duration: 240, exit: 160 },
} as const

// --- Foundations ------------------------------------------------------------

export const FABRICATOR_FOUNDATIONS: { cssVars: CssVars; css: CssObject } = {
  cssVars: {
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
      "color-destructive-light": "var(--destructive-light)",
      "color-focus-ring": "var(--focus-ring)",
      "color-info": "var(--info)",
      "color-success": "var(--success)",
      "color-warning": "var(--warning)",
      "ease-spring": EASE_SPRING,
      "ease-spring-bounce": EASE_SPRING_BOUNCE,
      "ease-exit": "cubic-bezier(0.25, 0.1, 0.25, 1)",
    },
    light: {
      ...Object.fromEntries(
        SURFACE_LEVELS.flatMap((level) => [
          [`surface-${level}`, LIGHT_SURFACES[level - 1]],
          [`shadow-${level}`, lightShadow(level)],
        ])
      ),
      "shadow-color": "oklch(0 0 0 / 0.06)",
      overlay: "0 0 0",
      hover: "oklch(0 0 0 / 0.04)",
      active: "oklch(0 0 0 / 0.07)",
      selected: "oklch(0.87 0 0)",
      tint: "oklch(0 0 0 / 0.08)",
      "tint-hover": "oklch(0 0 0 / 0.065)",
      "destructive-light": "oklch(0.971 0.013 17.4)",
      "focus-ring": "oklch(0.693 0.161 265.2)",
      info: "oklch(0.623 0.188 259.8)",
      success: "oklch(0.723 0.192 149.6)",
      warning: "oklch(0.769 0.165 70.1)",
    },
    dark: {
      ...Object.fromEntries(
        SURFACE_LEVELS.flatMap((level) => [
          [`surface-${level}`, DARK_SURFACES[level - 1]],
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
      selected: "oklch(0.439 0 0)",
      tint: "oklch(1 0 0 / 0.25)",
      "tint-hover": "oklch(1 0 0 / 0.2)",
      "destructive-light": "oklch(0.258 0.089 26)",
      "focus-ring": "oklch(0.693 0.161 265.2)",
      info: "oklch(0.809 0.096 251.8)",
      success: "oklch(0.871 0.136 154.4)",
      warning: "oklch(0.879 0.153 91.6)",
    },
  },
  css: {
    "@layer base": {
      // Smooth, even text: grayscale anti-aliasing on macOS (subpixel
      // rendering makes light-on-dark text look heavy and fringed), kerning
      // and ligatures, the font's optical sizes, and no faux bold or italic
      // when a weight is missing. No grey tap flash on touch.
      html: {
        "-webkit-font-smoothing": "antialiased",
        "-moz-osx-font-smoothing": "grayscale",
        "text-rendering": "optimizeLegibility",
        "font-kerning": "normal",
        "font-optical-sizing": "auto",
        "font-synthesis": "none",
        "-webkit-tap-highlight-color": "transparent",
      },
      // Thin, low-contrast scrollbars that darken on hover. Fine pointers
      // only: touch devices keep their native overlay scrollbars.
      "@media (pointer: fine)": {
        "*": {
          "scrollbar-width": "thin",
          "scrollbar-color": "rgb(var(--overlay) / 0.08) transparent",
        },
        "::-webkit-scrollbar": { width: "10px", height: "10px" },
        "::-webkit-scrollbar-track, ::-webkit-scrollbar-corner": {
          background: "transparent",
        },
        "::-webkit-scrollbar-thumb": {
          "background-color": "rgb(var(--overlay) / 0.08)",
          border: "3px solid transparent",
          "background-clip": "content-box",
          "border-radius": "9999px",
        },
        "::-webkit-scrollbar-thumb:vertical": {
          "border-left-width": "1px",
          "border-right-width": "5px",
        },
        "::-webkit-scrollbar-thumb:horizontal": {
          "border-top-width": "1px",
          "border-bottom-width": "5px",
        },
        "::-webkit-scrollbar-thumb:hover": {
          "background-color": "rgb(var(--overlay) / 0.12)",
        },
        "::-webkit-scrollbar-thumb:active": {
          "background-color": "rgb(var(--overlay) / 0.16)",
        },
      },
      // Reduced motion: fewer and gentler, not none. Enter/exit animations
      // keep their fades and drop slides and zooms. `!important` in the base
      // layer beats the per-component animation utilities.
      "@media (prefers-reduced-motion: reduce)": {
        "*, ::before, ::after": {
          "--tw-enter-translate-x": "0 !important",
          "--tw-enter-translate-y": "0 !important",
          "--tw-exit-translate-x": "0 !important",
          "--tw-exit-translate-y": "0 !important",
          "--tw-enter-scale": "1 !important",
          "--tw-exit-scale": "1 !important",
        },
      },
    },
    "@utility scrollbar-hide": {
      "-ms-overflow-style": "none",
      "scrollbar-width": "none",
      "&::-webkit-scrollbar": { display: "none" },
    },
    // Optically centre text in fixed-height controls.
    "@utility text-box-trim": {
      "text-box": "trim-both cap alphabetic",
    },
    // Weights that pair Inter's `wght` with `opsz`, so a label can get
    // heavier (e.g. when selected) without changing its width. Animate with
    // `transition-[font-variation-settings]`. Needs a variable Inter with the
    // optical-size axis; without it only the weight changes.
    "@utility weight-normal": {
      "font-variation-settings": "'wght' 400, 'opsz' 14",
    },
    "@utility weight-medium": {
      "font-variation-settings": "'wght' 450, 'opsz' 15",
    },
    "@utility weight-semibold": {
      "font-variation-settings": "'wght' 550, 'opsz' 18",
    },
    "@utility weight-bold": {
      "font-variation-settings": "'wght' 700, 'opsz' 25",
    },
  },
}

// --- Palette ----------------------------------------------------------------
// The Fabricator colours for the shadcn token names. Neutral, with the page on
// surface-1 and raised containers on surface-3. Applied by the `fabricator`
// preset only, so other presets keep their own colours.
//
// Colour tokens hold literal colours, never var() or color-mix(): the CLI only
// maps a token to `--color-<name>` in `@theme inline` when its value is a
// colour, so `bg-background` and `border-border` would not exist otherwise.

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
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0 0 0 / 0.08)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.967 0.001 286.4)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0 0 0 / 0.04)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.637 0.208 25.3)",
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
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
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
    primary: "oklch(0.97 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(1 0 0 / 0.25)",
    "secondary-foreground": "oklch(0.97 0 0)",
    muted: "oklch(0.235 0 0)",
    "muted-foreground": "oklch(0.715 0 0)",
    accent: "oklch(1 0 0 / 0.06)",
    "accent-foreground": "oklch(0.97 0 0)",
    destructive: "oklch(0.808 0.103 19.6)",
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
    "sidebar-primary": "oklch(0.97 0 0)",
    "sidebar-primary-foreground": "oklch(0.205 0 0)",
    "sidebar-accent": "oklch(1 0 0 / 0.06)",
    "sidebar-accent-foreground": "oklch(0.97 0 0)",
    "sidebar-border": "oklch(0.97 0 0 / 0.12)",
    "sidebar-ring": "oklch(0.693 0.161 265.2)",
  },
}

// --- CSS output -------------------------------------------------------------

function serializeCss(object: CssObject, indent = ""): string {
  return Object.entries(object)
    .map(([key, value]) =>
      typeof value === "string"
        ? `${indent}${key}: ${value};`
        : `${indent}${key} {\n${serializeCss(value, `${indent}  `)}\n${indent}}`
    )
    .join("\n")
}

function vars(entries: Record<string, string>, indent = "  ") {
  return Object.entries(entries)
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join("\n")
}

/**
 * The foundations and palette as a stylesheet, for the website. The selectors
 * are one notch more specific than `:root`/`.dark` so they win over tokens a
 * stylesheet defines later in the same file.
 */
export function toFabricatorStylesheet({
  light = "html:root",
  dark = "html.dark",
}: { light?: string; dark?: string } = {}) {
  return [
    "/* Generated from registry/fabricator/foundations.ts by scripts/build-registry.mts. Do not edit. */",
    `${light} {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.light, ...FABRICATOR_PALETTE.light })}\n}`,
    `${dark} {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.dark, ...FABRICATOR_PALETTE.dark })}\n}`,
    `@theme inline {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.theme, ...FABRICATOR_PALETTE.theme })}\n}`,
    serializeCss(FABRICATOR_FOUNDATIONS.css),
    "",
  ].join("\n\n")
}
