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
  LogOutIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"
import { StatusBar } from "expo-status-bar"
import {
  Linking,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { SoundEffects } from "@/registry/native/components/sound-effects"
import {
  AppNav,
  AppNavBottomBar,
  AppNavCustomize,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPanel,
  AppShellPanelTrigger,
  AppShellStatusBar,
} from "@/registry/native/ui/app-shell"
import { Button } from "@/registry/native/ui/button"
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
  getComponentTitle,
  getDemoName,
  getPathFromUrl,
} from "./components/component-model"
import { ComponentScreen } from "./components/component-screen"
import { DetailsPanel } from "./details-panel"
import { NewTabPage, OverviewPage } from "./explorer-pages"
import { EXPLORER_COMPONENTS, getNavGroups, USER, WORKSPACES } from "./nav"
import {
  HOME_HREF,
  NEW_TAB_PATH,
  NEW_TAB_TITLE,
  PageTabs,
  usePageTabs,
} from "./page-tabs"
import { ScreenBoundary } from "./screen-boundary"
import { useScreenCheck } from "./screen-check/use-screen-check"
import { SettingsCard } from "./settings"
import {
  DEFAULT_SHELL_OPTIONS,
  ShellOptionsCard,
  type ShellOptions,
} from "./shell-options"
import { GlassView, hasLiquidGlass } from "./shell/glass"
import {
  EDITOR_NATIVE_SPIKE_PATH,
  EditorNativeSpike,
  getSpikePathFromUrl,
} from "./spikes/editor-native-spike"
import { ThemeProvider, useTheme, useThemeSettings } from "./theme"

const NativeIconsPage = React.lazy(() =>
  import("./icons/icons-page").then((module) => ({
    default: module.NativeIconsPage,
  }))
)

const showNewTask = () => toast("New task")

const PLATFORM_LABEL =
  Platform.OS === "ios" ? (Platform.isPad ? "iPadOS" : "iOS") : "Android"

