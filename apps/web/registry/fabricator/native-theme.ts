// The website's theme resolved for React Native, which has no OKLCH, no CSS
// variables and no calc(). Everything derives from the modules the website's
// stylesheet is generated from, so a look renders the same on both;
// __tests__/native-theme.test.ts pins the result to values measured in a
// browser.

import { roleLiterals } from "@/registry/fabricator/color-roles"
import { DENSITIES } from "@/registry/fabricator/density"
import {
  FABRICATOR_FOUNDATIONS,
  FABRICATOR_PALETTE,
} from "@/registry/fabricator/foundations"
import {
  parseLook,
  PILL_RADIUS,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import {
  DEFAULT_MOTION_SPEED,
  MOTION_SPEEDS,
} from "@/registry/fabricator/motion"
import {
  MUTED_FOREGROUND_STEP,
  oklchToHex,
  SURFACE_STEPS,
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
  const foundations = FABRICATOR_FOUNDATIONS.cssVars[mode]
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
    ...FABRICATOR_FOUNDATIONS.cssVars.light,
    ...FABRICATOR_FOUNDATIONS.cssVars[mode],
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

const LOOK_URL_PATTERN = /^fabricator-ui:\/\/look\/?(?:\?(.*))?$/

/** The look a `fabricator-ui://look?<look params>` link carries, if it is one. */
export function getLookFromUrl(url: string) {
  const match = LOOK_URL_PATTERN.exec(url)
  if (!match) return null
  const result = parseLook(new URLSearchParams(match[1] ?? ""))
  return result.success ? result.look : null
}
