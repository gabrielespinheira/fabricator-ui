"use client"

// User Menu: the signed-in person's menu. `row` fills a sidebar row with the
// avatar, name and email (shadcn's footer placement); `mark` is the avatar
// alone, for the header row SharpOS puts it in. The items are yours: pass
// DropdownMenu groups as children.
import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"

import {
  useThemePreference,
  type ThemePreferenceOptions,
} from "@/registry/bases/base/hooks/use-theme-preference"
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/registry/bases/base/lib/theme-toggle-model"
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

const THEME_ICONS: Record<ThemePreference, React.ReactNode> = {
  light: (
    <IconPlaceholder
      lucide="SunIcon"
      tabler="IconSun"
      hugeicons="Sun03Icon"
      phosphor="SunIcon"
      remixicon="RiSunLine"
    />
  ),
  dark: (
    <IconPlaceholder
      lucide="MoonIcon"
      tabler="IconMoon"
      hugeicons="Moon02Icon"
      phosphor="MoonIcon"
      remixicon="RiMoonLine"
    />
  ),
  system: (
    <IconPlaceholder
      lucide="MonitorIcon"
      tabler="IconDeviceDesktop"
      hugeicons="ComputerIcon"
      phosphor="MonitorIcon"
      remixicon="RiComputerLine"
    />
  ),
}

const THEME_LABELS = {
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  system: "System",
}

type UserMenuThemeProps = ThemePreferenceOptions & {
  /** Translates the row's label and the tabs' names. */
  labels?: Partial<typeof THEME_LABELS>
  className?: string
}

function ThemeLabelIcon() {
  return (
    <IconPlaceholder
      lucide="PaletteIcon"
      tabler="IconPalette"
      hugeicons="PaintBoardIcon"
      phosphor="PaletteIcon"
      remixicon="RiPaletteLine"
    />
  )
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
        <span
          data-slot="user-menu-email"
          className="cn-user-menu-email truncate"
        >
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
  /** DropdownMenu groups and UserMenuTheme: profile, theme, sign out… */
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
              tooltip={user.name}
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

// The theme row: a label, and light, dark and system as small tabs. Picking one
// keeps the menu open and reveals the page from that tab, as Theme Toggle does.
// data-fluid-hover keeps the menu's gliding highlight out of the row.
function UserMenuTheme({
  theme,
  onThemeChange,
  variant = "circle-blur",
  start = "trigger",
  labels,
  className,
}: UserMenuThemeProps) {
  const labelId = React.useId()
  const names = { ...THEME_LABELS, ...labels }
  const { attach, select, value } = useThemePreference({
    theme,
    onThemeChange,
    variant,
    start,
  })
  return (
    <MenuPrimitive.RadioGroup
      ref={attach}
      data-slot="user-menu-theme"
      data-fluid-hover=""
      data-value={value}
      aria-labelledby={labelId}
      value={value ?? ""}
      onValueChange={select}
      className={cn(
        "cn-user-menu-theme relative isolate flex items-center",
        className
      )}
    >
      <span
        id={labelId}
        data-slot="user-menu-theme-label"
        className="cn-user-menu-theme-label flex min-w-0 flex-1 items-center [&_svg]:shrink-0"
      >
        <ThemeLabelIcon />
        <span className="truncate">{names.theme}</span>
      </span>
      {THEME_PREFERENCES.map((preference) => (
        <MenuPrimitive.RadioItem
          key={preference}
          data-slot="user-menu-theme-item"
          data-theme-preference={preference}
          aria-label={names[preference]}
          label={names[preference]}
          value={preference}
          className="cn-user-menu-theme-item flex shrink-0 items-center justify-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
        >
          {THEME_ICONS[preference]}
        </MenuPrimitive.RadioItem>
      ))}
    </MenuPrimitive.RadioGroup>
  )
}

export { UserMenu, UserMenuTheme, type UserMenuThemeProps, type UserMenuUser }
