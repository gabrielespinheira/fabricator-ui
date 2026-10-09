"use client"

import * as React from "react"
import { BookOpenIcon, BotIcon, ChevronRightIcon } from "lucide-react"

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/styles/aria-fabricator/ui/sidebar"

const sections = [
  {
    title: "Models",
    icon: BotIcon,
    items: ["Genesis", "Explorer", "Quantum"],
  },
  {
    title: "Documentation",
    icon: BookOpenIcon,
    items: ["Introduction", "Get started", "Changelog"],
  },
]

export default function SidebarNested() {
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    Models: true,
  })
  const [current, setCurrent] = React.useState("Explorer")

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const isOpen = open[section.title] ?? false
                  return (
                    <SidebarMenuItem key={section.title}>
                      <SidebarMenuButton
                        icon={section.icon}
                        aria-expanded={isOpen}
                        onPress={() =>
                          setOpen((state) => ({
                            ...state,
                            [section.title]: !isOpen,
                          }))
                        }
                      >
                        <span>{section.title}</span>
                        <ChevronRightIcon
                          data-open={isOpen ? "" : undefined}
                          className="ms-auto transition-transform duration-fast ease-spring data-open:rotate-90"
                        />
                      </SidebarMenuButton>
                      <SidebarMenuSub open={isOpen}>
                        {section.items.map((item) => (
                          <SidebarMenuSubItem key={item}>
                            <SidebarMenuSubButton
                              isActive={item === current}
                              onPress={() => setCurrent(item)}
                            >
                              <span>{item}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  )
                })}
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
