"use client"

import * as React from "react"

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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/radix/ui/dropdown-menu"
import { Switch } from "@/registry/bases/radix/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The messenger's controls whose API differs between Base UI, Radix and React
// Aria: a tooltip's trigger, a switch's state, a dialog opened from code and a
// menu item's action. The rest of the block is shared.

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
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
    />
  )
}

export function MessengerBlockDialog({
  name,
  open,
  onOpenChange,
  onConfirm,
}: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Block {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They won&apos;t be able to message or call you, and won&apos;t see
            when you&apos;re online. You can unblock them in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Block
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** The conversation's page menu, for AppShellHeaderActions' `menu`. */
export function MessengerConversationMenu({
  isMuted,
  canBlock,
  onShowDetails,
  onToggleMute,
  onBlock,
}: {
  isMuted: boolean
  canBlock: boolean
  onShowDetails: () => void
  onToggleMute: () => void
  onBlock: () => void
}) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={onShowDetails}>
          <IconPlaceholder
            lucide="InfoIcon"
            tabler="IconInfoCircle"
            hugeicons="InformationCircleIcon"
            phosphor="InfoIcon"
            remixicon="RiInformationLine"
          />
          Details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleMute}>
          {isMuted ? (
            <IconPlaceholder
              lucide="BellIcon"
              tabler="IconBell"
              hugeicons="Notification01Icon"
              phosphor="BellIcon"
              remixicon="RiNotification3Line"
            />
          ) : (
            <IconPlaceholder
              lucide="BellOffIcon"
              tabler="IconBellOff"
              hugeicons="NotificationOff01Icon"
              phosphor="BellSlashIcon"
              remixicon="RiNotificationOffLine"
            />
          )}
          {isMuted ? "Unmute notifications" : "Mute notifications"}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      {canBlock && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={onBlock}>
              <IconPlaceholder
                lucide="BanIcon"
                tabler="IconBan"
                hugeicons="UnavailableIcon"
                phosphor="ProhibitIcon"
                remixicon="RiForbidLine"
              />
              Block contact…
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </>
      )}
    </>
  )
}
