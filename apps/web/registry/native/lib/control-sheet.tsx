import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { MenuSheet } from "@/registry/native/lib/menu-sheet"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/registry/native/ui/dropdown-menu"
import { Text } from "@/registry/native/ui/text"

// The same menu data as the website's property-controls. A phone has no room
// for a submenu beside its menu, so one opens in the same sheet with a way back.

type ControlMenuItem =
  | {
      type?: "item"
      id: string
      label: string
      icon?: React.ReactNode
      shortcut?: string
      variant?: "default" | "destructive"
      isDisabled?: boolean
      onSelect: () => void
    }
  | {
      type: "check"
      id: string
      label: string
      icon?: React.ReactNode
      isChecked: boolean
      isDisabled?: boolean
      /** Keeps the sheet open, for choices made several at a time. */
      staysOpen?: boolean
      onSelect: () => void
    }
  | {
      type: "submenu"
      id: string
      label: string
      icon?: React.ReactNode
      groups: readonly ControlMenuGroup[]
    }

type ControlMenuGroup = {
  id: string
  label?: string
  items: readonly ControlMenuItem[]
}

function findSubmenu(
  groups: readonly ControlMenuGroup[],
  id: string | null
): Extract<ControlMenuItem, { type: "submenu" }> | null {
  for (const { items } of groups)
    for (const item of items)
      if (item.type === "submenu" && item.id === id) return item
  return null
}

function ControlSheet({
  open,
  onOpenChange,
  label,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  groups: readonly ControlMenuGroup[]
}) {
  const [path, setPath] = React.useState<string | null>(null)
  const submenu = findSubmenu(groups, path)
  const shown = (submenu?.groups ?? groups).filter(
    ({ items }) => items.length > 0
  )
  return (
    <MenuSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setPath(null)
        onOpenChange(next)
      }}
      label={label}
      contentKey={path ?? "root"}
    >
      {submenu ? (
        <DropdownMenuItem
          accessibilityLabel="Back"
          closeOnClick={false}
          onPress={() => setPath(null)}
        >
          <ChevronLeftIcon />
          {submenu.label}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuLabel numberOfLines={1}>{label}</DropdownMenuLabel>
      )}
      {shown.map(({ id, label: heading, items }, index) => (
        <React.Fragment key={id}>
          {(index > 0 || submenu) && <DropdownMenuSeparator />}
          <DropdownMenuGroup>
            {heading && <DropdownMenuLabel>{heading}</DropdownMenuLabel>}
            {items.map((item) =>
              item.type === "check" ? (
                <DropdownMenuCheckboxItem
                  key={item.id}
                  checked={item.isChecked}
                  disabled={item.isDisabled}
                  closeOnClick={!item.staysOpen}
                  onCheckedChange={item.onSelect}
                >
                  {item.icon}
                  <Text numberOfLines={1} className="shrink">
                    {item.label}
                  </Text>
                </DropdownMenuCheckboxItem>
              ) : item.type === "submenu" ? (
                <DropdownMenuItem
                  key={item.id}
                  closeOnClick={false}
                  onPress={() => setPath(item.id)}
                >
                  {item.icon}
                  <Text numberOfLines={1} className="shrink">
                    {item.label}
                  </Text>
                  <View className="flex-1 items-end">
                    <ChevronRightIcon />
                  </View>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.id}
                  variant={item.variant}
                  disabled={item.isDisabled}
                  onPress={item.onSelect}
                >
                  {item.icon}
                  <Text numberOfLines={1} className="shrink">
                    {item.label}
                  </Text>
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuGroup>
        </React.Fragment>
      ))}
    </MenuSheet>
  )
}

export { ControlSheet, type ControlMenuGroup, type ControlMenuItem }
