"use client"

import * as React from "react"
import {
  BellIcon,
  BoxIcon,
  CalendarIcon,
  ChartLineIcon,
  CogIcon,
  FileTextIcon,
  HomeIcon,
  InboxIcon,
  LifeBuoyIcon,
  LogOutIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/radix-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPageTitle,
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
  SidebarTrigger,
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
        badge: 4,
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

type Crumb = { label: string; href?: string }

/** The trail to the current page: its parent row, then the page. */
function getCrumbs(path: string): Crumb[] {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.href === path) return [{ label: item.label }]
      const child = item.children?.find((entry) => entry.href === path)
      if (child) {
        return [{ label: item.label, href: item.href }, { label: child.label }]
      }
    }
  }
  return [{ label: "Home" }]
}

export default function SidebarDemo() {
  const [path, setPath] = React.useState("/projects/launch")
  const [workspace, setWorkspace] = React.useState("acme")
  const workspaceName = workspaces.find((entry) => entry.id === workspace)?.name
  const crumbs = getCrumbs(path)
  const page = crumbs[crumbs.length - 1]?.label

  return (
    <AppShell storageKey="sidebar-demo" storage={null}>
      <Sidebar variant="inset">
        <SidebarHeader className="flex-row items-center">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={workspace}
              onSelect={setWorkspace}
              onCreate={() => {}}
              onManage={() => {}}
            />
          </div>
          <SidebarTrigger className="ms-auto" />
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
              <a
                href={item.href}
                onClick={(event) => {
                  event.preventDefault()
                  setPath(item.href ?? "/")
                }}
              />
            )}
            items={[{ label: workspaceName, href: "/" }, ...crumbs]}
          />
        </AppShellHeader>
        <AppShellContent size="md">
          <div className="flex flex-col gap-3">
            <AppShellPageTitle>{page}</AppShellPageTitle>
            <p className="text-muted-foreground">
              Drag the sidebar&apos;s edge to resize it, click the edge or press
              ⌘B to collapse it, and click a section&apos;s name to fold it
              away.
            </p>
          </div>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
