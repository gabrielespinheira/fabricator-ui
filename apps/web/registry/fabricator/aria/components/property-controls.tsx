"use client"

// The shape every base shares. Properties, Kanban and Record View describe
// their popups as data, and this file draws them with the base's own parts, so
// nothing above it depends on a base's trigger or selection API.
import * as React from "react"
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"
import { cn } from "cn"
import { Dialog } from "react-aria-components"

import { Button } from "@/registry/bases/aria/ui/button"
import { Calendar, RangeCalendar } from "@/registry/bases/aria/ui/calendar"
import { Checkbox } from "@/registry/bases/aria/ui/checkbox"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/registry/bases/aria/ui/command"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import {
  InputGroupAddon,
  InputGroupText,
} from "@/registry/bases/aria/ui/input-group"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/bases/aria/ui/number-field"
import { Popover, PopoverTrigger } from "@/registry/bases/aria/ui/popover"
import { Switch } from "@/registry/bases/aria/ui/switch"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type ControlMenuItem =
  | {
      type?: "item"
      id: string
      label: string
      icon?: React.ReactNode
      shortcut?: string
      variant?: "default" | "destructive"
      isDisabled?: boolean
      onSelect: () => void
    }
  | {
      type: "check"
      id: string
      label: string
      icon?: React.ReactNode
      isChecked: boolean
      isDisabled?: boolean
      /** Keeps the menu open, for choices made several at a time. */
      staysOpen?: boolean
      onSelect: () => void
    }
  | {
      type: "submenu"
      id: string
      label: string
      icon?: React.ReactNode
      groups: readonly ControlMenuGroup[]
    }

type ControlMenuGroup = {
  id: string
  label?: string
  items: readonly ControlMenuItem[]
}

type ControlMenuProps = {
  /** Names the trigger. */
  label: string
  groups: readonly ControlMenuGroup[]
  children?: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  align?: "start" | "end"
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** On a panel or a dialog, where a popup's own level would sink into it. */
  isRaised?: boolean
  /** Opens at a point of the window instead of from the trigger, which stays hidden. */
  point?: { x: number; y: number }
}

