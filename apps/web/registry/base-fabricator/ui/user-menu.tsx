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
} from "@/registry/base-fabricator/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/base-fabricator/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/base-fabricator/ui/sidebar"
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
    <Avatar
      data-slot="user-menu-avatar"
      className="size-(--density-32) [&_[data-slot=avatar-fallback]]:text-foreground"
    >
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

function UserDetails({ user }: { user: UserMenuUser }) {
  return (
    <span className="grid min-w-0 flex-1 text-start leading-tight">
      <span className="truncate text-(length:--density-text-13) text-foreground weight-semibold">
        {user.name}
      </span>
      {user.email && (
        <span className="truncate text-(length:--density-text-12) text-muted-foreground">
          {user.email}
        </span>
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
              className={cn(
                "data-popup-open:bg-hover data-popup-open:text-foreground data-[user-menu=mark]:flex data-[user-menu=mark]:shrink-0 data-[user-menu=mark]:cursor-pointer data-[user-menu=mark]:items-center data-[user-menu=mark]:justify-center data-[user-menu=mark]:rounded-full data-[user-menu=mark]:ring-ring data-[user-menu=mark]:outline-none data-[user-menu=mark]:focus-visible:ring-1 data-[user-menu=mark]:focus-visible:ring-offset-1 data-[user-menu=mark]:focus-visible:ring-offset-background data-open:bg-hover data-open:text-foreground",
                className
              )}
            />
          ) : (
            <SidebarMenuButton
              size="lg"
              tooltip={user.name}
              className={cn(
                "data-popup-open:bg-hover data-popup-open:text-foreground data-[user-menu=mark]:flex data-[user-menu=mark]:shrink-0 data-[user-menu=mark]:cursor-pointer data-[user-menu=mark]:items-center data-[user-menu=mark]:justify-center data-[user-menu=mark]:rounded-full data-[user-menu=mark]:ring-ring data-[user-menu=mark]:outline-none data-[user-menu=mark]:focus-visible:ring-1 data-[user-menu=mark]:focus-visible:ring-offset-1 data-[user-menu=mark]:focus-visible:ring-offset-background data-open:bg-hover data-open:text-foreground",
                className
              )}
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
              className="ms-auto me-[calc((var(--density-20)-var(--density-icon-16))/2)] size-(--density-icon-16) text-muted-foreground"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side ?? (isMobile || isMark ? "bottom" : "right")}
        align={align}
        sideOffset={4}
        className="min-w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-(--density-8) px-(--density-8) py-(--density-6) font-normal text-foreground">
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
