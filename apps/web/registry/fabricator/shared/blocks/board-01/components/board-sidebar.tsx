"use client"

import * as React from "react"

import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { BoardProjectMark } from "@/registry/bases/__base__/blocks/board-01/components/board-project-mark"
import {
  BOARD_ACCOUNT,
  BOARD_VIEWS,
  type BoardProject,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import { AppNav } from "@/registry/bases/__base__/ui/app-nav"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import { PropertyMark } from "@/registry/bases/__base__/ui/properties"
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
  { id: "acme", name: "Acme Inc", description: "Product" },
  { id: "studio", name: "Acme Studio", description: "Brand" },
]

const VIEW_ICONS: Record<string, React.ReactElement> = {
  all: boardIcons.all,
  mine: boardIcons.mine,
  urgent: <PropertyMark mark={{ icon: "priority-high" }} />,
  bugs: boardIcons.bugs,
}

/** The projects, then the open one's saved views, with their open tickets. */
export function BoardSidebar({
  projects,
  project,
  viewId,
  getCount,
  onNavigate,
}: {
  projects: readonly BoardProject[]
  project: BoardProject
  /** Null once the filters match no saved view. */
  viewId: string | null
  getCount: (project: BoardProject, viewId: string) => number
  onNavigate: (projectId: BoardProject["id"], viewId: string) => void
}) {
  const [workspaceId, setWorkspaceId] = React.useState("acme")
  // No hrefs: both lists switch the board in place. Give the items an href
  // (/board/[project]/[view]) to route instead.
  const projectGroups = [
    {
      id: "projects",
      label: "Projects",
      items: projects.map((entry) => ({
        id: entry.id,
        label: entry.name,
        icon: <BoardProjectMark projectId={entry.id} />,
      })),
    },
  ]
  const viewGroups = [
    {
      id: "views",
      label: "Views",
      items: BOARD_VIEWS.map((view) => ({
        id: view.id,
        label: view.label,
        // As wide as a project's mark, so the two lists share an edge.
        icon: (
          <span className="flex size-(--density-20) items-center justify-center">
            {VIEW_ICONS[view.id]}
          </span>
        ),
        badge: getCount(project, view.id) || undefined,
      })),
    },
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
          aria-label="Projects"
          groups={projectGroups}
          activeId={project.id}
          onNavigate={({ id }) => {
            const target = projects.find((entry) => entry.id === id)
            if (target) onNavigate(target.id, "all")
          }}
        />
        <AppNav
          aria-label="Views"
          groups={viewGroups}
          activeId={viewId}
          onNavigate={({ id }) => onNavigate(project.id, id)}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={BOARD_ACCOUNT}>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {boardIcons.profile}
              Account
            </DropdownMenuItem>
            <DropdownMenuItem>
              {boardIcons.settings}
              Workspace settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {boardIcons.signOut}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
