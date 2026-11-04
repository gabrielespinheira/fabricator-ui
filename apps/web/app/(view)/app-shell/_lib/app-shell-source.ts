// What `/init/app-shell` serves: an App Shell written out from the option cards'
// choices, as a registry item the CLI installs into the project. It uses only
// the parts' shared API, so one source fits every base, and the project's
// components.json resolves the `@fabricator` dependencies to its own.

import { createLoader, createSerializer } from "nuqs/server"

import { FABRICATOR_ICONS_PACKAGE } from "@/registry/fabricator"

import {
  DEFAULT_PLAYGROUND_OPTIONS,
  getTabsPlacement,
  getTrafficLights,
  isPeekAvailable,
  playgroundParsers,
  type PlaygroundOptions,
} from "./options"

const REGISTRY = "@/registry/base-fabricator"
const ICON_PLACEHOLDER = "@/app/(create)/components/icon-placeholder"
const PRINT_WIDTH = 80

const ICONS = {
  home: ["HomeIcon", "IconHome", "Home01Icon", "HouseIcon", "RiHomeLine"],
  inbox: ["InboxIcon", "IconInbox", "InboxIcon", "TrayIcon", "RiInboxLine"],
  projects: ["BoxIcon", "IconBox", "PackageIcon", "PackageIcon", "RiBox3Line"],
  team: ["UsersIcon", "IconUsers", "UserGroupIcon", "UsersIcon", "RiGroupLine"],
  settings: [
    "SettingsIcon",
    "IconSettings",
    "SettingsIcon",
    "GearIcon",
    "RiSettingsLine",
  ],
  share: ["ShareIcon", "IconShare", "Share01Icon", "ShareIcon", "RiShareLine"],
  plus: ["PlusIcon", "IconPlus", "PlusSignIcon", "PlusIcon", "RiAddLine"],
} as const

const blank = (line: string) => line.trim() === ""

function indent(lines: string[], depth: number) {
  return lines.map((line) => (blank(line) ? "" : `${" ".repeat(depth)}${line}`))
}

function icon(name: keyof typeof ICONS) {
  const [lucide, tabler, hugeicons, phosphor, remixicon] = ICONS[name]
  return [
    "<IconPlaceholder",
    `  lucide="${lucide}"`,
    `  tabler="${tabler}"`,
    `  hugeicons="${hugeicons}"`,
    `  phosphor="${phosphor}"`,
    `  remixicon="${remixicon}"`,
    "/>",
  ]
}

/** An `icon` property holding a placeholder. */
function iconProperty(name: keyof typeof ICONS) {
  return ["icon: (", ...indent(icon(name), 2), "),"]
}

function navItem(
  fields: string[],
  iconName: keyof typeof ICONS,
  children?: string[]
) {
  return [
    "{",
    ...indent(fields, 2),
    ...indent(iconProperty(iconName), 2),
    ...indent(children ?? [], 2),
    "},",
  ]
}

/** An opening tag: on one line when it fits, otherwise one attribute per line. */
function openTag(
  tag: string,
  attributes: string[][],
  depth: number,
  selfClosing = false
) {
  const end = selfClosing ? " />" : ">"
  const flat = attributes.map((lines) => lines.join(" "))
  const oneLine = `<${[tag, ...flat].join(" ")}${end}`
  const isFlat = attributes.every((lines) => lines.length === 1)
  if (isFlat && depth + oneLine.length <= PRINT_WIDTH) return [oneLine]
  return [
    `<${tag}`,
    ...attributes.flatMap((lines) => indent(lines, 2)),
    selfClosing ? "/>" : ">",
  ]
}

function importLines(names: string[], from: string) {
  const oneLine = `import { ${names.join(", ")} } from "${from}"`
  if (names.length === 1 || oneLine.length <= PRINT_WIDTH) return [oneLine]
  return ["import {", ...names.map((name) => `  ${name},`), `} from "${from}"`]
}

/**
 * The choices that shape the install: the preview's fullscreen is left out, and
 * so is whatever the other choices rule out, so the URL and the code say only
 * what takes effect.
 */
