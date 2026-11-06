import * as React from "react"
import {
  FilesIcon,
  FileTextIcon,
  SearchIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import {
  AppNav,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTrigger,
  AppShellPanelView,
  AppShellStatusBar,
} from "@/registry/native/ui/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from "@/registry/native/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/registry/native/ui/tab-strip"
import { Text } from "@/registry/native/ui/text"

// A workbench: documents open as tabs above the content, a resources panel switches
// views from triggers in the tab row (as an editor's activity bar does), and a status
// bar runs along the bottom. The sidebar starts hidden.

const noop = () => {}

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/" },
      { id: "calendar", label: "Calendar", href: "/calendar" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    collapsible: true,
    reorderable: true,
    items: [
      { id: "relay", label: "Relay", href: "/p/relay", badge: 3 },
      { id: "fabricator", label: "Fabricator", href: "/p/fabricator" },
    ],
  },
]

const initialDocuments: Record<string, string> = {
  plan: "app-shell.md",
  shell: "app-shell.tsx",
  notes: "Notes",
}

function AppShell02({
  pathname = "/p/fabricator",
  onNavigate = noop,
}: {
  pathname?: string
  onNavigate?: (item: AppNavItem) => void
}) {
  const [documents, setDocuments] = React.useState(initialDocuments)
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["plan", "shell", "notes"],
      pinned: ["plan"],
      recent: ["shell"],
      preview: null,
      closed: [],
    },
  })

  const newDocument = () => {
    const id = `untitled-${Object.keys(documents).length}`
    setDocuments((current) => ({ ...current, [id]: "Untitled" }))
    tabs.open(id)
  }

  return (
    <AppShell storageKey="app-shell-02" peek="hover" defaultOpen={false}>
      <Sidebar variant="inset">
        <SidebarContent>
          <AppNav groups={groups} pathname={pathname} onNavigate={onNavigate} />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <View className="h-(--density-48) shrink-0 flex-row items-center gap-1 px-2">
          <SidebarTrigger />
          <TabStrip
            {...tabs.stripProps}
            onNew={newDocument}
            onRename={(id, title) =>
              setDocuments((current) => ({ ...current, [id]: title }))
            }
            panelId="workbench-content"
            className="min-w-0 flex-1"
          >
            <TabStripList aria-label="Open documents">
              {tabs.state.tabs.map((id) => (
                <TabStripTab
                  key={id}
                  value={id}
                  icon={FileTextIcon}
                  pinned={tabs.state.pinned.includes(id)}
                >
                  {documents[id] ?? id}
                </TabStripTab>
              ))}
            </TabStripList>
            <TabStripNew />
            <TabStripOverflow />
          </TabStrip>
          <AppShellPanelTrigger
            panel="resources"
            view="files"
            accessibilityLabel="Files"
          >
            <FilesIcon />
          </AppShellPanelTrigger>
          <AppShellPanelTrigger
            panel="resources"
            view="search"
            accessibilityLabel="Search"
          >
            <SearchIcon />
          </AppShellPanelTrigger>
        </View>
        <AppShellContent id="workbench-content" role="tabpanel">
          <Text className="p-6">
            {tabs.activeId ? documents[tabs.activeId] : "No open documents"}
          </Text>
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="resources"
        label="Resources"
        defaultOpen
        defaultWidth={300}
        views={[
          { value: "files", label: "Files", shortcut: "shift+mod+e" },
          { value: "search", label: "Search", shortcut: "shift+mod+f" },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs />
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelView value="files">
          <Text className="p-3">Your files.</Text>
        </AppShellPanelView>
        <AppShellPanelView value="search">
          <Text className="p-3">Search the project.</Text>
        </AppShellPanelView>
      </AppShellPanel>
      <AppShellStatusBar>
        <Text>main</Text>
        <Text className="ms-auto">{tabs.state.tabs.length} open</Text>
      </AppShellStatusBar>
    </AppShell>
  )
}

export { AppShell02 }
