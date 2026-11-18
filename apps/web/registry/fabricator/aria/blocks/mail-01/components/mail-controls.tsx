"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  type MailContact,
  type MailFilter,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Button } from "@/registry/bases/aria/ui/button"
import { Checkbox } from "@/registry/bases/aria/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
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
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/aria/ui/sheet"
import { Toggle } from "@/registry/bases/aria/ui/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/aria/ui/toggle-group"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"

// The mail block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, checkboxes, toggles, menus with their triggers, the
// compose sheet, the recipient picker and toasts. This is React Aria's; the
// rest of the block is shared.

export type MailMenuEntry = {
  id: string
  label: string
  icon?: React.ReactNode
  /** Text at the end of the row, such as when a snooze ends. */
  detail?: string
  destructive?: boolean
  onSelect: () => void
}

/** Groups of rows, with an optional label per group. */
export type MailMenuGroup = {
  id: string
  label?: string
  entries: MailMenuEntry[]
}

/**
 * An icon button named by a tooltip. `isFocusable={false}` keeps a pointer
 * shortcut out of the tab order when the same action is reachable elsewhere.
 */
export function MailIconButton({
  label,
  onClick,
  isFocusable = true,
  className,
  children,
}: {
  label: string
  onClick: () => void
  isFocusable?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        excludeFromTabOrder={!isFocusable}
        onPress={onClick}
        className={className}
      >
        {children}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

export function MailCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  className?: string
}) {
  return (
    <Checkbox
      isSelected={checked}
      isIndeterminate={indeterminate}
      onChange={onCheckedChange}
      aria-label={label}
      className={className}
    />
  )
}

export function MailStarToggle({
  pressed,
  onPressedChange,
  label,
  className,
  children,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Toggle
      size="sm"
      isSelected={pressed}
      onChange={onPressedChange}
      aria-label={label}
      className={className}
    >
      {children}
    </Toggle>
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

export function MailFilterToggle({
  value,
  onValueChange,
}: {
  value: MailFilter
  onValueChange: (filter: MailFilter) => void
}) {
  return (
    <ToggleGroup
      size="sm"
      aria-label="Show"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [selected] = keys
        if (isMailFilter(selected)) onValueChange(selected)
      }}
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem key={filter.value} id={filter.value}>
          {filter.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Menu rows, for a menu button or the App Shell header's page menu. */
export function MailMenuItems({ groups }: { groups: MailMenuGroup[] }) {
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
            variant={entry.destructive ? "destructive" : undefined}
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
}: {
  label: string
  icon: React.ReactNode
  groups: MailMenuGroup[]
}) {
  return (
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon-sm" aria-label={label}>
        {icon}
      </Button>
      <DropdownMenu placement="bottom end" className="min-w-56">
        <MailMenuItems groups={groups} />
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** The compose form's surface: a sheet from the end edge. */
export function MailComposeSheet({
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
  return (
    <Sheet
      isOpen={open}
      onOpenChange={onOpenChange}
      side="right"
      className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
    >
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      {children}
    </Sheet>
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

/** A short report of what just happened, with Undo when it can be undone. */
export function notifyMail(message: string, undo?: () => void) {
  toast(message, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
