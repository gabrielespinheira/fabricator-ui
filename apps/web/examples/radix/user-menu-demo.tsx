"use client"

import {
  BellIcon,
  CreditCardIcon,
  HomeIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { AppNav, type AppNavGroup } from "@/styles/radix-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/radix-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/styles/radix-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/styles/radix-fabricator/ui/sidebar"
import { UserMenu, UserMenuTheme } from "@/styles/radix-fabricator/ui/user-menu"

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
  const { theme, setTheme } = useTheme()
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
      </DropdownMenuGroup>
      <UserMenuTheme theme={theme} onThemeChange={setTheme} />
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
