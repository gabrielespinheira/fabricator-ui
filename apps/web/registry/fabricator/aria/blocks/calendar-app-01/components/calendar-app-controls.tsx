"use client"

import * as React from "react"
import { cn } from "cn"
import { Dialog } from "react-aria-components"

import { Button } from "@/registry/bases/aria/ui/button"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Popover, PopoverTrigger } from "@/registry/bases/aria/ui/popover"
import { SidebarMenuButton } from "@/registry/bases/aria/ui/sidebar"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/aria/ui/toggle-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The calendar app's controls whose API differs between Base UI, Radix and
// React Aria: choices, menus with their triggers and the date picker. This is
// React Aria; the rest of the block is shared.

/**
 * One of a few short values: the view, your answer. `value` is undefined
 * until something is picked.
 */
export function CalendarAppChoice<TValue extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string
  options: readonly { value: TValue; label: string }[]
  value: TValue | undefined
  onValueChange: (value: TValue) => void
  className?: string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      size="sm"
      spacing={0}
      selectedKeys={value === undefined ? [] : [value]}
      onSelectionChange={(selected) => {
        const next = selected.values().next().value
        const option = options.find((item) => item.value === next)
        if (option) onValueChange(option.value)
      }}
      className={cn(
        "rounded-(--radius-control) bg-foreground/[0.05]",
        className
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          id={option.value}
          className="min-w-0 flex-1 font-normal text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export type CalendarAppMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  /** Last and alone, under a separator. */
  isDestructive?: boolean
  onSelect: () => void
}

/** The rest of the actions on one thing, behind an ellipsis. */
export function CalendarAppMenu({
  label,
  entries,
}: {
  label: string
  entries: CalendarAppMenuEntry[]
}) {
  const safe = entries.filter(({ isDestructive }) => !isDestructive)
  const destructive = entries.filter(({ isDestructive }) => isDestructive)
  return (
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon-sm" aria-label={label}>
        <IconPlaceholder
          lucide="EllipsisIcon"
          tabler="IconDots"
          hugeicons="MoreHorizontalCircle01Icon"
          phosphor="DotsThreeIcon"
          remixicon="RiMoreLine"
        />
      </Button>
      <DropdownMenu placement="bottom end" className="w-auto min-w-44">
        <DropdownMenuGroup>
          {safe.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              textValue={entry.label}
              onAction={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {destructive.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.length > 0 ? (
          <DropdownMenuGroup>
            {destructive.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                variant="destructive"
                textValue={entry.label}
                onAction={entry.onSelect}
              >
                {entry.icon}
                {entry.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** A value that rests as text and opens the others. */
export function CalendarAppValueMenu({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: readonly { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
}) {
  const current = options.find((option) => option.value === value)
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${label}: ${current?.label ?? ""}`}
        className="-ms-(--density-16) text-foreground"
      >
        {current?.label}
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          data-icon="inline-end"
          className="text-muted-foreground"
        />
      </Button>
      <DropdownMenu placement="bottom end" className="w-auto min-w-44">
        <DropdownMenuGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[value]}
          onSelectionChange={(keys) => {
            if (keys === "all") return
            const next = options.find((option) => keys.has(option.value))
            if (next) onValueChange(next.value)
          }}
        >
          {options.map((option) => (
            <DropdownMenuItem key={option.value} id={option.value}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** The sidebar's last row: colleagues whose calendars can be shown. */
export function CalendarAppAddCalendar({
  options,
  onAdd,
}: {
  options: { id: string; name: string; media: React.ReactNode }[]
  onAdd: (id: string) => void
}) {
  return (
    <DropdownMenuTrigger>
      <SidebarMenuButton>
        <IconPlaceholder
          lucide="PlusIcon"
          tabler="IconPlus"
          hugeicons="PlusSignIcon"
          phosphor="PlusIcon"
          remixicon="RiAddLine"
        />
        <span>Add calendar</span>
      </SidebarMenuButton>
      <DropdownMenu placement="bottom start" className="w-auto min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colleagues</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              textValue={option.name}
              onAction={() => onAdd(option.id)}
            >
              {option.media}
              {option.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** View options for the page menu: each one is on or off. */
export function CalendarAppViewOptions({
  options,
}: {
  options: {
    id: string
    label: string
    icon: React.ReactNode
    isOn: boolean
    onChange: (isOn: boolean) => void
  }[]
}) {
  return (
    <DropdownMenuGroup
      selectionMode="multiple"
      selectedKeys={options.filter(({ isOn }) => isOn).map(({ id }) => id)}
      onSelectionChange={(keys) => {
        for (const option of options) {
          const isOn = keys === "all" || keys.has(option.id)
          if (isOn !== option.isOn) option.onChange(isOn)
        }
      }}
    >
      <DropdownMenuLabel>View</DropdownMenuLabel>
      {options.map((option) => (
        <DropdownMenuItem
          key={option.id}
          id={option.id}
          textValue={option.label}
        >
          {option.icon}
          {option.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}

/** The period, opening a month to jump from. */
export function CalendarAppDateButton({
  title,
  children,
}: {
  title: string
  /** The month; call `close` once a day is picked. */
  children: (close: () => void) => React.ReactNode
}) {
  const [isOpen, setOpen] = React.useState(false)
  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="-ms-(--density-8) min-w-0 px-(--density-8) text-(length:--density-text-16) text-foreground weight-semibold"
      >
        <span className="truncate">{title}</span>
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          data-icon="inline-end"
          className="text-muted-foreground"
        />
      </Button>
      <Popover placement="bottom start" className="w-auto">
        <Dialog aria-label="Choose a date" className="outline-none">
          {children(() => setOpen(false))}
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}