export function normalizeInstallOptions(
  options: PlaygroundOptions
): PlaygroundOptions {
  const { fullscreen, glass, panelMobile, peek } = DEFAULT_PLAYGROUND_OPTIONS
  return {
    ...options,
    fullscreen,
    peek: isPeekAvailable(options) ? options.peek : peek,
    panelMobile: options.panel ? options.panelMobile : panelMobile,
    glass: options.window === "web" ? glass : options.glass,
  }
}

const serializeOptions = createSerializer(playgroundParsers)

/** The endpoint for these choices: only what differs from the defaults. */
export function buildAppShellInstallUrl(
  options: PlaygroundOptions,
  siteUrl: string,
  iconLibrary = "fabricator"
) {
  const query = serializeOptions(normalizeInstallOptions(options))
  const icons =
    iconLibrary === "fabricator"
      ? ""
      : `${query ? "&" : "?"}iconLibrary=${iconLibrary}`
  return `${siteUrl}/init/app-shell${query}${icons}`
}

/** Reads the endpoint's query; anything unknown keeps its default. */
export function parseAppShellParams(params: URLSearchParams) {
  return normalizeInstallOptions(createLoader(playgroundParsers)(params))
}

/** What the file needs from the registry, for these choices. */
export function getAppShellDependencies(options: PlaygroundOptions) {
  return [
    "app-shell",
    "app-shell-model",
    "app-nav",
    "sidebar",
    "foundations",
    ...(options.account === "none" ? [] : ["user-menu", "dropdown-menu"]),
    ...(options.switcher === "none" ? [] : ["workspace-switcher"]),
    ...(options.tabs === "none" ? [] : ["tab-strip"]),
  ].map((name) => `@fabricator/${name}`)
}

function buildImports(options: PlaygroundOptions) {
  const placement = getTabsPlacement(options)
  const hasTitle = placement !== "header"
  const hasWindow = options.window !== "web"

  const model = [
    ...(options.customize ? ["EMPTY_NAV_PREFERENCES"] : []),
    ...(hasTitle ? ["getActiveNavItem", "getNavPath"] : []),
  ]
  const nav = [
    "AppNav",
    ...(options.bottomNav ? ["AppNavBottomBar"] : []),
    ...(options.customize ? ["AppNavCustomize"] : []),
    "type AppNavGroup",
  ]
  const shell = [
    "AppShell",
    ...(hasTitle && options.breadcrumb ? ["AppShellBreadcrumb"] : []),
    "AppShellContent",
    "AppShellHeader",
    ...(options.actions ? ["AppShellHeaderActions"] : []),
    "AppShellMain",
    ...(options.panel
      ? [
          "AppShellPanel",
          "AppShellPanelClose",
          "AppShellPanelContent",
          "AppShellPanelHeader",
          "AppShellPanelTitle",
          "AppShellPanelTrigger",
        ]
      : []),
    ...(options.status ? ["AppShellStatusBar"] : []),
    ...(placement === "titlebar" ? ["AppShellTitlebar"] : []),
    ...(hasWindow ? ["createLocalStorage"] : []),
    ...(placement === "row" ? ["useDragRegionProps"] : []),
  ]
  const sidebar = [
    "Sidebar",
    "SidebarContent",
    ...(options.account === "footer" || options.customize
      ? ["SidebarFooter"]
      : []),
    "SidebarHeader",
    ...(options.collapse === "none" ? [] : ["SidebarRail"]),
    ...(!hasWindow && options.collapse !== "none" ? ["SidebarTrigger"] : []),
  ]

  return [
    ...(model.length > 0
      ? importLines(model, `${REGISTRY}/lib/app-shell-model`)
      : []),
    ...importLines(nav, `${REGISTRY}/ui/app-nav`),
    ...importLines(shell, `${REGISTRY}/ui/app-shell`),
    ...(options.account === "none"
      ? []
      : importLines(
          ["DropdownMenuGroup", "DropdownMenuItem", "DropdownMenuSeparator"],
          `${REGISTRY}/ui/dropdown-menu`
        )),
    ...importLines(sidebar, `${REGISTRY}/ui/sidebar`),
    ...(options.tabs === "none"
      ? []
      : importLines(
          [
            "TabStrip",
            "TabStripList",
            "TabStripNew",
            "TabStripOverflow",
            "TabStripTab",
            "useTabStripState",
          ],
          `${REGISTRY}/ui/tab-strip`
        )),
    ...(options.account === "none"
      ? []
      : importLines(["UserMenu"], `${REGISTRY}/ui/user-menu`)),
    ...(options.switcher === "none"
      ? []
      : importLines(
          ["WorkspaceSwitcher"],
          `${REGISTRY}/ui/workspace-switcher`
        )),
    ...importLines(["IconPlaceholder"], ICON_PLACEHOLDER),
  ]
}