function getPageTitle(pathname: string, groups: AppNavGroup[]) {
  const demo = getDemoName(pathname)
  if (demo) return getComponentTitle(demo)
  const activeId = getActiveNavItem(groups, pathname)
  const path = activeId ? getNavPath(groups, activeId) : []
  return path.at(-1)?.label ?? "Overview"
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

/** Stands in the sidebar's header without a workspace switcher. */
function Brand({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      role="link"
      accessibilityLabel="Fabricator UI, overview"
      onPress={onPress}
      className="h-8 flex-row items-center rounded-lg px-2"
    >
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        Fabricator UI
      </Text>
    </Pressable>
  )
}

function ThemeToggle() {
  const { isDark } = useTheme()
  const { setThemeChoice } = useThemeSettings()
  return (
    <Button
      variant="ghost"
      size="xs"
      className="ml-auto"
      onPress={() => setThemeChoice(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {isDark ? "Light" : "Dark"}
    </Button>
  )
}

/** The page a tab is on. */
function Page({
  pathname,
  isPhone,
  options,
  onOptionsChange,
  onOpen,
}: {
  pathname: string
  isPhone: boolean
  options: ShellOptions
  onOptionsChange: (options: ShellOptions) => void
  onOpen: (href: string) => void
}) {
  if (pathname === "/icons")
    return (
      <React.Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <Text>Loading icons…</Text>
          </View>
        }
      >
        <NativeIconsPage />
      </React.Suspense>
    )
  const demoName = getDemoName(pathname)
  if (demoName) {
    return <ComponentScreen name={demoName} />
  }
  if (pathname === NEW_TAB_PATH) {
    return (
      <NewTabPage
        contentSize={options.contentSize}
        isPhone={isPhone}
        onOpen={onOpen}
      />
    )
  }
  return (
    <OverviewPage
      contentSize={options.contentSize}
      isPhone={isPhone}
      onOpen={onOpen}
      setup={
        <SetupCards
          options={options}
          onOptionsChange={onOptionsChange}
          isPhone={isPhone}
        />
      }
    />
  )
}

function Shell() {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const isPhone = getShellSize(width) === "phone"

  const pageTabs = usePageTabs()
  const { pathname } = pageTabs
  const [isSpikeOpen, setIsSpikeOpen] = React.useState(false)
  // A page in a tab leaves whatever was full screen.
  const open = (href: string) => {
    if (href === EDITOR_NATIVE_SPIKE_PATH) {
      setIsSpikeOpen(true)
      return
    }
    setIsSpikeOpen(false)
    pageTabs.open(href)
  }
  useScreenCheck(open)
  const openUrl = React.useEffectEvent((url: string | null | undefined) => {
    const path = getPathFromUrl(url) ?? getSpikePathFromUrl(url)
    if (path) open(path)
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
  const groups = React.useMemo(
    () => getNavGroups({ reorderable: options.reorder }),
    [options.reorder]
  )

  if (isSpikeOpen) {
    return <EditorNativeSpike onBack={() => setIsSpikeOpen(false)} />
  }
  const activeId = getActiveNavItem(groups, pathname)
  const path = activeId ? getNavPath(groups, activeId) : []
  const getTitle = (tabPath: string) => getPageTitle(tabPath, groups)
  const title = pathname === NEW_TAB_PATH ? NEW_TAB_TITLE : getTitle(pathname)
  const activeComponent = getDemoName(pathname)
  const workspace =
    WORKSPACES.find((entry) => entry.id === workspaceId) ?? WORKSPACES[0]
  const navigate = (item: AppNavItem) => {
    if (item.href) open(item.href)
  }
  // The trail to the page; the group a component is in has no page.
  const crumbs = [
    ...path.slice(0, -1).map((item) => ({
      label: item.label,
      onSelect: item.href ? () => navigate(item) : undefined,
    })),
    { label: title },
  ]
  const hasSwitcher = options.switcher !== "none"
  const hasAccountOnTop = options.account === "header"
  const panelTrigger = options.panel ? (
    <AppShellPanelTrigger panel="details" />
  ) : null
  const pageTabStrip = <PageTabs pageTabs={pageTabs} getTitle={getTitle} />
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
      // Returning from the spike keeps the shell in place.
      storageKey="example"
    >
      <Sidebar variant={options.variant} collapsible={options.collapse}>
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
          ) : (
            <Brand onPress={() => open(HOME_HREF)} />
          )}
        </SidebarHeader>
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
                  ? crumbs
                  : [
                      {
                        label: hasSwitcher ? workspace.name : "Fabricator UI",
                        onSelect: () => open(HOME_HREF),
                      },
                      ...crumbs,
                    ]
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
          {hasHeaderActions ? (
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
        <ScreenBoundary key={pathname}>
          <Page
            pathname={pathname}
            isPhone={isPhone}
            options={options}
            onOptionsChange={setOptions}
            onOpen={open}
          />
        </ScreenBoundary>
        {options.bottomNav ? (
          <AppNavBottomBar
            groups={groups}
            pathname={pathname}
            onNavigate={navigate}
            variant={options.bottomNavStyle === "flat" ? "flat" : "floating"}
            capsule={
              options.bottomNavStyle === "glass" && hasLiquidGlass() ? (
                <GlassView
                  glassEffectStyle="regular"
                  isInteractive
                  colorScheme={theme.mode}
                />
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
          defaultOpen
          defaultWidth={320}
          minWidth={240}
          maxWidth={480}
          mobile={options.panelMobile}
        >
          <DetailsPanel slug={activeComponent} />
        </AppShellPanel>
      ) : null}
      {options.status ? (
        <AppShellStatusBar>
          <Text>React Native · {PLATFORM_LABEL}</Text>
          <Text>{EXPLORER_COMPONENTS.length} components</Text>
          <ThemeToggle />
        </AppShellStatusBar>
      ) : null}
      {activeComponent ? null : <Toaster />}
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
      {/* The Editor's keyboard bar rides the keyboard through this. */}
      <KeyboardProvider>
        <FabricatorRoot>
          <ThemeProvider>
            <ThemedStatusBar />
            <SoundEffectsFromSettings />
            <Shell />
          </ThemeProvider>
        </FabricatorRoot>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
