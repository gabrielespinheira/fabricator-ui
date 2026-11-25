"use client"

import * as React from "react"

import {
  getRoleLabel,
  isMemberRole,
  isMembersView,
  MEMBER_ROLES,
  MEMBERS_VIEWS,
  type CheckedAddress,
  type MemberRole,
  type MembersView,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/base/ui/alert-dialog"
import { Button } from "@/registry/bases/base/ui/button"
import { Checkbox } from "@/registry/bases/base/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/base/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/base/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  MultiSelect,
  MultiSelectInput,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/base/ui/multi-select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/base/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/base/ui/select"
import { Spinner } from "@/registry/bases/base/ui/spinner"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/base/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/base/ui/tabs"
import { toast } from "@/registry/bases/base/ui/toast"

// The members page's controls whose API differs between Base UI, Radix and
// React Aria. This is Base UI's; the rest of the block is shared.

/** A button that can be off, or busy with what it started. */
export function MembersButton({
  isDisabled = false,
  isPending = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "disabled"> & {
  isDisabled?: boolean
  isPending?: boolean
}) {
  return (
    <Button disabled={isDisabled || isPending} {...props}>
      {isPending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}

export type MembersMenuItem = {
  id: string
  label: string
  icon: React.ReactNode
  isDestructive?: boolean
  onSelect: () => void
}

/** Groups of rows, for a menu button or a menu that is already open. */
export function MembersMenuItems({ groups }: { groups: MembersMenuItem[][] }) {
  return groups
    .filter((items) => items.length > 0)
    .map((items, index) => (
      <React.Fragment key={items[0]?.id}>
        {index > 0 && <DropdownMenuSeparator />}
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              variant={item.isDestructive ? "destructive" : "default"}
              onClick={item.onSelect}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </React.Fragment>
    ))
}

export function MembersMenuButton({
  label,
  icon,
  groups,
  className,
}: {
  label: string
  icon: React.ReactNode
  groups: MembersMenuItem[][]
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={className}
          />
        }
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <MembersMenuItems groups={groups} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A role as text that opens the roles, each with what it can do. */
export function MembersRolePicker({
  label,
  value,
  note,
  isLocked = false,
  canBeOwner = true,
  onValueChange,
  trigger,
}: {
  label: string
  value: MemberRole | null
  /** Why the role can't change, above the roles. */
  note?: string
  isLocked?: boolean
  canBeOwner?: boolean
  onValueChange: (role: MemberRole) => void
  trigger: {
    variant: "ghost" | "outline"
    className?: string
    content: React.ReactNode
  }
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={trigger.variant}
            size="sm"
            aria-label={value ? `${label}: ${getRoleLabel(value)}` : label}
            className={trigger.className}
          />
        }
      >
        {trigger.content}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          {note && (
            <DropdownMenuLabel className="text-pretty whitespace-normal">
              {note}
            </DropdownMenuLabel>
          )}
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next: unknown) => {
              if (isMemberRole(next)) onValueChange(next)
            }}
          >
            {MEMBER_ROLES.filter(
              (role) => canBeOwner || role.value !== "owner"
            ).map((role) => (
              <DropdownMenuRadioItem
                key={role.value}
                value={role.value}
                disabled={isLocked && role.value !== value}
                closeOnClick
                className="h-auto items-start py-(--density-6)"
              >
                <RoleText label={role.label} description={role.description} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RoleText({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <span className="flex min-w-0 flex-col gap-(--density-2)">
      <span>{label}</span>
      <span className="text-(length:--density-text-12) font-normal text-pretty whitespace-normal text-muted-foreground">
        {description}
      </span>
    </span>
  )
}

/** Which roles the list shows; none chosen is all of them. */
export function MembersRoleFilter({
  value,
  icon,
  onValueChange,
}: {
  value: MemberRole[]
  icon: React.ReactNode
  onValueChange: (roles: MemberRole[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {icon}
        Role
        {value.length > 0 && (
          <span className="tabular-nums">· {value.length}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Role</DropdownMenuLabel>
          {MEMBER_ROLES.map((role) => (
            <DropdownMenuCheckboxItem
              key={role.value}
              checked={value.includes(role.value)}
              onCheckedChange={(isOn) =>
                onValueChange(toggle(value, role.value, isOn))
              }
            >
              {role.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function toggle(roles: MemberRole[], role: MemberRole, isOn: boolean) {
  const rest = roles.filter((candidate) => candidate !== role)
  return isOn ? [...rest, role] : rest
}

export function MembersViewTabs({
  value,
  onValueChange,
  children,
}: {
  children: React.ReactNode
  value: MembersView
  onValueChange: (view: MembersView) => void
}) {
  return (
    <Tabs
      className="gap-(--density-12)"
      value={value}
      onValueChange={(next: unknown) => {
        if (isMembersView(next)) onValueChange(next)
      }}
    >
      {children}
    </Tabs>
  )
}

export function MembersViewList() {
  return (
    <TabsList aria-label="Show">
      {MEMBERS_VIEWS.map((view) => (
        <TabsTrigger key={view.value} value={view.value}>
          {view.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function MembersViewPanel({
  value,
  children,
}: {
  value: MembersView
  children: React.ReactNode
}) {
  return (
    <TabsContent
      value={value}
      className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {children}
    </TabsContent>
  )
}

export function MembersCheckbox({
  label,
  checked,
  className,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  className?: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      className={className}
    />
  )
}

export type MembersColumn = {
  label: string
  className?: string
  isHidden?: boolean
}

export function MembersTableHeader({
  columns,
  className,
}: {
  columns: MembersColumn[]
  className?: string
}) {
  return (
    <TableHeader className={className}>
      <TableRow>
        {columns.map((column) => (
          <TableHead key={column.label} className={column.className}>
            {column.isHidden ? (
              <span className="sr-only">{column.label}</span>
            ) : (
              column.label
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

/** A task over the page: a dialog, and a bottom drawer on phones. */
export function MembersDialog({
  open,
  onOpenChange,
  isPhone,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPhone: boolean
  title: string
  description: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-(--density-16)">
            {children}
          </div>
          <DrawerFooter className="flex-col-reverse">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-4rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="-mx-(--density-16) scroll-fade-b overflow-y-auto px-(--density-16)">
          {children}
        </div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A decision to confirm, with what it needs to know first. */
export function MembersConfirm({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  isDestructive = false,
  isConfirmDisabled = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  isDestructive?: boolean
  isConfirmDisabled?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={isDestructive ? "destructive" : "default"}
            disabled={isConfirmDisabled}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** The frame of the role cards; each card holds a `MembersRadio`. */
export function MembersRadioGroup({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: MemberRole
  onValueChange: (value: MemberRole) => void
  children: React.ReactNode
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next: unknown) => {
        if (isMemberRole(next)) onValueChange(next)
      }}
      className="gap-(--density-8)"
    >
      {children}
    </RadioGroup>
  )
}

export function MembersRadio({ id, value }: { id: string; value: MemberRole }) {
  return <RadioGroupItem id={id} value={value} />
}

/** Addresses as chips: typed one at a time, or a pasted list. */
export function MembersAddressBox({
  id,
  addresses,
  draft,
  describedBy,
  renderChip,
  onRemove,
  onDraftChange,
  onAdd,
}: {
  id: string
  label: string
  addresses: CheckedAddress[]
  draft: string
  describedBy: string
  renderChip: (email: string) => React.ReactNode
  onRemove: (emails: string[]) => void
  onDraftChange: (draft: string) => void
  onAdd: (text: string) => void
}) {
  const emails = addresses.map(({ email }) => email)

  return (
    <MultiSelect<string>
      items={emails}
      open={false}
      value={emails}
      onValueChange={(next) =>
        onRemove(emails.filter((email) => !next.includes(email)))
      }
      inputValue={draft}
      onInputValueChange={onDraftChange}
    >
      <MultiSelectTrigger
        className="min-h-20 items-start [&_[data-slot=multi-select-icon]]:hidden"
        {...getEntryHandlers(draft, onAdd)}
      >
        <MultiSelectValue<string>>{renderChip}</MultiSelectValue>
        <MultiSelectInput
          id={id}
          aria-describedby={describedBy}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          enterKeyHint="done"
          placeholder="maya@acme.com, Tom Becker <tom@acme.com>"
          onBlur={() => onAdd(draft)}
        />
      </MultiSelectTrigger>
    </MultiSelect>
  )
}

// Enter, Tab, a separator or a pasted list adds what was typed. Caught on the
// way down, before the field's own keys. A space waits while a name is typed.
function getEntryHandlers(draft: string, onAdd: (text: string) => void) {
  return {
    onKeyDownCapture: (event: React.KeyboardEvent) => {
      const isSeparator =
        ["Enter", ",", ";"].includes(event.key) ||
        (event.key === " " && draft.includes("@") && !draft.includes("<"))
      if (!isSeparator || !draft.trim()) return
      event.preventDefault()
      event.stopPropagation()
      onAdd(draft)
    },
    onPasteCapture: (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text")
      if (!text.includes("@")) return
      event.preventDefault()
      onAdd(`${draft} ${text}`)
    },
  }
}

export type MembersSelectOption = { value: string; label: string }

export function MembersSelect({
  id,
  value,
  options,
  onValueChange,
}: {
  id: string
  label: string
  value: string
  options: MembersSelectOption[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** A short report, with Undo when it can be undone. */
export function notifyMembers(title: string, undo?: () => void) {
  const id = toast.add({
    title,
    actionProps: undo && {
      children: "Undo",
      onClick: () => {
        undo()
        toast.close(id)
      },
    },
  })
}
