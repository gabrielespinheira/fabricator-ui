// What a control's `size` means on a device held in the hand, and which rung of the
// scale a device starts on. No React Native imports, so it stays testable anywhere.

import {
  DENSITIES,
  type DensityName,
  type Density as DensityTokens,
} from "@/registry/fabricator/density"

/** The touch target a control reaches, with `hitSlop` where it's drawn smaller. */
const TOUCH_TARGET = 44

/** Where a window stops being a phone: the App Shell changes layout here too. */
export const TABLET_MIN_WIDTH = 768

/**
 * A tablet's base: 40pt controls with the phone's 15pt text and 18pt icons. The
 * desktop is 36pt and the phone 44pt. There's room for lighter chrome, and a tablet
 * is read from further away, so the text stays while the controls come down;
 * `hitSlop` keeps them at 44pt for a finger. Rows are as tall as controls (`30`).
 */
export const TABLET_DENSITY: DensityTokens = {
  space: {
    4: 4,
    6: 8,
    8: 10,
    10: 12,
    12: 14,
    14: 16,
    16: 18,
    20: 24,
    24: 28,
    28: 32,
    30: 40,
    32: 36,
    36: 40,
    40: 44,
    48: 52,
  },
  text: DENSITIES.spacious.text,
  icon: DENSITIES.spacious.icon,
}

/** A tablet's `size="sm"`: 34pt and 14pt text, for toolbars and dense rows. */
export const TABLET_SMALL_DENSITY: DensityTokens = {
  space: {
    4: 4,
    6: 6,
    8: 8,
    10: 10,
    12: 12,
    14: 14,
    16: 14,
    20: 20,
    24: 24,
    28: 28,
    30: 30,
    32: 32,
    36: 34,
    40: 38,
    48: 46,
  },
  text: { 11: 12, 12: 12, 13: 14, 14: 15, 16: 16 },
  icon: { 14: 14, 16: 16 },
}

/** A tablet's `size="lg"`: 48pt and 16pt text, for a screen's main action. */
export const TABLET_LARGE_DENSITY: DensityTokens = {
  space: {
    4: 4,
    6: 8,
    8: 10,
    10: 12,
    12: 14,
    14: 16,
    16: 22,
    20: 26,
    24: 30,
    28: 40,
    30: 48,
    32: 44,
    36: 48,
    40: 52,
    48: 60,
  },
  text: { 11: 13, 12: 14, 13: 16, 14: 17, 16: 20 },
  icon: { 14: 18, 16: 20 },
}

/**
 * A step above spacious, for a `size="lg"` control on a phone: 52pt and 17pt text,
 * the size of a screen's main action. Native only: a website's largest is spacious.
 */
export const LARGE_DENSITY: DensityTokens = {
  space: {
    4: 4,
    6: 10,
    8: 12,
    10: 14,
    12: 16,
    14: 18,
    16: 24,
    20: 28,
    24: 32,
    28: 44,
    30: 46,
    32: 48,
    36: 52,
    40: 56,
    48: 64,
  },
  text: { 11: 13, 12: 14, 13: 17, 14: 18, 16: 20 },
  icon: { 14: 18, 16: 20 },
}

const NATIVE_DENSITIES = {
  large: LARGE_DENSITY,
  tablet: TABLET_DENSITY,
  "tablet-sm": TABLET_SMALL_DENSITY,
  "tablet-lg": TABLET_LARGE_DENSITY,
} as const

export type SizeDensity = DensityName | keyof typeof NATIVE_DENSITIES

export function getDensityTokens(density: SizeDensity): DensityTokens {
  return density in NATIVE_DENSITIES
    ? NATIVE_DENSITIES[density as keyof typeof NATIVE_DENSITIES]
    : DENSITIES[density as DensityName]
}

const CONTROL_HEIGHTS = new Map<number, SizeDensity>([
  [DENSITIES.compact.space[36], "compact"],
  [TABLET_SMALL_DENSITY.space[36], "tablet-sm"],
  [TABLET_DENSITY.space[36], "tablet"],
  [DENSITIES.spacious.space[36], "spacious"],
  [TABLET_LARGE_DENSITY.space[36], "tablet-lg"],
  [LARGE_DENSITY.space[36], "large"],
])

/** Which density a control height belongs to: what `--density-36` says it's in. */
export function getDensityName(controlHeight: number): SizeDensity {
  return CONTROL_HEIGHTS.get(controlHeight) ?? "default"
}

const isTabletRung = (density: SizeDensity) =>
  density === "tablet" || density === "tablet-sm" || density === "tablet-lg"

/**
 * The rung a device takes in place of its look's density, if any. A native app's
 * look is spacious, the phone's base; a tablet takes its own. Default on a phone
 * takes the tablet's rung too: the website's default (36pt controls, 13pt text)
 * is sized for a pointer, and this is the step under a phone's base that still
 * fits a finger. Compact stays as picked, and a window narrower than a tablet
 * (Split View) is a phone's.
 */
export function getDeviceDensity(
  density: SizeDensity,
  windowWidth: number
): SizeDensity | undefined {
  const isTablet = windowWidth >= TABLET_MIN_WIDTH
  if (density === "spacious" && isTablet) return "tablet"
  if (density === "default" && !isTablet) return "tablet"
  return undefined
}

/**
 * The density a `size` pins a control to. On the website `sm` is compact and `lg`
 * spacious. At spacious, a phone's base, that would drop `sm` to 28pt and 12pt text
 * and leave `lg` the same as the default, so there they're a step either side, and
 * a tablet's base has its own steps.
 */
export function getSizeDensity(
  size: string | null | undefined,
  around: SizeDensity
): SizeDensity | undefined {
  if (size !== "sm" && size !== "lg") return undefined
  if (isTabletRung(around)) return size === "sm" ? "tablet-sm" : "tablet-lg"
  const isPhoneBase = around === "spacious" || around === "large"
  if (size === "sm") return isPhoneBase ? "default" : "compact"
  return isPhoneBase ? "large" : "spacious"
}

/** The fixed floor below `sm`, which a tablet's distance takes a step up. */
export function getXsSize(around: SizeDensity) {
  return isTabletRung(around)
    ? { height: 28, icon: 14 }
    : { height: 24, icon: 12 }
}

/** The `hitSlop` that takes a control this tall to a full touch target. */
export function getTouchSlop(height: number) {
  return Math.max(0, Math.ceil((TOUCH_TARGET - height) / 2))
}
