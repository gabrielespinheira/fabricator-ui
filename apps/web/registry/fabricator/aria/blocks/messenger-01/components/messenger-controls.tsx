"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/aria/ui/alert-dialog"
import { Button } from "@/registry/bases/aria/ui/button"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Switch } from "@/registry/bases/aria/ui/switch"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"
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
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onPress={onClick}
        className={className}
      >
        {children}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
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
  return <Switch id={id} isSelected={checked} onChange={onCheckedChange} />
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
    <AlertDialog isOpen={open} onOpenChange={onOpenChange} size="sm">
      <AlertDialogHeader>
        <AlertDialogTitle>Block {name}?</AlertDialogTitle>
        <AlertDialogDescription>
          They won&apos;t be able to message or call you, and won&apos;t see
          when you&apos;re online. You can unblock them in Settings.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onPress={onConfirm}>
          Block
        </AlertDialogAction>
      </AlertDialogFooter>
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
        <DropdownMenuItem onAction={onShowDetails}>
          <IconPlaceholder
            lucide="InfoIcon"
            tabler="IconInfoCircle"
            hugeicons="InformationCircleIcon"
            phosphor="InfoIcon"
            remixicon="RiInformationLine"
          />
          Details
        </DropdownMenuItem>
        <DropdownMenuItem
          textValue={isMuted ? "Unmute notifications" : "Mute notifications"}
          onAction={onToggleMute}
        >
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
            <DropdownMenuItem
              variant="destructive"
              textValue="Block contact"
              onAction={onBlock}
            >
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
