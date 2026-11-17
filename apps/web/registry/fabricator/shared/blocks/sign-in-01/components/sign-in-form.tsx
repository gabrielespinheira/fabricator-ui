"use client"

import * as React from "react"

import {
  getEmailError,
  getSignInErrors,
  hasSignInErrors,
  SIGN_IN_MESSAGES,
  type SignInErrors,
  type SignInResult,
  type SignInValues,
} from "@/registry/bases/__base__/blocks/sign-in-01/lib/sign-in-form-model"
import { Alert, AlertDescription } from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/__base__/ui/input-group"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type Status = "idle" | "submitting" | "redirecting"

export function SignInForm({
  forgotPasswordHref,
  onSubmit,
  onSignedIn,
}: {
  forgotPasswordHref: string
  onSubmit: (values: SignInValues) => Promise<SignInResult>
  onSignedIn: () => void
}) {
  const [values, setValues] = React.useState<SignInValues>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = React.useState<SignInErrors>({})
  const [formError, setFormError] = React.useState<string>()
  const [status, setStatus] = React.useState<Status>("idle")
  const [isPasswordVisible, setPasswordVisible] = React.useState(false)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)

  const update = (field: keyof SignInValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    // A message stays until the field is fixed, then goes as they type.
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getSignInErrors(values)
    setErrors(nextErrors)
    setFormError(undefined)
    if (hasSignInErrors(nextErrors)) {
      const firstInvalid = nextErrors.email ? emailRef : passwordRef
      firstInvalid.current?.focus()
      return
    }

    setStatus("submitting")
    const result = await onSubmit({ ...values, email: values.email.trim() })
    if (result.ok) {
      setStatus("redirecting")
      onSignedIn()
      return
    }
    setStatus("idle")
    setFormError(SIGN_IN_MESSAGES[result.error])
    passwordRef.current?.select()
  }

  const isBusy = status !== "idle"

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* A disabled fieldset disables every control while signing in. */}
      <fieldset disabled={isBusy} className="contents">
        <FieldGroup>
          {formError && (
            <Alert variant="error">
              <IconPlaceholder
                lucide="CircleAlertIcon"
                tabler="IconAlertCircle"
                hugeicons="AlertCircleIcon"
                phosphor="WarningCircleIcon"
                remixicon="RiErrorWarningLine"
              />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
            <Input
              ref={emailRef}
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ada@acme.com"
              value={values.email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={
                errors.email ? "sign-in-email-error" : undefined
              }
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => {
                // Only a typed address is checked on leaving; an empty field
                // waits for submit.
                if (!values.email) return
                setErrors((current) => ({
                  ...current,
                  email: getEmailError(values.email),
                }))
              }}
            />
            <FieldError id="sign-in-email-error">{errors.email}</FieldError>
          </Field>
          <Field data-invalid={errors.password ? true : undefined}>
            <div className="flex items-center gap-(--density-8)">
              <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
              <a
                href={forgotPasswordHref}
                className="ms-auto rounded-sm text-(length:--density-text-12) text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Forgot password?
              </a>
            </div>
            <InputGroup>
              <InputGroupInput
                ref={passwordRef}
                id="sign-in-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                value={values.password}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={
                  errors.password ? "sign-in-password-error" : undefined
                }
                onChange={(event) => update("password", event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {isPasswordVisible ? (
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
            <FieldError id="sign-in-password-error">
              {errors.password}
            </FieldError>
          </Field>
          <Button type="submit" className="w-full">
            {isBusy && <Spinner data-icon="inline-start" />}
            {status === "idle" && "Sign in"}
            {status === "submitting" && "Signing in…"}
            {status === "redirecting" && "Opening your workspace…"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
