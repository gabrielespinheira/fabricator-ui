// User Menu: the signed-in person's menu. `row` fills a sidebar row with the avatar,
// name and email; `mark` is the avatar alone, for a header row. The items are yours:
// pass DropdownMenu groups as children. On a phone they open in a sheet.
import * as React from "react"
import { ChevronsUpDownIcon } from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { Pressable, View } from "react-native"

import { MenuSheet } from "@/registry/native/lib/menu-sheet"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/native/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  useSidebarCollapse,
} from "@/registry/native/ui/sidebar"
import { Text, TextStyle } from "@/registry/native/ui/text"

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
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback>
        <Text className="cn-user-menu-avatar-text">
          {getInitials(user.name)}
        </Text>
      </AvatarFallback>
    </Avatar>
  )
}

function UserDetails({ user }: { user: UserMenuUser }) {
  return (
    <View className="cn-user-menu-details flex-1 flex-col">
      <Text numberOfLines={1} className="cn-user-menu-name">
        {user.name}
      </Text>
      {user.email ? (
        <Text numberOfLines={1} className="cn-user-menu-email">
          {user.email}
        </Text>
      ) : null}
    </View>
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
  /** Default: above the row on tablets, below for `mark`. A phone opens a sheet. */
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
  /** DropdownMenu groups: profile, settings, theme, sign out… */
  children?: React.ReactNode
}) {
  const { isMobile } = useSidebar()
  const collapse = useSidebarCollapse()
  const [open, setOpen] = React.useState(false)
  const isMark = variant === "mark"
  const isCompact = isMark || collapse === "icon"

  const triggerContent = (
    <>
      <UserAvatar user={user} />
      {!isCompact && (
        <>
          <UserDetails user={user} />
          <TextStyle className="cn-user-menu-chevron-text">
            <View className="cn-user-menu-chevron ml-auto items-center justify-center">
              <ChevronsUpDownIcon strokeWidth={1.5} />
            </View>
          </TextStyle>
        </>
      )}
    </>
  )
  const triggerProps = {
    accessibilityLabel: `Account: ${user.name}`,
    "aria-expanded": open,
    "data-user-menu": variant,
    "data-state": open ? "open" : "closed",
  }
  const trigger = isMark ? (
    <Pressable
      role="button"
      hitSlop={8}
      className={cn(
        "cn-user-menu-trigger shrink-0 items-center justify-center",
        className
      )}
      {...triggerProps}
    />
  ) : (
    <SidebarMenuButton
      size="lg"
      className={cn("cn-user-menu-trigger", className)}
      {...triggerProps}
    />
  )

  const items = (
    <>
      <DropdownMenuGroup>
        <View className="cn-user-menu-label flex-row items-center">
          <UserAvatar user={user} />
          <UserDetails user={user} />
        </View>
      </DropdownMenuGroup>
      {children ? <DropdownMenuSeparator /> : null}
      {children}
    </>
  )

  const menu = isMobile ? (
    <>
      {React.cloneElement(trigger, {
        onPress: () => setOpen(true),
        children: triggerContent,
      })}
      <MenuSheet
        open={open}
        onOpenChange={setOpen}
        label={`Account: ${user.name}`}
      >
        {items}
      </MenuSheet>
    </>
  ) : (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={trigger}>
        {triggerContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side ?? (isMark ? "bottom" : "top")}
        align={align}
        sideOffset={4}
        className="cn-user-menu-content"
      >
        {items}
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
