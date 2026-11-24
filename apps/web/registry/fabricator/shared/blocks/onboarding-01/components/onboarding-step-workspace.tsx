"use client"

import * as React from "react"

import { OnboardingColorPalette } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import { OnboardingMark } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-mark"
import {
  getAddressState,
  ONBOARDING_COLORS,
  toAddress,
  type OnboardingAnswers,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { ColorPickerPopover } from "@/registry/bases/__base__/ui/color-picker"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/bases/__base__/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** The name, the color and the address, all filled in from the email. */
export function OnboardingStepWorkspace({
  answers,
  hasTried,
  onChange,
}: {
  answers: OnboardingAnswers
  /** A first try to continue shows what is missing. */
  hasTried: boolean
  onChange: (answers: OnboardingAnswers) => void
}) {
  const id = React.useId()
  const [isAddressOwn, setAddressOwn] = React.useState(
    answers.address !== toAddress(answers.name)
  )
  const state = getAddressState(answers.address)
  const isNameMissing = hasTried && answers.name.trim() === ""
  const isAddressShown = state.status === "taken" || hasTried

  return (
    <FieldGroup>
      <Field data-invalid={isNameMissing || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${id}-name`}
            autoComplete="organization"
            enterKeyHint="next"
            placeholder="Acme"
            value={answers.name}
            aria-invalid={isNameMissing || undefined}
            aria-describedby={isNameMissing ? `${id}-name-error` : undefined}
            onChange={(event) => {
              const name = event.target.value
              onChange({
                ...answers,
                name,
                ...(!isAddressOwn && { address: toAddress(name) }),
              })
            }}
          />
          <InputGroupAddon className="ps-(--density-4)">
            <OnboardingMark
              name={answers.name || "A"}
              color={answers.color}
              className="size-(--density-24) rounded-md text-(length:--density-text-12)"
            />
          </InputGroupAddon>
        </InputGroup>
        {isNameMissing ? (
          <FieldError id={`${id}-name-error`}>Name the workspace.</FieldError>
        ) : (
          <FieldDescription>From your email, ada@acme.com.</FieldDescription>
        )}
      </Field>
      <Field>
        <FieldTitle id={`${id}-color`}>Color</FieldTitle>
        <span className="flex flex-wrap items-center gap-(--density-8)">
          <OnboardingColorPalette
            labelledBy={`${id}-color`}
            value={answers.color}
            colors={ONBOARDING_COLORS}
            onValueChange={(color) => onChange({ ...answers, color })}
          />
          <ColorPickerPopover
            triggerLabel="Custom"
            triggerLabelPosition="right"
            triggerShowValue={false}
            value={answers.color}
            swatches={ONBOARDING_COLORS.map(({ value, label }) => ({
              color: value,
              label,
            }))}
            onValueChange={(_text, color) =>
              onChange({ ...answers, color: color.hex })
            }
          />
        </span>
      </Field>
      <Field
        data-invalid={(isAddressShown && state.status !== "free") || undefined}
      >
        <FieldLabel htmlFor={`${id}-address`}>Address</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${id}-address`}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            value={answers.address}
            aria-invalid={
              (isAddressShown && state.status !== "free") || undefined
            }
            aria-describedby={`${id}-address-help`}
            onChange={(event) => {
              setAddressOwn(true)
              onChange({ ...answers, address: toAddress(event.target.value) })
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.example.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        {isAddressShown && state.status !== "free" ? (
          <FieldError
            id={`${id}-address-help`}
            className="flex flex-wrap items-center justify-between gap-(--density-8)"
          >
            {state.status === "taken"
              ? `${answers.address} is taken.`
              : state.message}
            {state.status === "taken" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddressOwn(true)
                  onChange({ ...answers, address: state.suggestion })
                }}
              >
                Use {state.suggestion}
              </Button>
            )}
          </FieldError>
        ) : (
          <FieldDescription
            id={`${id}-address-help`}
            className="flex items-center gap-(--density-6)"
          >
            {state.status === "free" && (
              <IconPlaceholder
                lucide="CircleCheckIcon"
                tabler="IconCircleCheck"
                hugeicons="CheckmarkCircle02Icon"
                phosphor="CheckCircleIcon"
                remixicon="RiCheckboxCircleLine"
                className="size-(--density-icon-14) shrink-0 text-success"
              />
            )}
            {state.status === "free"
              ? "Free to use. You can change it later."
              : state.message}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  )
}
