"use client"

import * as React from "react"

import { MembersMenuItems } from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/bases/__base__/ui/sidebar"
import {
  UserMenu,
  type UserMenuUser,
} from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const WORKSPACES = [
  {
    id: "acme",
    name: "Acme Inc",
    description: "Team plan",
    logo: (
      <span
        aria-hidden
        className="flex size-full items-center justify-center rounded-[inherit] text-white weight-semibold"
        style={{ background: "#0e7a5f" }}
      >
        A
      </span>
    ),
  },
  { id: "acme-labs", name: "Acme Labs", description: "Free plan" },
]

function getGroups(problemCount: number): AppNavGroup[] {
  return [
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
              hugeicons="Folder01Icon"
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
              lucide="Building2Icon"
              tabler="IconBuilding"
              hugeicons="Building03Icon"
              phosphor="BuildingsIcon"
              remixicon="RiBuildingLine"
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
              lucide="Settings2Icon"
              tabler="IconSettings"
              hugeicons="Settings05Icon"
              phosphor="GearIcon"
              remixicon="RiSettingsLine"
            />
          ),
        },
        {
          id: "members",
          label: "Members",
          href: "/settings/members",
          badge: problemCount > 0 ? problemCount : undefined,
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
}

/** The workspace switcher, the app's navigation and the person's menu. */
export function MembersSidebar({
  user,
  problemCount,
}: {
  user: UserMenuUser
  /** Invitations someone has to look at. */
  problemCount: number
}) {
  const [workspace, setWorkspace] = React.useState("acme")
  const groups = React.useMemo(() => getGroups(problemCount), [problemCount])

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={WORKSPACES}
          activeId={workspace}
          onSelect={setWorkspace}
          onCreate={() => {}}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNav groups={groups} pathname="/settings/members" />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user}>
          <MembersMenuItems
            groups={[
              [
                {
                  id: "profile",
                  label: "Profile",
                  icon: (
                    <IconPlaceholder
                      lucide="CircleUserIcon"
                      tabler="IconUserCircle"
                      hugeicons="UserCircleIcon"
                      phosphor="UserCircleIcon"
                      remixicon="RiUserSmileLine"
                    />
                  ),
                  onSelect: () => {},
                },
                {
                  id: "alerts",
                  label: "Notifications",
                  icon: (
                    <IconPlaceholder
                      lucide="BellIcon"
                      tabler="IconNotification"
                      hugeicons="Notification03Icon"
                      phosphor="BellIcon"
                      remixicon="RiNotification3Line"
                    />
                  ),
                  onSelect: () => {},
                },
              ],
              [
                {
                  id: "leave",
                  label: "Sign out",
                  icon: (
                    <IconPlaceholder
                      lucide="LogOutIcon"
                      tabler="IconLogout"
                      hugeicons="Logout01Icon"
                      phosphor="SignOutIcon"
                      remixicon="RiLogoutBoxLine"
                    />
                  ),
                  onSelect: () => {},
                },
              ],
            ]}
          />
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
