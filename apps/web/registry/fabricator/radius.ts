// Fabricator radius: the look's three shapes and the corner roles.
//
// A shape (Rounded, Squircle, Pill) sets each role's corner as
// `control height × ratio + base`. The control height is `--density-36`, so
// corners follow the density and a component's `size`. The roles:
//
// - control: single-line controls (button, input, select trigger, toggle).
// - surface: containers (card, popover, menu, dialog, alert, toast).
// - panel:   large frames (App Shell frame and inset, sheet edges).
// - mark:    small parts (checkbox, kbd, tooltip, inline code).
//
// Layered corners stay concentric: an inner corner is the outer one minus the
// distance between the two edges (`--radius-nested` for a row in a `p-1`
// popup, `--radius-inner` for a part inside a control), and a wrapper hugging
// one control is the control's corner plus the distance (`--radius-wrap` for
// a track with `p-(--density-4)`). Other gaps write the same sum inline:
// `rounded-[calc(var(--radius-control)+var(--density-8))]`.
//
// Style maps write `rounded-(--radius-control)` and friends: CSS variables, so
// class merging (cn) still lets a consumer's `rounded-none` win. The roles are
// declared on :root and again in every density scope, because a variable is
// resolved where it is declared.
//
// Squircle draws a superellipse `corner-shape` where the browser supports it
// (Chromium 139+, Electron), with radii scaled by SQUIRCLE_CORNER_SCALE, since
// a superellipse at the same radius reads tighter than a round corner.
// Elsewhere it is a slightly softer Rounded. React Native draws iOS's
// continuous corners at the base radii (`borderCurve`), and round corners on
// Android. `__tests__/radius-usage.test.ts` fails on fixed radii in the style
// maps.

import type { CssObject } from "@/registry/fabricator/css-object"

export const RADIUS_SHAPES = ["rounded", "squircle", "pill"] as const
export type RadiusShape = (typeof RADIUS_SHAPES)[number]

export const DEFAULT_RADIUS_SHAPE: RadiusShape = "rounded"

export const RADIUS_ROLES = ["control", "surface", "panel", "mark"] as const
export type RadiusRole = (typeof RADIUS_ROLES)[number]

/** A role's corner: `control height × ratio + base`, in px. */
export type RoleRadius = { ratio: number; base: number }

export const SHAPE_RADII: Record<
  RadiusShape,
  Record<RadiusRole, RoleRadius>
> = {
  // 8px on a 36px control, 12px containers holding 8px rows.
  rounded: {
    control: { ratio: 2 / 9, base: 0 },
    surface: { ratio: 0, base: 12 },
    panel: { ratio: 0, base: 16 },
    mark: { ratio: 0, base: 4 },
  },
  // Softer than Rounded, the proportions of Apple's controls and cards.
  squircle: {
    control: { ratio: 0.25, base: 0 },
    surface: { ratio: 0, base: 14 },
    panel: { ratio: 0, base: 20 },
    mark: { ratio: 0, base: 5 },
  },
  // Capsule controls. Containers stay moderate: half a control plus a popup's
  // 4px padding, so the capsule rows inside a menu are concentric.
  pill: {
    control: { ratio: 0.5, base: 0 },
    surface: { ratio: 0.5, base: 4 },
    panel: { ratio: 0.5, base: 8 },
    mark: { ratio: 0, base: 6 },
  },
}

/** shadcn's `--radius` per shape, for a project's own `rounded-lg`. */
export const SHAPE_ROOT_RADIUS: Record<RadiusShape, string> = {
  rounded: "0.5rem",
  squircle: "0.625rem",
  pill: "0.75rem",
}

/**
 * Squircle's CSS curve. `squircle` (superellipse(2)) covers as much of a
 * corner as a circle about half its radius; superellipse(1.5) scaled by 1.35
 * covers what a circle of the base radius does, eased into the edges like
 * Apple's continuous corners.
 */
export const SQUIRCLE_CORNER_SHAPE = "superellipse(1.5)"

/** How much larger a superellipse radius is than the round one it matches. */
export const SQUIRCLE_CORNER_SCALE = 1.35

/** The padding of menus, selects and other popups around their rows. */
export const POPUP_INSET = 4

