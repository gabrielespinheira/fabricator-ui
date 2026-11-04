// The website's theme resolved for React Native, which has no OKLCH, no CSS
// variables and no calc(). Everything derives from the modules the website's
// stylesheet is generated from, so a look renders the same on both;
// __tests__/native-theme.test.ts pins the result to values measured in a
// browser.

import { COLOR_ROLES, roleLiterals } from "@/registry/fabricator/color-roles"
import { DENSITIES } from "@/registry/fabricator/density"
import { getDensityVariables } from "@/registry/fabricator/density-variables"
import {
  FABRICATOR_PALETTE,
  FABRICATOR_TOKENS,
} from "@/registry/fabricator/foundation-tokens"
import {
  DEFAULT_LOOK,
  parseLook,
  PILL_RADIUS,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import {
  DEFAULT_MOTION_SPEED,
  MOTION_ROLES,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
} from "@/registry/fabricator/motion"
import {
  MUTED_FOREGROUND_STEP,
  oklchToHex,
  SURFACE_STEPS,
  surfaceLadder,
  TINTED_NEUTRALS,
  tintedLiteral,
} from "@/registry/fabricator/surface-tint"

export type NativeMode = "light" | "dark"

// The App Shell's tokens are color-mix() rules in
// registry/styles/fabricator/app-shell.css. The test reads that file, so these
// can't drift from it.
export const APP_SHELL_FRAME_BLACK = { light: 0.04, dark: 0.22 }
export const APP_SHELL_FRAME_MUTED_BLACK = { light: 0.1, dark: 0 }
export const APP_SHELL_CARD_SHADOW_DARK =
  "inset 0 0 0 1px var(--dm-ring-high),0 1px 2px oklch(0 0 0/0.24)"

/** Multiples of --radius, as in app/globals.css. */
export const RADIUS_SCALE = { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, "2xl": 1.8 }

const REM = 16

const OKLCH_PATTERN =
  /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/g

const BEZIER_PATTERN = /cubic-bezier\(([^)]+)\)/

class NativeThemeError extends Error {
  override name = "NativeThemeError"
}

type Oklch = { l: number; c: number; h: number; alpha?: number }

function parseOklch(css: string): Oklch {
  const [match] = css.matchAll(OKLCH_PATTERN)
  if (!match) throw new NativeThemeError(`Not an oklch() colour: ${css}`)
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
    ...(match[4] === undefined ? {} : { alpha: Number(match[4]) }),
  }
}

function withAlpha(hex: string, alpha: number) {
  const channels = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16)
  )
  return `rgba(${channels.join(", ")}, ${alpha})`
}

function toNativeColor(css: string) {
  const { l, c, h, alpha } = parseOklch(css)
  const hex = oklchToHex(l, c, h)
  return alpha === undefined ? hex : withAlpha(hex, alpha)
}

/** color-mix(in oklab, <css>, black <share>): OKLab scales towards black. */
function mixWithBlack(css: string, share: number) {
  const { l, c, h } = parseOklch(css)
  return oklchToHex(l * (1 - share), c * (1 - share), h)
}

/** A CSS shadow with its variables and colours resolved, as boxShadow takes it. */
function resolveShadow(shadow: string, vars: Record<string, string>) {
  return shadow
    .replace(/var\(--([\w-]+)\)/g, (_match, name: string) => {
      const value = vars[name]
      if (value === undefined) {
        throw new NativeThemeError(`Unknown variable in a shadow: --${name}`)
      }
      return value
    })
    .replace(OKLCH_PATTERN, (color) => toNativeColor(color))
    .replace(/,(?=\S)/g, ", ")
}

/** Uniwind splits a shadow list on commas, so its colours can't contain any. */
function toHexAlphaColors(shadow: string) {
  return shadow.replace(
    /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g,
    (_match, red: string, green: string, blue: string, alpha: string) => {
      const channels = [red, green, blue, Number(alpha) * 255].map((channel) =>
        Math.round(Number(channel)).toString(16).padStart(2, "0")
      )
      return `#${channels.join("")}`
    }
  )
}

function getBezier(easing: string) {
  const match = BEZIER_PATTERN.exec(easing)
  if (!match) throw new NativeThemeError(`Not a cubic-bezier(): ${easing}`)
  return match[1].split(",").map(Number)
}

