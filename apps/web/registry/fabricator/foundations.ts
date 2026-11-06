// Fabricator UI foundations: surfaces, interaction overlays, focus, motion,
// density and scrollbars.
//
// This module is the single source of truth. The registry build turns it into
// the `foundations` registry item (installed with every Fabricator
// component), the /init payload adds it to new projects, and the website's
// app/fabricator.css is generated from it.
//
// Every token here has a new name, so installing it never overwrites a
// project's shadcn tokens (AGENTS.md, contract item 4). The Fabricator colour
// palette for the shadcn token names lives in FABRICATOR_PALETTE below and is
// only applied by the `fabricator` preset. The colour roles (primary,
// secondary, info, success, warning, destructive) come from color-roles.ts.

import type { CssObject } from "@/registry/fabricator/css-object"
import { DENSITY_CSS } from "@/registry/fabricator/density"
import {
  FABRICATOR_PALETTE,
  FABRICATOR_TOKENS,
  PALETTE_LINKS,
  SURFACE_PALETTE_LINKS,
  type CssVars,
} from "@/registry/fabricator/foundation-tokens"
import { MOTION_CSS } from "@/registry/fabricator/motion"

export type { CssObject }
export { FABRICATOR_PALETTE, PALETTE_LINKS, SURFACE_PALETTE_LINKS }

// --- Foundations ------------------------------------------------------------

export const FABRICATOR_FOUNDATIONS: { cssVars: CssVars; css: CssObject } = {
  cssVars: FABRICATOR_TOKENS,
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
      // keep their fades and drop slides, zooms, blur and the press.
      // `!important` in the base layer beats the motion utilities and the
      // speed switches, whatever speed is set.
      "@media (prefers-reduced-motion: reduce)": {
        "*, ::before, ::after": {
          "--tw-enter-translate-x": "0 !important",
          "--tw-enter-translate-y": "0 !important",
          "--tw-exit-translate-x": "0 !important",
          "--tw-exit-translate-y": "0 !important",
          "--tw-enter-scale": "1 !important",
          "--tw-exit-scale": "1 !important",
          "--tw-enter-blur": "0 !important",
          "--tw-exit-blur": "0 !important",
          "--motion-press-scale": "1 !important",
        },
      },
    },
    // Speeds (data-motion) and the motion utilities (motion-popup, …).
    ...MOTION_CSS,
    // Densities (data-density) and the density-* utilities.
    ...DENSITY_CSS,
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
 * stylesheet defines later in the same file. The palette is linked to the
 * surfaces and the colour roles, so the site's settings retint everything.
 */
export function toFabricatorStylesheet({
  light = "html:root",
  dark = "html.dark",
}: { light?: string; dark?: string } = {}) {
  return [
    "/* Generated from registry/fabricator/foundations.ts by scripts/build-registry.mts. Do not edit. */",
    `${light} {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.light, ...FABRICATOR_PALETTE.light, ...PALETTE_LINKS.light })}\n}`,
    `${dark} {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.dark, ...FABRICATOR_PALETTE.dark, ...PALETTE_LINKS.dark })}\n}`,
    `@theme inline {\n${vars({ ...FABRICATOR_FOUNDATIONS.cssVars.theme, ...FABRICATOR_PALETTE.theme })}\n}`,
    serializeCss(FABRICATOR_FOUNDATIONS.css),
    "",
  ].join("\n\n")
}
