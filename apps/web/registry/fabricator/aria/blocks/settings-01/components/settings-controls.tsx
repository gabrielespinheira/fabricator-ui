"use client"

import * as React from "react"
import { toast } from "sonner"

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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/registry/bases/aria/ui/combobox"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Progress } from "@/registry/bases/aria/ui/progress"
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
import { Slider } from "@/registry/bases/aria/ui/slider"
import { Spinner } from "@/registry/bases/aria/ui/spinner"
import { Switch } from "@/registry/bases/aria/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/aria/ui/toggle-group"

// The settings page's controls whose API differs between Base UI, Radix and
// React Aria. This is React Aria's; the rest of the block is shared.

export type SettingsOption<Value extends string = string> = {
  value: Value
  label: string
  /** Quieter text at the end of a row, such as the time in a city. */
  detail?: string
}

/** A button that can be off, or busy with what it started. */
export function SettingsButton({
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

/** An answer offered inside a sentence. */
export function SettingsSuggestion({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="link"
      onPress={onClick}
      className="h-auto p-0 text-(length:--density-text-12)"
    >
      {children}
    </Button>
  )
}

export type SettingsMenuItem = {
  id: string
  label: string
  icon: React.ReactNode
  separatorBefore?: boolean
  onSelect: () => void
}

/** Rows for a menu that is already open: the header's, or the person's. */
export function SettingsMenuItems({ items }: { items: SettingsMenuItem[] }) {
  return items.map((item) => (
    <React.Fragment key={item.id}>
      {item.separatorBefore && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        <DropdownMenuItem
          id={item.id}
          textValue={item.label}
          onAction={item.onSelect}
        >
          {item.icon}
          {item.label}
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </React.Fragment>
  ))
}

export function SettingsSwitch({
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

/** One of two to four short choices, every label in view. */
export function SettingsChoice<Value extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: Value
  options: SettingsOption<Value>[]
  onValueChange: (value: Value) => void
}) {
  return (
    <ToggleGroup
      aria-label={label}
      size="sm"
      spacing={0}
      className="w-full bg-foreground/[0.05]"
      selectedKeys={[value]}
      onSelectionChange={(selection) => {
        const next = selection.values().next().value
        const option = options.find((candidate) => candidate.value === next)
        if (option && option.value !== value) onValueChange(option.value)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          className="flex-1 font-normal text-foreground"
          key={option.value}
          id={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function SettingsSelect<Value extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
}: {
  id: string
  label: string
  value: Value
  options: SettingsOption<Value>[]
  onValueChange: (value: Value) => void
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(next) => {
        const option = options.find((candidate) => candidate.value === next)
        if (option) onValueChange(option.value)
      }}
      className="w-full"
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent placement="bottom end">
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

/** One of many, found by typing. */
export function SettingsCombobox({
  id,
  label,
  value,
  options,
  emptyLabel,
  onValueChange,
}: {
  id: string
  label: string
  value: string
  options: SettingsOption[]
  emptyLabel: string
  onValueChange: (value: string) => void
}) {
  return (
    <Combobox
      aria-label={label}
      allowsEmptyCollection
      value={value}
      onChange={(next) => {
        if (next !== null) onValueChange(String(next))
      }}
    >
      <ComboboxInput id={id} className="w-full" />
      <ComboboxContent placement="bottom end">
        <ComboboxList
          renderEmptyState={() => <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>}
        >
          {options.map((option) => (
            <ComboboxItem
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">
                {option.detail}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/** The frame of a set of choice cards; each card holds a `SettingsRadio`. */
export function SettingsRadioGroup({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onChange={onValueChange}
      className="gap-(--density-8)"
    >
      {children}
    </RadioGroup>
  )
}

export function SettingsRadio({
  id,
  value,
  isDisabled = false,
}: {
  id: string
  value: string
  isDisabled?: boolean
}) {
  return <RadioGroupItem id={id} value={value} isDisabled={isDisabled} />
}

/** Domains as chips: typed one at a time or pasted as a list. */
export function SettingsDomains({
  id,
  label,
  value,
  draft,
  isInvalid,
  describedBy,
  onValueChange,
  onDraftChange,
  onAdd,
}: {
  id: string
  label: string
  value: string[]
  draft: string
  isInvalid: boolean
  describedBy?: string
  onValueChange: (domains: string[]) => void
  onDraftChange: (draft: string) => void
  onAdd: (text: string) => void
}) {
  return (
    <div {...getEntryHandlers(draft, onAdd)}>
      <MultiSelect
        aria-label={label}
        aria-describedby={describedBy}
        isInvalid={isInvalid}
        menuTrigger="manual"
        value={value}
        onChange={(keys) => onValueChange(keys.map(String))}
        inputValue={draft}
        onInputChange={onDraftChange}
      >
        <MultiSelectTrigger className="[&_[data-slot=multi-select-chip-remove]]:min-h-6 [&_[data-slot=multi-select-chip-remove]]:min-w-6 [&_[data-slot=multi-select-icon]]:hidden">
          <MultiSelectValue />
          <MultiSelectInput
            id={id}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="url"
            enterKeyHint="done"
            placeholder="acme.com"
          />
        </MultiSelectTrigger>
        {/* The chips are read from the options, so each domain is one. */}
        <MultiSelectContent className="hidden">
          <MultiSelectList>
            {value.map((domain) => (
              <MultiSelectItem key={domain} id={domain} textValue={domain}>
                {domain}
              </MultiSelectItem>
            ))}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
    </div>
  )
}

// Enter, a separator or a pasted list adds what was typed. Caught on the way
// down, before the field's own keys.
function getEntryHandlers(draft: string, onAdd: (text: string) => void) {
  return {
    onKeyDownCapture: (event: React.KeyboardEvent) => {
      if (!["Enter", ",", ";", " "].includes(event.key) || !draft.trim()) return
      event.preventDefault()
      event.stopPropagation()
      onAdd(draft)
    },
    onPasteCapture: (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text")
      if (!/[\s,;]/.test(text.trim())) return
      event.preventDefault()
      onAdd(`${draft} ${text}`)
    },
    onBlurCapture: () => onAdd(draft),
  }
}

// A dot on every stop.
const STOPS = { showSteps: true }

/** A level on a few stops, shown as it moves and saved when it lands. */
export function SettingsSlider({
  label,
  value,
  max,
  onValueChange,
  onValueCommit,
}: {
  label: string
  value: number
  max: number
  onValueChange: (value: number) => void
  onValueCommit: (value: number) => void
}) {
  return (
    <Slider
      aria-label={label}
      value={value}
      minValue={0}
      maxValue={max}
      step={1}
      {...STOPS}
      onChange={onValueChange}
      onChangeEnd={onValueCommit}
    />
  )
}

export function SettingsProgress({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return <Progress aria-label={label} value={value} />
}

/** A decision that can't be taken back, or that asks for something first. */
export function SettingsConfirm({
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
  description: React.ReactNode
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

/** A short report, with Undo when it can be undone. */
export function notifySaved(title: string, undo?: () => void) {
  toast(title, undo ? { action: { label: "Undo", onClick: undo } } : {})
}

export function notifyFailed(
  title: string,
  description: string,
  retry: () => void
) {
  toast.error(title, {
    description,
    action: { label: "Retry", onClick: retry },
  })
}
