"use client"

// User Menu: the signed-in person's menu. `row` fills a sidebar row with the
// avatar, name and email (shadcn's footer placement); `mark` is the avatar
// alone, for the header row SharpOS puts it in. The items are yours: pass
// DropdownMenu groups as children.
import * as React from "react"
import { cn } from "cn"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/base/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/bases/base/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type UserMenuUser = {
  name: string
  email?: string
  avatarUrl?: string
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

function UserAvatar({ user }: { user: UserMenuUser }) {
  return (
    <Avatar data-slot="user-menu-avatar" className="cn-user-menu-avatar">
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

function UserDetails({ user }: { user: UserMenuUser }) {
  return (
    <span className="cn-user-menu-details grid min-w-0 flex-1 text-start">
      <span className="cn-user-menu-name truncate">{user.name}</span>
      {user.email && (
        <span className="cn-user-menu-email truncate">{user.email}</span>
      )}
    </span>
  )
}

function UserMenu({
  user,
  variant = "row",
  side,
  align = "end",
  className,
  children,
}: {
  user: UserMenuUser
  variant?: "row" | "mark"
  /** Default: to the right on desktop, below on phones and for `mark`. */
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
  /** DropdownMenu groups: profile, settings, theme, sign out… */
  children?: React.ReactNode
}) {
  const { isMobile } = useSidebar()
  const isMark = variant === "mark"

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={isMark ? `Account: ${user.name}` : undefined}
        data-user-menu={variant}
        render={
          isMark ? (
            <button
              type="button"
              className={cn("cn-user-menu-trigger", className)}
            />
          ) : (
            <SidebarMenuButton
              size="lg"
              className={cn("cn-user-menu-trigger", className)}
            />
          )
        }
      >
        <UserAvatar user={user} />
        {!isMark && (
          <>
            <UserDetails user={user} />
            <IconPlaceholder
              lucide="ChevronsUpDownIcon"
              tabler="IconSelector"
              hugeicons="UnfoldMoreIcon"
              phosphor="CaretUpDownIcon"
              remixicon="RiArrowUpDownLine"
              className="cn-user-menu-chevron ms-auto"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side ?? (isMobile || isMark ? "bottom" : "right")}
        align={align}
        sideOffset={4}
        className="cn-user-menu-content"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="cn-user-menu-label flex items-center">
            <UserAvatar user={user} />
            <UserDetails user={user} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {children && <DropdownMenuSeparator />}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (isMark) return menu
  return (
    <SidebarMenu>
      <SidebarMenuItem>{menu}</SidebarMenuItem>
    </SidebarMenu>
  )
}

export { UserMenu, type UserMenuUser }
