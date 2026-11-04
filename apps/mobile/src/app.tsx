import * as React from "react"
import {
  EMPTY_NAV_PREFERENCES,
  getActiveNavItem,
  getNavPath,
  getPanelPlacement,
  getShellSize,
  revealPanelView,
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

import { NAV_GROUPS, WORKSPACES } from "./nav"
import { SettingsPage } from "./settings"
import { IconButton } from "./shell/icon-button"
import { PanelContent, PanelSheet } from "./shell/panel"
import { Sidebar } from "./shell/sidebar"
import { SidebarReveal } from "./shell/sidebar-reveal"
import { SidebarToggleIcon } from "./shell/sidebar-toggle-icon"
import { TabBar } from "./shell/tab-bar"
import { FONT, ThemeProvider, useStyles, useTheme, type Theme } from "./theme"

// The Sidebar's and the panel's default widths on the website.
const SIDEBAR_WIDTH = 256
const PANEL_WIDTH = 320

const SETTINGS_HREF = "/settings"

const showNewTask = () => Alert.alert("New task")

/** The page: its title, then its content on the page's own rhythm. */
function Page({ title, pathname }: { title: string; pathname: string }) {
  const styles = useStyles(buildStyles)
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.pageTitle}>
        {title}
      </Text>
      {pathname === SETTINGS_HREF ? (
        <SettingsPage />
      ) : (
        <>
          <Text style={styles.pageText}>
            The App Shell's model drives this screen: the active page, the open
            rows, the bottom tabs, the breadcrumb and where the panel goes all
            come from lib/app-shell-model, the same file the web shell runs.
            Change the look in Settings.
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
function FloatingButton() {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <Pressable
      onPress={showNewTask}
      accessibilityRole="button"
      accessibilityLabel="New task"
      style={({ pressed }) => [styles.fab, pressed && styles.primaryPressed]}
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

  const [pathname, setPathname] = React.useState("/projects/launch/tasks")
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )
  const [workspaceId, setWorkspaceId] = React.useState("acme")
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
  const placement = getPanelPlacement({
    shellWidth: width - insets.left - insets.right,
    occupiedWidth: !isPhone && isSidebarOpen ? SIDEBAR_WIDTH : 0,
    panelWidth: panel.width,
  })

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
  const panelToggleInset = (theme.space[48] - theme.compact.space[36]) / 2
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
  const sidebar = (
    <Sidebar
      activeId={activeId}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onNavigate={navigate}
      workspaceId={workspaceId}
      onWorkspaceChange={setWorkspaceId}
      onToggle={() =>
        isPhone ? setIsDrawerOpen(false) : setIsSidebarOpen(false)
      }
      insetTop={insets.top}
      insetBottom={insets.bottom}
    />
  )

  if (isPhone) {
    return (
      <>
        <SidebarReveal
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
                {panelToggle}
              </View>
            </View>
            <View style={styles.fill}>
              <Page title={title} pathname={pathname} />
              <FloatingButton />
            </View>
            <TabBar
              groups={NAV_GROUPS}
              activeId={activeId}
              onNavigate={navigate}
              insetBottom={insets.bottom}
            />
          </View>
        </SidebarReveal>
        <PanelSheet isOpen={isFloatingOpen} onClose={closePanel}>
          {panelContent}
        </PanelSheet>
      </>
    )
  }

  return (
    <View
      style={[
        styles.frame,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {isSidebarOpen && <View style={{ width: SIDEBAR_WIDTH }}>{sidebar}</View>}
      <View style={styles.fill}>
        <View
          style={[
            styles.cards,
            {
              paddingTop: insets.top + theme.space[6],
              paddingLeft: isSidebarOpen ? 0 : theme.space[6],
            },
          ]}
        >
          <View style={[styles.card, styles.fill]}>
            <View style={styles.header}>
              {!isSidebarOpen && (
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
              <Breadcrumb
                crumbs={[workspace.name, ...path.map((item) => item.label)]}
              />
              <PrimaryButton />
              <View style={styles.toggleSlot} />
            </View>
            <Page title={title} pathname={pathname} />
          </View>
          {isDocked && panel.open && (
            <View style={[styles.card, { width: panel.width }]}>
              {panelContent}
            </View>
          )}
          <View
            style={[
              styles.panelToggle,
              { top: insets.top + theme.space[6] + panelToggleInset },
            ]}
          >
            {panelToggle}
          </View>
        </View>
        <View
          style={[styles.statusBar, { paddingBottom: insets.bottom }]}
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
      </View>
      {!isDocked && (
        <PanelSheet isOpen={isFloatingOpen} onClose={closePanel}>
          {panelContent}
        </PanelSheet>
      )}
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
      <ThemeProvider>
        <ThemedStatusBar />
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

// The page's own rhythm is fixed on the website too: p-6, gap-6, h-32, an
// unscaled 16px paragraph and a text-2xl title.
const PAGE_SPACE = 24
const PAGE_MAX_WIDTH = 768
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
    phoneHeader: { backgroundColor: theme.colors.main },
    header: {
      height: theme.space[48],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      paddingHorizontal: theme.space[12],
    },
    phoneTitle: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: theme.text[13],
      color: theme.colors.foreground,
    },
    page: {
      width: "100%",
      maxWidth: PAGE_MAX_WIDTH,
      alignSelf: "center",
      padding: PAGE_SPACE,
      paddingBottom: FAB_CLEARANCE,
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
    headerTrigger: { marginLeft: -theme.compact.space[4] },
    toggleSlot: { width: theme.compact.space[36] },
    panelToggle: {
      position: "absolute",
      right: theme.space[6] + theme.space[12],
    },
    cards: {
      flex: 1,
      flexDirection: "row",
      gap: theme.space[6],
      paddingRight: theme.space[6],
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
      bottom: theme.space[16],
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
