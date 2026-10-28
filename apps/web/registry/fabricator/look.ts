// A project's look: the Make it yours settings that install with it.
//
// The setup page (/create) writes them into the init URL, and /init turns
// them into the payload's cssVars. Values are `<hue>_<chroma>` for colours
// (no characters that need encoding, so the URL in a command stays readable),
// `shape=pill`, `motion=<speed>` and `density=<compact|spacious>`. Only values
// that differ from the defaults are written.

import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_DEFAULTS,
  ROLE_PALETTE_LINKS,
  sameRoleColor,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import {
  DEFAULT_DENSITY,
  DENSITIES,
  DENSITY_NAMES,
  toDensityVars,
  type DensityName,
} from "@/registry/fabricator/density"
import { SURFACE_PALETTE_LINKS } from "@/registry/fabricator/foundations"
import {
  DEFAULT_MOTION_SPEED,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
  toMotionVars,
} from "@/registry/fabricator/motion"
import {
  isNeutralTint,
  NEUTRAL_TINT,
  normalizeTint,
  sameTint,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"

export const LOOK_SHAPES = ["rounded", "pill"] as const
export type LookShape = (typeof LOOK_SHAPES)[number]

export const LOOK_MOTIONS = [...MOTION_SPEED_NAMES, "off"] as const
export type LookMotion = (typeof LOOK_MOTIONS)[number]

export type FabricatorLook = {
  surface: SurfaceTint
  colors: Record<ColorRole, RoleColor>
  radius: LookShape
  motion: LookMotion
  density: DensityName
}

export const DEFAULT_LOOK: FabricatorLook = {
  surface: NEUTRAL_TINT,
  colors: ROLE_DEFAULTS,
  radius: "rounded",
  motion: DEFAULT_MOTION_SPEED,
  density: DEFAULT_DENSITY,
}

/** Every param the look reads and writes. */
export const LOOK_PARAM_NAMES = [
  "surface",
  ...COLOR_ROLES,
  "shape",
  "motion",
  "density",
] as const

/** The radius Pill sets (the website's Pill setting uses the same value). */
const PILL_RADIUS = "1.25rem"

// The roles whose shadcn tokens (primary, secondary, destructive) the
// Fabricator palette writes as literals; changing one relinks them.
const PALETTE_ROLES: ColorRole[] = ["primary", "secondary", "destructive"]

const COLOR_PATTERN = /^(\d+(?:\.\d+)?)_(\d*\.?\d+)$/

function writeColor({ hue, chroma }: { hue: number; chroma: number }) {
  return `${hue}_${chroma}`
}

function readColor(value: string) {
  const match = COLOR_PATTERN.exec(value)
  if (!match) return undefined
  return { hue: Number(match[1]), chroma: Number(match[2]) }
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: string
): value is T {
  return values.some((candidate) => candidate === value)
}

export function lookToSearchParams(look: FabricatorLook) {
  const params = new URLSearchParams()
  if (!sameTint(look.surface, NEUTRAL_TINT)) {
    params.set("surface", writeColor(look.surface))
  }
  for (const role of COLOR_ROLES) {
    if (!sameRoleColor(look.colors[role], ROLE_DEFAULTS[role])) {
      params.set(role, writeColor(look.colors[role]))
    }
  }
  if (look.radius !== DEFAULT_LOOK.radius) params.set("shape", look.radius)
  if (look.motion !== DEFAULT_LOOK.motion) params.set("motion", look.motion)
  if (look.density !== DEFAULT_LOOK.density) {
    params.set("density", look.density)
  }
  return params
}

type ParseResult =
  | { success: true; look: FabricatorLook }
  | { success: false; error: string }

const COLOR_HINT = "Use <hue>_<chroma>, for example 260_0.2."

export function parseLook(searchParams: URLSearchParams): ParseResult {
  let surface = DEFAULT_LOOK.surface
  const surfaceParam = searchParams.get("surface")
  if (surfaceParam !== null) {
    const color = readColor(surfaceParam)
    if (!color) {
      return {
        success: false,
        error: `Invalid "surface": ${surfaceParam}. ${COLOR_HINT}`,
      }
    }
    surface = normalizeTint(color)
  }

  const colors = { ...DEFAULT_LOOK.colors }
  for (const role of COLOR_ROLES) {
    const roleParam = searchParams.get(role)
    if (roleParam === null) continue
    const color = readColor(roleParam)
    if (!color) {
      return {
        success: false,
        error: `Invalid "${role}": ${roleParam}. ${COLOR_HINT}`,
      }
    }
    colors[role] = normalizeRoleColor(role, color)
  }

  const shape = searchParams.get("shape") ?? DEFAULT_LOOK.radius
  if (!isOneOf(LOOK_SHAPES, shape)) {
    return {
      success: false,
      error: `Invalid "shape": ${shape}. Use one of: ${LOOK_SHAPES.join(", ")}.`,
    }
  }

  const motion = searchParams.get("motion") ?? DEFAULT_LOOK.motion
  if (!isOneOf(LOOK_MOTIONS, motion)) {
    return {
      success: false,
      error: `Invalid "motion": ${motion}. Use one of: ${LOOK_MOTIONS.join(", ")}.`,
    }
  }

  const density = searchParams.get("density") ?? DEFAULT_LOOK.density
  if (!isOneOf(DENSITY_NAMES, density)) {
    return {
      success: false,
      error: `Invalid "density": ${density}. Use one of: ${DENSITY_NAMES.join(", ")}.`,
    }
  }

  return {
    success: true,
    look: { surface, colors, radius: shape, motion, density },
  }
}

/**
 * The cssVars a look adds on top of the Fabricator palette. A tinted surface
 * or a changed role also points the theme tokens at the live recipes, so they
 * follow `--surface-*` and `--<role>-*` (what the Colors page tells a
 * project to paste).
 */
export function lookCssVars(look: FabricatorLook) {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}

  if (!isNeutralTint(look.surface)) {
    Object.assign(light, {
      "surface-hue": String(look.surface.hue),
      "surface-chroma": String(look.surface.chroma),
      ...SURFACE_PALETTE_LINKS.light,
    })
    Object.assign(dark, SURFACE_PALETTE_LINKS.dark)
  }

  const changedRoles = COLOR_ROLES.filter(
    (role) => !sameRoleColor(look.colors[role], ROLE_DEFAULTS[role])
  )
  for (const role of changedRoles) {
    light[`${role}-hue`] = String(look.colors[role].hue)
    light[`${role}-chroma`] = String(look.colors[role].chroma)
  }
  if (changedRoles.some((role) => PALETTE_ROLES.includes(role))) {
    Object.assign(light, ROLE_PALETTE_LINKS.light)
    Object.assign(dark, ROLE_PALETTE_LINKS.dark)
  }

  if (look.radius === "pill") light.radius = PILL_RADIUS

  if (look.motion === "off") {
    light["motion-scale"] = "0"
  } else if (look.motion !== DEFAULT_MOTION_SPEED) {
    Object.assign(light, toMotionVars(MOTION_SPEEDS[look.motion]))
  }

  // The project's density sits in :root; data-density still switches any
  // part of the page.
  if (look.density !== DEFAULT_DENSITY) {
    Object.assign(light, toDensityVars(DENSITIES[look.density]))
  }

  return { light, dark }
}