function getRadiusScale(look: FabricatorLook) {
  const radius =
    look.radius === "pill" ? PILL_RADIUS : FABRICATOR_PALETTE.light.radius
  const base = Number.parseFloat(radius) * REM
  return {
    sm: base * RADIUS_SCALE.sm,
    md: base * RADIUS_SCALE.md,
    lg: base * RADIUS_SCALE.lg,
    xl: base * RADIUS_SCALE.xl,
    "2xl": base * RADIUS_SCALE["2xl"],
  }
}

function getColors(mode: NativeMode, look: FabricatorLook) {
  const palette = FABRICATOR_PALETTE[mode]
  const foundations = FABRICATOR_TOKENS[mode]
  const surface = (level: 1 | 3 | 4) =>
    tintedLiteral(SURFACE_STEPS[mode][level - 1], look.surface)
  const muted =
    mode === "light"
      ? tintedLiteral(MUTED_FOREGROUND_STEP, look.surface)
      : palette["muted-foreground"]
  const main = toNativeColor(surface(1))
  const foreground = toNativeColor(palette.foreground)
  const hover = parseOklch(foundations.hover)
  const role = roleLiterals("primary", mode, look.colors.primary)

  return {
    frame: mixWithBlack(surface(1), APP_SHELL_FRAME_BLACK[mode]),
    main,
    panel: main,
    popover: toNativeColor(surface(3)),
    tabActive: toNativeColor(surface(4)),
    foreground,
    foregroundSoft: withAlpha(foreground, 0.8),
    muted: toNativeColor(muted),
    mutedOnFrame: mixWithBlack(muted, APP_SHELL_FRAME_MUTED_BLACK[mode]),
    border: toNativeColor(palette.border),
    hover: toNativeColor(foundations.hover),
    active: toNativeColor(foundations.active),
    wash: withAlpha(
      oklchToHex(hover.l, hover.c, hover.h),
      (hover.alpha ?? 1) / 2
    ),
    tabTrack: withAlpha(foreground, 0.05),
    segmentedTrack: withAlpha(foreground, 0.06),
    segmentLabel: withAlpha(foreground, 0.7),
    switchThumb: "#ffffff",
    // The Sheet's scrim: bg-black/40, dark:bg-black/80.
    scrim: mode === "light" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.8)",
    placeholder: withAlpha(
      toNativeColor(tintedLiteral(TINTED_NEUTRALS[mode].muted, look.surface)),
      0.5
    ),
    primary: toNativeColor(role.primary),
    primaryForeground: toNativeColor(role["primary-foreground"]),
  }
}

function getShadows(mode: NativeMode) {
  const vars = {
    ...FABRICATOR_TOKENS.light,
    ...FABRICATOR_TOKENS[mode],
  }
  const selection = resolveShadow(vars["shadow-2"], vars)
  return {
    /** The raised row and any selected fill (shadow-surface-2). */
    selection,
    /** The main column and the docked panel (--app-shell-card-shadow). */
    card:
      mode === "light"
        ? selection
        : resolveShadow(APP_SHELL_CARD_SHADOW_DARK, vars),
    /** The active tab and the floating button (shadow-surface-4). */
    raised: resolveShadow(vars["shadow-4"], vars),
    /** The page beside a revealed sidebar (shadow-surface-6). */
    page: resolveShadow(vars["shadow-6"], vars),
  }
}

/** Everything the native example needs to draw one look in one mode. */
export function getNativeTheme(mode: NativeMode, look: FabricatorLook) {
  const density = DENSITIES[look.density]
  const isOff = look.motion === "off"
  const speed =
    MOTION_SPEEDS[look.motion === "off" ? DEFAULT_MOTION_SPEED : look.motion]
  return {
    mode,
    isDark: mode === "dark",
    colors: getColors(mode, look),
    shadows: getShadows(mode),
    radius: getRadiusScale(look),
    space: density.space,
    text: density.text,
    icon: density.icon,
    /** A control's size="sm" pins it to compact and size="lg" to spacious. */
    compact: DENSITIES.compact,
    spacious: DENSITIES.spacious,
    motion: {
      sheetEnterMs: isOff ? 0 : speed.durations.sheet.enter,
      sheetExitMs: isOff ? 0 : speed.durations.sheet.exit,
      sheetEasing: getBezier(speed.easings.drawer),
      moveMs: isOff ? 0 : speed.durations.move.enter,
      moveEasing: getBezier(speed.easings.move),
    },
  }
}

