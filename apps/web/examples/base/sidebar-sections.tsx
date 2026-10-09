"use client"

import {
  ArrowUpDownIcon,
  FolderIcon,
  PlusIcon,
  SquareTerminalIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"

export default function SidebarSections() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup collapsible>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupActions>
              <SidebarGroupAction aria-label="Sort projects">
                <ArrowUpDownIcon />
              </SidebarGroupAction>
              <SidebarGroupAction aria-label="New project">
                <PlusIcon />
              </SidebarGroupAction>
            </SidebarGroupActions>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={FolderIcon} isActive>
                    <span>Design system</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>12</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={FolderIcon}>
                    <span>Marketing site</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={FolderIcon}>
                    <span>Mobile app</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup collapsible defaultOpen={false}>
            <SidebarGroupLabel>Archive</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={SquareTerminalIcon}>
                    <span>CLI prototype</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={SquareTerminalIcon}>
                    <span>Docs v1</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center px-3">
          <SidebarTrigger />
        </header>
      </SidebarInset>
    </SidebarProvider>
  )
}
