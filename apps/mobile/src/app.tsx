import "./global.css"

import * as React from "react"
import {
  APP_SHELL_CONTENT_WIDTHS,
  EMPTY_NAV_PREFERENCES,
  getActiveNavItem,
  getNavPath,
  getPanelPlacement,
  getShellSize,
  revealPanelView,
  type AppShellContentSize,
  type NavItem,
  type NavPreferences,
  type PanelState,
} from "@fabricator-ui/app-shell-model"
import { StatusBar } from "expo-status-bar"
import {
  ChevronRightIcon,
  GitBranchIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react-native"
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context"

import { FabricatorRoot } from "@/registry/native/ui/fabricator-root"

import {
  BlockLibrary,
  BLOCKS_HREF,
  ComponentLibrary,
  COMPONENTS_HREF,
} from "./library/component-library"
import { getPathFromUrl } from "./library/library-model"
import { NAV_GROUPS, WORKSPACES } from "./nav"
import { SettingsCard } from "./settings"
import {
  DEFAULT_SHELL_OPTIONS,
  ShellOptionsCard,
  type ShellOptions,
} from "./shell-options"
import { getControlInset, IconButton } from "./shell/icon-button"
import { PanelContent, PanelSheet } from "./shell/panel"
import { Sidebar } from "./shell/sidebar"
import { SidebarReveal } from "./shell/sidebar-reveal"
import { SidebarToggleIcon } from "./shell/sidebar-toggle-icon"
import { TabBar } from "./shell/tab-bar"
import { FONT, ThemeProvider, useStyles, useTheme, type Theme } from "./theme"

// The Sidebar's and the panel's default widths on the website.
const SIDEBAR_WIDTH = 256
const PANEL_WIDTH = 320

const HOME_HREF = "/"
const SETTINGS_HREF = "/settings"

const showNewTask = () => Alert.alert("New task")

const isLibraryPath = (pathname: string) =>
  pathname.startsWith(COMPONENTS_HREF) || pathname.startsWith(BLOCKS_HREF)

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
  const styles = useStyles(buildStyles)
  return (
    <View style={styles.setup}>
      <SettingsCard style={isPhone ? styles.setupFull : styles.setupSettings} />
      <ShellOptionsCard
        options={options}
        onChange={onOptionsChange}
        isPhone={isPhone}
        style={isPhone ? styles.setupFull : styles.setupOptions}
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
  bottomInset = 0,
  onNavigate,
}: {
  title: string
  pathname: string
  setup: React.ReactNode
  contentSize: AppShellContentSize
  bottomInset?: number
  onNavigate: (href: string) => void
}) {
  const styles = useStyles(buildStyles)
  const isSetup = pathname === HOME_HREF || pathname === SETTINGS_HREF
  if (pathname.startsWith(BLOCKS_HREF)) {
    return (
      <BlockLibrary
        pathname={pathname}
        onNavigate={onNavigate}
        bottomInset={bottomInset}
      />
    )
  }
  if (pathname.startsWith(COMPONENTS_HREF)) {
    return (
      <ComponentLibrary
        pathname={pathname}
        onNavigate={onNavigate}
        bottomInset={bottomInset}
      />
    )
  }
  return (
    <ScrollView
      contentContainerStyle={[
        styles.page,
        {
          maxWidth: APP_SHELL_CONTENT_WIDTHS[contentSize],
          paddingBottom: FAB_CLEARANCE + bottomInset,
        },
      ]}
    >
      <Text accessibilityRole="header" style={styles.pageTitle}>
        {title}
      </Text>
      {isSetup ? (
        <>
          <Text style={styles.pageText}>
            Set up the shell and its look here.
          </Text>
          {setup}
        </>
      ) : (
        <>
          <Text style={styles.pageText}>
            The shell's options and settings are on Home. This screen's active
            page, breadcrumb and panel placement come from lib/app-shell-model,
            the same file the web shell runs.
          </Text>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.placeholder} />
          ))}
        </>
      )}
    </ScrollView>
  )
}

/** The breadcrumb on an iPad: the workspace, then the page's ancestors. */
function Breadcrumb({ crumbs }: { crumbs: string[] }) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <View style={styles.breadcrumb} accessibilityRole="text">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <React.Fragment key={`${crumb}-${index}`}>
            {index > 0 && (
              <ChevronRightIcon
                size={theme.icon[14]}
                color={theme.colors.muted}
                strokeWidth={1.5}
              />
            )}
            <Text
              numberOfLines={1}
              style={[styles.crumb, isLast && styles.crumbCurrent]}
            >
              {crumb}
            </Text>
          </React.Fragment>
        )
      })}
    </View>
  )
}

