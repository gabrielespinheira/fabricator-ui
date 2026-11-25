"use client"

import * as React from "react"
import { toast } from "sonner"

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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/aria/ui/alert-dialog"
import { Button } from "@/registry/bases/aria/ui/button"
import { Checkbox } from "@/registry/bases/aria/ui/checkbox"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/aria/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/aria/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/aria/ui/multi-select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/aria/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/aria/ui/select"
import { Spinner } from "@/registry/bases/aria/ui/spinner"
import { TableHead, TableHeader } from "@/registry/bases/aria/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/aria/ui/tabs"

// The members page's controls whose API differs between Base UI, Radix and
// React Aria. This is React Aria's; the rest of the block is shared.

/** A button that can be off, or busy with what it started. */
export function MembersButton({
  isDisabled = false,
  isPending = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children" | "isPending"> & {
  isPending?: boolean
  children?: React.ReactNode
}) {
  return (
    <Button isDisabled={isDisabled || isPending} {...props}>
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
              id={item.id}
              textValue={item.label}
              variant={item.isDestructive ? "destructive" : "default"}
              onAction={item.onSelect}
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
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={className}
      >
        {icon}
      </Button>
      <DropdownMenu placement="bottom end" className="min-w-56">
        <MembersMenuItems groups={groups} />
      </DropdownMenu>
    </DropdownMenuTrigger>
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
    <DropdownMenuTrigger>
      <Button
        variant={trigger.variant}
        size="sm"
        aria-label={value ? `${label}: ${getRoleLabel(value)}` : label}
        className={trigger.className}
      >
        {trigger.content}
      </Button>
      <DropdownMenu placement="bottom start" className="w-72">
        <DropdownMenuGroup
          selectionMode="single"
          disallowEmptySelection={value !== null}
          selectedKeys={value ? [value] : []}
          onSelectionChange={(keys) => {
            const [next] = keys
            if (isMemberRole(next)) onValueChange(next)
          }}
        >
          {note && (
            <DropdownMenuLabel className="text-pretty whitespace-normal">
              {note}
            </DropdownMenuLabel>
          )}
          {MEMBER_ROLES.filter(
            (role) => canBeOwner || role.value !== "owner"
          ).map((role) => (
            <DropdownMenuItem
              key={role.value}
              id={role.value}
              textValue={role.label}
              isDisabled={isLocked && role.value !== value}
              className="h-auto items-start py-(--density-6)"
            >
              <RoleText label={role.label} description={role.description} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
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
    <DropdownMenuTrigger>
      <Button variant="outline">
        {icon}
        Role
        {value.length > 0 && (
          <span className="tabular-nums">· {value.length}</span>
        )}
      </Button>
      <DropdownMenu placement="bottom start" className="min-w-40">
        <DropdownMenuGroup
          selectionMode="multiple"
          selectedKeys={value}
          onSelectionChange={(keys) =>
            onValueChange(
              MEMBER_ROLES.map((role) => role.value).filter(
                (role) => keys === "all" || keys.has(role)
              )
            )
          }
        >
          <DropdownMenuLabel>Role</DropdownMenuLabel>
          {MEMBER_ROLES.map((role) => (
            <DropdownMenuItem
              key={role.value}
              id={role.value}
              textValue={role.label}
            >
              {role.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
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
      selectedKey={value}
      onSelectionChange={(next) => {
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
        <TabsTrigger key={view.value} id={view.value}>
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
      id={value}
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
      isSelected={checked}
      onChange={onCheckedChange}
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
      {columns.map((column, index) => (
        <TableHead
          key={column.label}
          isRowHeader={index === 0}
          className={column.className}
        >
          {column.isHidden ? (
            <span className="sr-only">{column.label}</span>
          ) : (
            column.label
          )}
        </TableHead>
      ))}
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
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      className="max-h-[calc(100svh-4rem)] sm:max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="-mx-(--density-16) min-h-0 scroll-fade-b overflow-y-auto px-(--density-16)">
        {children}
      </div>
      <DialogFooter>{footer}</DialogFooter>
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
    <AlertDialog isOpen={open} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {children}
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          variant={isDestructive ? "destructive" : "default"}
          isDisabled={isConfirmDisabled}
          onPress={onConfirm}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
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
      onChange={(next) => {
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
  label,
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
    <div {...getEntryHandlers(draft, onAdd)}>
      <MultiSelect<CheckedAddress>
        aria-label={label}
        aria-describedby={describedBy}
        menuTrigger="manual"
        value={emails}
        onChange={(keys) =>
          onRemove(emails.filter((email) => !keys.includes(email)))
        }
        inputValue={draft}
        onInputChange={onDraftChange}
      >
        <MultiSelectTrigger className="min-h-20 items-start [&_[data-slot=multi-select-icon]]:hidden">
          <MultiSelectValue<CheckedAddress>>
            {({ email }) => renderChip(email)}
          </MultiSelectValue>
          <MultiSelectInput
            id={id}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            enterKeyHint="done"
            placeholder="maya@acme.com, Tom Becker <tom@acme.com>"
          />
        </MultiSelectTrigger>
        {/* The chips are read from the options, so each address is one. */}
        <MultiSelectContent className="hidden">
          <MultiSelectList>
            {addresses.map((address) => (
              <MultiSelectItem
                key={address.email}
                id={address.email}
                value={address}
                textValue={address.email}
              >
                {address.email}
              </MultiSelectItem>
            ))}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    </div>
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
    onBlurCapture: () => onAdd(draft),
  }
}

export type MembersSelectOption = { value: string; label: string }

export function MembersSelect({
  id,
  label,
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
      aria-label={label}
      value={value}
      onChange={(next) => {
        if (next !== null) onValueChange(String(next))
      }}
      className="w-full"
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} id={option.value}>
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
  toast(title, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
