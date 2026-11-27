"use client"

import * as React from "react"
import { cn } from "cn"
import { toast } from "sonner"

import {
  MoreIcon,
  ReactIcon,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import { type Photo } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message-body"
import { QUICK_REACTIONS } from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/radix/ui/alert-dialog"
import { Button } from "@/registry/bases/radix/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/registry/bases/radix/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/radix/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/radix/ui/popover"
import { Switch } from "@/registry/bases/radix/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"

// The messenger's controls whose API differs between Base UI, Radix and React
// Aria: tooltips, a switch's state, dialogs opened from code, menus, the
// reaction picker and toasts. This is Radix's; the rest of the block is
// shared.

export type MessengerMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  isDestructive?: boolean
  /** Shown as a button beside a message, not only in its menu. */
  isInToolbar?: boolean
  onSelect: () => void
}

export function MessengerIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    // A local provider: Radix tooltips need one, and the app may not have it.
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            className={className}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function MessengerMuteSwitch({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
}

export function MessengerConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  actionLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  cancelLabel: string
  actionLabel: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** A photo at full size. */
export function MessengerPhotoDialog({
  photo,
  open,
  onOpenChange,
}: {
  photo: Photo | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pe-(--density-36)">
            {photo?.caption ?? photo?.alt}
          </DialogTitle>
        </DialogHeader>
        <img
          src={photo?.src}
          alt={photo?.alt}
          className="max-h-[75svh] w-full rounded-(--radius-control) object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}

/** The rows of a menu, for AppShellHeaderActions' `menu`. */
export function MessengerMenuItems({
  groups,
}: {
  groups: MessengerMenuEntry[][]
}) {
  return groups.map((entries, index) => (
    <React.Fragment key={entries[0]?.id}>
      {index > 0 && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        {entries.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            variant={entry.isDestructive ? "destructive" : "default"}
            onSelect={entry.onSelect}
          >
            {entry.icon}
            {entry.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </React.Fragment>
  ))
}

/**
 * A message's menu, around the message: a right click, or a long press on
 * touch, opens it at the point pressed.
 */
export function MessengerMessageMenu({
  entries,
  onReact,
  children,
}: {
  entries: MessengerMenuEntry[]
  /** Left out, the message can't be reacted to yet. */
  onReact: ((emoji: string) => void) | undefined
  children: React.ReactElement
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        className="select-text pointer-coarse:select-none"
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-56">
        {onReact && (
          <>
            <ContextMenuGroup className="flex justify-between">
              {QUICK_REACTIONS.map(({ emoji, name }) => (
                <ContextMenuItem
                  key={emoji}
                  aria-label={name}
                  onSelect={() => onReact(emoji)}
                  className="size-(--density-36) justify-center px-0 text-(length:--density-text-16) text-foreground"
                >
                  {emoji}
                </ContextMenuItem>
              ))}
            </ContextMenuGroup>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuGroup>
          {entries.map((entry) => (
            <ContextMenuItem
              key={entry.id}
              variant={entry.isDestructive ? "destructive" : "default"}
              onSelect={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** A message's actions beside its bubble. */
export function MessengerMessageToolbar({
  entries,
  onReact,
  onOpenChange,
  className,
}: {
  entries: MessengerMenuEntry[]
  onReact: ((emoji: string) => void) | undefined
  /** The picker or the menu opened, so the toolbar has to stay. */
  onOpenChange: (open: boolean) => void
  className?: string
}) {
  const [isPickerOpen, setPickerOpen] = React.useState(false)
  const rest = entries.filter((entry) => !entry.isInToolbar)
  const changePicker = (open: boolean) => {
    setPickerOpen(open)
    onOpenChange(open)
  }

  return (
    <div
      role="group"
      aria-label="Message actions"
      className={cn(
        "animate-in duration-feedback fade-in-0 motion-reduce:animate-none",
        className
      )}
    >
      {onReact && (
        <Popover open={isPickerOpen} onOpenChange={changePicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="React">
              <ReactIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            aria-label="Reactions"
            className="w-auto flex-row gap-0 p-(--density-4)"
          >
            {QUICK_REACTIONS.map(({ emoji, name }) => (
              <Button
                key={emoji}
                variant="ghost"
                size="icon"
                aria-label={name}
                onClick={() => {
                  onReact(emoji)
                  changePicker(false)
                }}
                className="text-(length:--density-text-16) text-foreground"
              >
                {emoji}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      )}
      {entries
        .filter((entry) => entry.isInToolbar)
        .map((entry) => (
          <MessengerIconButton
            key={entry.id}
            label={entry.label}
            onClick={entry.onSelect}
          >
            {entry.icon}
          </MessengerIconButton>
        ))}
      {rest.length > 0 && (
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48">
            <MessengerMenuItems groups={[rest]} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/** A short report of what just happened, with Undo when it can be undone. */
export function notifyMessenger(message: string, undo?: () => void) {
  toast(message, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
