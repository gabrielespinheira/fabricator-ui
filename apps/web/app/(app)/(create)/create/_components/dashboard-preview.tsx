"use client"

import * as React from "react"

import {
  BellIcon,
  ChartBarIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  HomeIcon,
  InboxIcon,
  LayersIcon,
  LifeBuoyIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "@/lib/site-icons"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@/styles/base-fabricator/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/styles/base-fabricator/ui/breadcrumb"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/styles/base-fabricator/ui/input-group"
import { Kbd } from "@/styles/base-fabricator/ui/kbd"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/styles/base-fabricator/ui/progress"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/styles/base-fabricator/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

import { DashboardOverview } from "./dashboard-panels"

const NAV = [
  { label: "Overview", icon: HomeIcon },
  { label: "Projects", icon: LayersIcon, badge: "12" },
  { label: "Inbox", icon: InboxIcon, badge: "4" },
  { label: "Team", icon: UsersIcon },
  { label: "Reports", icon: ChartBarIcon },
]

const FAVOURITES = [
  { label: "Website relaunch", colour: "bg-primary" },
  { label: "Brand refresh", colour: "bg-success" },
  { label: "Mobile app", colour: "bg-warning" },
]

/**
 * A small product dashboard built from the real components, so every Make
 * it yours setting shows up the way it would in an app.
 */
export function DashboardPreview() {
  const [page, setPage] = React.useState("Overview")

  return (
    <div className="@container overflow-hidden rounded-2xl bg-background text-base shadow-surface-2 ring-1 ring-border">
      <SidebarProvider
        className="min-h-0"
        style={{ "--sidebar-width": "232px" } as React.CSSProperties}
      >
        <Sidebar
          collapsible="none"
          className="hidden h-auto self-stretch border-e border-sidebar-border @3xl:flex"
        >
          <SidebarHeader>
            <WorkspaceMenu />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map(({ label, icon: Icon, badge }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        isActive={page === label}
                        onClick={() => setPage(label)}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                      {badge ? (
                        <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Favourites</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {FAVOURITES.map(({ label, colour }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        isActive={page === label}
                        onClick={() => setPage(label)}
                      >
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 rounded-full ${colour}`}
                        />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex flex-col gap-3 rounded-xl bg-sidebar-accent p-3">
              <Progress value={72}>
                <ProgressLabel>Storage</ProgressLabel>
                <ProgressValue />
              </Progress>
              <Button size="sm" variant="outline" className="w-full">
                Upgrade plan
              </Button>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <LifeBuoyIcon />
                  <span>Help and support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar page={page} />
          <DashboardOverview />
        </div>
      </SidebarProvider>
    </div>
  )
}

function WorkspaceMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="data-popup-open:bg-hover" />
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground">
          N
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
          <span className="truncate text-[13px] font-semibold">Northwind</span>
          <span className="truncate text-xs text-muted-foreground">
            Studio plan
          </span>
        </span>
        <ChevronsUpDownIcon className="ms-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem>
            Northwind
            <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Personal
            <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Create workspace</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopBar({ page }: { page: string }) {
  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 @xl:px-6">
      <Breadcrumb className="hidden @xl:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#dashboard">Northwind</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{page}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <InputGroup className="ms-auto max-w-56">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search" aria-label="Search" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Notifications" />
          }
        >
          <BellIcon />
        </TooltipTrigger>
        <TooltipContent>3 unread notifications</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Account"
            />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback>AP</AvatarFallback>
            <AvatarBadge className="bg-success" />
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Ada Park</DropdownMenuLabel>
            <DropdownMenuItem>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCardIcon />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
