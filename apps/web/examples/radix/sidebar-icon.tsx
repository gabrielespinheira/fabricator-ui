"use client"

import {
  CalendarIcon,
  HomeIcon,
  InboxIcon,
  SearchIcon,
  SettingsIcon,
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
} from "@/styles/radix-fabricator/ui/sidebar"

const items = [
  { title: "Home", icon: HomeIcon, active: true },
  { title: "Inbox", icon: InboxIcon },
  { title: "Calendar", icon: CalendarIcon },
  { title: "Search", icon: SearchIcon },
  { title: "Settings", icon: SettingsIcon },
]

export default function SidebarIcon() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      icon={item.icon}
                      isActive={item.active}
                      tooltip={item.title}
                    >
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
      <SidebarInset>
        <header className="flex h-12 items-center px-3">
          <SidebarTrigger />
        </header>
      </SidebarInset>
    </SidebarProvider>
  )
}
