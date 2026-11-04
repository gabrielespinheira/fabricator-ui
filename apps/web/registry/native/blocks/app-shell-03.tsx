import * as React from "react"
import {
  ChartLineIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import {
  AppNav,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/registry/native/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/native/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/native/ui/sidebar"
import { UserMenu } from "@/registry/native/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

// A classic SaaS layout: the team switcher on top, the person's menu at the bottom,
// and a sidebar that collapses to an icon rail.

const noop = () => {}

const teams = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
]

const groups: AppNavGroup[] = [
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        icon: ChartLineIcon,
      },
      {
        id: "customers",
        label: "Customers",
        href: "/customers",
        icon: UsersIcon,
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
        children: [
          { id: "general", label: "General", href: "/settings" },
          { id: "billing", label: "Billing", href: "/settings/billing" },
          { id: "members", label: "Members", href: "/settings/members" },
        ],
      },
    ],
  },
]

function AppShell03({
  pathname = "/dashboard",
  onNavigate = noop,
}: {
  pathname?: string
  onNavigate?: (item: AppNavItem) => void
}) {
  const [team, setTeam] = React.useState("acme")

  return (
    <AppShell storageKey="app-shell-03">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <WorkspaceSwitcher
            label="Teams"
            createLabel="Add team"
            workspaces={teams}
            activeId={team}
            onSelect={setTeam}
            onCreate={noop}
          />
        </SidebarHeader>
        <SidebarContent>
          <AppNav groups={groups} pathname={pathname} onNavigate={onNavigate} />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu
            user={{ name: "Gabs Fabricator", email: "gabs@fabricator.dev" }}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem>Account</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuGroup>
          </UserMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader trigger="always">
          <AppShellBreadcrumb
            items={[
              { label: "Platform", onSelect: noop },
              { label: "Dashboard" },
            ]}
          />
        </AppShellHeader>
        <AppShellContent>
          <View className="gap-4 p-4">
            <View className="gap-4 sm:flex-row">
              <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
              <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
              <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
            </View>
            <View className="min-h-96 rounded-xl bg-muted/50" />
          </View>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}

export { AppShell03 }
