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
  MenuIcon,
  PanelLeftIcon,
  PanelRightIcon,
  type LucideIcon,
} from "lucide-react-native"
import {
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
import { Drawer } from "./shell/drawer"
import { IconButton } from "./shell/icon-button"
import { PanelContent, PanelSheet } from "./shell/panel"
import { Sidebar } from "./shell/sidebar"
import { TabBar } from "./shell/tab-bar"
import { SIZE, useTheme, type Theme } from "./theme"

const SIDEBAR_WIDTH = 300
const PANEL_WIDTH = 340

/** The page: its title, then placeholder content. */
function Page({ title, theme }: { title: string; theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text
        accessibilityRole="header"
        style={[styles.pageTitle, { color: theme.foreground }]}
      >
        {title}
      </Text>
      <Text style={[styles.pageText, { color: theme.muted }]}>
        The App Shell's model drives this screen: the active page, the open
        rows, the bottom tabs, the breadcrumb and where the panel goes all come
        from lib/app-shell-model, the same file the web shell runs.
      </Text>
      {Array.from({ length: 5 }, (_, index) => (
        <View
          key={index}
          style={[styles.placeholder, { backgroundColor: theme.wash }]}
        />
      ))}
    </ScrollView>
  )
}

/** The breadcrumb on an iPad: the workspace, then the page's ancestors. */
function Breadcrumb({ crumbs, theme }: { crumbs: string[]; theme: Theme }) {
  return (
    <View style={styles.breadcrumb} accessibilityRole="text">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <React.Fragment key={`${crumb}-${index}`}>
            {index > 0 && (
              <ChevronRightIcon
                size={14}
                color={theme.muted}
                strokeWidth={1.75}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.crumb,
                {
                  color: isLast ? theme.foreground : theme.muted,
                  fontWeight: isLast ? "500" : "400",
                },
              ]}
            >
              {crumb}
            </Text>
          </React.Fragment>
        )
      })}
    </View>
  )
}

function Shell() {
  const theme = useTheme()
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
    shellWidth: width,
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
      theme={theme}
    />
  )
  const sidebar = (
    <Sidebar
      activeId={activeId}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onNavigate={navigate}
      workspaceId={workspaceId}
      onWorkspaceChange={setWorkspaceId}
      insetTop={insets.top}
      insetBottom={insets.bottom}
      theme={theme}
    />
  )

  if (isPhone) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.main }]}>
        <View style={[styles.phoneHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={MenuIcon}
            label="Open the sidebar"
            onPress={() => setIsDrawerOpen(true)}
            theme={theme}
          />
          <Text
            numberOfLines={1}
            style={[styles.phoneTitle, { color: theme.foreground }]}
          >
            {title}
          </Text>
          <IconButton
            icon={PanelRightIcon}
            label="Toggle the panel"
            onPress={togglePanel}
            isActive={isPanelOpen}
            theme={theme}
          />
        </View>
        <Page title={title} theme={theme} />
        <TabBar
          groups={NAV_GROUPS}
          activeId={activeId}
          onNavigate={navigate}
          insetBottom={insets.bottom}
          theme={theme}
        />
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          width={Math.min(320, width * 0.85)}
          backgroundColor={theme.frame}
        >
          {sidebar}
        </Drawer>
        <PanelSheet isOpen={isFloatingOpen} onClose={closePanel} theme={theme}>
          {panelContent}
        </PanelSheet>
      </View>
    )
  }

  const card = [
    styles.card,
    { backgroundColor: theme.main, borderColor: theme.cardEdge },
  ]
  return (
    <View style={[styles.fill, styles.row, { backgroundColor: theme.frame }]}>
      {isSidebarOpen && <View style={{ width: SIDEBAR_WIDTH }}>{sidebar}</View>}
      <View style={styles.fill}>
        <View
          style={[
            styles.fill,
            styles.row,
            styles.cards,
            {
              paddingTop: insets.top + SIZE.gutter,
              paddingLeft: isSidebarOpen ? 0 : SIZE.gutter,
            },
          ]}
        >
          <View style={[card, styles.fill]}>
            <View style={styles.cardHeader}>
              <IconButton
                icon={PanelLeftIcon}
                label="Toggle the sidebar"
                onPress={() => setIsSidebarOpen((open) => !open)}
                theme={theme}
              />
              <Breadcrumb
                crumbs={[workspace.name, ...path.map((item) => item.label)]}
                theme={theme}
              />
              <IconButton
                icon={PanelRightIcon}
                label="Toggle the panel"
                onPress={togglePanel}
                isActive={isPanelOpen}
                theme={theme}
              />
            </View>
            <Page title={title} theme={theme} />
          </View>
          {isDocked && panel.open && (
            <View style={[card, { width: panel.width }]}>{panelContent}</View>
          )}
        </View>
        <View
          style={[styles.statusBar, { paddingBottom: insets.bottom }]}
          accessibilityRole="summary"
        >
          <GitBranchIcon
            size={14}
            color={theme.mutedOnFrame}
            strokeWidth={1.75}
          />
          <Text style={[styles.status, { color: theme.mutedOnFrame }]}>
            main
          </Text>
          <Text style={[styles.status, { color: theme.mutedOnFrame }]}>
            Synced
          </Text>
          <Text
            style={[
              styles.status,
              styles.statusEnd,
              { color: theme.mutedOnFrame },
            ]}
          >
            {size === "desktop" ? "Desktop" : "Tablet"} layout
          </Text>
        </View>
      </View>
      {!isDocked && (
        <PanelSheet isOpen={isFloatingOpen} onClose={closePanel} theme={theme}>
          {panelContent}
        </PanelSheet>
      )}
    </View>
  )
}

export function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Shell />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: "row" },
  phoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    minHeight: SIZE.header,
  },
  phoneTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  page: { padding: 20, gap: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  pageText: { fontSize: SIZE.text, lineHeight: 22 },
  placeholder: { height: 120, borderRadius: SIZE.radius },
  cards: { gap: SIZE.gutter, paddingRight: SIZE.gutter },
  card: {
    borderRadius: SIZE.radius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardHeader: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  breadcrumb: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  crumb: { fontSize: SIZE.small, flexShrink: 1 },
  statusBar: {
    minHeight: SIZE.statusBar,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  status: { fontSize: SIZE.caption },
  statusEnd: { marginLeft: "auto" },
})
