"use client"

// The shape every base shares. Properties, Kanban and Record View describe
// their popups as data, and this file draws them with the base's own parts, so
// nothing above it depends on a base's trigger or selection API.
import * as React from "react"
import { cn } from "cn"

import { Button } from "@/registry/bases/radix/ui/button"
import { Calendar } from "@/registry/bases/radix/ui/calendar"
import { Checkbox } from "@/registry/bases/radix/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/registry/bases/radix/ui/command"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"
import {
  InputGroupAddon,
  InputGroupText,
} from "@/registry/bases/radix/ui/input-group"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/bases/radix/ui/number-field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/radix/ui/popover"
import { Switch } from "@/registry/bases/radix/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
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
        <DropdownMenuSubTrigger>
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
      <DropdownMenuCheckboxItem
        checked={item.isChecked}
        disabled={item.isDisabled}
        onSelect={(event) => {
          if (item.staysOpen) event.preventDefault()
          item.onSelect()
        }}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
      </DropdownMenuCheckboxItem>
    )
  return (
    <DropdownMenuItem
      variant={item.variant}
      disabled={item.isDisabled}
      onSelect={item.onSelect}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
      {item.shortcut && (
        <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
      )}
    </DropdownMenuItem>
  )
}

function ControlMenuGroups({
  groups,
}: {
  groups: readonly ControlMenuGroup[]
}) {
  return groups
    .filter(({ items }) => items.length > 0)
    .map(({ id, label, items }, index) => (
      <React.Fragment key={id}>
        {index > 0 && <DropdownMenuSeparator />}
        <DropdownMenuGroup>
          {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
          {items.map((item) => (
            <ControlMenuEntry key={item.id} item={item} />
          ))}
        </DropdownMenuGroup>
      </React.Fragment>
    ))
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
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          aria-hidden={point ? true : undefined}
          tabIndex={point ? -1 : undefined}
          variant={variant}
          size={size}
          className={cn(point && hiddenTrigger, className)}
          style={point ? { left: point.x, top: point.y } : undefined}
          data-sortable-ignore=""
        >
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        data-raised={isRaised || undefined}
        className="cn-properties-menu"
        onCloseAutoFocus={point ? (event) => event.preventDefault() : undefined}
      >
        <ControlMenuGroups groups={groups} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Radix hears Escape before the part it is meant for, such as a panel going back. */
function keepForEscape(event: KeyboardEvent) {
  if (event.target instanceof Element && event.target.closest("[data-escape]"))
    event.preventDefault()
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={triggerLabel ?? undefined}
          variant={variant}
          size={size}
          className={className}
          data-sortable-ignore={isDraggable ? undefined : ""}
        >
          {trigger}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-label={label}
        data-layout={layout}
        data-raised={isRaised || undefined}
        className="cn-properties-popover"
        onEscapeKeyDown={keepForEscape}
      >
        {children}
      </PopoverContent>
    </Popover>
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
  return (
    <Command label={label}>
      <CommandInput
        autoFocus
        placeholder={placeholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!isNew && <CommandEmpty>{emptyText}</CommandEmpty>}
        {groupOptions(options).map((group) => (
          <CommandGroup key={group.heading ?? "all"} heading={group.heading}>
            {group.options.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.value}`}
                data-checked={selected.includes(option.value)}
                disabled={option.isDisabled}
                onSelect={() => onSelect(option.value)}
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
          <CommandGroup>
            <CommandItem
              forceMount
              value={`create ${name}`}
              onSelect={() => {
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
              <span className="truncate">Create “{name}”</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

function ControlCalendar({ value, onSelect }: ControlCalendarProps) {
  return (
    <Calendar
      mode="single"
      required
      autoFocus
      selected={value ?? undefined}
      defaultMonth={value ?? undefined}
      onSelect={onSelect}
    />
  )
}

function ControlRangeCalendar({
  start,
  end,
  onSelect,
}: ControlRangeCalendarProps) {
  return (
    <Calendar
      mode="range"
      required
      autoFocus
      selected={{ from: start ?? undefined, to: end ?? undefined }}
      defaultMonth={start ?? undefined}
      onSelect={(next) => {
        if (next.from)
          onSelect(
            next.from,
            next.to && next.to.getTime() !== next.from.getTime()
              ? next.to
              : null
          )
      }}
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
      locale="en-US"
      value={value}
      min={min}
      max={max}
      step={step}
      format={format}
      className="cn-properties-number-field"
      onValueChange={(next) => onValueChange(next)}
      onValueCommitted={(next) => onValueCommit(next)}
    >
      <NumberFieldGroup className="cn-properties-number-group">
        <NumberFieldInput
          aria-label={label}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
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
        <NumberFieldDecrement
          align="inline-end"
          aria-label={`Decrease ${label}`}
        />
        <NumberFieldIncrement aria-label={`Increase ${label}`} />
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
      checked={checked}
      onCheckedChange={onCheckedChange}
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
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next === true)}
    />
  )
}

function ControlTooltip({ label, children }: ControlTooltipProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
