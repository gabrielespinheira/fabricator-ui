"use client"

import * as React from "react"

import {
  isOnboardingLayout,
  splitEmails,
  type OnboardingLayout,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Field, FieldContent, FieldLabel } from "@/registry/bases/base/ui/field"
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
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/base/ui/radio-group"
import { Slider } from "@/registry/bases/base/ui/slider"
import { Switch } from "@/registry/bases/base/ui/switch"
import { toast } from "@/registry/bases/base/ui/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"

// The onboarding block's controls whose API differs between Base UI, Radix and
// React Aria. This is Base UI's; the rest of the block is shared.

/** One of a few, each a card that says what it leads to. */
export function OnboardingChoiceCards({
  labelledBy,
  value,
  options,
  onValueChange,
}: {
  labelledBy: string
  value: string | null
  options: { value: string; content: React.ReactNode }[]
  onValueChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <RadioGroup
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={(next: unknown) => {
        if (typeof next === "string") onValueChange(next)
      }}
      className="gap-(--density-12)"
    >
      {options.map((option) => (
        <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
          <Field orientation="horizontal">
            <FieldContent id={`${id}-${option.value}-label`}>
              {option.content}
            </FieldContent>
            <RadioGroupItem
              value={option.value}
              id={`${id}-${option.value}`}
              aria-labelledby={`${id}-${option.value}-label`}
            />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  )
}

/** Several of a few, each switched on by itself. */
export function OnboardingSwitchCard({
  id,
  checked,
  isBusy,
  onCheckedChange,
  children,
}: {
  id: string
  checked: boolean
  isBusy: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        <FieldContent>{children}</FieldContent>
        <Switch
          id={id}
          checked={checked}
          disabled={isBusy}
          onCheckedChange={onCheckedChange}
        />
      </Field>
    </FieldLabel>
  )
}

export function OnboardingLayoutChoice({
  labelledBy,
  value,
  options,
  onValueChange,
}: {
  labelledBy: string
  value: OnboardingLayout
  options: { value: OnboardingLayout; label: string }[]
  onValueChange: (layout: OnboardingLayout) => void
}) {
  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      size="sm"
      spacing={0}
      className="w-full bg-foreground/[0.05]"
      value={[value]}
      onValueChange={([next]) => {
        if (isOnboardingLayout(next)) onValueChange(next)
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

// A dot on every stop, which Fabricator adds to the slider.
const WITH_STEPS = { showSteps: true }

export function OnboardingSizeSlider({
  label,
  value,
  max,
  valueText,
  onValueChange,
}: {
  label: string
  value: number
  max: number
  valueText: string
  onValueChange: (value: number) => void
}) {
  return (
    <Slider
      aria-label={`${label}: ${valueText}`}
      value={[value]}
      max={max}
      step={1}
      {...WITH_STEPS}
      onValueChange={(next) => {
        const [first] = typeof next === "number" ? [next] : next
        if (first !== undefined) onValueChange(first)
      }}
    />
  )
}

export function OnboardingColorPalette({
  labelledBy,
  value,
  colors,
  onValueChange,
}: {
  labelledBy: string
  value: string
  colors: { value: string; label: string }[]
  onValueChange: (color: string) => void
}) {
  return (
    <ToggleGroup
      spacing={1}
      aria-labelledby={labelledBy}
      value={[value]}
      onValueChange={([next]) => {
        if (typeof next === "string") onValueChange(next)
      }}
    >
      {colors.map((color) => (
        <ToggleGroupItem
          key={color.value}
          value={color.value}
          aria-label={color.label}
          className="w-(--density-36) px-0"
        >
          <span
            className="size-(--density-20) rounded-full"
            style={{ background: color.value }}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

const SEPARATORS = ["Enter", "Tab", ",", ";", " "]

/** One box that takes a paste and turns it into addresses. */
export function OnboardingEmailsField({
  id,
  labelledBy,
  describedBy,
  values,
  isInvalid,
  onValuesChange,
}: {
  id: string
  labelledBy: string
  describedBy: string
  values: string[]
  isInvalid: (email: string) => boolean
  onValuesChange: (emails: string[]) => void
}) {
  const [draft, setDraft] = React.useState("")
  const add = (text: string) => {
    onValuesChange([...new Set([...values, ...splitEmails(text)])])
    setDraft("")
  }

  return (
    <MultiSelect
      items={splitEmails(draft).slice(0, 1)}
      value={values}
      onValueChange={(next: string[]) => {
        onValuesChange(next)
        setDraft("")
      }}
      inputValue={draft}
      onInputValueChange={(next) => setDraft(next)}
      open={draft.trim() !== ""}
      onOpenChange={(isOpen) => {
        if (!isOpen && draft.trim()) add(draft)
      }}
    >
      <MultiSelectTrigger>
        <MultiSelectValue>
          {(email: string) => (
            <span className={isInvalid(email) ? "text-destructive-text" : ""}>
              {email}
            </span>
          )}
        </MultiSelectValue>
        <MultiSelectInput
          id={id}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          autoComplete="off"
          inputMode="email"
          enterKeyHint="done"
          placeholder="Paste or type emails"
          onKeyDown={(event) => {
            if (!SEPARATORS.includes(event.key) || !draft.trim()) return
            if (event.key !== "Tab") event.preventDefault()
            add(draft)
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text")
            if (splitEmails(text).length < 2) return
            event.preventDefault()
            add(`${draft} ${text}`)
          }}
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectEmpty>Keep typing.</MultiSelectEmpty>
        <MultiSelectList>
          {(email: string) => (
            <MultiSelectItem key={email} value={email}>
              Add {email}
            </MultiSelectItem>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}

/** A short report of what just happened. */
export function notifyOnboarding(title: string, description: string) {
  toast.add({ title, description })
}