/** A role's corner in px, before the squircle scale (what native draws). */
export function getRoleRadius(
  shape: RadiusShape,
  role: RadiusRole,
  controlHeight: number
) {
  const { ratio, base } = SHAPE_RADII[shape][role]
  return controlHeight * ratio + base
}

/** The corner of a layer inside another: outer minus the gap, at least a mark. */
export function getNestedRadius({
  outer,
  inset,
  mark,
}: {
  outer: number
  inset: number
  mark: number
}) {
  return Math.max(mark, outer - inset)
}

/** The corner of a wrapper hugging one control: the control's plus the gap. */
export function getWrappingRadius({
  inner,
  inset,
}: {
  inner: number
  inset: number
}) {
  return inner + inset
}

/** Every corner in px for React Native, which has no calc(). */
export function getNativeRadii(
  shape: RadiusShape,
  density: { space: { 4: number; 36: number } }
) {
  const height = density.space[36]
  const control = getRoleRadius(shape, "control", height)
  const surface = getRoleRadius(shape, "surface", height)
  const panel = getRoleRadius(shape, "panel", height)
  const mark = getRoleRadius(shape, "mark", height)
  return {
    control,
    surface,
    panel,
    mark,
    nested: getNestedRadius({ outer: surface, inset: POPUP_INSET, mark }),
    inner: getNestedRadius({ outer: control, inset: density.space[4], mark }),
    wrap: getWrappingRadius({ inner: control, inset: density.space[4] }),
  }
}

const px = (value: number) => `${value}px`

/** The variables a shape sets on :root, keyed by name without the `--`. */
export function toShapeVars(shape: RadiusShape): Record<string, string> {
  return {
    ...Object.fromEntries(
      RADIUS_ROLES.flatMap((role) => [
        [`radius-${role}-ratio`, String(SHAPE_RADII[shape][role].ratio)],
        [`radius-${role}-base`, px(SHAPE_RADII[shape][role].base)],
      ])
    ),
    "corner-shape": shape === "squircle" ? SQUIRCLE_CORNER_SHAPE : "round",
    ...(shape === "squircle" && {
      "radius-squircle-scale": String(SQUIRCLE_CORNER_SCALE),
    }),
  }
}

/** The shape variables that differ from Rounded, for a look's cssVars. */
export function toChangedShapeVars(shape: RadiusShape) {
  const defaults = toShapeVars(DEFAULT_RADIUS_SHAPE)
  return Object.fromEntries(
    Object.entries(toShapeVars(shape)).filter(
      ([name, value]) => defaults[name] !== value
    )
  )
}

/**
 * The role corners, resolved wherever they are declared: :root and every
 * density scope (density.ts adds them to its switches and utilities).
 */
export const RADIUS_ROLE_VARS: Record<string, string> = {
  ...Object.fromEntries(
    RADIUS_ROLES.map((role) => [
      `radius-${role}`,
      `calc((var(--density-36) * var(--radius-${role}-ratio, 0) + var(--radius-${role}-base, 0px)) * var(--radius-corner-scale, 1))`,
    ])
  ),
  // A row in a popup's `p-1`.
  "radius-nested": `max(var(--radius-mark), calc(var(--radius-surface) - ${px(POPUP_INSET)}))`,
  // A small part inside a control: an input group's button, a chip.
  "radius-inner":
    "max(var(--radius-mark), calc(var(--radius-control) - var(--density-4)))",
  // A track or group hugging controls with `p-(--density-4)`.
  "radius-wrap": "calc(var(--radius-control) + var(--density-4))",
}

/**
 * The corner shape for every element, in the base layer (a variable, so
 * Squircle switches it in one place). Round things (`rounded-full`) stay
 * circles.
 */
export const RADIUS_BASE_CSS: CssObject = {
  "*, ::before, ::after": {
    "corner-shape": "var(--corner-shape, round)",
  },
  "[class*='rounded-full'], [class*='rounded-full']::before, [class*='rounded-full']::after":
    { "corner-shape": "round" },
}

/** Scales the roles only where `corner-shape` draws, so a fallback stays put. */
export const RADIUS_SUPPORTS_CSS: CssObject = {
  "@supports (corner-shape: squircle)": {
    ":root": {
      "--radius-corner-scale": "var(--radius-squircle-scale, 1)",
    },
  },
}
