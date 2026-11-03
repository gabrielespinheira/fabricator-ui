"use client"

import * as React from "react"
import { BuildingIcon, HomeIcon, InboxIcon, MailIcon } from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/aria-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/aria-fabricator/ui/app-shell"
import { CommandGroup, CommandItem } from "@/styles/aria-fabricator/ui/command"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/styles/aria-fabricator/ui/sidebar"
import { WorkspaceSwitcher } from "@/styles/aria-fabricator/ui/workspace-switcher"

const workspaces = [
  { id: "acme", name: "Acme Inc", description: "Enterprise · 48 members" },
  { id: "studio", name: "Fabricator Studio", description: "Pro · 6 members" },
  { id: "lab", name: "Side Lab", description: "Free · just you" },
  {
    id: "north",
    name: "North Agency",
    description: "Pro · 12 members",
    logo: <BuildingIcon />,
  },
]

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon },
      { id: "inbox", label: "Inbox", href: "/inbox", icon: InboxIcon },
    ],
  },
]

export function WorkspaceSwitcherDemo() {
  const [active, setActive] = React.useState("acme")
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null)

  // Apps load the next workspace here; the overlay covers the wait.
  const select = (id: string) => {
    setSwitchingTo(id)
    window.setTimeout(() => {
      setActive(id)
      setSwitchingTo(null)
    }, 900)
  }

  return (
    <AppShell storageKey="workspace-switcher-demo" storage={null}>
      <Sidebar>
        <SidebarHeader>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={active}
            onSelect={select}
            switchingTo={switchingTo}
            onCreate={() => {}}
            onManage={() => {}}
            shortcut={null}
          />
        </SidebarHeader>
        <SidebarContent>
          <AppNav groups={groups} pathname="/" />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <WorkspaceSwitcher
            variant="command"
            size="mark"
            workspaces={workspaces}
            activeId={active}
            onSelect={select}
            onCreate={() => {}}
          >
            <CommandGroup heading="Invitations">
              <CommandItem textValue="Join Orbit Labs" onAction={() => {}}>
                <MailIcon />
                Join Orbit Labs
              </CommandItem>
            </CommandGroup>
          </WorkspaceSwitcher>
          <span className="text-sm text-muted-foreground">
            The mark opens the searchable variant (⌘O).
          </span>
        </AppShellHeader>
        <AppShellContent className="p-6 text-sm text-muted-foreground">
          Showing{" "}
          {workspaces.find((workspace) => workspace.id === active)?.name}.
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
