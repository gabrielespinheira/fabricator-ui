// What the App Shell card offers: the website's options under the website's
// names, so the card's install command is the website's too. A test in apps/web
// reads the command back through the endpoint's own parsers.

export type TabBarStyle = "flat" | "glass" | "floating"

/**
 * Left out, as for any React Native project on the website: Peek (nothing hovers)
 * and Window (the system owns it). Tabs have no titlebar to go in.
 */
export type ShellOptions = {
  variant: "inset" | "sidebar" | "floating"
  collapse: "icon" | "offcanvas" | "none"
  mobileSidebar: "reveal" | "sheet"
  switcher: "menu" | "command" | "none"
  account: "footer" | "header" | "none"
  reorder: boolean
  customize: boolean
  tabs: "none" | "main"
  contentSize: "sm" | "md" | "lg"
  breadcrumb: boolean
  actions: boolean
  status: boolean
  bottomNav: boolean
  bottomNavStyle: TabBarStyle
  panel: boolean
  panelMobile: "drawer" | "swap" | "none"
}

const SITE_URL = "https://fabricator-ui.vercel.app"

const WEBSITE_DEFAULTS: ShellOptions = {
  variant: "inset",
  collapse: "icon",
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
  bottomNavStyle: "flat",
  panel: true,
  panelMobile: "drawer",
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
  return [
    { value: "flat", label: "Flat" },
    { value: "glass", label: "Glass", disabled: !hasGlass },
    { value: "floating", label: "Floating" },
  ] as const
}

/** How many options differ from the defaults (the Reset button's count). */
export function countChangedOptions(
  options: ShellOptions,
  defaults: ShellOptions
) {
  return getOptionKeys(options).filter((key) => options[key] !== defaults[key])
    .length
}

/** The rows this device can't show the effect of, and where they apply. */
export function getOptionNotes({
  isPhone,
}: {
  isPhone: boolean
}): Partial<Record<keyof ShellOptions, string>> {
  if (isPhone) {
    return {
      variant: "Tablets only.",
      collapse: "Tablets only.",
      contentSize: "Tablets only.",
      actions: "Tablets only.",
      status: "Tablets only.",
    }
  }
  return {
    mobileSidebar: "Phones only.",
    bottomNav: "Phones only.",
    bottomNavStyle: "Phones only.",
    panelMobile: "Phones only.",
  }
}

/**
 * Installs the shell with these choices. Naming `app-shell` as well as the URL
 * makes the CLI add the `@fabricator` registry the URL's dependencies need.
 */
export function buildInstallCommand(options: ShellOptions) {
  const params = new URLSearchParams()
  for (const key of getOptionKeys(options)) {
    if (options[key] !== WEBSITE_DEFAULTS[key]) {
      params.set(key, String(options[key]))
    }
  }
  params.set("platform", "native")
  return `npx fabricator-ui@latest add app-shell "${SITE_URL}/init/app-shell?${params}"`
}