/** The primary action in an iPad's header: size="sm", so always compact. */
function PrimaryButton() {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <Pressable
      onPress={showNewTask}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.primaryPressed,
      ]}
    >
      <PlusIcon
        size={theme.compact.icon[16]}
        color={theme.colors.primaryForeground}
        strokeWidth={2}
      />
      <Text style={styles.primaryLabel}>New task</Text>
    </Pressable>
  )
}

/** The primary action on a phone, floating over the page: size="icon-lg". */
function FloatingButton({ bottomInset }: { bottomInset: number }) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <Pressable
      onPress={showNewTask}
      accessibilityRole="button"
      accessibilityLabel="New task"
      style={({ pressed }) => [
        styles.fab,
        { bottom: theme.space[16] + bottomInset },
        pressed && styles.primaryPressed,
      ]}
    >
      <PlusIcon
        size={theme.spacious.icon[16]}
        color={theme.colors.primaryForeground}
        strokeWidth={2}
      />
    </Pressable>
  )
}

function Shell() {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const size = getShellSize(width)
  const isPhone = size === "phone"

  const [pathname, setPathname] = React.useState(HOME_HREF)
  React.useEffect(() => {
    const open = (url: string | null | undefined) => {
      const path = getPathFromUrl(url)
      if (path) setPathname(path)
    }
    void Linking.getInitialURL().then(open)
    const subscription = Linking.addEventListener("url", ({ url }) => open(url))
    return () => subscription.remove()
  }, [])
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )
  const [workspaceId, setWorkspaceId] = React.useState("acme")
  const [options, setOptions] = React.useState(DEFAULT_SHELL_OPTIONS)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)
  // Docked, the panel's open state is a preference. Floating (a phone, a
  // narrow iPad), it starts closed and its open state is temporary, so a
  // sheet never opens by itself, as on the web.
  const [panel, setPanel] = React.useState<PanelState>({
    open: true,
    view: "details",
    width: PANEL_WIDTH,
  })
  const [isFloatingOpen, setIsFloatingOpen] = React.useState(false)

  const activeId = getActiveNavItem(NAV_GROUPS, pathname)
  const path = activeId ? getNavPath(NAV_GROUPS, activeId) : []
  const title = path.at(-1)?.label ?? "Home"
  const workspace =
    WORKSPACES.find((entry) => entry.id === workspaceId) ?? WORKSPACES[0]
  const isSidebarExpanded = options.collapse === "never" || isSidebarOpen
  const railWidth = theme.space[32] + 2 * theme.space[8]
  const sidebarWidth = isSidebarExpanded
    ? SIDEBAR_WIDTH
    : options.collapse === "icons"
      ? railWidth
      : 0
  const placement = getPanelPlacement({
    shellWidth: width - insets.left - insets.right,
    occupiedWidth: isPhone ? 0 : sidebarWidth,
    panelWidth: panel.width,
    mobile: options.panelOnPhones,
  })
  const hasPanel = options.panel && placement !== null
  const isFlat = options.style !== "inset"
  const gutter = isFlat ? 0 : theme.space[8]

  const isDocked = placement === "inline"
  const isPanelOpen = isDocked ? panel.open : isFloatingOpen
  const setPanelOpen = (open: boolean) => {
    if (isDocked) setPanel((current) => ({ ...current, open }))
    else setIsFloatingOpen(open)
  }

  const navigate = (item: NavItem<LucideIcon>) => {
    if (item.href) setPathname(item.href)
    setIsDrawerOpen(false)
  }
  // The panel's toggle holds the card's top corner, open or closed, centred
  // in the row of whichever header is under it.
  const panelToggleInset = getControlInset(theme)
  const closePanel = () => setPanelOpen(false)
  const togglePanel = () => setPanelOpen(!isPanelOpen)
  const panelContent = (
    <PanelContent
      title={title}
      view={panel.view}
      onViewChange={(view) =>
        setPanel((current) => revealPanelView(current, view))
      }
      onClose={closePanel}
      isDocked={isDocked}
    />
  )
  const panelToggle = (
    <IconButton
      label={isPanelOpen ? "Hide the panel" : "Show the panel"}
      onPress={togglePanel}
      isExpanded={isPanelOpen}
    >
      <SidebarToggleIcon
        isOpen={isPanelOpen}
        side="right"
        background={theme.colors.main}
      />
    </IconButton>
  )
  const setup = (
    <SetupCards
      options={options}
      onOptionsChange={setOptions}
      isPhone={isPhone}
    />
  )
  const isFloatingSidebar = !isPhone && options.style === "floating"
  const sidebar = (
    <Sidebar
      activeId={activeId}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onNavigate={navigate}
      workspaceId={workspaceId}
      onWorkspaceChange={setWorkspaceId}
      onToggle={
        isPhone
          ? () => setIsDrawerOpen(false)
          : options.collapse === "never"
            ? undefined
            : () => setIsSidebarOpen(false)
      }
      isRail={!isPhone && !isSidebarExpanded}
      hasWorkspaces={options.workspaces === "menu"}
      account={options.account}
      insetTop={isFloatingSidebar ? 0 : insets.top}
      insetBottom={isFloatingSidebar ? 0 : insets.bottom}
    />
  )
  const panelSheet = hasPanel && (
    <PanelSheet
      isOpen={isFloatingOpen}
      isScreen={placement === "swap"}
      insetTop={insets.top}
      onClose={closePanel}
    >
      {panelContent}
    </PanelSheet>
  )

  if (isPhone) {
    return (
      <>
        <SidebarReveal
          variant={options.phoneSidebar}
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          sidebar={sidebar}
        >
          <View style={styles.phone}>
            <View style={[styles.phoneHeader, { paddingTop: insets.top }]}>
              <View style={styles.header}>
                <IconButton
                  label="Show the sidebar"
                  onPress={() => setIsDrawerOpen(true)}
                  isExpanded={isDrawerOpen}
                  style={styles.headerTrigger}
                >
                  <SidebarToggleIcon
                    isOpen={isDrawerOpen}
                    background={theme.colors.main}
                  />
                </IconButton>
                <Text numberOfLines={1} style={styles.phoneTitle}>
                  {title}
                </Text>
                {hasPanel && panelToggle}
              </View>
            </View>
            <View style={styles.fill}>
              <Page
                title={title}
                pathname={pathname}
                setup={setup}
                contentSize={options.contentSize}
                bottomInset={options.tabBar ? 0 : insets.bottom}
                onNavigate={setPathname}
              />
              {options.actions && !isLibraryPath(pathname) && (
                <FloatingButton
                  bottomInset={options.tabBar ? 0 : insets.bottom}
                />
              )}
            </View>
            {options.tabBar && (
              <TabBar
                groups={NAV_GROUPS}
                activeId={activeId}
                onNavigate={navigate}
                insetBottom={insets.bottom}
              />
            )}
          </View>
        </SidebarReveal>
        {panelSheet}
      </>
    )
  }

  return (
    <View
      style={[
        styles.frame,
        isFloatingSidebar && styles.frameFloating,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {sidebarWidth > 0 && (
        <View
          style={[
            { width: sidebarWidth },
            options.style === "flush" && styles.sidebarFlush,
            isFloatingSidebar && [
              styles.sidebarFloating,
              {
                paddingTop: insets.top + theme.space[8],
                paddingBottom: insets.bottom + theme.space[8],
              },
            ],
          ]}
        >
          <View style={isFloatingSidebar ? styles.sidebarCard : styles.fill}>
            {sidebar}
          </View>
        </View>
      )}
      <View style={styles.fill}>
        <View
          style={[
            styles.cards,
            isFlat && styles.cardsFlat,
            {
              paddingTop: isFlat ? 0 : insets.top + gutter,
              paddingLeft: isFlat || sidebarWidth > 0 ? 0 : gutter,
              paddingBottom: options.status
                ? 0
                : isFlat
                  ? 0
                  : insets.bottom + gutter,
            },
          ]}
        >
          <View
            style={[
              isFlat ? styles.flatColumn : styles.card,
              styles.fill,
              isFlat && { paddingTop: insets.top },
            ]}
          >
            <View style={styles.header}>
              {!isSidebarExpanded && (
                <IconButton
                  label="Show the sidebar"
                  onPress={() => setIsSidebarOpen(true)}
                  isExpanded={false}
                  style={styles.headerTrigger}
                >
                  <SidebarToggleIcon
                    isOpen={false}
                    background={theme.colors.main}
                  />
                </IconButton>
              )}
              {options.breadcrumb ? (
                <Breadcrumb
                  crumbs={[workspace.name, ...path.map((item) => item.label)]}
                />
              ) : (
                <Text numberOfLines={1} style={styles.phoneTitle}>
                  {title}
                </Text>
              )}
              {options.actions && <PrimaryButton />}
              {hasPanel && <View style={styles.toggleSlot} />}
            </View>
            <Page
              title={title}
              pathname={pathname}
              setup={setup}
              contentSize={options.contentSize}
              onNavigate={setPathname}
            />
          </View>
          {hasPanel && isDocked && panel.open && (
            <View
              style={[
                isFlat
                  ? [
                      styles.flatColumn,
                      styles.panelFlat,
                      { paddingTop: insets.top },
                    ]
                  : styles.card,
                { width: panel.width },
              ]}
            >
              {panelContent}
            </View>
          )}
          {hasPanel && (
            <View
              style={[
                styles.panelToggle,
                {
                  top: insets.top + gutter + panelToggleInset,
                  right: gutter + panelToggleInset,
                },
              ]}
            >
              {panelToggle}
            </View>
          )}
        </View>
        {options.status && (
          <View
            style={[
              styles.statusBar,
              isFloatingSidebar && styles.statusBarFloating,
              { paddingBottom: insets.bottom },
            ]}
            accessibilityRole="summary"
          >
            <GitBranchIcon
              size={theme.icon[14]}
              color={theme.colors.mutedOnFrame}
              strokeWidth={1.5}
            />
            <Text style={styles.status}>main</Text>
            <Text style={styles.status}>Synced</Text>
            <Text style={[styles.status, styles.statusEnd]}>4 open</Text>
          </View>
        )}
      </View>
      {!isDocked && panelSheet}
    </View>
  )
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
          <Shell />
        </ThemeProvider>
      </FabricatorRoot>
    </SafeAreaProvider>
  )
}

