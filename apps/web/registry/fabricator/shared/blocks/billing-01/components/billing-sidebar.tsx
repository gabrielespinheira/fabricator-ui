"use client"

import * as React from "react"

import { BILLING_USER } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const workspaces = [
  { id: "acme", name: "Acme Inc", description: "11 people" },
  { id: "acme-labs", name: "Acme Labs", description: "3 people" },
]

const groups: AppNavGroup[] = [
  {
    id: "work",
    items: [
      {
        id: "home",
        label: "Home",
        href: "/",
        match: { exact: true },
        icon: (
          <IconPlaceholder
            lucide="HouseIcon"
            tabler="IconHome"
            hugeicons="Home01Icon"
            phosphor="HouseIcon"
            remixicon="RiHomeLine"
          />
        ),
      },
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        icon: (
          <IconPlaceholder
            lucide="FolderIcon"
            tabler="IconFolder"
            hugeicons="FolderIcon"
            phosphor="FolderIcon"
            remixicon="RiFolderLine"
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
        id: "reports",
        label: "Reports",
        href: "/reports",
        icon: (
          <IconPlaceholder
            lucide="ChartColumnIcon"
            tabler="IconChartBar"
            hugeicons="ChartColumnIcon"
            phosphor="ChartBarIcon"
            remixicon="RiBarChartLine"
          />
        ),
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        id: "general",
        label: "General",
        href: "/settings",
        match: { exact: true },
        icon: (
          <IconPlaceholder
            lucide="SettingsIcon"
            tabler="IconSettings"
            hugeicons="SettingsIcon"
            phosphor="GearIcon"
            remixicon="RiSettingsLine"
          />
        ),
      },
      {
        id: "members",
        label: "Members",
        href: "/settings/members",
        icon: (
          <IconPlaceholder
            lucide="CircleUserRoundIcon"
            tabler="IconUserCircle"
            hugeicons="UserCircle02Icon"
            phosphor="UserCircleIcon"
            remixicon="RiUserLine"
          />
        ),
      },
      {
        id: "billing",
        label: "Billing",
        href: "/settings/billing",
        icon: (
          <IconPlaceholder
            lucide="CreditCardIcon"
            tabler="IconCreditCard"
            hugeicons="CreditCardIcon"
            phosphor="CreditCardIcon"
            remixicon="RiBankCardLine"
          />
        ),
      },
    ],
  },
]

/** The workspace, the product's navigation and the person's menu. */
export function BillingSidebar() {
  const [workspace, setWorkspace] = React.useState("acme")

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeId={workspace}
          onSelect={setWorkspace}
          onCreate={() => {}}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNav groups={groups} pathname="/settings/billing" />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={BILLING_USER}>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="UserIcon"
                tabler="IconUser"
                hugeicons="UserIcon"
                phosphor="UserIcon"
                remixicon="RiUserLine"
              />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="BellIcon"
                tabler="IconBell"
                hugeicons="NotificationIcon"
                phosphor="BellIcon"
                remixicon="RiNotificationLine"
              />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="LogOutIcon"
                tabler="IconLogout"
                hugeicons="LogoutIcon"
                phosphor="SignOutIcon"
                remixicon="RiLogoutBoxLine"
              />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
