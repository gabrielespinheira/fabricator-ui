// The App Shell playground (/app-shell): the options it offers, read from and
// written to the URL, so a configuration is a link.

import {
  createLoader,
  parseAsBoolean,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server"

import type {
  ShellOptionKey,
  ShellProject,
} from "@/registry/fabricator/app-shell-options"
import { getTrafficLights } from "@/registry/fabricator/shared/lib/desktop-window"
import type { AppShellWindow } from "@/styles/base-fabricator/ui/app-shell"

export {
  getHiddenShellOptions,
  getTabChoices,
  isPeekAvailable,
  SIDEBAR_COLLAPSE_CHOICES,
  SIDEBAR_VARIANT_CHOICES,
  TAB_PLACEMENT_CHOICES,
  type ShellProject,
} from "@/registry/fabricator/app-shell-options"
export { getTrafficLights }

export const SIDEBAR_VARIANTS = ["inset", "sidebar", "floating"] as const
export const SIDEBAR_COLLAPSE = ["icon", "offcanvas", "none"] as const
export const SIDEBAR_PEEK = ["none", "hover", "click"] as const
export const MOBILE_SIDEBARS = ["reveal", "sheet"] as const
export const SWITCHER_VARIANTS = ["menu", "command", "none"] as const
export const ACCOUNT_PLACEMENTS = ["footer", "header", "none"] as const
export const TAB_PLACEMENTS = ["none", "main", "titlebar"] as const
export const CONTENT_SIZES = ["sm", "md", "lg"] as const
export const PANEL_MOBILE = ["drawer", "swap", "none"] as const
export const BOTTOM_NAV_STYLES = ["flat", "floating", "glass"] as const
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
  // React Native only: its example's card sets it, and so does /create for a project with a React Native app.
  bottomNavStyle: parseAsStringLiteral(BOTTOM_NAV_STYLES).withDefault("flat"),
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

/** The App Shell's own page shows every app but React Native, which has its own example. */
export const PLAYGROUND_PROJECT: ShellProject = {
  hasWeb: true,
  hasDesktop: true,
  hasMobile: false,
}

/** The tab bar's style only reaches a React Native app. */
export const PLAYGROUND_HIDDEN_OPTIONS: ReadonlySet<ShellOptionKey> = new Set([
  "bottomNavStyle",
])

/** Says where an option applies, when some of a project's apps don't honour it. */
export function getShellOptionNotes({
  hasWeb,
  hasDesktop,
  hasMobile,
}: ShellProject): Partial<Record<ShellOptionKey, string>> {
  const isMixed = hasMobile && (hasWeb || hasDesktop)
  return {
    ...(isMixed ? { peek: "Web and desktop only." } : {}),
    ...(hasDesktop ? { glass: "macOS only." } : {}),
    // The preview is the website's shell, whose tab bar has one look.
    ...(hasMobile
      ? { bottomNavStyle: "In the React Native app; the preview stays flat." }
      : {}),
  }
}

export type PreviewSize = "browser" | "macos" | "windows" | "phone"

/** What the preview can show, for the apps a project has. */
export function getPreviewChoices({
  hasWeb,
  hasDesktop,
  hasMobile,
}: ShellProject): ReadonlyArray<{ value: PreviewSize; label: string }> {
  return [
    ...(hasWeb ? [{ value: "browser" as const, label: "Browser" }] : []),
    ...(hasDesktop
      ? [
          { value: "macos" as const, label: "macOS" },
          { value: "windows" as const, label: "Windows" },
        ]
      : []),
    {
      value: "phone" as const,
      label: hasMobile ? "Phone" : "Phone width",
    },
  ]
}

/**
 * The native window the shell lays out around (none on the web). Tauri keeps its
 * own title bar on Windows, and can't move the macOS lights after launch, so its
 * titlebar row stays tall.
 */
export function getPlaygroundWindow(
  options: PlaygroundOptions,
  runtime?: "electron" | "tauri"
): AppShellWindow | undefined {
  if (options.window === "macos") {
    return {
      controls: "macos",
      isFullscreen: options.fullscreen,
      trafficLights: getTrafficLights(
        options.tabs === "titlebar" && runtime !== "tauri"
      ),
      isTranslucent: options.glass,
    }
  }
  if (options.window === "windows" && runtime !== "tauri") {
    // A browser has no Window Controls Overlay to report the buttons'
    // width: three 46px buttons.
    return {
      controls: "overlay",
      isFullscreen: options.fullscreen,
      overlayWidth: 138,
      // A project's Electron app sets no material on Windows.
      isTranslucent: options.glass && !runtime,
    }
  }
  return undefined
}
