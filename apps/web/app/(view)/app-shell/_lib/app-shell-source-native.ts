// What `/init/app-shell?platform=native` serves: the same choices, written for
// React Native. The views differ and the options that need a pointer or a window
// have no meaning here, so it's a file of its own; the options and the sample
// navigation are the web file's.

import { NATIVE_APP_SHELL_ROOT } from "./app-shell-root-source"
import { normalizeInstallOptions } from "./app-shell-source"
import type { PlaygroundOptions } from "./options"

const REGISTRY = "@/registry/native"
const GLASS_PACKAGE = "expo-glass-effect"
const ICONS_PACKAGE = "@fabricator-ui/icons-react-native"

const blank = (line: string) => line.trim() === ""

function indent(lines: string[], depth: number) {
  return lines.map((line) => (blank(line) ? "" : `${" ".repeat(depth)}${line}`))
}

function importLines(names: string[], from: string) {
  const oneLine = `import { ${names.join(", ")} } from "${from}"`
  if (names.length === 1 || oneLine.length <= 80) return [oneLine]
  return ["import {", ...names.map((name) => `  ${name},`), `} from "${from}"`]
}

function hasGlassTabBar(options: PlaygroundOptions) {
  return options.bottomNav && options.bottomNavStyle === "glass"
}

export function getNativeAppShellDependencies(options: PlaygroundOptions) {
  return [
    "app-shell",
    "app-shell-model",
    "app-nav",
    "sidebar",
    "text",
    ...(options.account === "none" ? [] : ["user-menu", "dropdown-menu"]),
    ...(options.switcher === "none" ? [] : ["workspace-switcher"]),
    ...(options.tabs === "none" ? [] : ["tab-strip"]),
  ].map((name) => `@fabricator/${name}`)
}

function usedIcons(options: PlaygroundOptions) {
  return [
    "BoxIcon",
    "HomeIcon",
    "InboxIcon",
    ...(options.actions ? ["PlusIcon"] : []),
    "SettingsIcon",
    ...(options.actions ? ["ShareIcon"] : []),
    "UsersIcon",
  ]
}

function usesText(options: PlaygroundOptions) {
  return (
    options.status ||
    options.panel ||
    options.switcher === "none" ||
    (!options.breadcrumb && options.tabs === "none")
  )
}

