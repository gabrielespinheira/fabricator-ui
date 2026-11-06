import "./global.css"

import * as React from "react"
import {
  EMPTY_NAV_PREFERENCES,
  getActiveNavItem,
  getNavPath,
  getShellSize,
  type NavPreferences,
} from "@fabricator-ui/app-shell-model"
import {
  BellIcon,
  GitBranchIcon,
  LogOutIcon,
  PlusIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"
import { StatusBar } from "expo-status-bar"
import { Linking, useWindowDimensions, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { SoundEffects } from "@/registry/native/components/sound-effects"
import {
  AppNav,
  AppNavBottomBar,
  AppNavCustomize,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTrigger,
  AppShellStatusBar,
} from "@/registry/native/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/native/ui/dropdown-menu"
import { FabricatorRoot } from "@/registry/native/ui/fabricator-root"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/native/ui/sidebar"
import { toast, Toaster } from "@/registry/native/ui/sonner"
import { Text } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

import {
  BlockLibrary,
  BlockScreen,
  ComponentLibrary,
} from "./library/component-library"
import {
  BLOCKS_HREF,
  COMPONENTS_HREF,
  getBlockName,
  getComponentTitle,
  getDemoName,
  getPathFromUrl,
} from "./library/library-model"
import { NAV_GROUPS, PANEL_VIEWS, USER, WORKSPACES } from "./nav"
import { PageTabs, usePageTabs } from "./page-tabs"
import { PanelViews } from "./panel-views"
import { SettingsCard } from "./settings"
import {
  DEFAULT_SHELL_OPTIONS,
  ShellOptionsCard,
  type ShellOptions,
} from "./shell-options"
import { GlassView, hasLiquidGlass } from "./shell/glass"
import { ThemeProvider, useTheme, useThemeSettings } from "./theme"

const HOME_HREF = "/"
const SETTINGS_HREF = "/settings"

const showNewTask = () => toast("New task")

const isLibraryPath = (pathname: string) =>
  pathname.startsWith(COMPONENTS_HREF) || pathname.startsWith(BLOCKS_HREF)

function getPageTitle(pathname: string) {
  const demo = getDemoName(pathname)
  if (demo) return getComponentTitle(demo)
  const activeId = getActiveNavItem(NAV_GROUPS, pathname)
  const path = activeId ? getNavPath(NAV_GROUPS, activeId) : []
  return path.at(-1)?.label ?? "Home"
}

function AccountMenuItems() {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem onPress={() => toast("Profile")}>
          <UserIcon />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onPress={() => toast("Notifications")}>
          <BellIcon />
          Notifications
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          variant="destructive"
          onPress={() => toast("Signed out")}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

/** The two setup cards: side by side where they fit, stacked on a phone. */
function SetupCards({
  options,
  onOptionsChange,
  isPhone,
}: {
  options: ShellOptions
  onOptionsChange: (options: ShellOptions) => void
  isPhone: boolean
}) {
  return (
    <View className="flex-row flex-wrap items-start gap-6">
      <SettingsCard className={isPhone ? "w-full" : "min-w-64 flex-1"} />
      <ShellOptionsCard
        options={options}
        onChange={onOptionsChange}
        isPhone={isPhone}
        className={isPhone ? "w-full" : "min-w-88 flex-[1.4]"}
      />
    </View>
  )
}

/** The page: its title, then its content on the page's own rhythm. */
function Page({
  title,
  pathname,
  setup,
  contentSize,
  onNavigate,
}: {
  title: string
  pathname: string
  setup: React.ReactNode
  contentSize: ShellOptions["contentSize"]
  onNavigate: (href: string) => void
}) {
  if (pathname.startsWith(BLOCKS_HREF)) {
    return <BlockLibrary onNavigate={onNavigate} />
  }
  if (pathname.startsWith(COMPONENTS_HREF)) {
    return <ComponentLibrary pathname={pathname} onNavigate={onNavigate} />
  }
  const isSetup = pathname === HOME_HREF || pathname === SETTINGS_HREF
  return (
    <AppShellContent
      // Each page opens at its top.
      key={pathname}
      size={contentSize}
      contentContainerClassName="gap-6"
    >
      <AppShellPageTitle>{title}</AppShellPageTitle>
      {isSetup ? (
        <>
          <Text className="text-base text-muted-foreground">
            Set up the shell and its look here.
          </Text>
          {setup}
        </>
      ) : (
        <>
          <Text className="text-base text-muted-foreground">
            The shell's options and settings are on Home. This screen's active
            page, breadcrumb and panel placement come from lib/app-shell-model,
            the same file the web shell runs.
          </Text>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} className="h-32 rounded-xl bg-muted/50" />
          ))}
        </>
      )}
    </AppShellContent>
  )
}