type ControlPopoverProps = {
  /** Names the popup, and its trigger unless that has text of its own. */
  label: string
  /** The trigger's name; null when its text says it. */
  triggerLabel?: string | null
  trigger: React.ReactNode
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  align?: "start" | "end"
  className?: string
  /** What the popup holds, which decides its width and padding. */
  layout?:
    | "color"
    | "picker"
    | "calendar"
    | "form"
    | "settings"
    | "view"
    | "file"
  /** On a panel or a dialog, where a popup's own level would sink into it. */
  isRaised?: boolean
  /** Its trigger is also what a sortable row is dragged by. */
  isDraggable?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type ControlOption = {
  value: string
  label: string
  icon?: React.ReactNode
  count?: number
  /** The heading it is under. Options of one heading follow each other. */
  group?: string
  isDisabled?: boolean
}

type ControlOptionsProps = {
  label: string
  options: readonly ControlOption[]
  selected: readonly string[]
  onSelect: (value: string) => void
  /** Offers the typed text as a new option. */
  onCreate?: (label: string) => void
  placeholder?: string
  emptyText?: string
}

type ControlToggleProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

type ControlCalendarProps = {
  label: string
  value: Date | null
  onSelect: (day: Date) => void
}

type ControlRangeCalendarProps = {
  label: string
  start: Date | null
  end: Date | null
  onSelect: (start: Date, end: Date | null) => void
}

type ControlNumberProps = {
  label: string
  value: number | null
  min?: number
  max?: number
  step?: number
  format?: Intl.NumberFormatOptions
  /** After the number: a unit, or "%". */
  suffix?: string
  isInvalid?: boolean
  /** The message about its value. */
  describedBy?: string
  /** Every change, also while typing. */
  onValueChange: (value: number | null) => void
  /** A change that is done: a step, Enter, or leaving the field. */
  onValueCommit: (value: number | null) => void
  onEscape: () => void
}

type ControlTooltipProps = {
  label: string
  children: React.ReactElement
}

const hiddenTrigger = "pointer-events-none fixed size-0 opacity-0"

function ControlMenuEntry({ item }: { item: ControlMenuItem }) {
  if (item.type === "submenu")
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger textValue={item.label}>
          {item.icon}
          <span className="truncate">{item.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="cn-properties-menu">
          <ControlMenuGroups groups={item.groups} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  if (item.type === "check")
    return (
      <DropdownMenuItem
        id={item.id}
        textValue={item.label}
        isDisabled={item.isDisabled}
        shouldCloseOnSelect={!item.staysOpen}
        onAction={item.onSelect}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
      </DropdownMenuItem>
    )
  return (
    <DropdownMenuItem
      id={item.id}
      textValue={item.label}
      variant={item.variant}
      isDisabled={item.isDisabled}
      onAction={item.onSelect}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
      {item.shortcut && (
        <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
      )}
    </DropdownMenuItem>
  )
}

// React Aria keeps the checks of a section on the section, so a group of checks
// is one that selects several; each item's own action is what changes it.
function ControlMenuGroups({
  groups,
}: {
  groups: readonly ControlMenuGroup[]
}) {
  return groups
    .filter(({ items }) => items.length > 0)
    .map(({ id, label, items }, index) => {
      const checked = items.flatMap((item) =>
        item.type === "check" && item.isChecked ? [item.id] : []
      )
      const hasChecks = items.some((item) => item.type === "check")
      return (
        <React.Fragment key={id}>
          {index > 0 && <DropdownMenuSeparator />}
          <DropdownMenuGroup
            aria-label={label ?? id}
            selectionMode={hasChecks ? "multiple" : "none"}
            selectedKeys={checked}
          >
            {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
            {items.map((item) => (
              <ControlMenuEntry key={item.id} item={item} />
            ))}
          </DropdownMenuGroup>
        </React.Fragment>
      )
    })
}

function ControlMenu({
  label,
  groups,
  children,
  variant = "ghost",
  size = "icon-xs",
  align = "start",
  className,
  open,
  onOpenChange,
  isRaised,
  point,
}: ControlMenuProps) {
  return (
    <DropdownMenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      <Button
        aria-label={label}
        excludeFromTabOrder={!!point}
        variant={variant}
        size={size}
        className={cn(point && hiddenTrigger, className)}
        style={point ? { left: point.x, top: point.y } : undefined}
        data-sortable-ignore=""
      >
        {children}
      </Button>
      <DropdownMenu
        aria-label={label}
        placement={align === "end" ? "bottom end" : "bottom start"}
        data-raised={isRaised || undefined}
        className="cn-properties-menu"
      >
        <ControlMenuGroups groups={groups} />
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

function ControlPopover({
  label,
  triggerLabel = label,
  trigger,
  children,
  variant = "ghost",
  size = "default",
  align = "start",
  className,
  layout,
  isRaised,
  isDraggable,
  open,
  onOpenChange,
}: ControlPopoverProps) {
  return (
    <PopoverTrigger isOpen={open} onOpenChange={onOpenChange}>
      <Button
        aria-label={triggerLabel ?? undefined}
        variant={variant}
        size={size}
        className={className}
        data-sortable-ignore={isDraggable ? undefined : ""}
      >
        {trigger}
      </Button>
      <Popover
        placement={align === "end" ? "bottom end" : "bottom start"}
        data-layout={layout}
        data-raised={isRaised || undefined}
        className="cn-properties-popover"
      >
        <Dialog aria-label={label} className="outline-none">
          {children}
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}

function groupOptions(options: readonly ControlOption[]) {
  const groups: { heading?: string; options: ControlOption[] }[] = []
  for (const option of options) {
    const last = groups.at(-1)
    if (last && last.heading === option.group) last.options.push(option)
    else groups.push({ heading: option.group, options: [option] })
  }
  return groups
}

function ControlOptions({
  label,
  options,
  selected,
  onSelect,
  onCreate,
  placeholder = "Search…",
  emptyText = "No results.",
}: ControlOptionsProps) {
  const [query, setQuery] = React.useState("")
  const name = query.trim()
  const isNew =
    !!onCreate &&
    name !== "" &&
    !options.some((option) => option.label.toLowerCase() === name.toLowerCase())
  const createText = `Create “${name}”`
  return (
    <Command inputValue={query} onInputChange={setQuery}>
      <CommandInput placeholder={placeholder} />
      <CommandList
        aria-label={label}
        renderEmptyState={() => (
          <div className="cn-properties-empty">{emptyText}</div>
        )}
      >
        {groupOptions(options).map((group) => (
          <CommandGroup
            key={group.heading ?? "all"}
            heading={group.heading}
            aria-label={group.heading ?? label}
          >
            {group.options.map((option) => (
              <CommandItem
                key={option.value}
                id={option.value}
                textValue={option.label}
                data-checked={selected.includes(option.value)}
                isDisabled={option.isDisabled}
                shouldCloseOnSelect={false}
                onAction={() => onSelect(option.value)}
              >
                {option.icon}
                <span className="truncate">{option.label}</span>
                {option.count !== undefined && (
                  <CommandShortcut className="cn-properties-option-count">
                    {option.count}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {isNew && (
          <CommandGroup aria-label="New">
            <CommandItem
              id="__create"
              textValue={createText}
              shouldCloseOnSelect={false}
              onAction={() => {
                onCreate(name)
                setQuery("")
              }}
            >
              <IconPlaceholder
                lucide="PlusIcon"
                tabler="IconPlus"
                hugeicons="PlusSignIcon"
                phosphor="PlusIcon"
                remixicon="RiAddLine"
              />
              <span className="truncate">{createText}</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

function ControlCalendar({ label, value, onSelect }: ControlCalendarProps) {
  const day = value ? toCalendarDate(value) : null
  return (
    <Calendar
      autoFocus
      aria-label={label}
      value={day}
      defaultFocusedValue={day ?? today(getLocalTimeZone())}
      onChange={(next) =>
        onSelect(new Date(next.year, next.month - 1, next.day))
      }
    />
  )
}

function toCalendarDate(day: Date) {
  return new CalendarDate(day.getFullYear(), day.getMonth() + 1, day.getDate())
}

function ControlRangeCalendar({
  label,
  start,
  end,
  onSelect,
}: ControlRangeCalendarProps) {
  return (
    <RangeCalendar
      autoFocus
      aria-label={label}
      value={
        start
          ? { start: toCalendarDate(start), end: toCalendarDate(end ?? start) }
          : null
      }
      defaultFocusedValue={
        start ? toCalendarDate(start) : today(getLocalTimeZone())
      }
      onChange={(next) =>
        onSelect(
          new Date(next.start.year, next.start.month - 1, next.start.day),
          next.end.compare(next.start) === 0
            ? null
            : new Date(next.end.year, next.end.month - 1, next.end.day)
        )
      }
    />
  )
}

function handleNumberKeys(
  event: React.KeyboardEvent<HTMLInputElement>,
  onEscape: () => void
) {
  if (event.key === "Enter") event.currentTarget.blur()
  if (event.key !== "Escape") return
  event.preventDefault()
  event.stopPropagation()
  onEscape()
}

function ControlNumber({
  label,
  value,
  min,
  max,
  step,
  format,
  suffix,
  isInvalid,
  describedBy,
  onValueChange,
  onValueCommit,
  onEscape,
}: ControlNumberProps) {
  return (
    <NumberField
      aria-label={label}
      aria-describedby={describedBy}
      isInvalid={isInvalid}
      value={value ?? Number.NaN}
      minValue={min}
      maxValue={max}
      step={step}
      formatOptions={format}
      className="cn-properties-number-field"
      onChange={(next) => {
        const number = Number.isNaN(next) ? null : next
        onValueChange(number)
        onValueCommit(number)
      }}
    >
      <NumberFieldGroup className="cn-properties-number-group">
        <NumberFieldInput
          placeholder="Empty"
          data-escape="undo"
          className="cn-properties-number-input"
          onKeyDown={(event) => handleNumberKeys(event, onEscape)}
        />
        <InputGroupAddon
          align="inline-end"
          className="cn-properties-number-suffix"
        >
          {suffix && <InputGroupText>{suffix}</InputGroupText>}
        </InputGroupAddon>
        <NumberFieldDecrement align="inline-end" />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  )
}

function ControlSwitch({
  label,
  checked,
  onCheckedChange,
}: ControlToggleProps) {
  return (
    <Switch
      size="sm"
      aria-label={label}
      isSelected={checked}
      onChange={onCheckedChange}
    />
  )
}

function ControlCheckbox({
  label,
  checked,
  onCheckedChange,
}: ControlToggleProps) {
  return (
    <Checkbox
      aria-label={label}
      isSelected={checked}
      onChange={onCheckedChange}
    />
  )
}

function ControlTooltip({ label, children }: ControlTooltipProps) {
  return (
    <TooltipTrigger delay={400}>
      {children}
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

export {
  ControlCalendar,
  ControlCheckbox,
  ControlMenu,
  ControlNumber,
  ControlOptions,
  ControlPopover,
  ControlRangeCalendar,
  ControlSwitch,
  ControlTooltip,
  type ControlMenuGroup,
  type ControlMenuItem,
  type ControlMenuProps,
  type ControlOption,
  type ControlOptionsProps,
  type ControlPopoverProps,
}
