"use client"

import * as React from "react"

import { automationIcons } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import {
  AUTOMATION_ACCOUNT,
  AUTOMATION_WORKFLOWS,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-data"
import { AppNav } from "@/registry/bases/__base__/ui/app-nav"
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
  SidebarTrigger,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"

const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "Support" },
  { id: "studio", name: "Acme Studio", description: "Operations" },
]

const COUNT = new Intl.NumberFormat("en-US", { notation: "compact" })

const WORKSPACE_LINKS = [
  { id: "runs", label: "Runs", icon: automationIcons.history },
  { id: "connections", label: "Connections", icon: automationIcons.http },
  { id: "templates", label: "Templates", icon: automationIcons.library },
]

/** The workspace's workflows, with this week's runs, and where runs live. */
export function AutomationSidebar({
  activeId,
  onNavigate,
}: {
  activeId: string
  onNavigate: (id: string) => void
}) {
  const [workspaceId, setWorkspaceId] = React.useState("acme")
  // No hrefs: the list switches in place. Give the items an href
  // (/automations/[workflow]) to route instead.
  const groups = [
    {
      id: "workflows",
      label: "Workflows",
      items: AUTOMATION_WORKFLOWS.map((workflow) => ({
        id: workflow.id,
        label: workflow.name,
        icon: automationIcons.workflow,
        badge: COUNT.format(workflow.runs),
      })),
    },
    { id: "workspace", label: "Workspace", items: WORKSPACE_LINKS },
  ]
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-(--density-4)">
          <WorkspaceSwitcher
            label="Workspaces"
            createLabel="Add workspace"
            workspaces={WORKSPACES}
            activeId={workspaceId}
            onSelect={setWorkspaceId}
            onCreate={() => {}}
          />
          <SidebarTrigger className="ms-auto shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          aria-label="Automations"
          groups={groups}
          activeId={activeId}
          onNavigate={({ id }) => onNavigate(id)}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={AUTOMATION_ACCOUNT}>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {automationIcons.user}
              Account
            </DropdownMenuItem>
            <DropdownMenuItem>
              {automationIcons.settings}
              Workspace settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {automationIcons.signOut}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
