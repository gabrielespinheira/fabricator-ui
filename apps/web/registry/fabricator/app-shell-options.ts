// The App Shell's options as every card lays them out: what applies everywhere
// first, then what only wide screens or only phones can show. The website's cards
// and the React Native example's both render this, so they can't drift apart. A card
// inside a running shell passes its platform, and shows only what that shell can
// preview; a setup page, which writes the command for every app, shows it all.

export type ShellOptionValues = {
  variant: "inset" | "sidebar" | "floating"
  collapse: "icon" | "offcanvas" | "none"
  peek: "none" | "hover" | "click"
  mobileSidebar: "reveal" | "sheet"
  switcher: "menu" | "command" | "none"
  account: "footer" | "header" | "none"
  customize: boolean
  reorder: boolean
  breadcrumb: boolean
  actions: boolean
  tabs: "none" | "main" | "titlebar"
  contentSize: "sm" | "md" | "lg"
  panel: boolean
  panelMobile: "drawer" | "swap" | "none"
  status: boolean
  bottomNav: boolean
  bottomNavStyle: "flat" | "floating" | "glass"
  window: "web" | "macos" | "windows"
  fullscreen: boolean
  glass: boolean
}

export type ShellOptionKey = keyof ShellOptionValues

/** Which apps a project's shell is for. */
export type ShellProject = {
  hasWeb: boolean
  hasDesktop: boolean
  hasMobile: boolean
}

type ChoiceKey = {
  [Key in ShellOptionKey]: ShellOptionValues[Key] extends boolean ? never : Key
}[ShellOptionKey]

type SwitchKey = Exclude<ShellOptionKey, ChoiceKey>

export const SIDEBAR_VARIANT_CHOICES = [
  { value: "inset", label: "Inset" },
  { value: "sidebar", label: "Flush" },
  { value: "floating", label: "Floating" },
] as const

export const SIDEBAR_COLLAPSE_CHOICES = [
  { value: "icon", label: "Icons" },
  { value: "offcanvas", label: "Hide" },
  { value: "none", label: "Never" },
] as const

export const TAB_PLACEMENT_CHOICES = [
  { value: "none", label: "None" },
  { value: "main", label: "Page" },
  { value: "titlebar", label: "Titlebar" },
] as const

export const BOTTOM_NAV_STYLE_CHOICES = [
  { value: "glass", label: "Glass" },
  { value: "floating", label: "Floating" },
  { value: "flat", label: "Flat" },
] as const

const SWITCH_LABELS: Record<SwitchKey, string> = {
  reorder: "Drag to reorder",
  customize: "Pin, hide and customize",
  breadcrumb: "Breadcrumb",
  actions: "Header actions",
  panel: "Right panel",
  status: "Status bar",
  bottomNav: "Show",
  fullscreen: "Fullscreen",
  glass: "Glass sidebar",
}

const CHOICE_FIELDS: {
  [Key in ChoiceKey]: {
    label: string
    choices: readonly { value: ShellOptionValues[Key]; label: string }[]
  }
} = {
  switcher: {
    label: "Workspaces",
    choices: [
      { value: "menu", label: "Menu" },
      { value: "command", label: "Search" },
      { value: "none", label: "None" },
    ],
  },
  account: {
    label: "Account",
    choices: [
      { value: "footer", label: "Bottom" },
      { value: "header", label: "Top" },
      { value: "none", label: "None" },
    ],
  },
  tabs: { label: "Tabs", choices: TAB_PLACEMENT_CHOICES },
  variant: { label: "Style", choices: SIDEBAR_VARIANT_CHOICES },
  collapse: { label: "Collapse", choices: SIDEBAR_COLLAPSE_CHOICES },
  peek: {
    label: "Peek",
    choices: [
      { value: "none", label: "Off" },
      { value: "hover", label: "Hover" },
      { value: "click", label: "Click" },
    ],
  },
  contentSize: {
    label: "Content width",
    choices: [
      { value: "sm", label: "Narrow" },
      { value: "md", label: "Default" },
      { value: "lg", label: "Wide" },
    ],
  },
  window: {
    label: "Runs in",
    choices: [
      { value: "web", label: "Browser" },
      { value: "macos", label: "macOS" },
      { value: "windows", label: "Windows" },
    ],
  },
  mobileSidebar: {
    label: "Sidebar",
    choices: [
      { value: "reveal", label: "Reveal" },
      { value: "sheet", label: "Sheet" },
    ],
  },
  panelMobile: {
    label: "Right panel",
    choices: [
      { value: "drawer", label: "Drawer" },
      { value: "swap", label: "Screen" },
      { value: "none", label: "None" },
    ],
  },
  bottomNavStyle: { label: "Style", choices: BOTTOM_NAV_STYLE_CHOICES },
}

