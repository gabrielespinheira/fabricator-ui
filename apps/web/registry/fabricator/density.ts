// Fabricator density: how much room the components take.
//
// Three densities set the same tokens: compact (dashboards, toolbars, dense
// tables), default (apps) and spacious (websites and landing pages). Default
// is the one in :root; `data-density="<name>"` on <html> or on any element
// switches everything inside it, and the `density-<name>` utilities do the
// same from a class (so `md:density-spacious` works). A component's
// `size="sm"` pins it to compact and `size="lg"` to spacious.
//
// Components size themselves with the tokens, never fixed pixels. Every token
// is named after its default value: `h-(--density-36)` is 36px at default,
// 28px compact and 44px spacious; `px-(--density-16)`, `gap-(--density-6)`,
// `text-(length:--density-text-13)` and `size-(--density-icon-16)` work the
// same way. They are CSS variables rather than theme keys, so class merging (cn)
// knows them: a consumer's `h-12` still replaces `h-(--density-36)`.
// `registry/fabricator/__tests__/density-usage.test.ts` fails on fixed
// control sizes in the style maps.

import type { CssObject } from "@/registry/fabricator/foundations"

export const DENSITY_NAMES = ["compact", "default", "spacious"] as const

export type DensityName = (typeof DENSITY_NAMES)[number]

export const DEFAULT_DENSITY: DensityName = "default"

export function isDensityName(value: unknown): value is DensityName {
  return DENSITY_NAMES.some((name) => name === value)
}

/** Spacing and size steps, named by their default size in px. */
export const DENSITY_SPACE_STEPS = [
  4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48,
] as const

/** Text sizes, named by their default size in px. */
export const DENSITY_TEXT_STEPS = [11, 12, 13, 14, 16] as const

/** Icon sizes, named by their default size in px. */
export const DENSITY_ICON_STEPS = [14, 16] as const

export type DensitySpaceStep = (typeof DENSITY_SPACE_STEPS)[number]
export type DensityTextStep = (typeof DENSITY_TEXT_STEPS)[number]
export type DensityIconStep = (typeof DENSITY_ICON_STEPS)[number]

export type Density = {
  /** Px per spacing step. */
  space: Record<DensitySpaceStep, number>
  /** Px per text step. */
  text: Record<DensityTextStep, number>
  /** Px per icon step. */
  icon: Record<DensityIconStep, number>
}

export const DENSITIES: Record<DensityName, Density> = {
  // About a fifth smaller: 28px controls and menu rows, 12px text. Tracks
  // keep 24px items with 2px of padding.
  compact: {
    space: {
      4: 2,
      6: 4,
      8: 6,
      10: 8,
      12: 10,
      14: 12,
      16: 12,
      20: 16,
      24: 20,
      28: 24,
      32: 28,
      36: 28,
      40: 32,
      48: 40,
    },
    text: { 11: 11, 12: 12, 13: 12, 14: 13, 16: 15 },
    icon: { 14: 12, 16: 14 },
  },
  // 36px controls, 13px text: Fabricator's own sizes.
  default: {
    space: {
      4: 4,
      6: 6,
      8: 8,
      10: 10,
      12: 12,
      14: 14,
      16: 16,
      20: 20,
      24: 24,
      28: 28,
      32: 32,
      36: 36,
      40: 40,
      48: 48,
    },
    text: { 11: 11, 12: 12, 13: 13, 14: 14, 16: 16 },
    icon: { 14: 14, 16: 16 },
  },
  // About a fifth larger: 44px controls (the touch target size), 15px text,
  // 18px icons.
  spacious: {
    space: {
      4: 4,
      6: 8,
      8: 10,
      10: 12,
      12: 14,
      14: 16,
      16: 20,
      20: 24,
      24: 28,
      28: 36,
      32: 40,
      36: 44,
      40: 48,
      48: 56,
    },
    text: { 11: 12, 12: 13, 13: 15, 14: 16, 16: 18 },
    icon: { 14: 16, 16: 18 },
  },
}

const toRem = (px: number) => `${px / 16}rem`

/** A density's tokens, keyed by name without the `--`. */
export function toDensityVars(density: Density): Record<string, string> {
  return {
    ...Object.fromEntries(
      DENSITY_SPACE_STEPS.map((step) => [
        `density-${step}`,
        toRem(density.space[step]),
      ])
    ),
    ...Object.fromEntries(
      DENSITY_TEXT_STEPS.map((step) => [
        `density-text-${step}`,
        `${density.text[step]}px`,
      ])
    ),
    ...Object.fromEntries(
      DENSITY_ICON_STEPS.map((step) => [
        `density-icon-${step}`,
        toRem(density.icon[step]),
      ])
    ),
  }
}

const vars = (entries: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, value]) => [`--${name}`, value])
  )

/**
 * Density switches and utilities, in the shape of a registry item's `css`
 * field. The selectors are one notch more specific than :root, so they win
 * on <html>, and plain attribute selectors anywhere else.
 */
export const DENSITY_CSS: CssObject = {
  ...Object.fromEntries(
    DENSITY_NAMES.map((name) => [
      `:root[data-density="${name}"], [data-density="${name}"]`,
      vars(toDensityVars(DENSITIES[name])),
    ])
  ),
  ...Object.fromEntries(
    DENSITY_NAMES.map((name) => [
      `@utility density-${name}`,
      vars(toDensityVars(DENSITIES[name])),
    ])
  ),
}

/** The default density's tokens, for :root. */
export const DENSITY_ROOT_VARS: Record<string, string> = toDensityVars(
  DENSITIES[DEFAULT_DENSITY]
)
