// The named choices the settings offer, shared by the website's settings menu
// and the React Native example. No React here: both import it.

import {
  ROLE_DEFAULTS,
  roleMaxChroma,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import type { DensityName } from "@/registry/fabricator/density"
import {
  NEUTRAL_TINT,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"

/** The look's shapes: --radius at 0.5rem, or at 1.25rem for Pill. */
export const RADIUS_OPTIONS = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
] as const

/** The foundations' motion speeds (registry/fabricator/motion.ts), slowest first, then Off. */
export const MOTION_OPTIONS = [
  { value: "smooth", label: "Smooth" },
  { value: "default", label: "Default" },
  { value: "snappy", label: "Snappy" },
  { value: "instant", label: "Instant" },
  { value: "off", label: "Off" },
] as const

/** The foundations' densities (registry/fabricator/density.ts), smallest first. */
export const DENSITY_OPTIONS: { value: DensityName; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "spacious", label: "Spacious" },
]

/** Named surface tints for the settings menu and the Colors page. */
export const SURFACE_PRESETS: {
  value: string
  label: string
  tint: SurfaceTint
}[] = [
  { value: "neutral", label: "Neutral", tint: NEUTRAL_TINT },
  { value: "slate", label: "Slate", tint: { hue: 260, chroma: 0.02 } },
  { value: "sand", label: "Sand", tint: { hue: 75, chroma: 0.018 } },
  { value: "sage", label: "Sage", tint: { hue: 145, chroma: 0.022 } },
  { value: "ocean", label: "Ocean", tint: { hue: 220, chroma: 0.035 } },
  { value: "indigo", label: "Indigo", tint: { hue: 272, chroma: 0.04 } },
  { value: "plum", label: "Plum", tint: { hue: 325, chroma: 0.035 } },
  { value: "rose", label: "Rose", tint: { hue: 15, chroma: 0.03 } },
]

export type RolePreset = { value: string; label: string; color: RoleColor }

/** A named hue at a strong but calm chroma: its maximum, up to 0.22. */
function tone(value: string, label: string, hue: number): RolePreset {
  return {
    value,
    label,
    color: { hue, chroma: Math.min(roleMaxChroma(hue), 0.22) },
  }
}

const WHEEL = [
  tone("blue", "Blue", 260),
  tone("indigo", "Indigo", 277),
  tone("violet", "Violet", 300),
  tone("pink", "Pink", 350),
  tone("red", "Red", 25),
  tone("orange", "Orange", 45),
  tone("amber", "Amber", 75),
  tone("green", "Green", 150),
  tone("teal", "Teal", 190),
]

/**
 * Named colours for each role. Primary and secondary start neutral and take
 * any hue; each status offers tones of its own family, its default among them.
 */
export const ROLE_PRESETS: Record<ColorRole, RolePreset[]> = {
  primary: [
    { value: "neutral", label: "Neutral", color: ROLE_DEFAULTS.primary },
    ...WHEEL,
  ],
  secondary: [
    { value: "neutral", label: "Neutral", color: ROLE_DEFAULTS.secondary },
    ...WHEEL,
  ],
  info: [
    tone("sky", "Sky", 232),
    { value: "blue", label: "Blue", color: ROLE_DEFAULTS.info },
    tone("indigo", "Indigo", 272),
  ],
  success: [
    tone("lime", "Lime", 132),
    { value: "green", label: "Green", color: ROLE_DEFAULTS.success },
    tone("emerald", "Emerald", 165),
  ],
  warning: [
    tone("orange", "Orange", 52),
    { value: "amber", label: "Amber", color: ROLE_DEFAULTS.warning },
    tone("yellow", "Yellow", 92),
  ],
  destructive: [
    tone("rose", "Rose", 14),
    { value: "red", label: "Red", color: ROLE_DEFAULTS.destructive },
    tone("orange", "Orange", 42),
  ],
}