function buildGroups(options: PlaygroundOptions) {
  const projectChildren = [
    "children: [",
    '  { id: "launch", label: "Q4 launch", href: "/projects/launch" },',
    '  { id: "website", label: "Website", href: "/projects/website" },',
    "],",
  ]
  return [
    "const groups: AppNavGroup[] = [",
    "  {",
    '    id: "main",',
    "    items: [",
    ...indent(
      navItem(['id: "home",', 'label: "Home",', 'href: "/",'], "home"),
      6
    ),
    ...indent(
      navItem(
        ['id: "inbox",', 'label: "Inbox",', 'href: "/inbox",', "badge: 4,"],
        "inbox"
      ),
      6
    ),
    "    ],",
    "  },",
    "  {",
    '    id: "workspace",',
    '    label: "Workspace",',
    "    collapsible: true,",
    ...(options.reorder ? ["    reorderable: true,"] : []),
    "    items: [",
    ...indent(
      navItem(
        ['id: "projects",', 'label: "Projects",', 'href: "/projects",'],
        "projects",
        projectChildren
      ),
      6
    ),
    ...indent(
      navItem(['id: "team",', 'label: "Team",', 'href: "/team",'], "team"),
      6
    ),
    ...indent(
      navItem(
        ['id: "settings",', 'label: "Settings",', 'href: "/settings",'],
        "settings"
      ),
      6
    ),
    "    ],",
    "  },",
    "]",
  ]
}

function buildData(options: PlaygroundOptions) {
  return [
    ...(options.switcher === "none"
      ? []
      : [
          "const workspaces = [",
          '  { id: "acme", name: "Acme Inc", description: "Enterprise" },',
          '  { id: "studio", name: "Fabricator Studio", description: "Pro" },',
          "]",
          "",
        ]),
    ...(options.account === "none"
      ? []
      : [
          'const user = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }',
          "",
        ]),
  ]
}

function buildHelpers(options: PlaygroundOptions) {
  const placement = getTabsPlacement(options)
  return [
    ...(options.account === "none"
      ? []
      : [
          "function UserMenuItems() {",
          "  return (",
          "    <>",
          "      <DropdownMenuGroup>",
          "        <DropdownMenuItem>Profile</DropdownMenuItem>",
          "        <DropdownMenuItem>Notifications</DropdownMenuItem>",
          "      </DropdownMenuGroup>",
          "      <DropdownMenuSeparator />",
          "      <DropdownMenuGroup>",
          "        <DropdownMenuItem>Sign out</DropdownMenuItem>",
          "      </DropdownMenuGroup>",
          "    </>",
          "  )",
          "}",
          "",
        ]),
    ...(placement === "row"
      ? [
          "/** The tab strip as the main column's top row, which moves a desktop window. */",
          "function TabRow({ children }: { children: React.ReactNode }) {",
          "  const dragRegion = useDragRegionProps()",
          "  return (",
          "    <div",
          "      {...dragRegion}",
          '      className="flex h-(--density-48) shrink-0 items-center gap-(--density-8) pe-(--app-shell-control-inset) [&>[data-slot=tab-strip]]:-me-(--density-6)"',
          "    >",
          "      {children}",
          "    </div>",
          "  )",
          "}",
          "",
        ]
      : []),
    ...(options.tabs === "none"
      ? []
      : [
          "function DocumentTabs() {",
          "  const [titles, setTitles] = React.useState<Record<string, string>>({",
          '    home: "Home",',
          "  })",
          "  const tabs = useTabStripState({",
          "    defaultState: {",
          '      tabs: ["home"],',
          "      pinned: [],",
          '      recent: ["home"],',
          "      preview: null,",
          "      closed: [],",
          "    },",
          "  })",
          "  const openNewTab = () => {",
          "    const id = crypto.randomUUID()",
          '    setTitles((current) => ({ ...current, [id]: "New tab" }))',
          "    tabs.open(id)",
          "  }",
          "  return (",
          "    <TabStrip",
          "      {...tabs.stripProps}",
          "      onNew={openNewTab}",
          '      className="min-w-0 flex-1"',
          "    >",
          '      <TabStripList aria-label="Open documents">',
          "        {tabs.state.tabs.map((id) => (",
          "          <TabStripTab key={id} value={id}>",
          "            {titles[id]}",
          "          </TabStripTab>",
          "        ))}",
          "      </TabStripList>",
          "      <TabStripNew />",
          "      <TabStripOverflow />",
          "    </TabStrip>",
          "  )",
          "}",
          "",
        ]),
  ]
}

