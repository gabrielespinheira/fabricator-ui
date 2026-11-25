"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  isOnboardingLayout,
  splitEmails,
  type OnboardingLayout,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Field, FieldContent } from "@/registry/bases/aria/ui/field"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
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
import { Slider } from "@/registry/bases/aria/ui/slider"
import { Switch } from "@/registry/bases/aria/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/aria/ui/toggle-group"

// The onboarding block's controls whose API differs between Base UI, Radix and
// React Aria. This is React Aria's; the rest of the block is shared.

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
      onChange={onValueChange}
      className="gap-(--density-12)"
    >
      {options.map((option) => (
        <RadioGroupItem
          key={option.value}
          value={option.value}
          aria-labelledby={`${id}-${option.value}`}
          render={({ className, children, ...labelProps }) => (
            <label
              {...labelProps}
              data-slot="field-label"
              className="cn-field-label cn-field-label-aria group/field-label peer/field-label flex w-full flex-col"
            >
              <Field orientation="horizontal">
                <FieldContent id={`${id}-${option.value}`}>
                  {option.content}
                </FieldContent>
                <span
                  className={className}
                  data-slot="radio-group-item"
                  data-selected={value === option.value || undefined}
                >
                  {children}
                </span>
              </Field>
            </label>
          )}
        />
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
    <Switch
      id={id}
      aria-labelledby={`${id}-label`}
      isSelected={checked}
      isDisabled={isBusy}
      onChange={onCheckedChange}
      render={({ className, children: control, ...labelProps }) => (
        <label
          {...labelProps}
          data-slot="field-label"
          className="cn-field-label cn-field-label-aria group/field-label peer/field-label flex w-full flex-col"
        >
          <Field orientation="horizontal">
            <FieldContent id={`${id}-label`}>{children}</FieldContent>
            <span
              className={className}
              data-slot="switch"
              data-selected={checked || undefined}
              data-disabled={isBusy || undefined}
            >
              {control}
            </span>
          </Field>
        </label>
      )}
    />
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
      selectedKeys={[value]}
      onSelectionChange={(selection) => {
        const next = selection.values().next().value
        if (isOnboardingLayout(next)) onValueChange(next)
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
      value={value}
      maxValue={max}
      step={1}
      {...WITH_STEPS}
      onChange={onValueChange}
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
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [next] = keys
        if (typeof next === "string") onValueChange(next)
      }}
    >
      {colors.map((color) => (
        <ToggleGroupItem
          key={color.value}
          id={color.value}
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

  // React Aria shows a chip for what its list holds, so the list holds both.
  const items = [...new Set([...values, ...splitEmails(draft).slice(0, 1)])]

  return (
    <MultiSelect
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      defaultFilter={() => true}
      value={values}
      onChange={(keys) => {
        onValuesChange(keys.map(String))
        setDraft("")
      }}
      inputValue={draft}
      onInputChange={setDraft}
      onOpenChange={(isOpen) => {
        if (!isOpen && draft.trim()) add(draft)
      }}
    >
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput
          id={id}
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
        <MultiSelectList
          renderEmptyState={() => (
            <MultiSelectEmpty>Keep typing.</MultiSelectEmpty>
          )}
        >
          {items.map((email) => (
            <MultiSelectItem key={email} id={email} textValue={email}>
              {values.includes(email) ? email : `Add ${email}`}
            </MultiSelectItem>
          ))}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}

/** A short report of what just happened. */
export function notifyOnboarding(title: string, description: string) {
  toast(title, { description })
}
