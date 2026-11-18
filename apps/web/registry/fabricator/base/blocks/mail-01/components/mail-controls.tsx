"use client"

import * as React from "react"

import {
  type MailContact,
  type MailFilter,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Button } from "@/registry/bases/base/ui/button"
import { Checkbox } from "@/registry/bases/base/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/base/ui/multi-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/base/ui/sheet"
import { toast } from "@/registry/bases/base/ui/toast"
import { Toggle } from "@/registry/bases/base/ui/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"

// The mail block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, checkboxes, toggles, menus with their triggers, the
// compose sheet, the recipient picker and toasts. This is Base UI's; the
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            tabIndex={isFocusable ? undefined : -1}
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
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={(next) => onCheckedChange(next)}
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
      pressed={pressed}
      onPressedChange={onPressedChange}
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
      value={[value]}
      onValueChange={(next) => {
        const [selected] = next
        if (isMailFilter(selected)) onValueChange(selected)
      }}
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem key={filter.value} value={filter.value}>
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
            variant={entry.destructive ? "destructive" : undefined}
            onClick={entry.onSelect}
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <MailMenuItems groups={groups} />
      </DropdownMenuContent>
    </DropdownMenu>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}

type RecipientOption = { value: string; label: string; email: string }

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
  const options = React.useMemo<RecipientOption[]>(
    () =>
      contacts.map((contact) => ({
        value: contact.id,
        label: contact.name,
        email: contact.email,
      })),
    [contacts]
  )
  const selected = options.filter((option) => value.includes(option.value))

  return (
    <MultiSelect
      items={options}
      value={selected}
      onValueChange={(next: RecipientOption[]) =>
        onValueChange(next.map((option) => option.value))
      }
    >
      <MultiSelectTrigger aria-invalid={isInvalid || undefined}>
        <MultiSelectValue />
        <MultiSelectInput
          id={id}
          aria-describedby={describedBy}
          placeholder="Add people"
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectEmpty>No one with that name.</MultiSelectEmpty>
        <MultiSelectList>
          {(option: RecipientOption) => (
            <MultiSelectItem key={option.value} value={option}>
              {option.label}
              <span className="ms-auto text-muted-foreground">
                {option.email}
              </span>
            </MultiSelectItem>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}

/** A short report of what just happened, with Undo when it can be undone. */
export function notifyMail(message: string, undo?: () => void) {
  toast.add({
    title: message,
    actionProps: undo ? { children: "Undo", onClick: undo } : undefined,
  })
}