function buildWindowAttribute(options: PlaygroundOptions) {
  if (options.window === "web") return []
  const translucent = options.glass ? ["  isTranslucent: true,"] : []
  return [
    [
      "window={{",
      ...(options.window === "macos"
        ? [
            '  controls: "macos",',
            `  trafficLights: { x: ${getTrafficLights(options.tabs === "titlebar").x}, y: ${getTrafficLights(options.tabs === "titlebar").y} },`,
          ]
        : ['  controls: "overlay",']),
      ...translucent,
      "}}",
    ],
  ]
}

function buildSidebar(options: PlaygroundOptions) {
  const hasWindow = options.window !== "web"
  const account = options.account
  const headerChildren = [
    ...(account === "header"
      ? [
          '<UserMenu variant="mark" align="start" user={user}>',
          "  <UserMenuItems />",
          "</UserMenu>",
        ]
      : []),
    ...(options.switcher === "none"
      ? [
          "<a",
          '  href="/"',
          '  className="flex h-8 items-center px-2 text-lg font-semibold tracking-tight"',
          ">",
          "  Acme Inc",
          "</a>",
        ]
      : [
          '<div className="min-w-0 flex-1">',
          "  <WorkspaceSwitcher",
          `    variant="${options.switcher}"`,
          `    size="${account === "header" ? "mark" : "row"}"`,
          "    workspaces={workspaces}",
          "    activeId={workspace}",
          "    onSelect={setWorkspace}",
          "    onCreate={() => {}}",
          "  />",
          "</div>",
        ]),
    ...(!hasWindow && options.collapse !== "none"
      ? [
          '<SidebarTrigger className="ms-auto group-data-[collapsible=icon]:hidden" />',
        ]
      : []),
  ]
  const hasFooter = account === "footer" || options.customize

  return [
    `<Sidebar variant="${options.variant}" collapsible="${options.collapse}">`,
    '  <SidebarHeader className="flex-row items-center">',
    ...indent(headerChildren, 4),
    "  </SidebarHeader>",
    "  <SidebarContent>",
    ...indent(
      openTag(
        "AppNav",
        [
          ["groups={groups}"],
          ["pathname={pathname}"],
          ["renderLink={renderLink}"],
          ...(options.customize
            ? [
                ["preferences={preferences}"],
                ["onPreferencesChange={setPreferences}"],
                ["customizable"],
              ]
            : []),
        ],
        10,
        true
      ),
      4
    ),
    "  </SidebarContent>",
    ...(hasFooter
      ? [
          "  <SidebarFooter>",
          ...(options.customize
            ? [
                "    <AppNavCustomize",
                "      groups={groups}",
                "      preferences={preferences}",
                "      onPreferencesChange={setPreferences}",
                "    />",
              ]
            : []),
          ...(account === "footer"
            ? [
                "    <UserMenu user={user}>",
                "      <UserMenuItems />",
                "    </UserMenu>",
              ]
            : []),
          "  </SidebarFooter>",
        ]
      : []),
    ...(options.collapse === "none" ? [] : ["  <SidebarRail />"]),
    "</Sidebar>",
  ]
}