// The page's own rhythm is fixed on the website too: p-6, gap-6, h-32, an
// unscaled 16px paragraph and a text-2xl title.
const PAGE_SPACE = 24
const PLACEHOLDER_HEIGHT = 128
const FAB_CLEARANCE = 112

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    phone: { flex: 1, backgroundColor: theme.colors.main },
    frame: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: theme.colors.frame,
    },
    // A floating sidebar is the one card: the rest takes the main colour.
    frameFloating: { backgroundColor: theme.colors.main },
    statusBarFloating: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    phoneHeader: { backgroundColor: theme.colors.main },
    header: {
      height: theme.space[48],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      paddingLeft: theme.space[12],
      paddingRight: getControlInset(theme),
    },
    phoneTitle: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: theme.text[13],
      color: theme.colors.foreground,
    },
    page: {
      width: "100%",
      alignSelf: "center",
      padding: PAGE_SPACE,
      gap: PAGE_SPACE,
    },
    pageTitle: {
      fontFamily: FONT.semibold,
      fontSize: 24,
      letterSpacing: -0.6,
      color: theme.colors.foreground,
    },
    pageText: {
      fontFamily: FONT.regular,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.muted,
    },
    placeholder: {
      height: PLACEHOLDER_HEIGHT,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.placeholder,
    },
    // The website's -ms-(--density-4), read inside the button's compact density.
    headerTrigger: { marginLeft: getControlInset(theme) - theme.space[12] },
    toggleSlot: { width: theme.compact.space[36] },
    panelToggle: { position: "absolute" },
    sidebarFlush: {
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    sidebarFloating: { paddingHorizontal: theme.space[8] },
    sidebarCard: {
      flex: 1,
      overflow: "hidden",
      borderRadius: theme.radius.xl,
      boxShadow: theme.shadows.selection,
    },
    cardsFlat: { gap: 0, paddingRight: 0 },
    flatColumn: { backgroundColor: theme.colors.main },
    panelFlat: { borderLeftWidth: 1, borderLeftColor: theme.colors.border },
    setup: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: PAGE_SPACE,
    },
    setupFull: { width: "100%" },
    setupSettings: { flexGrow: 1, flexBasis: 256 },
    setupOptions: { flexGrow: 1, flexBasis: 352, minWidth: 0 },
    cards: {
      flex: 1,
      flexDirection: "row",
      gap: theme.space[8],
      paddingRight: theme.space[8],
    },
    card: {
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.main,
      boxShadow: theme.shadows.card,
      overflow: "hidden",
    },
    breadcrumb: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[6],
      minWidth: 0,
    },
    crumb: {
      flexShrink: 1,
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
      color: theme.colors.muted,
    },
    crumbCurrent: {
      flexShrink: 0,
      fontFamily: FONT.medium,
      color: theme.colors.foreground,
    },
    primary: {
      height: theme.compact.space[36],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.compact.space[6],
      paddingLeft: theme.compact.space[10],
      paddingRight: theme.compact.space[12],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary,
    },
    primaryPressed: { opacity: 0.9 },
    primaryLabel: {
      fontFamily: FONT.medium,
      fontSize: theme.compact.text[13],
      color: theme.colors.primaryForeground,
    },
    fab: {
      position: "absolute",
      right: theme.space[16],
      width: theme.spacious.space[36],
      height: theme.spacious.space[36],
      borderRadius: theme.spacious.space[36] / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      boxShadow: theme.shadows.raised,
    },
    statusBar: {
      minHeight: theme.space[36],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      paddingHorizontal: theme.space[12],
    },
    status: {
      fontFamily: FONT.regular,
      fontSize: theme.text[12],
      color: theme.colors.mutedOnFrame,
    },
    statusEnd: { marginLeft: "auto" },
  })
