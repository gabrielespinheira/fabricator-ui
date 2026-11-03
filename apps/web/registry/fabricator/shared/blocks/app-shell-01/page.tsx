"use client"

import * as React from "react"

import { EMPTY_NAV_PREFERENCES } from "@/registry/bases/__base__/lib/app-shell-model"
import {
  AppNav,
  AppNavCustomize,
  type AppNavGroup,
} from "@/registry/bases/__base__/ui/app-nav"
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
} from "@/registry/bases/__base__/ui/app-shell"
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
  SidebarTrigger,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A workspace app: the account and the organization share the sidebar's
// first row, the navigation is grouped and customizable, the page title
// takes the breadcrumb's place as you scroll, and details open beside the
// page (a drawer on phones).

const workspaces = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
]

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "home",
        label: "Home",
        href: "/",
        icon: (
          <IconPlaceholder
            lucide="HomeIcon"
            tabler="IconHome"
            hugeicons="Home01Icon"
            phosphor="HouseIcon"
            remixicon="RiHomeLine"
          />
        ),
      },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        badge: 4,
        icon: (
          <IconPlaceholder
            lucide="InboxIcon"
            tabler="IconInbox"
            hugeicons="InboxIcon"
            phosphor="TrayIcon"
            remixicon="RiInboxLine"
          />
        ),
      },
    ],
  },
  {
    id: "favorites",
    label: "Favorites",
    collapsible: true,
    reorderable: true,
    items: [
      { id: "launch", label: "Q4 launch", href: "/projects/launch" },
      { id: "roadmap", label: "Roadmap", href: "/projects/roadmap" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    collapsible: true,
    reorderable: true,
    items: [
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        icon: (
          <IconPlaceholder
            lucide="BoxIcon"
            tabler="IconBox"
            hugeicons="PackageIcon"
            phosphor="PackageIcon"
            remixicon="RiBox3Line"
          />
        ),
        children: [
          {
            id: "launch-project",
            label: "Q4 launch",
            href: "/projects/launch",
          },
          { id: "website", label: "Website", href: "/projects/website" },
        ],
      },
      {
        id: "team",
        label: "Team",
        href: "/team",
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
      },
    ],
  },
]

export default function Page() {
  // Pass your router's pathname and link instead.
  const [pathname, setPathname] = React.useState("/projects/launch")
  const [workspace, setWorkspace] = React.useState("acme")
  const [preferences, setPreferences] = React.useState(EMPTY_NAV_PREFERENCES)

  const renderLink = (item: { href?: string }) => (
    <a
      href={item.href}
      onClick={(event) => {
        event.preventDefault()
        setPathname(item.href ?? "/")
      }}
    />
  )

  return (
    <AppShell storageKey="app-shell-01" peek="hover">
      <Sidebar variant="inset">
        <SidebarHeader className="flex-row items-center">
          <UserMenu
            variant="mark"
            align="start"
            user={{ name: "Gabs Fabricator", email: "gabs@fabricator.dev" }}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuGroup>
          </UserMenu>
          <WorkspaceSwitcher
            variant="command"
            size="mark"
            workspaces={workspaces}
            activeId={workspace}
            onSelect={setWorkspace}
            onCreate={() => {}}
          />
          <SidebarTrigger className="ms-auto" />
        </SidebarHeader>
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname={pathname}
            renderLink={renderLink}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            customizable
          />
        </SidebarContent>
        <SidebarFooter>
          <AppNavCustomize
            groups={groups}
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />
        </SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            renderLink={renderLink}
            items={[
              { label: "Projects", href: "/projects" },
              { label: "Q4 launch" },
            ]}
          />
          <AppShellHeaderActions
            actions={[
              {
                id: "share",
                label: "Share",
                onSelect: () => {},
                icon: (
                  <IconPlaceholder
                    lucide="ShareIcon"
                    tabler="IconShare"
                    hugeicons="Share01Icon"
                    phosphor="ShareIcon"
                    remixicon="RiShareLine"
                  />
                ),
              },
            ]}
            primaryAction={{
              id: "new",
              label: "New issue",
              shortcut: "c",
              onSelect: () => {},
              icon: (
                <IconPlaceholder
                  lucide="PlusIcon"
                  tabler="IconPlus"
                  hugeicons="PlusSignIcon"
                  phosphor="PlusIcon"
                  remixicon="RiAddLine"
                />
              ),
            }}
          />
          <AppShellPanelTrigger panel="details" />
        </AppShellHeader>
        <AppShellContent>
          <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
            <AppShellPageTitle>Q4 launch</AppShellPageTitle>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-32 rounded-xl bg-muted/50" />
            ))}
          </div>
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="details"
        label="Details"
        defaultOpen
        shortcut="mod+alt+b"
        views={[
          { value: "details", label: "Details" },
          { value: "activity", label: "Activity" },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs />
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelView value="details" className="p-4">
          Owner, status, dates and links.
        </AppShellPanelView>
        <AppShellPanelView value="activity" className="p-4">
          What changed, and who changed it.
        </AppShellPanelView>
      </AppShellPanel>
    </AppShell>
  )
}
