// Fabricator loader: how a placeholder looks while content loads.
//
// Two loaders set the same tokens: skeleton (a quiet block that pulses, the
// default) and blueprint. The blueprint is for base components: a
// placeholder the size of a control (a button, an input, a badge, an
// avatar, a line of text) is drawn as its own dotted outline, with a pen
// tracing it from the top centre round both sides to the bottom and erasing
// it again, as the Blueprint component draws an outline. Layout and
// structure (a panel, a card's content area, a plot, a page) stay calm: the
// same quiet block as the skeleton. The style maps tell them apart by the
// placeholder's height (`loader-control` tokens up to LOADER_CONTROL_MAX).
//
// The default is in :root; `data-loader="<name>"` on <html> or on any
// element switches everything inside it, and the `loader-<name>` utilities
// do the same from a class. `--loader` holds the name for code that needs to
// know it. The trace is timed by the reveal motion role and stops when
// motion is off; the style maps stop it under Reduce Motion, leaving the
// outline.

import type { CssObject } from "@/registry/fabricator/css-object"

export const LOADER_NAMES = ["skeleton", "blueprint"] as const

export type LoaderName = (typeof LOADER_NAMES)[number]

export const DEFAULT_LOADER: LoaderName = "skeleton"

export function isLoaderName(value: unknown): value is LoaderName {
  return LOADER_NAMES.some((name) => name === value)
}

const TRACE_KEYFRAMES = "fabricator-loader-trace"

// The blueprint's ink and pen, the same mixes as the Blueprint component's
// drawing, so a placeholder and a sketch read as one hand.
const INK = "color-mix(in oklab, var(--muted-foreground) 38%, transparent)"
const PEN = "color-mix(in oklab, var(--foreground) 34%, transparent)"

// One trace every three reveals (2.1s at the default speed), on the soft
// in-out curve: drawn in the first half, erased in the second.
const TRACE = `${TRACE_KEYFRAMES} calc(var(--motion-reveal) * 3 * var(--motion-scale, 1)) cubic-bezier(0.65, 0, 0.35, 1) infinite`

/**
 * The tallest placeholder drawn as a control, in rem: a spacious input
 * (44px) with room to spare. Taller ones are layout and stay calm.
 */
export const LOADER_CONTROL_MAX = "3.5rem"

/** Every loader token, by loader, without the leading `--`. */
export const LOADERS: Record<LoaderName, Record<string, string>> = {
  skeleton: {
    loader: "skeleton",
    // Layout and structure: a quiet block that pulses.
    "loader-fill": "var(--hover)",
    "loader-animation": "var(--animate-pulse)",
    // Controls: the same block.
    "loader-control-fill": "var(--hover)",
    "loader-control-animation": "var(--animate-pulse)",
    "loader-outline": "transparent",
    "loader-outline-width": "0px",
    // The pen's stroke: not drawn.
    "loader-pen": "transparent",
    "loader-trace": "none",
  },
  blueprint: {
    loader: "blueprint",
    // Layout and structure stay calm: the skeleton's block.
    "loader-fill": "var(--hover)",
    "loader-animation": "var(--animate-pulse)",
    // Controls: no fill, a still outline, and the pen tracing it.
    "loader-control-fill": "transparent",
    "loader-control-animation": "none",
    "loader-outline": INK,
    "loader-outline-width": "1.5px",
    "loader-pen": PEN,
    "loader-trace": TRACE,
  },
}

const vars = (entries: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, value]) => [`--${name}`, value])
  )

/**
 * Loader switches, utilities and the trace, in the shape of a registry
 * item's `css` field. The selectors are one notch more specific than :root,
 * so they win on <html>, and plain attribute selectors anywhere else.
 */
export const LOADER_CSS: CssObject = {
  ...Object.fromEntries(
    LOADER_NAMES.map((name) => [
      `:root[data-loader="${name}"], [data-loader="${name}"]`,
      vars(LOADERS[name]),
    ])
  ),
  ...Object.fromEntries(
    LOADER_NAMES.map((name) => [`@utility loader-${name}`, vars(LOADERS[name])])
  ),
  // The pen's two angles, each side of the top centre: the style maps show
  // the pen between them (a conic mask on the placeholder's trace). They
  // animate, so they are registered as angles.
  "@property --loader-head": {
    syntax: '"<angle>"',
    inherits: "false",
    "initial-value": "0deg",
  },
  "@property --loader-tail": {
    syntax: '"<angle>"',
    inherits: "false",
    "initial-value": "0deg",
  },
  // Both halves draw from the top centre to the bottom, then the tail
  // follows the head and erases them.
  [`@keyframes ${TRACE_KEYFRAMES}`]: {
    "0%": { "--loader-head": "0deg", "--loader-tail": "0deg" },
    "50%": { "--loader-head": "180deg", "--loader-tail": "0deg" },
    "100%": { "--loader-head": "180deg", "--loader-tail": "180deg" },
  },
}

/** The default loader's tokens, for :root. */
export const LOADER_ROOT_VARS: Record<string, string> = LOADERS[DEFAULT_LOADER]
