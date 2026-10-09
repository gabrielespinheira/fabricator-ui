"use client"

import { FileTextIcon, HomeIcon, InboxIcon, StarIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/styles/radix-fabricator/ui/sidebar"

const items = [
  { title: "Home", icon: HomeIcon, active: true },
  { title: "Inbox", icon: InboxIcon },
  { title: "Starred", icon: StarIcon },
  { title: "Documents", icon: FileTextIcon },
]

export default function SidebarPeek() {
  return (
    <SidebarProvider defaultOpen={false} peek="hover">
      <Sidebar>
        <SidebarHeader className="flex-row items-center">
          <SidebarTrigger />
          <span className="text-sm font-medium">Acme Inc</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
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
      </Sidebar>
      <SidebarInset>
        <InsetHeader />
        <p className="px-4 text-sm text-muted-foreground">
          Rest on the trigger or the left edge to peek. Click a trigger to pin
          the sidebar open.
        </p>
      </SidebarInset>
    </SidebarProvider>
  )
}

// The inset's trigger shows only while the sidebar is collapsed; the
// sidebar's own header trigger takes over once it is open or peeking.
function InsetHeader() {
  const { state, isMobile } = useSidebar()

  return (
    <header className="flex h-12 items-center gap-2 px-3">
      {(state === "collapsed" || isMobile) && <SidebarTrigger />}
    </header>
  )
}
