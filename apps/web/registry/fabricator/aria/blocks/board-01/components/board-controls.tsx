"use client"

import * as React from "react"
import { cn } from "cn"
import { toast } from "sonner"

import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import { Button } from "@/registry/bases/aria/ui/button"
import { Checkbox } from "@/registry/bases/aria/ui/checkbox"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/aria/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/aria/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Switch } from "@/registry/bases/aria/ui/switch"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"

// The board block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, a checkbox's and a switch's state, menus with their
// triggers, the new ticket overlay and toasts. This is React Aria's; the rest
// of the block is shared.

/** An icon button named by a tooltip. */
export function BoardIconButton({
  label,
  isPressed,
  onClick,
  className,
  children,
}: {
  label: string
  isPressed?: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <TooltipTrigger delay={600}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={isPressed}
        onPress={onClick}
        className={className}
      >
        {children}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

export function BoardCheckbox({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      aria-label={label}
      isSelected={checked}
      onChange={onCheckedChange}
    />
  )
}

export function BoardSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Switch
      id={id}
      size="sm"
      aria-label={label}
      isSelected={checked}
      onChange={onCheckedChange}
    />
  )
}

export type BoardMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  /** Last and alone, under a separator. */
  isDestructive?: boolean
  onSelect: () => void
}

/** The rest of the actions on one thing, behind an icon. */
export function BoardMenuButton({
  label,
  icon,
  entries,
}: {
  label: string
  icon: React.ReactNode
  entries: BoardMenuEntry[]
}) {
  const safe = entries.filter(({ isDestructive }) => !isDestructive)
  const destructive = entries.filter(({ isDestructive }) => isDestructive)
  return (
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon-sm" aria-label={label}>
        {icon}
      </Button>
      <DropdownMenu placement="bottom end" className="w-auto min-w-44">
        <DropdownMenuGroup>
          {safe.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              textValue={entry.label}
              onAction={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {destructive.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuGroup>
          {destructive.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              variant="destructive"
              textValue={entry.label}
              onAction={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** How the board is cut into rows, behind an icon that stays lit while it is. */
export function BoardRowsMenu<TValue extends string>({
  label,
  icon,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string
  icon: React.ReactNode
  /** The first is the resting choice. */
  options: readonly { value: TValue; label: string }[]
  value: TValue
  onValueChange: (value: TValue) => void
  className?: string
}) {
  const isOn = value !== options[0]?.value
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={cn(isOn && "bg-hover text-foreground", className)}
      >
        {icon}
      </Button>
      <DropdownMenu placement="bottom end" className="w-auto min-w-40">
        <DropdownMenuGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[value]}
          onSelectionChange={(keys) => {
            if (keys === "all") return
            const next = options.find((option) => keys.has(option.value))
            if (next) onValueChange(next.value)
          }}
        >
          {options.map((option) => (
            <DropdownMenuItem key={option.value} id={option.value}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** Where a ticket is written: a dialog, or a drawer on phones. */
export function BoardDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--density-40))]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {/* Selecting text in a field must not drag the drawer away. */}
          <div data-vaul-no-drag="" className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-130">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </Dialog>
  )
}

/** A short report of what just happened, with a way to it. */
export function notifyBoard(
  message: string,
  action?: { label: string; onSelect: () => void }
) {
  toast(
    message,
    action && { action: { label: action.label, onClick: action.onSelect } }
  )
}
