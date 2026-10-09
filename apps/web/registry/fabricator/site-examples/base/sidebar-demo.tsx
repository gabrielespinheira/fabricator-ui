"use client"

import * as React from "react"
import {
  BoxIcon,
  ChevronsUpDownIcon,
  FolderPlusIcon,
  InboxIcon,
  LayersIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SquarePenIcon,
  UserIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/base-fabricator/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import { Separator } from "@/styles/base-fabricator/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/styles/base-fabricator/ui/sidebar"

type Thread = {
  id: string
  title: string
  /** running: work in progress (a filled dot); unread; idle. */
  status: "running" | "unread" | "idle"
}

const projects: { name: string; threads: Thread[] }[] = [
  {
    name: "fabricator-ui",
    threads: [
      { id: "rail", title: "Resizable sidebar rail", status: "running" },
      { id: "peek", title: "Peek on hover", status: "unread" },
      { id: "toggle", title: "Animated toggle icon", status: "idle" },
    ],
  },
  {
    name: "marketing-site",
    threads: [
      { id: "hero", title: "Hero section copy", status: "unread" },
      { id: "pricing", title: "Pricing page layout", status: "idle" },
    ],
  },
]

export default function SidebarDemo() {
  const [current, setCurrent] = React.useState("rail")
  const project = projects.find((item) =>
    item.threads.some((thread) => thread.id === current)
  )
  const thread = project?.threads.find((item) => item.id === current)

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <WorkspaceSwitcher />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton icon={SearchIcon}>
                <span>Search</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton icon={InboxIcon}>
                <span>Inbox</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>4</SidebarMenuBadge>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton icon={SquarePenIcon}>
                <span>New thread</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {projects.map((project) => (
            <SidebarGroup key={project.name} collapsible>
              <SidebarGroupLabel>{project.name}</SidebarGroupLabel>
              <SidebarGroupAction aria-label={`New thread in ${project.name}`}>
                <PlusIcon />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {project.threads.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        status={
                          item.status === "running" ? undefined : item.status
                        }
                        dot={item.status === "running" ? "filled" : undefined}
                        isActive={item.id === current}
                        onClick={() => setCurrent(item.id)}
                      >
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="data-vertical:h-4 data-vertical:self-auto"
          />
          <span className="truncate text-[13px] text-muted-foreground">
            {project?.name}
            <span className="px-1.5">/</span>
            <span className="text-foreground">{thread?.title}</span>
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-2 px-6 py-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {thread?.title}
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Drag the sidebar&apos;s edge to resize it, click the edge or press
            ⌘B to collapse it, and click a project&apos;s name to fold its
            threads away.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BoxIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-start leading-tight">
              <span className="truncate font-medium text-foreground">
                Acme Inc
              </span>
              <span className="truncate text-xs">Enterprise</span>
            </div>
            <ChevronsUpDownIcon className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuItem>
                <BoxIcon />
                Acme Inc
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LayersIcon />
                Acme Labs
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <FolderPlusIcon />
                New workspace
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserMenu() {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src="https://github.com/gabrielespinheira.png"
                alt="@gabrielespinheira"
              />
              <AvatarFallback className="rounded-lg">GE</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start leading-tight">
              <span className="truncate font-medium text-foreground">
                Gabriel
              </span>
              <span className="truncate text-xs">gabriel@example.com</span>
            </div>
            <ChevronsUpDownIcon className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
