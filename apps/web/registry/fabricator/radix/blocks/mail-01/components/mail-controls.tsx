"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  type MailContact,
  type MailFilter,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import { Button } from "@/registry/bases/radix/ui/button"
import { Checkbox } from "@/registry/bases/radix/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/radix/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/radix/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"
import { Kbd } from "@/registry/bases/radix/ui/kbd"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/radix/ui/multi-select"
import { Tabs, TabsList, TabsTrigger } from "@/registry/bases/radix/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"

// The mail block's controls whose API differs between Base UI, Radix and
// React Aria: tooltips, checkboxes, tabs, menus with their triggers, the
// compose overlay, the recipient picker and toasts. This is Radix's; the
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
    // A local provider: Radix tooltips need one, and the app may not have it.
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={isMobile ? "icon" : "icon-sm"}
            aria-label={label}
            aria-pressed={isPressed}
            disabled={isDisabled}
            tabIndex={isFocusable ? undefined : -1}
            onClick={onClick}
            className={className}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      tabIndex={isFocusable ? undefined : -1}
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
  className,
}: {
  value: MailFilter
  onValueChange: (filter: MailFilter) => void
  className?: string
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (isMailFilter(next)) onValueChange(next)
      }}
      className={className}
    >
      <TabsList aria-label="Show">
        {FILTERS.map((filter) => (
          <TabsTrigger key={filter.value} value={filter.value}>
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function MailMenuItems({ groups }: { groups: MailMenuGroup[] }) {
  return groups.map((group, index) => (
    <React.Fragment key={group.id}>
      {index > 0 && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
        {group.entries.map((entry) => (
          <DropdownMenuItem key={entry.id} onSelect={entry.onSelect}>
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isMobile ? "icon" : "icon-sm"}
          aria-label={label}
        >
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-60">
        <MailMenuItems groups={groups} />
      </DropdownMenuContent>
    </DropdownMenu>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
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