function Shell() {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const isPhone = getShellSize(width) === "phone"

  const pageTabs = usePageTabs({ homeHref: HOME_HREF })
  const { pathname, setPathname } = pageTabs
  const openUrl = React.useEffectEvent((url: string | null | undefined) => {
    const path = getPathFromUrl(url)
    if (path) setPathname(path)
  })
  React.useEffect(() => {
    void Linking.getInitialURL().then(openUrl)
    const subscription = Linking.addEventListener("url", ({ url }) =>
      openUrl(url)
    )
    return () => subscription.remove()
  }, [])
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )
  const [workspaceId, setWorkspaceId] = React.useState("acme")
  const [options, setOptions] = React.useState(DEFAULT_SHELL_OPTIONS)

  const blockName = getBlockName(pathname)
  if (blockName) {
    return (
      <BlockScreen
        name={blockName}
        onBack={() => {
          setPathname(BLOCKS_HREF)
        }}
      />
    )
  }

  const activeId = getActiveNavItem(NAV_GROUPS, pathname)
  const path = activeId ? getNavPath(NAV_GROUPS, activeId) : []
  const title = getPageTitle(pathname)
  const workspace =
    WORKSPACES.find((entry) => entry.id === workspaceId) ?? WORKSPACES[0]
  const navigate = (item: AppNavItem) => {
    if (item.href) setPathname(item.href)
  }
  const crumbs = [
    ...path.map((item) => ({
      label: item.label,
      onSelect: item.href ? () => navigate(item) : undefined,
    })),
    // A demo is a level below its list, which isn't in the navigation.
    ...(getDemoName(pathname) ? [{ label: title }] : []),
  ]
  const hasAccountOnTop = options.account === "header"
  const hasSwitcher = options.switcher !== "none"
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    reorderable: options.reorder,
  }))
  const panelTrigger = options.panel ? (
    <AppShellPanelTrigger panel="details" />
  ) : null
  const pageTabStrip = <PageTabs pageTabs={pageTabs} getTitle={getPageTitle} />
  // Tablets only: on a phone the library floats the primary action over the page,
  // and this example shows no floating button.
  const hasHeaderActions = options.actions && !isPhone
  // Tabs in the page take their own row, unless the header would hold nothing else.
  // On a phone the page scrolls under the header, so the strip is the header.
  const hasRowOfTabs =
    !isPhone &&
    options.tabs === "main" &&
    (options.breadcrumb || hasHeaderActions)
  const hasTabsInHeader = options.tabs === "main" && !hasRowOfTabs

  return (
    <AppShell
      storage={null}
      mobileSidebar={options.mobileSidebar}
      // Going back to a shell, as a block leaves, keeps its place.
      storageKey="example"
    >
      <Sidebar variant={options.variant} collapsible={options.collapse}>
        {hasSwitcher || hasAccountOnTop ? (
          <SidebarHeader className="flex-row items-center">
            {hasAccountOnTop ? (
              <UserMenu variant="mark" align="start" user={USER}>
                <AccountMenuItems />
              </UserMenu>
            ) : null}
            {hasSwitcher ? (
              <WorkspaceSwitcher
                variant={options.switcher === "command" ? "command" : "menu"}
                workspaces={WORKSPACES}
                activeId={workspaceId}
                onSelect={setWorkspaceId}
                size={hasAccountOnTop ? "mark" : "row"}
                onCreate={() => toast("Create a workspace")}
                onManage={() => toast("Manage workspaces")}
              />
            ) : null}
          </SidebarHeader>
        ) : null}
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname={pathname}
            onNavigate={navigate}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            customizable={options.customize}
          />
        </SidebarContent>
        {options.account === "footer" || options.customize ? (
          <SidebarFooter>
            {options.customize ? (
              <AppNavCustomize
                groups={groups}
                preferences={preferences}
                onPreferencesChange={setPreferences}
              />
            ) : null}
            {options.account === "footer" ? (
              <UserMenu user={USER}>
                <AccountMenuItems />
              </UserMenu>
            ) : null}
          </SidebarFooter>
        ) : null}
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          {hasTabsInHeader ? (
            pageTabStrip
          ) : options.breadcrumb ? (
            <AppShellBreadcrumb
              items={
                isPhone
                  ? crumbs.length > 0
                    ? crumbs
                    : [{ label: title }]
                  : [{ label: workspace.name }, ...crumbs]
              }
            />
          ) : isPhone ? (
            // The page's own heading names it, so the header only holds the row.
            <View className="flex-1" />
          ) : (
            <Text
              numberOfLines={1}
              className="flex-1 text-(length:--density-text-13) font-medium text-foreground"
            >
              {title}
            </Text>
          )}
          {hasHeaderActions && !isLibraryPath(pathname) ? (
            <AppShellHeaderActions
              primaryAction={{
                id: "new-task",
                label: "New task",
                icon: PlusIcon,
                onSelect: showNewTask,
              }}
            />
          ) : null}
          {panelTrigger}
        </AppShellHeader>
        {hasRowOfTabs ? (
          <View className="flex-row items-center md:pl-(--density-24)">
            {pageTabStrip}
          </View>
        ) : null}
        <Page
          title={title}
          pathname={pathname}
          contentSize={options.contentSize}
          onNavigate={setPathname}
          setup={
            <SetupCards
              options={options}
              onOptionsChange={setOptions}
              isPhone={isPhone}
            />
          }
        />
        {options.bottomNav ? (
          <AppNavBottomBar
            groups={NAV_GROUPS}
            pathname={pathname}
            onNavigate={navigate}
            variant={options.bottomNavStyle === "flat" ? "flat" : "floating"}
            capsule={
              options.bottomNavStyle === "glass" && hasLiquidGlass() ? (
                <GlassView isInteractive colorScheme={theme.mode} />
              ) : undefined
            }
          />
        ) : null}
      </AppShellMain>
      {options.panel ? (
        <AppShellPanel
          id="details"
          label="Details"
          side="right"
          views={PANEL_VIEWS}
          defaultOpen
          defaultView="details"
          defaultWidth={320}
          minWidth={240}
          maxWidth={480}
          mobile={options.panelMobile}
        >
          <AppShellPanelHeader>
            <AppShellPanelTabs />
            <AppShellPanelClose />
          </AppShellPanelHeader>
          <PanelViews title={title} />
        </AppShellPanel>
      ) : null}
      {options.status ? (
        <AppShellStatusBar>
          <GitBranchIcon />
          <Text>main</Text>
          <Text>Synced</Text>
          <Text className="ml-auto">4 open</Text>
        </AppShellStatusBar>
      ) : null}
      {isLibraryPath(pathname) ? null : <Toaster />}
    </AppShell>
  )
}

function SoundEffectsFromSettings() {
  const { isSoundOn } = useThemeSettings()
  return <SoundEffects enabled={isSoundOn} />
}

function ThemedStatusBar() {
  const theme = useTheme()
  return <StatusBar style={theme.isDark ? "light" : "dark"} />
}

export function App() {
  return (
    <SafeAreaProvider>
      <FabricatorRoot>
        <ThemeProvider>
          <ThemedStatusBar />
          <SoundEffectsFromSettings />
          <Shell />
        </ThemeProvider>
      </FabricatorRoot>
    </SafeAreaProvider>
  )
}