export type NativeTheme = ReturnType<typeof getNativeTheme>

/**
 * A phone's default look: the website's, at the spacious density, because the
 * default's 36pt controls and 30pt rows are small for a finger.
 */
export const DEFAULT_NATIVE_LOOK: FabricatorLook = {
  ...DEFAULT_LOOK,
  density: "spacious",
}

type NativeVariables = Record<string, string | number>

function getMotionVariables(motion: FabricatorLook["motion"]): NativeVariables {
  const isOff = motion === "off"
  const speed = MOTION_SPEEDS[isOff ? DEFAULT_MOTION_SPEED : motion]
  return {
    ...Object.fromEntries(
      MOTION_ROLES.flatMap((role) => [
        [`--motion-${role}`, isOff ? 0 : speed.durations[role].enter],
        [`--motion-${role}-exit`, isOff ? 0 : speed.durations[role].exit],
      ])
    ),
    "--motion-scale": isOff ? 0 : 1,
    // Uniwind's compiler can't hold a cubic-bezier() in a variable, so the
    // theme names the speed and lib/motion reads its curves from motion.ts.
    "--motion-speed": MOTION_SPEED_NAMES.indexOf(
      isOff ? DEFAULT_MOTION_SPEED : motion
    ),
    "--motion-press-scale": isOff ? 1 : speed.scales.press,
    "--motion-tooltip-scale": speed.scales.tooltip,
    "--motion-popup-scale": speed.scales.popup,
    "--motion-dialog-scale": speed.scales.dialog,
    "--motion-tooltip-travel": speed.travel.tooltip,
    "--motion-popup-travel": speed.travel.popup,
  }
}

function getRoleVariables(mode: NativeMode, look: FabricatorLook) {
  return Object.fromEntries(
    COLOR_ROLES.flatMap((role) =>
      Object.entries(roleLiterals(role, mode, look.colors[role])).map(
        ([name, value]) => [`--${name}`, toNativeColor(value)]
      )
    )
  )
}

