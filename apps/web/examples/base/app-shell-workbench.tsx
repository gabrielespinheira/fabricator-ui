"use client"

import * as React from "react"
import {
  CalendarIcon,
  FilesIcon,
  FileTextIcon,
  GitBranchIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"
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
} from "@/styles/base-fabricator/ui/app-shell"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboardIcon,
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/calendar",
        icon: CalendarIcon,
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    collapsible: true,
    items: [
      {
        id: "relay",
        label: "Relay",
        href: "/p/relay",
        icon: GlobeIcon,
        badge: 3,
      },
      {
        id: "fabricator",
        label: "Fabricator",
        href: "/p/fabricator",
        icon: FileTextIcon,
      },
    ],
  },
]

type Tab = { title: string; icon: typeof FileTextIcon }

const INITIAL_TABS: Record<string, Tab> = {
  session: { title: "Build the app shell", icon: MessageSquareIcon },
  plan: { title: "app-shell.md", icon: FileTextIcon },
  preview: { title: "localhost:4000", icon: GlobeIcon },
  terminal: { title: "Terminal", icon: TerminalIcon },
}

export function AppShellWorkbench() {
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["session", "plan", "preview", "terminal"],
      pinned: ["session"],
      recent: ["plan"],
      preview: null,
      closed: [],
    },
  })
  const [titles, setTitles] = React.useState(INITIAL_TABS)

  return (
    <AppShell
      storageKey="app-shell-workbench"
      storage={null}
      peek="hover"
      defaultOpen={false}
    >
      <Sidebar variant="inset">
        <SidebarHeader className="flex-row items-center">
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname="/p/fabricator"
            renderLink={(item) => (
              <a href={item.href} onClick={(event) => event.preventDefault()} />
            )}
          />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <div className="flex items-center gap-1 ps-2 pe-2">
          <SidebarTrigger />
          <TabStrip
            {...tabs.stripProps}
            onNew={() => {
              const id = `session-${Object.keys(titles).length}`
              setTitles((current) => ({
                ...current,
                [id]: { title: "New session", icon: MessageSquareIcon },
              }))
              tabs.open(id)
            }}
            panelId="workbench-content"
            className="min-w-0 flex-1"
          >
            <TabStripList aria-label="Workspace tabs">
              {tabs.state.tabs.map((id) => {
                const tab = titles[id]
                if (!tab) return null
                return (
                  <TabStripTab
                    key={id}
                    value={id}
                    icon={tab.icon}
                    pinned={tabs.state.pinned.includes(id)}
                  >
                    {tab.title}
                  </TabStripTab>
                )
              })}
            </TabStripList>
            <TabStripNew />
          </TabStrip>
          <AppShellPanelTrigger
            panel="resources"
            view="files"
            aria-label="Files"
          >
            <FilesIcon />
          </AppShellPanelTrigger>
          <AppShellPanelTrigger
            panel="resources"
            view="search"
            aria-label="Search"
          >
            <SearchIcon />
          </AppShellPanelTrigger>
          <AppShellPanelTrigger
            panel="resources"
            view="changes"
            aria-label="Changes"
          >
            <GitBranchIcon />
          </AppShellPanelTrigger>
        </div>
        <AppShellContent
          id="workbench-content"
          role="tabpanel"
          className="flex items-center justify-center p-6 text-sm text-muted-foreground"
        >
          {tabs.activeId ? titles[tabs.activeId]?.title : "No open tabs"}
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="resources"
        label="Resources"
        defaultOpen
        defaultWidth={300}
        shortcut="mod+\"
        views={[
          {
            value: "files",
            label: "Files",
            icon: FilesIcon,
            shortcut: "shift+mod+e",
          },
          {
            value: "search",
            label: "Search",
            icon: SearchIcon,
            shortcut: "shift+mod+f",
          },
          {
            value: "changes",
            label: "Changes",
            icon: GitBranchIcon,
            shortcut: "shift+mod+g",
          },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs />
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelView value="files" className="p-3 text-muted-foreground">
          app/ · components/ · registry/
        </AppShellPanelView>
        <AppShellPanelView value="search" className="p-3 text-muted-foreground">
          Search the project.
        </AppShellPanelView>
        <AppShellPanelView
          value="changes"
          className="p-3 text-muted-foreground"
        >
          3 files changed.
        </AppShellPanelView>
      </AppShellPanel>
      <AppShellStatusBar>
        <Button variant="ghost" size="sm" aria-label="Branch: main">
          <GitBranchIcon data-icon="inline-start" />
          main
        </Button>
        <span className="ms-auto">{tabs.state.tabs.length} tabs</span>
      </AppShellStatusBar>
    </AppShell>
  )
}
