"use client"

import * as React from "react"

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
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"

// running: work in progress, shown as a filled dot without the unread text.
const threads: {
  id: string
  title: string
  status: "running" | "unread" | "idle"
}[] = [
  { id: "1", title: "Release checklist", status: "running" },
  { id: "2", title: "Onboarding copy review", status: "unread" },
  { id: "3", title: "Billing migration", status: "unread" },
  { id: "4", title: "Icon audit", status: "idle" },
  { id: "5", title: "Q4 roadmap", status: "idle" },
]

export default function SidebarStatus() {
  const [current, setCurrent] = React.useState("1")

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Threads</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {threads.map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      status={
                        thread.status === "running" ? undefined : thread.status
                      }
                      dot={thread.status === "running" ? "filled" : undefined}
                      isActive={thread.id === current}
                      onClick={() => setCurrent(thread.id)}
                    >
                      <span>{thread.title}</span>
                    </SidebarMenuButton>
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