/** Colours the look leaves alone: the palette and the interaction tokens. */
const LITERAL_COLOR_TOKENS = [
  "foreground",
  "card-foreground",
  "popover-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const

const SURFACE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

/**
 * Every token for one look in one mode, under the website's names, as literal
 * values. The installed stylesheet is written from this, and a look set at
 * runtime goes through `getNativeRuntimeVariables`, so both draw the same.
 */
export function getNativeCssVariables(
  mode: NativeMode,
  look: FabricatorLook
): NativeVariables {
  const palette = FABRICATOR_PALETTE[mode]
  const tokens = { ...FABRICATOR_TOKENS.light, ...FABRICATOR_TOKENS[mode] }
  const surfaces = surfaceLadder(mode, look.surface).map(toNativeColor)
  const roles = getRoleVariables(mode, look)
  const radius = getRadiusScale(look)
  const appShell = getColors(mode, look)

  return {
    ...Object.fromEntries(
      LITERAL_COLOR_TOKENS.map((name) => [
        `--${name}`,
        toNativeColor(palette[name]),
      ])
    ),
    ...roles,
    "--sidebar-primary": roles["--primary"],
    "--sidebar-primary-foreground": roles["--primary-foreground"],
    ...Object.fromEntries(
      SURFACE_LEVELS.flatMap((level) => [
        [`--surface-${level}`, surfaces[level - 1]],
        [
          `--shadow-${level}`,
          toHexAlphaColors(resolveShadow(tokens[`shadow-${level}`], tokens)),
        ],
      ])
    ),
    "--background": surfaces[0],
    "--card": surfaces[2],
    "--popover": surfaces[2],
    "--sidebar": surfaces[1],
    "--muted": toNativeColor(
      tintedLiteral(TINTED_NEUTRALS[mode].muted, look.surface)
    ),
    "--muted-foreground": toNativeColor(
      mode === "light"
        ? tintedLiteral(MUTED_FOREGROUND_STEP, look.surface)
        : palette["muted-foreground"]
    ),
    "--selected": toNativeColor(
      tintedLiteral(TINTED_NEUTRALS[mode].selected, look.surface)
    ),
    "--hover": toNativeColor(tokens.hover),
    "--active": toNativeColor(tokens.active),
    "--tint": toNativeColor(tokens.tint),
    "--tint-hover": toNativeColor(tokens["tint-hover"]),
    "--focus-ring": toNativeColor(tokens["focus-ring"]),
    "--app-shell-frame": appShell.frame,
    "--app-shell-main": appShell.main,
    "--app-shell-panel": appShell.panel,
    "--app-shell-frame-muted": appShell.mutedOnFrame,
    "--app-shell-card-shadow": toHexAlphaColors(getShadows(mode).card),
    "--radius": radius.lg,
    "--radius-sm": radius.sm,
    "--radius-md": radius.md,
    "--radius-lg": radius.lg,
    "--radius-xl": radius.xl,
    "--radius-2xl": radius["2xl"],
    ...getDensityVariables(DENSITIES[look.density]),
    ...getMotionVariables(look.motion),
  }
}

// Written with a unit in the stylesheet; Uniwind reads a bare number as one.
const PIXEL_TOKEN = /^--(radius|density-|motion-.*-travel)/

function toCssBlock(variables: NativeVariables, indent: string): string {
  return Object.entries(variables)
    .map(([name, value]) => {
      const unit =
        typeof value === "number" && PIXEL_TOKEN.test(name) ? "px" : ""
      return `${indent}${name}: ${value}${unit};`
    })
    .join("\n")
}

/** The website's Tailwind names, minus the motion keys only CSS can read. */
function getThemeMapping() {
  const palette = Object.keys(FABRICATOR_PALETTE.light).filter(
    (name) => name !== "radius"
  )
  return {
    ...Object.fromEntries(
      palette.map((name) => [`--color-${name}`, `var(--${name})`])
    ),
    ...Object.fromEntries(
      Object.entries(FABRICATOR_TOKENS.theme)
        .filter(
          ([name]) =>
            name.startsWith("color-") || name.startsWith("shadow-surface-")
        )
        .map(([name, value]) => [`--${name}`, value])
    ),
    "--color-app-shell-frame": "var(--app-shell-frame)",
    "--color-app-shell-main": "var(--app-shell-main)",
    "--color-app-shell-panel": "var(--app-shell-panel)",
    "--shadow-app-shell-card": "var(--app-shell-card-shadow)",
  }
}

/**
 * The installed theme file: every token per mode, nested the way Uniwind reads
 * themes, and the Tailwind names the components use.
 */
/**
 * The same tokens for `Uniwind.updateCSSVariables`. Uniwind adds `px` to every
 * number in a shadow as it resolves one, and turns a `-0.5px` it already has
 * into `-0px.5px`, which React Native rejects along with the whole shadow.
 */
export function getNativeRuntimeVariables(
  mode: NativeMode,
  look: FabricatorLook
): NativeVariables {
  return Object.fromEntries(
    Object.entries(getNativeCssVariables(mode, look)).map(([name, value]) => [
      name,
      name.includes("shadow") ? String(value).replace(/(\d)px/g, "$1") : value,
    ])
  )
}

export function toNativeStylesheet(look: FabricatorLook = DEFAULT_NATIVE_LOOK) {
  const mode = (name: NativeMode) =>
    `    @variant ${name} {\n${toCssBlock(getNativeCssVariables(name, look), "      ")}\n    }`
  return [
    "/* Fabricator UI's tokens for React Native. Generated; change the look with `fabricator-ui init` or at runtime with applyLook. */",
    `@layer theme {\n  :root {\n${mode("light")}\n${mode("dark")}\n  }\n}`,
    `@theme inline {\n${toCssBlock(getThemeMapping(), "  ")}\n}`,
    "",
  ].join("\n\n")
}

const LOOK_URL_PATTERN = /^fabricator-ui:\/\/look\/?(?:\?(.*))?$/

/** The look a `fabricator-ui://look?<look params>` link carries, if it is one. */
export function getLookFromUrl(url: string) {
  const match = LOOK_URL_PATTERN.exec(url)
  if (!match) return null
  const result = parseLook(new URLSearchParams(match[1] ?? ""))
  return result.success ? result.look : null
}
