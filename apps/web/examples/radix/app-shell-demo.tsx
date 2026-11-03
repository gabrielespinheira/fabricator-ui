"use client"

import * as React from "react"
import {
  ActivityIcon,
  BellIcon,
  BoxIcon,
  CalendarIcon,
  ChartLineIcon,
  CogIcon,
  FileTextIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/radix-fabricator/ui/app-nav"
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
  AppShellPanelView,
  AppShellStatusBar,
} from "@/styles/radix-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/styles/radix-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/styles/radix-fabricator/ui/sidebar"
import { UserMenu } from "@/styles/radix-fabricator/ui/user-menu"
import { WorkspaceSwitcher } from "@/styles/radix-fabricator/ui/workspace-switcher"

const workspaces = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
  { id: "lab", name: "Side Lab", description: "Free" },
]

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: InboxIcon,
        badge: 12,
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
    id: "workspace",
    label: "Workspace",
    collapsible: true,
    items: [
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        icon: BoxIcon,
        children: [
          { id: "launch", label: "Q4 launch", href: "/projects/launch" },
          { id: "website", label: "Website", href: "/projects/website" },
          { id: "mobile", label: "Mobile app", href: "/projects/mobile" },
        ],
      },
      { id: "docs", label: "Documents", href: "/docs", icon: FileTextIcon },
      { id: "team", label: "Team", href: "/team", icon: UsersIcon },
      {
        id: "reports",
        label: "Reports",
        href: "/reports",
        icon: ChartLineIcon,
        status: "unread",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    collapsible: true,
    items: [
      { id: "help", label: "Help center", href: "/help", icon: LifeBuoyIcon },
      { id: "settings", label: "Settings", href: "/settings", icon: CogIcon },
    ],
  },
]

export function AppShellDemo() {
  const [path, setPath] = React.useState("/projects/launch")
  const [workspace, setWorkspace] = React.useState("acme")

  return (
    <AppShell storageKey="app-shell-demo" storage={null}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={workspace}
            onSelect={setWorkspace}
            onCreate={() => {}}
            onManage={() => {}}
          />
        </SidebarHeader>
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname={path}
            renderLink={(item) => (
              <a
                href={item.href}
                onClick={(event) => {
                  event.preventDefault()
                  setPath(item.href ?? "/")
                }}
              />
            )}
          />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu
            user={{ name: "Gabs Fabricator", email: "gabs@fabricator.dev" }}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon />
                Notifications
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
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            renderLink={(item) => (
              <a href={item.href} onClick={(event) => event.preventDefault()} />
            )}
            items={[
              { label: "Acme Inc", href: "/" },
              { label: "Projects", href: "/projects" },
              { label: "Q4 launch" },
            ]}
          />
          <AppShellHeaderActions
            actions={[
              {
                id: "search",
                label: "Search",
                icon: SearchIcon,
                onSelect: () => {},
              },
              {
                id: "share",
                label: "Share",
                icon: ShareIcon,
                onSelect: () => {},
              },
            ]}
            primaryAction={{
              id: "new",
              label: "New task",
              icon: PlusIcon,
              onSelect: () => {},
            }}
          />
          <AppShellPanelTrigger panel="inspector" />
        </AppShellHeader>
        <AppShellContent>
          <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
            <AppShellPageTitle>Q4 launch</AppShellPageTitle>
            <p className="text-muted-foreground">
              Scroll down: the page title takes the breadcrumb&apos;s place in
              the header. Press F6 to move between the sidebar, the page and the
              panel.
            </p>
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl bg-muted/50"
                aria-hidden
              />
            ))}
          </div>
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="inspector"
        label="Inspector"
        defaultOpen
        shortcut="mod+alt+b"
        views={[
          { value: "details", label: "Details", icon: InfoIcon },
          { value: "activity", label: "Activity", icon: ActivityIcon },
          { value: "comments", label: "Comments", icon: MessageSquareIcon },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs />
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelView value="details" className="flex flex-col gap-3 p-4">
          <p className="font-medium">Q4 launch</p>
          <p className="text-muted-foreground">
            Drag the panel&apos;s edge to resize it, or past its minimum to
            close it. Press ⌥⌘B to toggle it.
          </p>
        </AppShellPanelView>
        <AppShellPanelView
          value="activity"
          className="p-4 text-muted-foreground"
        >
          Nothing new today.
        </AppShellPanelView>
        <AppShellPanelView
          value="comments"
          className="p-4 text-muted-foreground"
        >
          No comments yet.
        </AppShellPanelView>
      </AppShellPanel>
      <AppShellStatusBar>
        <span>Synced</span>
        <span className="ms-auto">12 tasks</span>
      </AppShellStatusBar>
    </AppShell>
  )
}
