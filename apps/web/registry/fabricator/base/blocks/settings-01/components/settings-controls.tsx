"use client"

import * as React from "react"

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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/registry/bases/base/ui/combobox"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  InputGroupAddon,
  InputGroupButton,
} from "@/registry/bases/base/ui/input-group"
import {
  MultiSelect,
  MultiSelectInput,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/bases/base/ui/multi-select"
import { Progress } from "@/registry/bases/base/ui/progress"
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
import { Slider } from "@/registry/bases/base/ui/slider"
import { Spinner } from "@/registry/bases/base/ui/spinner"
import { Switch } from "@/registry/bases/base/ui/switch"
import { toast } from "@/registry/bases/base/ui/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"

// The settings page's controls whose API differs between Base UI, Radix and
// React Aria. This is Base UI's; the rest of the block is shared.

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
      onClick={onClick}
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
        <DropdownMenuItem onClick={item.onSelect}>
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
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
    />
  )
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
      value={[value]}
      onValueChange={([next]) => {
        const option = options.find((candidate) => candidate.value === next)
        if (option) onValueChange(option.value)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          className="flex-1 font-normal text-foreground"
          key={option.value}
          value={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function SettingsSelect<Value extends string>({
  id,
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
      items={options}
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next)
        if (option) onValueChange(option.value)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
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
  const selected =
    options.find((option) => option.value === value) ?? options[0] ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next: SettingsOption | null) => {
        if (next) onValueChange(next.value)
      }}
      autoHighlight
    >
      {/* Its own arrow, because the built-in one has no name. */}
      <ComboboxInput id={id} showTrigger={false} className="w-full">
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            aria-label={`Show ${label.toLowerCase()}s`}
            render={<ComboboxTrigger />}
          />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent align="end">
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(option: SettingsOption) => (
            <ComboboxItem key={option.value} value={option}>
              <span className="min-w-0 truncate">{option.label}</span>
              <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">
                {option.detail}
              </span>
            </ComboboxItem>
          )}
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
      onValueChange={(next: unknown) => onValueChange(String(next))}
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
  return <RadioGroupItem id={id} value={value} disabled={isDisabled} />
}

/** Domains as chips: typed one at a time or pasted as a list. */
export function SettingsDomains({
  id,
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
    <MultiSelect<string>
      items={value}
      open={false}
      value={value}
      onValueChange={onValueChange}
      inputValue={draft}
      onInputValueChange={onDraftChange}
    >
      <MultiSelectTrigger
        aria-invalid={isInvalid || undefined}
        className="[&_[data-slot=multi-select-chip-remove]]:min-h-6 [&_[data-slot=multi-select-chip-remove]]:min-w-6 [&_[data-slot=multi-select-icon]]:hidden"
        {...getEntryHandlers(draft, onAdd)}
      >
        <MultiSelectValue />
        <MultiSelectInput
          id={id}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          enterKeyHint="done"
          placeholder="acme.com"
          onBlur={() => onAdd(draft)}
        />
      </MultiSelectTrigger>
    </MultiSelect>
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
  const toNumber = (next: number | readonly number[]) =>
    typeof next === "number" ? next : (next[0] ?? 0)

  return (
    <Slider
      aria-label={label}
      value={[value]}
      min={0}
      max={max}
      step={1}
      {...STOPS}
      onValueChange={(next) => onValueChange(toNumber(next))}
      onValueCommitted={(next) => onValueCommit(toNumber(next))}
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

/** A short report, with Undo when it can be undone. */
export function notifySaved(title: string, undo?: () => void) {
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

export function notifyFailed(
  title: string,
  description: string,
  retry: () => void
) {
  const id = toast.add({
    type: "error",
    title,
    description,
    actionProps: {
      children: "Retry",
      onClick: () => {
        retry()
        toast.close(id)
      },
    },
  })
}
