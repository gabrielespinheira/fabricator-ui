import type * as React from "react"

import { COLOR_ROLES } from "@/registry/fabricator/color-roles"
import {
  FABRICATOR_FOUNDATIONS,
  FABRICATOR_PALETTE,
  PALETTE_LINKS,
} from "@/registry/fabricator/foundations"

// The site settings on <html> (surface tint, colour roles, radius, motion
// speed) stay out of a scene, so it inherits them.
const SITE_SETTING_VARS = new RegExp(
  `^(surface-(hue|chroma)|(${COLOR_ROLES.join("|")})-(hue|chroma)|radius|motion)`
)

/**
 * Each theme's tokens as inline custom properties, so a scene renders in one
 * theme whatever the site's theme. The surfaces and roles stay calc()
 * expressions, so they read the live settings from <html>. Utilities with a
 * `dark:` variant still follow the site's theme.
 */
function themeVars(mode: "light" | "dark") {
  const vars = {
    ...FABRICATOR_FOUNDATIONS.cssVars[mode],
    ...FABRICATOR_PALETTE[mode],
    ...PALETTE_LINKS[mode],
  }
  return {
    colorScheme: mode,
    ...Object.fromEntries(
      Object.entries(vars)
        .filter(([name]) => !SITE_SETTING_VARS.test(name))
        .map(([name, value]) => [`--${name}`, value])
    ),
  } as React.CSSProperties
}

export const THEME_VARS = { light: themeVars("light"), dark: themeVars("dark") }