const SECTION_LAYOUT = {
  all: [
    {
      title: "Sidebar",
      keys: ["variant", "switcher", "account", "reorder", "customize"],
    },
    {
      title: "Main",
      keys: ["tabs", "contentSize", "breadcrumb", "actions", "panel"],
    },
  ],
  desktop: [
    { title: "Sidebar", keys: ["collapse", "peek"] },
    { title: "Main", keys: ["status"] },
    { title: "Window", keys: ["window", "fullscreen", "glass"] },
  ],
  mobile: [
    { title: "Opens as", keys: ["mobileSidebar", "panelMobile"] },
    { title: "Bottom nav", keys: ["bottomNav", "bottomNavStyle"] },
  ],
} as const

export type ShellOptionRow = {
  label: string
  /** Where the row applies, or what it's waiting for. */
  note: string | undefined
  isDisabled: boolean
} & (
  | { kind: "switch"; key: SwitchKey }
  | {
      kind: "choice"
      key: ChoiceKey
      choices: readonly { value: string; label: string }[]
    }
)

export type ShellOptionGroup = {
  title: string
  rows: readonly ShellOptionRow[]
}

export type ShellOptionSection = {
  id: keyof typeof SECTION_LAYOUT
  title: string
  description: string
  groups: readonly ShellOptionGroup[]
}

/** The platform section a running shell can preview. */
export type ShellPlatform = Exclude<ShellOptionSection["id"], "all">

/** Below the tablet size, a shell previews the mobile section. */
export function getShellPlatform({
  isPhone,
}: {
  isPhone: boolean
}): ShellPlatform {
  return isPhone ? "mobile" : "desktop"
}

/**
 * What a phone's layout never draws, though it applies everywhere else: its sidebar
 * opens over or beside the page, and any column is wider than its screen.
 */
const WIDE_SCREEN_OPTIONS: ReadonlySet<ShellOptionKey> = new Set([
  "variant",
  "contentSize",
])

type ShellOptionContext = {
  options: ShellOptionValues
  project: ShellProject
  /** Options this shell can't honour. */
  hidden?: ReadonlySet<ShellOptionKey>
  /** Shows only what this platform can preview. Left out, every section. */
  platform?: ShellPlatform
  /** Where an option applies, when it isn't everywhere. */
  notes?: Partial<Record<ShellOptionKey, string>>
}

/** Peek floats a hidden sidebar out, so it needs the off-canvas collapse. */
export function isPeekAvailable({
  collapse,
}: Pick<ShellOptionValues, "collapse">) {
  return collapse === "offcanvas"
}

/** Tabs in the titlebar need a window around them. */
export function getTabChoices({ hasDesktop }: ShellProject) {
  return TAB_PLACEMENT_CHOICES.filter(
    ({ value }) => hasDesktop || value !== "titlebar"
  )
}

/**
 * The options a project's shell can't honour. `window` and `fullscreen` only
 * choose what the preview draws, which follows the project's apps instead.
 */
export function getHiddenShellOptions({
  hasWeb,
  hasDesktop,
  hasMobile,
}: ShellProject): ReadonlySet<ShellOptionKey> {
  const hasPointer = hasWeb || hasDesktop
  return new Set<ShellOptionKey>([
    "window",
    "fullscreen",
    ...(hasDesktop ? [] : (["glass"] as const)),
    ...(hasPointer ? [] : (["peek"] as const)),
    ...(hasMobile ? [] : (["bottomNavStyle"] as const)),
  ])
}

function isChoiceKey(key: ShellOptionKey): key is ChoiceKey {
  return key in CHOICE_FIELDS
}

