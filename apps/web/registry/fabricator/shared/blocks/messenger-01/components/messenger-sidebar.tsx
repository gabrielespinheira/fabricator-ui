"use client"

import * as React from "react"

import { ChatIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  ME_PERSON,
  WORKSPACES,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-data"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
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

function getNavGroups(unread: number): AppNavGroup[] {
  return [
    {
      id: "main",
      items: [
        {
          id: "chats",
          label: "Chats",
          href: "/messages",
          icon: <ChatIcon />,
          badge: unread > 0 ? unread : undefined,
        },
        {
          id: "calls",
          label: "Calls",
          href: "/calls",
          icon: (
            <IconPlaceholder
              lucide="PhoneIcon"
              tabler="IconPhone"
              hugeicons="Call02Icon"
              phosphor="PhoneIcon"
              remixicon="RiPhoneLine"
            />
          ),
        },
        {
          id: "contacts",
          label: "Contacts",
          href: "/contacts",
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
          id: "archived",
          label: "Archived",
          href: "/messages/archived",
          icon: (
            <IconPlaceholder
              lucide="ArchiveIcon"
              tabler="IconArchive"
              hugeicons="Archive02Icon"
              phosphor="ArchiveIcon"
              remixicon="RiArchiveLine"
            />
          ),
        },
      ],
    },
    {
      id: "settings",
      items: [
        {
          id: "settings",
          label: "Settings",
          href: "/settings",
          icon: (
            <IconPlaceholder
              lucide="SettingsIcon"
              tabler="IconSettings"
              hugeicons="Settings01Icon"
              phosphor="GearIcon"
              remixicon="RiSettingsLine"
            />
          ),
        },
      ],
    },
  ]
}

/** The app's navigation, an icon rail until it is opened. */
export function MessengerSidebar({ unread }: { unread: number }) {
  const [workspaceId, setWorkspaceId] = React.useState(WORKSPACES[0].id)

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* On the rail the mark is centred on the panel's header row, which an
          inset panel starts 8px down. */}
      <SidebarHeader className="group-data-[collapsible=icon]:pt-(--density-16)">
        <WorkspaceSwitcher
          workspaces={WORKSPACES}
          activeId={workspaceId}
          onSelect={setWorkspaceId}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          groups={getNavGroups(unread)}
          pathname="/messages"
          // The rail's unread dot clears the icon it belongs to.
          className="group-data-[collapsible=icon]:[&_[data-badge]]:after:end-[calc(50%-var(--density-icon-16)/2-var(--density-4))]! group-data-[collapsible=icon]:[&_[data-badge]]:after:top-[calc(50%-var(--density-icon-16)/2-var(--density-4))]!"
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={ME_PERSON}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Notifications</DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