function buildActions() {
  return [
    "<AppShellHeaderActions",
    "  actions={[",
    "    {",
    '      id: "share",',
    '      label: "Share",',
    "      onSelect: () => {},",
    ...indent(iconProperty("share"), 6),
    "    },",
    "  ]}",
    "  primaryAction={{",
    '    id: "new",',
    '    label: "New task",',
    '    shortcut: "c",',
    "    onSelect: () => {},",
    ...indent(iconProperty("plus"), 4),
    "  }}",
    "/>",
  ]
}

function buildMain(options: PlaygroundOptions) {
  const placement = getTabsPlacement(options)
  const trigger = options.panel
    ? ['<AppShellPanelTrigger panel="details" />']
    : []
  const title =
    placement === "header"
      ? []
      : options.breadcrumb
        ? [
            "<AppShellBreadcrumb",
            "  renderLink={renderLink}",
            "  items={[",
            "    ...path.slice(0, -1).map(({ label, href }) => ({ label, href })),",
            "    { label: pageTitle },",
            "  ]}",
            "/>",
          ]
        : [
            '<span className="min-w-0 flex-1 truncate text-sm font-medium">',
            "  {pageTitle}",
            "</span>",
          ]

  return [
    "<AppShellMain>",
    ...(placement === "row"
      ? [
          "  <TabRow>",
          "    <DocumentTabs />",
          ...indent(trigger, 4),
          "  </TabRow>",
        ]
      : []),
    "  <AppShellHeader>",
    ...(placement === "header" ? ["    <DocumentTabs />"] : []),
    ...indent(title, 4),
    ...(options.actions ? indent(buildActions(), 4) : []),
    ...(placement === "row" ? [] : indent(trigger, 4)),
    "  </AppShellHeader>",
    `  <AppShellContent size="${options.contentSize}">{children}</AppShellContent>`,
    ...(options.bottomNav
      ? [
          "  <AppNavBottomBar",
          "    groups={groups}",
          "    pathname={pathname}",
          "    renderLink={renderLink}",
          "  />",
        ]
      : []),
    "</AppShellMain>",
  ]
}

function buildPanel(options: PlaygroundOptions) {
  if (!options.panel) return []
  const { panelMobile } = DEFAULT_PLAYGROUND_OPTIONS
  const attributes = [
    'id="details"',
    'label="Details"',
    "defaultOpen",
    ...(options.panelMobile === panelMobile
      ? []
      : [`mobile="${options.panelMobile}"`]),
  ]
  return [
    `<AppShellPanel ${attributes.join(" ")}>`,
    "  <AppShellPanelHeader>",
    "    <AppShellPanelTitle>Details</AppShellPanelTitle>",
    "    <AppShellPanelClose />",
    "  </AppShellPanelHeader>",
    '  <AppShellPanelContent className="p-4">',
    "    Owner, status, dates and links.",
    "  </AppShellPanelContent>",
    "</AppShellPanel>",
  ]
}

