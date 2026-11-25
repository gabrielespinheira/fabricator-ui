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
import {
  Button as ButtonPrimitive,
  Header as HeaderPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuSection as MenuSectionPrimitive,
} from "react-aria-components"

import {
  useThemePreference,
  type ThemePreferenceOptions,
} from "@/registry/bases/aria/hooks/use-theme-preference"
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/registry/bases/aria/lib/theme-toggle-model"
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
  side?: Side
  align?: Align
  className?: string
  /** DropdownMenu groups and UserMenuTheme: profile, theme, sign out… */
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
  const names = { ...THEME_LABELS, ...labels }
  const { attach, select, value } = useThemePreference({
    theme,
    onThemeChange,
    variant,
    start,
  })
  return (
    <MenuSectionPrimitive
      ref={attach}
      data-slot="user-menu-theme"
      data-fluid-hover=""
      data-value={value}
      selectionMode="single"
      disallowEmptySelection
      shouldCloseOnSelect={false}
      selectedKeys={value ? [value] : []}
      onSelectionChange={(keys) => {
        for (const key of keys) select(String(key))
      }}
      className={cn(
        "cn-user-menu-theme relative isolate flex items-center",
        className
      )}
    >
      <HeaderPrimitive
        data-slot="user-menu-theme-label"
        className="cn-user-menu-theme-label flex min-w-0 flex-1 items-center [&_svg]:shrink-0"
      >
        <ThemeLabelIcon />
        <span className="truncate">{names.theme}</span>
      </HeaderPrimitive>
      {THEME_PREFERENCES.map((preference) => (
        <MenuItemPrimitive
          key={preference}
          id={preference}
          data-slot="user-menu-theme-item"
          data-theme-preference={preference}
          aria-label={names[preference]}
          textValue={names[preference]}
          className="cn-user-menu-theme-item flex shrink-0 items-center justify-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
        >
          {THEME_ICONS[preference]}
        </MenuItemPrimitive>
      ))}
    </MenuSectionPrimitive>
  )
}

export { UserMenu, UserMenuTheme, type UserMenuThemeProps, type UserMenuUser }
