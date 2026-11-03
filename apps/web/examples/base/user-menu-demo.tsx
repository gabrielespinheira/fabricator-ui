"use client"

import {
  BellIcon,
  CreditCardIcon,
  HomeIcon,
  LogOutIcon,
  MoonIcon,
  UserIcon,
} from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/styles/base-fabricator/ui/sidebar"
import { UserMenu } from "@/styles/base-fabricator/ui/user-menu"

const user = {
  name: "Gabs Fabricator",
  email: "gabs@fabricator.dev",
  avatarUrl: "/avatars/01.png",
}

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [{ id: "home", label: "Home", href: "/", icon: HomeIcon }],
  },
]

function Items() {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <UserIcon />
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCardIcon />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BellIcon />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MoonIcon />
          Dark mode
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

export function UserMenuDemo() {
  return (
    <AppShell storageKey="user-menu-demo" storage={null}>
      <Sidebar>
        <SidebarContent>
          <AppNav groups={groups} pathname="/" />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu user={user}>
            <Items />
          </UserMenu>
        </SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader className="justify-end">
          <UserMenu user={user} variant="mark" align="end">
            <Items />
          </UserMenu>
        </AppShellHeader>
        <AppShellContent className="p-6 text-sm text-muted-foreground">
          The same menu as a sidebar row and as an avatar in the header.
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