function buildLayout(options: PlaygroundOptions) {
  const placement = getTabsPlacement(options)
  const defaults = DEFAULT_PLAYGROUND_OPTIONS
  const attributes = [
    ['storageKey="app"'],
    ...(options.window === "web" ? [] : [["storage={createLocalStorage()}"]]),
    ...(options.peek === defaults.peek ? [] : [[`peek="${options.peek}"`]]),
    ...(options.mobileSidebar === defaults.mobileSidebar
      ? []
      : [[`mobileSidebar="${options.mobileSidebar}"`]]),
    ...buildWindowAttribute(options),
    ...(placement === "titlebar"
      ? [
          [
            "titlebar={",
            "  <AppShellTitlebar>",
            "    <DocumentTabs />",
            "  </AppShellTitlebar>",
            "}",
          ],
        ]
      : []),
  ]
  const hasTitle = placement !== "header"

  return [
    "export function AppShellLayout({",
    "  pathname,",
    "  renderLink = (item) => <a href={item.href} />,",
    "  children,",
    "}: {",
    "  /** The current path, from your router. */",
    "  pathname: string",
    "  /** Your router's link, so moving between pages doesn't reload them. */",
    "  renderLink?: (item: { id?: string; href?: string }) => React.ReactElement",
    "  children: React.ReactNode",
    "}) {",
    ...(options.switcher === "none"
      ? []
      : ['  const [workspace, setWorkspace] = React.useState("acme")']),
    ...(options.customize
      ? [
          "  const [preferences, setPreferences] = React.useState(EMPTY_NAV_PREFERENCES)",
        ]
      : []),
    ...(hasTitle
      ? [
          "  const activeId = getActiveNavItem(groups, pathname)",
          "  const path = activeId ? getNavPath(groups, activeId) : []",
          '  const pageTitle = path.at(-1)?.label ?? "Home"',
        ]
      : []),
    ...(options.switcher === "none" && !options.customize && !hasTitle
      ? []
      : [""]),
    "  return (",
    ...indent(openTag("AppShell", attributes, 4), 4),
    ...indent(buildSidebar(options), 6),
    ...indent(buildMain(options), 6),
    ...indent(buildPanel(options), 6),
    ...(options.status
      ? [
          "      <AppShellStatusBar>",
          "        <span>Ready</span>",
          "      </AppShellStatusBar>",
        ]
      : []),
    "    </AppShell>",
    "  )",
    "}",
  ]
}

/** The file the CLI writes: the shell with these choices, ready to edit. */
export function buildAppShellSource(rawOptions: PlaygroundOptions) {
  const options = normalizeInstallOptions(rawOptions)
  return [
    '"use client"',
    "",
    'import * as React from "react"',
    "",
    ...buildImports(options),
    "",
    "// Written from your App Shell settings, and yours to edit: swap in your own",
    "// navigation, workspaces and account, and fill the panel and the status bar.",
    "",
    ...buildGroups(options),
    "",
    ...buildData(options),
    ...buildHelpers(options),
    ...buildLayout(options),
    "",
  ].join("\n")
}

const ICON_PLACEHOLDER_ELEMENT = /<IconPlaceholder\s+lucide="(\w+)"[^>]*?\/>/g

/** Fabricator's icons take Lucide's names, so each placeholder names its icon. */
function withFabricatorIcons(source: string) {
  const names = [
    ...new Set(
      Array.from(source.matchAll(ICON_PLACEHOLDER_ELEMENT), ([, name]) => name)
    ),
  ].flatMap((name) => (name ? [name] : []))
  return source
    .replace(ICON_PLACEHOLDER_ELEMENT, "<$1 />")
    .replace(
      importLines(["IconPlaceholder"], ICON_PLACEHOLDER).join("\n"),
      importLines(names.sort(), FABRICATOR_ICONS_PACKAGE).join("\n")
    )
}

/**
 * The registry item the CLI installs. It imports Fabricator's icons, the
 * default; with `icons: false`, placeholders resolve to the project's library.
 */
export function buildAppShellItem(
  rawOptions: PlaygroundOptions,
  { icons = true }: { icons?: boolean } = {}
) {
  const options = normalizeInstallOptions(rawOptions)
  const source = buildAppShellSource(options)
  return {
    $schema: "https://fabricator-ui.vercel.app/schema/registry-item.json",
    name: "app-shell-layout",
    type: "registry:block" as const,
    title: "App Shell layout",
    description: "An App Shell written out from your settings.",
    ...(icons && { dependencies: [FABRICATOR_ICONS_PACKAGE] }),
    registryDependencies: getAppShellDependencies(options),
    files: [
      {
        path: "registry/base-fabricator/blocks/app-shell-layout/app-shell-layout.tsx",
        type: "registry:component" as const,
        content: icons ? withFabricatorIcons(source) : source,
      },
    ],
    docs: [
      "Wrap your routes in the layout and pass your router's pathname:",
      "",
      '  import { AppShellLayout } from "@/components/app-shell-layout"',
      "",
      "  <AppShellLayout pathname={pathname}>{children}</AppShellLayout>",
    ].join("\n"),
    meta: { fabricator: true },
  }
}
