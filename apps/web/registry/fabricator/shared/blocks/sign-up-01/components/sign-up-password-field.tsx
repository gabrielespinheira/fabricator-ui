"use client"

import * as React from "react"
import { cn } from "cn"

import { getPasswordChecks } from "@/registry/bases/__base__/blocks/sign-up-01/lib/sign-up-form-model"
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/registry/bases/__base__/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export function SignUpPasswordField({
  inputRef,
  value,
  error,
  onChange,
}: {
  inputRef?: React.Ref<HTMLInputElement>
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const [isVisible, setVisible] = React.useState(false)
  const [isCapsLockOn, setCapsLockOn] = React.useState(false)

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          id="sign-up-password"
          name="password"
          type={isVisible ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? "sign-up-password-rules sign-up-password-error"
              : "sign-up-password-rules"
          }
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) =>
            setCapsLockOn(event.getModifierState("CapsLock"))
          }
          onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLockOn(false)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText
            role="status"
            className="text-(length:--density-text-12)"
          >
            {isCapsLockOn && "Caps Lock is on"}
          </InputGroupText>
          {/* The overlay gives a thumb the field's full height. */}
          <InputGroupButton
            size="icon-xs"
            className="relative after:absolute after:-inset-(--density-6)"
            aria-label={isVisible ? "Hide password" : "Show password"}
            onClick={() => setVisible((visible) => !visible)}
          >
            {isVisible ? (
              <IconPlaceholder
                lucide="EyeOffIcon"
                tabler="IconEyeOff"
                hugeicons="ViewOffIcon"
                phosphor="EyeSlashIcon"
                remixicon="RiEyeOffLine"
              />
            ) : (
              <IconPlaceholder
                lucide="EyeIcon"
                tabler="IconEye"
                hugeicons="ViewIcon"
                phosphor="EyeIcon"
                remixicon="RiEyeLine"
              />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {/* Always here, so nothing moves when a rule is met or missed. */}
      <ul
        id="sign-up-password-rules"
        aria-label="Password rules"
        className="flex min-h-lh flex-wrap gap-x-(--density-16) gap-y-(--density-4) text-(length:--density-text-12)"
      >
        {getPasswordChecks(value).map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-center gap-(--density-6) transition-colors duration-feedback ease-feedback [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0",
              check.isMet
                ? "text-success-text"
                : error
                  ? "text-destructive-text"
                  : "text-muted-foreground"
            )}
          >
            {check.isMet ? (
              <IconPlaceholder
                lucide="CircleCheckIcon"
                tabler="IconCircleCheck"
                hugeicons="CheckmarkCircle02Icon"
                phosphor="CheckCircleIcon"
                remixicon="RiCheckboxCircleLine"
              />
            ) : error ? (
              <IconPlaceholder
                lucide="CircleAlertIcon"
                tabler="IconAlertCircle"
                hugeicons="AlertCircleIcon"
                phosphor="WarningCircleIcon"
                remixicon="RiErrorWarningLine"
              />
            ) : (
              <IconPlaceholder
                lucide="CircleIcon"
                tabler="IconCircle"
                hugeicons="CircleIcon"
                phosphor="CircleIcon"
                remixicon="RiCheckboxBlankCircleLine"
              />
            )}
            <span>
              {check.label}
              <span className="sr-only">
                {check.isMet ? ", done" : ", not yet"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {/* Seen as the rules above turning red. */}
      <FieldError id="sign-up-password-error" className="sr-only">
        {error}
      </FieldError>
    </Field>
  )
}
