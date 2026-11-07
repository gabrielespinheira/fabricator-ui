"use client"

import * as React from "react"

import { AppNav, type AppNavGroup } from "@/registry/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/registry/base-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/base-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/base-fabricator/ui/sidebar"
import { UserMenu } from "@/registry/base-fabricator/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/base-fabricator/ui/workspace-switcher"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A classic SaaS layout: the team switcher on top, the person's menu at the
// bottom, and a sidebar that collapses to an icon rail.

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
        icon: (
          <IconPlaceholder
            lucide="LayoutDashboardIcon"
            tabler="IconLayoutDashboard"
            hugeicons="DashboardSquare01Icon"
            phosphor="SquaresFourIcon"
            remixicon="RiDashboardLine"
          />
        ),
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        icon: (
          <IconPlaceholder
            lucide="ChartLineIcon"
            tabler="IconChartLine"
            hugeicons="ChartLineData01Icon"
            phosphor="ChartLineIcon"
            remixicon="RiLineChartLine"
          />
        ),
      },
      {
        id: "customers",
        label: "Customers",
        href: "/customers",
        icon: (
          <IconPlaceholder
            lucide="UsersIcon"
            tabler="IconUsers"
            hugeicons="UserGroupIcon"
            phosphor="UsersIcon"
            remixicon="RiGroupLine"
          />
        ),
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: (
          <IconPlaceholder
            lucide="SettingsIcon"
            tabler="IconSettings"
            hugeicons="SettingsIcon"
            phosphor="GearIcon"
            remixicon="RiSettingsLine"
          />
        ),
        children: [
          { id: "general", label: "General", href: "/settings" },
          { id: "billing", label: "Billing", href: "/settings/billing" },
          { id: "members", label: "Members", href: "/settings/members" },
        ],
      },
    ],
  },
]

export default function Page() {
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
            onCreate={() => {}}
          />
        </SidebarHeader>
        <SidebarContent>
          <AppNav groups={groups} pathname="/dashboard" />
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
            items={[{ label: "Platform", href: "/" }, { label: "Dashboard" }]}
          />
        </AppShellHeader>
        <AppShellContent className="flex flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[60vh] rounded-xl bg-muted/50" />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
