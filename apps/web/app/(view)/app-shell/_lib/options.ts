// The App Shell playground (/app-shell): the options it offers, read from and
// written to the URL, so a configuration is a link.

import {
  createLoader,
  parseAsBoolean,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server"

import type { AppShellWindow } from "@/styles/base-fabricator/ui/app-shell"

export const SIDEBAR_VARIANTS = ["inset", "sidebar", "floating"] as const
export const SIDEBAR_COLLAPSE = ["icon", "offcanvas", "none"] as const
export const SIDEBAR_PEEK = ["none", "hover", "click"] as const
export const MOBILE_SIDEBARS = ["reveal", "sheet"] as const
export const SWITCHER_VARIANTS = ["menu", "command", "none"] as const
export const ACCOUNT_PLACEMENTS = ["footer", "header", "none"] as const
export const TAB_PLACEMENTS = ["none", "main", "titlebar"] as const
export const CONTENT_SIZES = ["sm", "md", "lg"] as const
export const PANEL_MOBILE = ["drawer", "swap", "none"] as const
export const WINDOWS = ["web", "macos", "windows"] as const

export const playgroundParsers = {
  variant: parseAsStringLiteral(SIDEBAR_VARIANTS).withDefault("inset"),
  collapse: parseAsStringLiteral(SIDEBAR_COLLAPSE).withDefault("icon"),
  peek: parseAsStringLiteral(SIDEBAR_PEEK).withDefault("none"),
  mobileSidebar: parseAsStringLiteral(MOBILE_SIDEBARS).withDefault("reveal"),
  switcher: parseAsStringLiteral(SWITCHER_VARIANTS).withDefault("menu"),
  account: parseAsStringLiteral(ACCOUNT_PLACEMENTS).withDefault("footer"),
  customize: parseAsBoolean.withDefault(false),
  reorder: parseAsBoolean.withDefault(true),
  breadcrumb: parseAsBoolean.withDefault(true),
  actions: parseAsBoolean.withDefault(true),
  tabs: parseAsStringLiteral(TAB_PLACEMENTS).withDefault("none"),
  contentSize: parseAsStringLiteral(CONTENT_SIZES).withDefault("md"),
  panel: parseAsBoolean.withDefault(true),
  panelMobile: parseAsStringLiteral(PANEL_MOBILE).withDefault("drawer"),
  status: parseAsBoolean.withDefault(true),
  bottomNav: parseAsBoolean.withDefault(false),
  window: parseAsStringLiteral(WINDOWS).withDefault("web"),
  fullscreen: parseAsBoolean.withDefault(false),
  glass: parseAsBoolean.withDefault(true),
}

export type PlaygroundOptions = inferParserType<typeof playgroundParsers>

export const DEFAULT_PLAYGROUND_OPTIONS: PlaygroundOptions = createLoader(
  playgroundParsers
)(new URLSearchParams())

const OPTION_KEYS = Object.keys(DEFAULT_PLAYGROUND_OPTIONS).filter(
  (key): key is keyof PlaygroundOptions => key in playgroundParsers
)

/** How many options differ from the defaults (the Reset button's count). */
export function countChangedOptions(
  options: PlaygroundOptions,
  defaults: PlaygroundOptions = DEFAULT_PLAYGROUND_OPTIONS
) {
  return OPTION_KEYS.filter((key) => options[key] !== defaults[key]).length
}

/**
 * Where the tab strip goes. Tabs in the page take their own row, unless the
 * header would hold nothing else: then the strip is the header.
 */
export function getTabsPlacement(options: PlaygroundOptions) {
  if (options.tabs !== "main") return options.tabs
  return options.breadcrumb || options.actions ? "row" : "header"
}

/** Peek floats a hidden sidebar out, so it needs the off-canvas collapse. */
export function isPeekAvailable(options: PlaygroundOptions) {
  return options.collapse === "offcanvas"
}

/**
 * Where the example's traffic lights sit: beside the main card's top row, or
 * centred in a titlebar row, which is as tall as the lights need (40px here).
 */
export function getTrafficLights(hasTitlebar: boolean) {
  return { x: 16, y: hasTitlebar ? 13 : 23 }
}

/** The native window the shell lays out around (none on the web). */
export function getPlaygroundWindow(
  options: PlaygroundOptions
): AppShellWindow | undefined {
  if (options.window === "macos") {
    return {
      controls: "macos",
      isFullscreen: options.fullscreen,
      trafficLights: getTrafficLights(options.tabs === "titlebar"),
      isTranslucent: options.glass,
    }
  }
  if (options.window === "windows") {
    // A browser has no Window Controls Overlay to report the buttons'
    // width: three 46px buttons.
    return {
      controls: "overlay",
      isFullscreen: options.fullscreen,
      overlayWidth: 138,
      isTranslucent: options.glass,
    }
  }
  return undefined
}
