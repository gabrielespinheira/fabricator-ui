"use client"

// User Menu: the signed-in person's menu. `row` fills a sidebar row with the
// avatar, name and email (shadcn's footer placement); `mark` is the avatar
// alone, for the header row SharpOS puts it in. The items are yours: pass
// DropdownMenu groups as children.
//
// React Aria: MenuTrigger wraps a RAC button (SidebarMenuButton, or a bare
// Button for the mark); `side` and `align` become the menu's placement.
import * as React from "react"
import { cn } from "cn"
import { Button as ButtonPrimitive } from "react-aria-components"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/aria/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/bases/aria/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type UserMenuUser = {
  name: string
  email?: string
  avatarUrl?: string
}

type Side = "top" | "right" | "bottom" | "left"
type Align = "start" | "center" | "end"

/** Base UI's side and align as a RAC placement ("right bottom"). */
function toPlacement(side: Side, align: Align) {
  if (side === "top" || side === "bottom") {
    return align === "center" ? side : (`${side} ${align}` as const)
  }
  if (align === "center") return side
  return `${side} ${align === "start" ? "top" : "bottom"}` as const
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
  side?: Side
  align?: Align
  className?: string
  /** DropdownMenu groups: profile, settings, theme, sign out… */
  children?: React.ReactNode
}) {
  const { isMobile } = useSidebar()
  // Tracked for the trigger's open look (data-popup-open, as in Base UI).
  const [open, setOpen] = React.useState(false)
  const isMark = variant === "mark"

  const menu = (
    <DropdownMenuTrigger isOpen={open} onOpenChange={setOpen}>
      {isMark ? (
        <ButtonPrimitive
          aria-label={`Account: ${user.name}`}
          data-user-menu={variant}
          data-popup-open={open ? "" : undefined}
          className={cn("cn-user-menu-trigger", className)}
        >
          <UserAvatar user={user} />
        </ButtonPrimitive>
      ) : (
        <SidebarMenuButton
          size="lg"
          tooltip={user.name}
          data-user-menu={variant}
          data-popup-open={open ? "" : undefined}
          className={cn("cn-user-menu-trigger", className)}
        >
          <UserAvatar user={user} />
          <UserDetails user={user} />
          <IconPlaceholder
            lucide="ChevronsUpDownIcon"
            tabler="IconSelector"
            hugeicons="UnfoldMoreIcon"
            phosphor="CaretUpDownIcon"
            remixicon="RiArrowUpDownLine"
            className="cn-user-menu-chevron ms-auto"
          />
        </SidebarMenuButton>
      )}
      <DropdownMenu
        placement={toPlacement(
          side ?? (isMobile || isMark ? "bottom" : "right"),
          align
        )}
        offset={4}
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
      </DropdownMenu>
    </DropdownMenuTrigger>
  )

  if (isMark) return menu
  return (
    <SidebarMenu>
      <SidebarMenuItem>{menu}</SidebarMenuItem>
    </SidebarMenu>
  )
}

export { UserMenu, type UserMenuUser }
