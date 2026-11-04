import * as React from "react"
import { View } from "react-native"

import {
  AppNav,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  createLocalStorage,
  type AppShellWindow,
} from "@/registry/native/ui/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/registry/native/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripTab,
  useTabStripState,
} from "@/registry/native/ui/tab-strip"
import { Text } from "@/registry/native/ui/text"

// The website's desktop app: tabs in the main card's top row and an off-canvas inset
// sidebar. React Native draws no window controls and windows don't drag, so `window`
// does nothing here, and `createLocalStorage` keeps the layout for the session.

const noop = () => {}

const desktopWindow: AppShellWindow = {
  controls: "macos",
  isFullscreen: false,
  trafficLights: { x: 16, y: 23 },
  isTranslucent: true,
}

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "library", label: "Library", href: "/" },
      { id: "recent", label: "Recent", href: "/recent" },
      { id: "shared", label: "Shared", href: "/shared", badge: 2 },
    ],
  },
]

const pages: Record<string, string> = {
  welcome: "Welcome",
  notes: "Meeting notes",
}

function AppShell04({
  pathname = "/",
  onNavigate = noop,
}: {
  pathname?: string
  onNavigate?: (item: AppNavItem) => void
}) {
  const [storage] = React.useState(createLocalStorage)
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["welcome", "notes"],
      pinned: [],
      recent: ["welcome"],
      preview: null,
      closed: [],
    },
  })

  return (
    <AppShell
      storageKey="app-shell-04"
      storage={storage}
      window={desktopWindow}
    >
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader>
          <View className="h-(--density-32) flex-row items-center px-2">
            <Text className="text-lg font-semibold tracking-tight">
              Library
            </Text>
          </View>
        </SidebarHeader>
        <SidebarContent>
          <AppNav groups={groups} pathname={pathname} onNavigate={onNavigate} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <TabStrip
            {...tabs.stripProps}
            onNew={() => tabs.reopen()}
            className="min-w-0 flex-1"
          >
            <TabStripList aria-label="Pages">
              {tabs.state.tabs.map((id) => (
                <TabStripTab key={id} value={id}>
                  {pages[id] ?? id}
                </TabStripTab>
              ))}
            </TabStripList>
            <TabStripNew />
          </TabStrip>
        </AppShellHeader>
        <AppShellContent>
          <Text className="p-6">
            {tabs.activeId ? pages[tabs.activeId] : "No open pages"}.
          </Text>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}

export { AppShell04 }
