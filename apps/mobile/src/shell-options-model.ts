// What the App Shell card offers: the website's options under the website's
// names, so the card's install command is the website's too. A test in apps/web
// reads the command back through the endpoint's own parsers.

import {
  getHiddenShellOptions,
  TAB_BAR_STYLE_CHOICES,
  type ShellOptionKey,
  type ShellOptionValues,
  type ShellProject,
} from "@/registry/fabricator/app-shell-options"

export type ShellOptions = ShellOptionValues

/** A React Native project: the sections and rows the card shows follow from it. */
export const NATIVE_PROJECT: ShellProject = {
  hasWeb: false,
  hasDesktop: false,
  hasMobile: true,
}

/** Left out: Peek (nothing hovers) and Window (the system owns it). */
export const NATIVE_HIDDEN_OPTIONS = getHiddenShellOptions(NATIVE_PROJECT)

/**
 * What this card leaves out on this device. On a phone the library floats the primary
 * action over the page, and this example shows no floating button.
 */
export function getNativeHiddenOptions({
  isPhone,
}: {
  isPhone: boolean
}): ReadonlySet<ShellOptionKey> {
  return isPhone
    ? new Set<ShellOptionKey>([...NATIVE_HIDDEN_OPTIONS, "actions"])
    : NATIVE_HIDDEN_OPTIONS
}

const SITE_URL = "https://fabricator-ui.vercel.app"

const WEBSITE_DEFAULTS: ShellOptions = {
  variant: "inset",
  collapse: "offcanvas",
  peek: "none",
  mobileSidebar: "reveal",
  switcher: "menu",
  account: "footer",
  reorder: true,
  customize: false,
  tabs: "none",
  contentSize: "md",
  breadcrumb: true,
  actions: true,
  status: true,
  bottomNav: false,
  bottomNavStyle: "glass",
  panel: true,
  panelMobile: "drawer",
  window: "web",
  fullscreen: false,
  glass: true,
}

function getOptionKeys(options: ShellOptions) {
  return Object.keys(WEBSITE_DEFAULTS).filter(
    (key): key is keyof ShellOptions => key in options
  )
}

/** The website's defaults, for an app: a tab bar, in the best style it can draw. */
export function getDefaultShellOptions({
  hasGlass,
}: {
  hasGlass: boolean
}): ShellOptions {
  return {
    ...WEBSITE_DEFAULTS,
    bottomNav: true,
    bottomNavStyle: hasGlass ? "glass" : "flat",
  }
}

/** Glass stays on the list: a build that can't draw it says why. */
export function getTabBarStyleChoices({ hasGlass }: { hasGlass: boolean }) {
  return TAB_BAR_STYLE_CHOICES.map((choice) => ({
    ...choice,
    disabled: choice.value === "glass" && !hasGlass,
  }))
}

/** How many options differ from the defaults (the Reset button's count). */
export function countChangedOptions(
  options: ShellOptions,
  defaults: ShellOptions
) {
  return getOptionKeys(options).filter((key) => options[key] !== defaults[key])
    .length
}

/** What this build can't draw, beside the row that asks for it. */
export function getOptionNotes({
  hasGlass,
}: {
  hasGlass: boolean
}): Partial<Record<keyof ShellOptions, string>> {
  return hasGlass
    ? {}
    : {
        bottomNavStyle:
          "Glass needs iOS 26 and a build with its module: bun run mobile.",
      }
}

/**
 * Installs the shell with these choices. Naming `app-shell` as well as the URL
 * makes the CLI add the `@fabricator` registry the URL's dependencies need.
 */
export function buildInstallCommand(options: ShellOptions) {
  const params = new URLSearchParams()
  // A switched-off part's choice wouldn't change the file.
  const installed: ShellOptions = {
    ...options,
    bottomNavStyle: options.bottomNav
      ? options.bottomNavStyle
      : WEBSITE_DEFAULTS.bottomNavStyle,
    panelMobile: options.panel
      ? options.panelMobile
      : WEBSITE_DEFAULTS.panelMobile,
  }
  for (const key of getOptionKeys(installed)) {
    if (installed[key] !== WEBSITE_DEFAULTS[key]) {
      params.set(key, String(installed[key]))
    }
  }
  params.set("platform", "native")
  return `npx fabricator-ui@latest add app-shell "${SITE_URL}/init/app-shell?${params}"`
}
