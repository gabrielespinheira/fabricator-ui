"use client"

import * as React from "react"

import { AppNav, type AppNavGroup } from "@/registry/base-fabricator/ui/app-nav"
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
} from "@/registry/base-fabricator/ui/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from "@/registry/base-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/registry/base-fabricator/ui/tab-strip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A workbench: documents open as tabs above the content, a resources panel
// switches views from triggers in the tab row (as an editor's activity bar
// does), and a status bar runs along the bottom. The sidebar starts hidden
// and peeks on hover.

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

const documentIcon = (
  <IconPlaceholder
    lucide="FileTextIcon"
    tabler="IconFileText"
    hugeicons="File01Icon"
    phosphor="FileTextIcon"
    remixicon="RiFileTextLine"
  />
)

const initialDocuments: Record<string, string> = {
  plan: "app-shell.md",
  shell: "app-shell.tsx",
  notes: "Notes",
}

export default function Page() {
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
          <AppNav groups={groups} pathname="/p/fabricator" />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <div className="flex items-center gap-1 px-2">
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
                  icon={documentIcon}
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
            aria-label="Files"
          >
            <IconPlaceholder
              lucide="FilesIcon"
              tabler="IconFiles"
              hugeicons="Files01Icon"
              phosphor="FilesIcon"
              remixicon="RiFileCopyLine"
            />
          </AppShellPanelTrigger>
          <AppShellPanelTrigger
            panel="resources"
            view="search"
            aria-label="Search"
          >
            <IconPlaceholder
              lucide="SearchIcon"
              tabler="IconSearch"
              hugeicons="Search01Icon"
              phosphor="MagnifyingGlassIcon"
              remixicon="RiSearchLine"
            />
          </AppShellPanelTrigger>
        </div>
        <AppShellContent id="workbench-content" role="tabpanel" className="p-6">
          {tabs.activeId ? documents[tabs.activeId] : "No open documents"}
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
        <AppShellPanelView value="files" className="p-3">
          Your files.
        </AppShellPanelView>
        <AppShellPanelView value="search" className="p-3">
          Search the project.
        </AppShellPanelView>
      </AppShellPanel>
      <AppShellStatusBar>
        <span>main</span>
        <span className="ms-auto">{tabs.state.tabs.length} open</span>
      </AppShellStatusBar>
    </AppShell>
  )
}
