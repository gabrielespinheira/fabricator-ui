"use client"

import {
  HistoryIcon,
  InfoIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"

const items = [
  { title: "Details", icon: InfoIcon, active: true },
  { title: "Comments", icon: MessageSquareIcon },
  { title: "History", icon: HistoryIcon },
  { title: "Members", icon: UsersIcon },
]

export default function SidebarRight() {
  return (
    <SidebarProvider shortcut="]">
      <SidebarInset>
        <header className="flex h-12 items-center justify-end px-3">
          <SidebarTrigger />
        </header>
        <p className="px-4 text-sm text-muted-foreground">
          Press ] to toggle the panel.
        </p>
      </SidebarInset>
      <Sidebar side="right">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Inspector</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton icon={item.icon} isActive={item.active}>
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  )
}
