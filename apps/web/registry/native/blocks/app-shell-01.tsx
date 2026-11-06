import * as React from "react"
import {
  BoxIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
  SettingsIcon,
  ShareIcon,
  UsersIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { EMPTY_NAV_PREFERENCES } from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  AppNav,
  AppNavCustomize,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
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
  SidebarTrigger,
} from "@/registry/native/ui/sidebar"
import { Text } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

// A workspace app: the account and the organization share the sidebar's first row,
// the navigation is grouped and customizable, the page title takes the breadcrumb's
// place as you scroll, and details open beside the page (a drawer on phones).

const noop = () => {}

const workspaces = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
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
        badge: 4,
        icon: InboxIcon,
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
        icon: BoxIcon,
        children: [
          {
            id: "launch-project",
            label: "Q4 launch",
            href: "/projects/launch",
          },
          { id: "website", label: "Website", href: "/projects/website" },
        ],
      },
      { id: "team", label: "Team", href: "/team", icon: UsersIcon },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
      },
    ],
  },
]

function AppShell01({
  onNavigate = noop,
}: {
  onNavigate?: (item: AppNavItem) => void
}) {
  // Pass your router's pathname instead.
  const [pathname, setPathname] = React.useState("/projects/launch")
  const [workspace, setWorkspace] = React.useState("acme")
  const [preferences, setPreferences] = React.useState(EMPTY_NAV_PREFERENCES)

  const navigate = (item: AppNavItem) => {
    if (item.href) setPathname(item.href)
    onNavigate(item)
  }

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
            onCreate={noop}
          />
          <SidebarTrigger className="ms-auto" />
        </SidebarHeader>
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname={pathname}
            onNavigate={navigate}
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
            items={[
              { label: "Projects", onSelect: () => setPathname("/projects") },
              { label: "Q4 launch" },
            ]}
          />
          <AppShellHeaderActions
            actions={[
              {
                id: "share",
                label: "Share",
                onSelect: noop,
                icon: ShareIcon,
              },
            ]}
            primaryAction={{
              id: "new",
              label: "New issue",
              shortcut: "c",
              onSelect: noop,
              icon: PlusIcon,
            }}
          />
          <AppShellPanelTrigger panel="details" />
        </AppShellHeader>
        <AppShellContent>
          <View className="w-full max-w-3xl gap-6 self-center p-6">
            <AppShellPageTitle>Q4 launch</AppShellPageTitle>
            {Array.from({ length: 6 }, (_, index) => (
              <View key={index} className="h-32 rounded-xl bg-muted/50" />
            ))}
          </View>
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="details"
        label="Details"
        defaultOpen
        views={[
          { value: "details", label: "Details" },
          { value: "activity", label: "Activity" },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs />
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelView value="details">
          <Text className="p-4">Owner, status, dates and links.</Text>
        </AppShellPanelView>
        <AppShellPanelView value="activity">
          <Text className="p-4">What changed, and who changed it.</Text>
        </AppShellPanelView>
      </AppShellPanel>
    </AppShell>
  )
}

export { AppShell01 }
