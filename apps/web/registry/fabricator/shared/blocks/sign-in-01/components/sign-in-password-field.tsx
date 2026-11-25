"use client"

import * as React from "react"

import { captionLinkClassName } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-frame"
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

export function SignInPasswordField({
  inputRef,
  value,
  error,
  forgotPasswordHref,
  onChange,
}: {
  inputRef?: React.Ref<HTMLInputElement>
  value: string
  error?: string
  forgotPasswordHref: string
  onChange: (value: string) => void
}) {
  const [isVisible, setVisible] = React.useState(false)
  const [isCapsLockOn, setCapsLockOn] = React.useState(false)

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-center justify-between gap-(--density-8)">
        <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
        <a
          href={forgotPasswordHref}
          className={`inline-flex min-h-6 items-center text-(length:--density-text-12) text-muted-foreground pointer-coarse:min-h-11 ${captionLinkClassName}`}
        >
          Forgot password?
        </a>
      </div>
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          id="sign-in-password"
          name="password"
          type={isVisible ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "sign-in-password-error" : undefined}
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
      <div className="min-h-lh text-(length:--density-text-12)">
        <FieldError id="sign-in-password-error">{error}</FieldError>
      </div>
    </Field>
  )
}