function buildImports(options: PlaygroundOptions) {
  const hasTabs = options.tabs !== "none"
  const isRowOfTabs = hasTabs && (options.breadcrumb || options.actions)
  const shell = [
    "AppShell",
    ...(options.breadcrumb ? ["AppShellBreadcrumb"] : []),
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
  ]
  const nav = [
    "AppNav",
    ...(options.bottomNav ? ["AppNavBottomBar"] : []),
    ...(options.customize ? ["AppNavCustomize"] : []),
    "type AppNavGroup",
    "type AppNavItem",
  ]
  const sidebar = [
    "Sidebar",
    "SidebarContent",
    ...(options.account === "footer" || options.customize
      ? ["SidebarFooter"]
      : []),
    "SidebarHeader",
    ...(options.collapse === "none" ? [] : ["SidebarTrigger"]),
  ]
  return [
    ...(hasGlassTabBar(options)
      ? importLines(["GlassView", "isLiquidGlassAvailable"], GLASS_PACKAGE)
      : []),
    ...importLines(usedIcons(options), ICONS_PACKAGE),
    ...(isRowOfTabs ? importLines(["View"], "react-native") : []),
    "",
    ...(options.customize
      ? importLines(
          ["EMPTY_NAV_PREFERENCES"],
          `${REGISTRY}/lib/app-shell-model`
        )
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
    ...(hasTabs
      ? importLines(
          [
            "TabStrip",
            "TabStripList",
            "TabStripNew",
            "TabStripOverflow",
            "TabStripTab",
            "useTabStripState",
          ],
          `${REGISTRY}/ui/tab-strip`
        )
      : []),
    ...(usesText(options) ? importLines(["Text"], `${REGISTRY}/ui/text`) : []),
    ...(options.account === "none"
      ? []
      : importLines(["UserMenu"], `${REGISTRY}/ui/user-menu`)),
    ...(options.switcher === "none"
      ? []
      : importLines(
          ["WorkspaceSwitcher"],
          `${REGISTRY}/ui/workspace-switcher`
        )),
  ]
}

function buildGroups(options: PlaygroundOptions) {
  const tab = options.bottomNav ? ' mobile: "tab",' : ""
  return [
    "const groups: AppNavGroup[] = [",
    "  {",
    '    id: "main",',
    "    items: [",
    `      { id: "home", label: "Home", href: "/", icon: HomeIcon,${tab} },`,
    "      {",
    '        id: "inbox",',
    '        label: "Inbox",',
    '        href: "/inbox",',
    "        badge: 4,",
    "        icon: InboxIcon,",
    ...(tab ? ['        mobile: "tab",'] : []),
    "      },",
    "    ],",
    "  },",
    "  {",
    '    id: "workspace",',
    '    label: "Workspace",',
    "    collapsible: true,",
    ...(options.reorder ? ["    reorderable: true,"] : []),
    "    items: [",
    `      { id: "projects", label: "Projects", href: "/projects", icon: BoxIcon,${tab} },`,
    '      { id: "team", label: "Team", href: "/team", icon: UsersIcon },',
    '      { id: "settings", label: "Settings", href: "/settings", icon: SettingsIcon },',
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
          "    const id = String(Date.now())",
          '    setTitles((current) => ({ ...current, [id]: "New tab" }))',
          "    tabs.open(id)",
          "  }",
          "  return (",
          '    <TabStrip {...tabs.stripProps} onNew={openNewTab} className="min-w-0 flex-1">',
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

function buildSidebar(options: PlaygroundOptions) {
  const account = options.account
  return [
    `<Sidebar variant="${options.variant}" collapsible="${options.collapse}">`,
    '  <SidebarHeader className="flex-row items-center">',
    ...(account === "header"
      ? [
          '    <UserMenu variant="mark" align="start" user={user}>',
          "      <UserMenuItems />",
          "    </UserMenu>",
        ]
      : []),
    ...(options.switcher === "none"
      ? ['    <Text className="px-2 text-lg font-semibold">Acme Inc</Text>']
      : [
          "    <WorkspaceSwitcher",
          `      variant="${options.switcher}"`,
          `      size="${account === "header" ? "mark" : "row"}"`,
          "      workspaces={workspaces}",
          "      activeId={workspace}",
          "      onSelect={setWorkspace}",
          "      onCreate={noop}",
          "    />",
        ]),
    ...(options.collapse === "none"
      ? []
      : ['    <SidebarTrigger className="ms-auto" />']),
    "  </SidebarHeader>",
    "  <SidebarContent>",
    "    <AppNav",
    "      groups={groups}",
    "      pathname={pathname}",
    "      onNavigate={onNavigate}",
    ...(options.customize
      ? [
          "      preferences={preferences}",
          "      onPreferencesChange={setPreferences}",
          "      customizable",
        ]
      : []),
    "    />",
    "  </SidebarContent>",
    ...(account === "footer" || options.customize
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
    "</Sidebar>",
  ]
}

function buildActions() {
  return [
    "<AppShellHeaderActions",
    '  actions={[{ id: "share", label: "Share", onSelect: noop, icon: ShareIcon }]}',
    "  primaryAction={{",
    '    id: "new",',
    '    label: "New task",',
    "    onSelect: noop,",
    "    icon: PlusIcon,",
    "  }}",
    "/>",
  ]
}

function buildMain(options: PlaygroundOptions) {
  const hasTabs = options.tabs !== "none"
  const isRowOfTabs = hasTabs && (options.breadcrumb || options.actions)
  const trigger = options.panel
    ? ['<AppShellPanelTrigger panel="details" />']
    : []
  return [
    "<AppShellMain>",
    ...(isRowOfTabs
      ? [
          '  <View className="flex-row items-center">',
          "    <DocumentTabs />",
          ...indent(trigger, 4),
          "  </View>",
        ]
      : []),
    "  <AppShellHeader>",
    ...(hasTabs && !isRowOfTabs ? ["    <DocumentTabs />"] : []),
    ...(options.breadcrumb
      ? ["    <AppShellBreadcrumb items={[{ label: pageTitle }]} />"]
      : isRowOfTabs || hasTabs
        ? []
        : ['    <Text className="flex-1 font-medium">{pageTitle}</Text>']),
    ...(options.actions ? indent(buildActions(), 4) : []),
    ...(isRowOfTabs ? [] : indent(trigger, 4)),
    "  </AppShellHeader>",
    `  <AppShellContent size="${options.contentSize}">{children}</AppShellContent>`,
    ...(options.bottomNav
      ? [
          "  <AppNavBottomBar",
          "    groups={groups}",
          "    pathname={pathname}",
          "    onNavigate={onNavigate}",
          ...(options.bottomNavStyle === "flat"
            ? []
            : ['    variant="floating"']),
          ...(hasGlassTabBar(options)
            ? [
                "    capsule={isLiquidGlassAvailable() ? <GlassView isInteractive /> : undefined}",
              ]
            : []),
          "  />",
        ]
      : []),
    "</AppShellMain>",
  ]
}

function buildPanel(options: PlaygroundOptions) {
  if (!options.panel) return []
  const mobile =
    options.panelMobile === "drawer" ? "" : ` mobile="${options.panelMobile}"`
  return [
    `<AppShellPanel id="details" label="Details"${mobile}>`,
    "  <AppShellPanelHeader>",
    "    <AppShellPanelTitle>Details</AppShellPanelTitle>",
    "    <AppShellPanelClose />",
    "  </AppShellPanelHeader>",
    '  <AppShellPanelContent className="p-4">',
    "    <Text>Owner, status, dates and links.</Text>",
    "  </AppShellPanelContent>",
    "</AppShellPanel>",
  ]
}

function buildLayout(options: PlaygroundOptions) {
  const usesNoop = options.actions || options.switcher !== "none"
  const needsTitle =
    options.breadcrumb || (options.tabs === "none" && !options.breadcrumb)
  const attributes = [
    'storageKey="app"',
    ...(options.mobileSidebar === "reveal"
      ? []
      : [`mobileSidebar="${options.mobileSidebar}"`]),
  ].join(" ")
  return [
    ...(usesNoop ? ["const noop = () => {}", ""] : []),
    "export function AppShellLayout({",
    "  pathname,",
    "  onNavigate,",
    "  children,",
    "}: {",
    "  /** The current path, from your router. */",
    "  pathname: string",
    "  /** Moves to an item, with your router. */",
    "  onNavigate: (item: AppNavItem) => void",
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
    ...(needsTitle
      ? [
          "  const pageTitle =",
          "    groups",
          "      .flatMap((group) => group.items)",
          '      .find((item) => item.href === pathname)?.label ?? "Home"',
        ]
      : []),
    "",
    "  return (",
    `    <AppShell ${attributes}>`,
    ...indent(buildSidebar(options), 6),
    ...indent(buildMain(options), 6),
    ...indent(buildPanel(options), 6),
    ...(options.status
      ? [
          "      <AppShellStatusBar>",
          "        <Text>Ready</Text>",
          "      </AppShellStatusBar>",
        ]
      : []),
    "    </AppShell>",
    "  )",
    "}",
  ]
}

/** The file the CLI writes in an Expo app: the shell with these choices. */
export function buildNativeAppShellSource(rawOptions: PlaygroundOptions) {
  const options = normalizeInstallOptions(rawOptions)
  return [
    'import * as React from "react"',
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

export function buildNativeAppShellItem(rawOptions: PlaygroundOptions) {
  const options = normalizeInstallOptions(rawOptions)
  return {
    $schema: "https://fabricator-ui.vercel.app/schema/registry-item.json",
    name: "app-shell-layout",
    type: "registry:block" as const,
    title: "App Shell layout",
    description:
      "An App Shell written out from your settings, for React Native.",
    dependencies: [
      ICONS_PACKAGE,
      ...(hasGlassTabBar(options) ? [GLASS_PACKAGE] : []),
    ],
    registryDependencies: getNativeAppShellDependencies(options),
    files: [
      {
        path: "registry/native/blocks/app-shell-layout/app-shell-layout.tsx",
        type: "registry:component" as const,
        content: buildNativeAppShellSource(options),
      },
      {
        path: "registry/native/blocks/app-shell-layout/app-shell-root.tsx",
        type: "registry:component" as const,
        content: NATIVE_APP_SHELL_ROOT,
      },
    ],
    docs: [
      "Wrap your root layout's content in the root:",
      "",
      '  import { AppShellRoot } from "@/components/app-shell-root"',
      "",
      "  <AppShellRoot><Slot /></AppShellRoot>",
      ...(hasGlassTabBar(options)
        ? [
            "",
            "Liquid Glass is a native module: rebuild the app with `npx expo run:ios`.",
          ]
        : []),
    ].join("\n"),
    meta: { fabricator: true },
  }
}
