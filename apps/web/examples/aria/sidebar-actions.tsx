"use client"

import {
  FileTextIcon,
  InboxIcon,
  MoreHorizontalIcon,
  PencilIcon,
  StarIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/styles/aria-fabricator/ui/sidebar"

const documents = ["Product brief", "Launch plan", "Research notes"]

export default function SidebarActions() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={InboxIcon} isActive>
                    <span>Inbox</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>24</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={StarIcon}>
                    <span>Starred</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction showOnHover aria-label="Edit starred">
                    <PencilIcon />
                  </SidebarMenuAction>
                  <SidebarMenuBadge>5</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {documents.map((title) => (
                  <SidebarMenuItem key={title}>
                    <SidebarMenuButton icon={FileTextIcon}>
                      <span>{title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuActions showOnHover>
                      <SidebarMenuAction aria-label={`Star ${title}`}>
                        <StarIcon />
                      </SidebarMenuAction>
                      <SidebarMenuAction aria-label={`More for ${title}`}>
                        <MoreHorizontalIcon />
                      </SidebarMenuAction>
                    </SidebarMenuActions>
                  </SidebarMenuItem>
                ))}
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
