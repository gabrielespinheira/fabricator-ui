"use client"

import * as React from "react"
import { cn } from "cn"

import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import { Button } from "@/registry/bases/base/ui/button"
import { Checkbox } from "@/registry/bases/base/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/base/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/base/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import { Switch } from "@/registry/bases/base/ui/switch"
import { toast } from "@/registry/bases/base/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"

// The board block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, a checkbox's and a switch's state, menus with their
// triggers, the new ticket overlay and toasts. This is Base UI's; the rest of
// the block is shared.

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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={isPressed}
            onClick={onClick}
            className={className}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
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
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {entries.map((entry) => (
          <React.Fragment key={entry.id}>
            {entry.isDestructive && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant={entry.isDestructive ? "destructive" : "default"}
                onClick={entry.onSelect}
              >
                {entry.icon}
                {entry.label}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(isOn && "bg-hover text-foreground", className)}
          />
        }
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            const option = options.find((entry) => entry.value === next)
            if (option) onValueChange(option.value)
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** A short report of what just happened, with a way to it. */
export function notifyBoard(
  message: string,
  action?: { label: string; onSelect: () => void }
) {
  const id = toast.add({
    title: message,
    actionProps: action && {
      children: action.label,
      onClick: () => {
        action.onSelect()
        toast.close(id)
      },
    },
  })
}
