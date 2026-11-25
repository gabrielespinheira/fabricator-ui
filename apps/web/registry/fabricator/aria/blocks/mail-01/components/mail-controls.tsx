"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  type MailContact,
  type MailFilter,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Kbd } from "@/registry/bases/aria/ui/kbd"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/aria/ui/multi-select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/aria/ui/tabs"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"

// The mail block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, checkboxes, tabs, menus with their triggers, the
// compose overlay, the recipient picker and toasts. This is React Aria's; the
// rest of the block is shared.

export type MailMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  /** Text at the end of the row: a shortcut, or when a snooze ends. */
  detail?: string
  onSelect: () => void
}

/** Groups of rows, with an optional label per group. */
export type MailMenuGroup = {
  id: string
  label?: string
  entries: MailMenuEntry[]
}

type IconButtonProps = {
  label: string
  /** Shown in the tooltip after the label. */
  shortcut?: string
  onClick: () => void
  /** For a control that is on or off, such as a star. */
  isPressed?: boolean
  isDisabled?: boolean
  /** false keeps a pointer shortcut out of the tab order. */
  isFocusable?: boolean
  className?: string
  children: React.ReactNode
}

/** An icon button named by a tooltip, with its shortcut. */
export function MailIconButton({
  label,
  shortcut,
  onClick,
  isPressed,
  isDisabled = false,
  isFocusable = true,
  className,
  children,
}: IconButtonProps) {
  const isMobile = useIsMobile()
  return (
    <TooltipTrigger delay={600}>
      <Button
        variant="ghost"
        size={isMobile ? "icon" : "icon-sm"}
        aria-label={label}
        aria-pressed={isPressed}
        isDisabled={isDisabled}
        excludeFromTabOrder={!isFocusable}
        onPress={onClick}
        className={className}
      >
        {children}
      </Button>
      <Tooltip>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </Tooltip>
    </TooltipTrigger>
  )
}

export function MailCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  isFocusable = true,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  isFocusable?: boolean
  className?: string
}) {
  return (
    <Checkbox
      isSelected={checked}
      isIndeterminate={indeterminate}
      onChange={onCheckedChange}
      excludeFromTabOrder={!isFocusable}
      aria-label={label}
      className={className}
    />
  )
}

const FILTERS: { value: MailFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "starred", label: "Starred" },
]

function isMailFilter(value: unknown): value is MailFilter {
  return FILTERS.some((filter) => filter.value === value)
}

/** What the list shows: one of three, so tabs. */
export function MailFilterTabs({
  value,
  onValueChange,
  children,
}: {
  value: MailFilter
  onValueChange: (filter: MailFilter) => void
  children: React.ReactNode
}) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(next) => {
        if (isMailFilter(next)) onValueChange(next)
      }}
      className="min-h-0 flex-1 gap-0"
    >
      {children}
    </Tabs>
  )
}

export function MailFilterList() {
  return (
    <TabsList aria-label="Show">
      {FILTERS.map((filter) => (
        <TabsTrigger key={filter.value} id={filter.value}>
          {filter.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function MailFilterPanel({
  value,
  children,
}: {
  value: MailFilter
  children: React.ReactNode
}) {
  return (
    <TabsContent
      id={value}
      className="flex min-h-0 flex-col focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {children}
    </TabsContent>
  )
}

function MailMenuItems({ groups }: { groups: MailMenuGroup[] }) {
  return groups.map((group, index) => (
    <React.Fragment key={group.id}>
      {index > 0 && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
        {group.entries.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            id={entry.id}
            textValue={entry.label}
            onAction={entry.onSelect}
          >
            {entry.icon}
            {entry.label}
            {entry.detail && (
              <DropdownMenuShortcut>{entry.detail}</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </React.Fragment>
  ))
}

/** An icon button that opens a menu. */
export function MailMenuButton({
  label,
  icon,
  groups,
  align = "end",
}: {
  label: string
  icon: React.ReactNode
  groups: MailMenuGroup[]
  align?: "start" | "end"
}) {
  const isMobile = useIsMobile()
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size={isMobile ? "icon" : "icon-sm"}
        aria-label={label}
      >
        {icon}
      </Button>
      <DropdownMenu placement={`bottom ${align}`} className="min-w-60">
        <MailMenuItems groups={groups} />
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** Where a message is written: a dialog, or a drawer on phones. */
export function MailComposeOverlay({
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
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-140">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </Dialog>
  )
}

/** People to send to, chosen from contacts and shown as chips. */
export function MailRecipientPicker({
  id,
  contacts,
  value,
  onValueChange,
  isInvalid,
  describedBy,
}: {
  id: string
  contacts: MailContact[]
  value: string[]
  onValueChange: (ids: string[]) => void
  isInvalid: boolean
  describedBy?: string
}) {
  return (
    <MultiSelect
      aria-label="To"
      aria-describedby={describedBy}
      isInvalid={isInvalid}
      value={value}
      onChange={(keys) => onValueChange(keys.map(String))}
    >
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput id={id} placeholder="Add people" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectList
          renderEmptyState={() => (
            <MultiSelectEmpty>No one with that name.</MultiSelectEmpty>
          )}
        >
          {contacts.map((contact) => (
            <MultiSelectItem
              key={contact.id}
              id={contact.id}
              textValue={contact.name}
            >
              {contact.name}
              <span className="ms-auto text-muted-foreground">
                {contact.email}
              </span>
            </MultiSelectItem>
          ))}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}

/** A short report of what just happened, with a way back. */
export function notifyMail(
  message: string,
  action?: { label: string; onSelect: () => void }
) {
  toast(
    message,
    action && { action: { label: action.label, onClick: action.onSelect } }
  )
}