function getRequirement(
  key: ShellOptionKey,
  { options, hidden }: ShellOptionContext
) {
  if (key === "peek" && !isPeekAvailable(options)) {
    return "Needs Collapse set to Hide."
  }
  if (key === "panelMobile" && !options.panel) {
    return "Needs the right panel on."
  }
  if (key === "bottomNavStyle" && !options.bottomNav) {
    return "Needs the bottom nav on."
  }
  // Without a choice of runtime, the real window decides what applies.
  const isWindowOff = !hidden?.has("window") && options.window === "web"
  if ((key === "fullscreen" || key === "glass") && isWindowOff) {
    return "Needs macOS or Windows."
  }
  return undefined
}

function getRow(
  key: ShellOptionKey,
  context: ShellOptionContext
): ShellOptionRow {
  const requirement = getRequirement(key, context)
  const state = {
    note: requirement ?? context.notes?.[key],
    isDisabled: requirement !== undefined,
  }
  if (!isChoiceKey(key)) {
    return { kind: "switch", key, label: SWITCH_LABELS[key], ...state }
  }
  const { label, choices } = CHOICE_FIELDS[key]
  return {
    kind: "choice",
    key,
    label,
    choices: key === "tabs" ? getTabChoices(context.project) : choices,
    ...state,
  }
}

function describeWideScreens({ hasDesktop, hasMobile }: ShellProject) {
  if (hasDesktop && hasMobile) {
    return "Wide browser windows, desktop apps and tablets."
  }
  if (hasDesktop) return "Wide browser windows and desktop apps."
  if (hasMobile) return "Wide browser windows and tablets."
  return "Wide browser windows."
}

function getSectionText({
  id,
  project,
}: {
  id: ShellOptionSection["id"]
  project: ShellProject
}) {
  const isNativeOnly = !project.hasWeb && !project.hasDesktop
  if (id === "all") {
    return { title: "All platforms", description: "Wherever the shell runs." }
  }
  if (id === "desktop") {
    return isNativeOnly
      ? { title: "Tablets", description: "iPad and Android tablets." }
      : { title: "Desktop", description: describeWideScreens(project) }
  }
  return isNativeOnly
    ? { title: "Phones", description: "iPhone and Android phones." }
    : { title: "Mobile", description: "Phones and narrow windows." }
}

/** The sections a card shows, in order, with what each row needs to draw itself. */
export function getShellOptionSections(
  context: ShellOptionContext
): readonly ShellOptionSection[] {
  const { project, hidden, platform } = context
  const isNativeOnly = !project.hasWeb && !project.hasDesktop
  const order = isNativeOnly
    ? (["all", "mobile", "desktop"] as const)
    : (["all", "desktop", "mobile"] as const)
  const isOffered = (key: ShellOptionKey) =>
    !hidden?.has(key) &&
    !(platform === "mobile" && WIDE_SCREEN_OPTIONS.has(key))

  return order
    .filter((id) => !platform || id === "all" || id === platform)
    .map((id) => ({
      id,
      ...getSectionText({ id, project }),
      groups: SECTION_LAYOUT[id]
        .map(({ title, keys }) => ({
          title,
          rows: keys.filter(isOffered).map((key) => getRow(key, context)),
        }))
        .filter(({ rows }) => rows.length > 0),
    }))
    .filter(({ groups }) => groups.length > 0)
}

/**
 * A section's groups in two columns of about the same height, in order. It goes by
 * rows, so a note appearing doesn't move a group across.
 */
export function splitShellOptionGroups(
  groups: readonly ShellOptionGroup[]
): readonly [readonly ShellOptionGroup[], readonly ShellOptionGroup[]] {
  const countRows = (part: readonly ShellOptionGroup[]) =>
    part.reduce((total, { rows }) => total + rows.length, 0)
  let split = Math.min(groups.length, 1)
  let smallestGap = Number.POSITIVE_INFINITY
  for (let index = 1; index < groups.length; index += 1) {
    const gap = Math.abs(
      countRows(groups.slice(0, index)) - countRows(groups.slice(index))
    )
    if (gap <= smallestGap) {
      smallestGap = gap
      split = index
    }
  }
  return [groups.slice(0, split), groups.slice(split)]
}
