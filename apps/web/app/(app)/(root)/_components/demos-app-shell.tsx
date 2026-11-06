"use client"

// Homepage cards for the App Shell family. Each is a compact, self-contained
// demo: the shells use a static sidebar and scope their shortcuts to focus,
// so they behave inside a card without taking over the page.
import * as React from "react"

import {
  ActivityIcon,
  BellIcon,
  BoxIcon,
  CodeIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  LogOutIcon,
  SettingsIcon,
} from "@/lib/site-icons"
import { AppNav, type AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTrigger,
  AppShellPanelView,
} from "@/styles/base-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from "@/styles/base-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"
import { UserMenu } from "@/styles/base-fabricator/ui/user-menu"
import { WorkspaceSwitcher } from "@/styles/base-fabricator/ui/workspace-switcher"

const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
]

const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

const GROUPS: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: InboxIcon,
        badge: 4,
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    collapsible: true,
    reorderable: true,
    items: [
      { id: "launch", label: "Q4 launch", href: "/launch", icon: BoxIcon },
      { id: "site", label: "Website", href: "/site", icon: GlobeIcon },
      { id: "docs", label: "Docs", href: "/docs", icon: FileTextIcon },
    ],
  },
]

const noNavigation = (item: { href?: string }) => (
  <a href={item.href} onClick={(event) => event.preventDefault()} />
)

/** A sidebar that sits in a card instead of the viewport. */
function CardSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      shortcut={null}
      className="min-h-0 w-auto"
      style={{ "--sidebar-width": "220px" } as React.CSSProperties}
    >
      <Sidebar collapsible="none" className="rounded-xl">
        {children}
      </Sidebar>
    </SidebarProvider>
  )
}

export function AppShellCardDemo() {
  return (
    <AppShell
      storage={null}
      shortcut={null}
      shortcutScope="focus"
      breakpoints={{ tablet: 280, desktop: 320 }}
      minMainWidth={80}
      sidebarWidth="140px"
      className="h-[340px] w-[360px] max-w-full overflow-hidden rounded-xl"
    >
      <Sidebar collapsible="none">
        <SidebarContent>
          <AppNav
            groups={GROUPS}
            pathname="/launch"
            renderLink={noNavigation}
          />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader trigger="never" className="px-3">
          <span className="min-w-0 flex-1 truncate font-medium">Q4 launch</span>
          <AppShellPanelTrigger panel="card-inspector" />
        </AppShellHeader>
        <AppShellContent className="flex flex-col gap-2 p-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-12 rounded-lg bg-muted/60"
              aria-hidden
            />
          ))}
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="card-inspector"
        label="Inspector"
        defaultWidth={130}
        minWidth={120}
        maxWidth={200}
        views={[
          { value: "details", label: "Details", icon: InfoIcon },
          { value: "activity", label: "Activity", icon: ActivityIcon },
        ]}
      >
        <AppShellPanelHeader className="px-2">
          <AppShellPanelTabs />
        </AppShellPanelHeader>
        <AppShellPanelView
          value="details"
          className="p-3 text-muted-foreground"
        >
          Drag my edge.
        </AppShellPanelView>
        <AppShellPanelView
          value="activity"
          className="p-3 text-muted-foreground"
        >
          Nothing new.
        </AppShellPanelView>
      </AppShellPanel>
    </AppShell>
  )
}

const TABS: Record<string, { title: string; icon: typeof HomeIcon }> = {
  home: { title: "Home", icon: HomeIcon },
  readme: { title: "README.md", icon: FileTextIcon },
  shell: { title: "app-shell.tsx", icon: CodeIcon },
  site: { title: "Website", icon: GlobeIcon },
}

export function TabStripCardDemo() {
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["home", "readme", "shell"],
      pinned: ["home"],
      recent: ["shell"],
      preview: "site",
      closed: [],
    },
  })
  return (
    <div className="w-[340px] max-w-full overflow-hidden rounded-xl bg-sidebar">
      <TabStrip
        {...tabs.stripProps}
        onNew={() => tabs.reopen()}
        shortcuts={false}
      >
        <TabStripList aria-label="Open files">
          {tabs.state.tabs.map((id) => {
            const tab = TABS[id]
            return tab ? (
              <TabStripTab
                key={id}
                value={id}
                icon={tab.icon}
                pinned={tabs.state.pinned.includes(id)}
                preview={tabs.state.preview === id}
                status={id === "readme" ? "dirty" : undefined}
                className="w-28 min-w-20"
              >
                {tab.title}
              </TabStripTab>
            ) : null
          })}
        </TabStripList>
        <TabStripNew aria-label="Reopen closed tab" />
      </TabStrip>
    </div>
  )
}

export function AppNavCardDemo() {
  return (
    <CardSidebar>
      <SidebarContent>
        <AppNav
          groups={GROUPS}
          pathname="/site"
          customizable
          renderLink={noNavigation}
        />
      </SidebarContent>
    </CardSidebar>
  )
}

export function WorkspaceSwitcherCardDemo() {
  const [active, setActive] = React.useState("acme")
  return (
    <CardSidebar>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={WORKSPACES}
          activeId={active}
          onSelect={setActive}
          onCreate={() => {}}
          shortcut={null}
        />
      </SidebarHeader>
    </CardSidebar>
  )
}

export function UserMenuCardDemo() {
  return (
    <CardSidebar>
      <SidebarFooter>
        <UserMenu user={USER}>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <BellIcon />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
    </CardSidebar>
  )
}
