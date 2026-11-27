"use client"

import * as React from "react"

import { SignInPasswordField } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-password-field"
import {
  getEmailError,
  getSignInErrors,
  getSignInFailure,
  hasSignInErrors,
  type SignInErrors,
  type SignInFailure,
  type SignInMethod,
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
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export function SignInForm({
  pending,
  forgotPasswordHref,
  signUpHref,
  onSubmit,
}: {
  /** The method under way; the others wait for it. */
  pending?: SignInMethod
  forgotPasswordHref: string
  signUpHref: string
  onSubmit: (values: SignInValues) => Promise<SignInResult>
}) {
  const [values, setValues] = React.useState<SignInValues>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = React.useState<SignInErrors>({})
  const [failure, setFailure] = React.useState<SignInFailure>()
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)

  // A touch screen would open its keyboard over the page, and a framed page
  // would take the focus from the one around it.
  React.useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (isTouch || window.self !== window.top) return
    emailRef.current?.focus({ preventScroll: true })
  }, [])

  // Runs once the fields are enabled again, so they can take the focus.
  React.useEffect(() => {
    if (!failure) return
    const ref = failure.focus === "email" ? emailRef : passwordRef
    ref.current?.focus()
    ref.current?.select()
  }, [failure])

  const update = (field: keyof SignInValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    // A message stays until the field is fixed, then goes as they type.
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
    if (failure?.place === "email" && field === "email") setFailure(undefined)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getSignInErrors(values)
    setErrors(nextErrors)
    setFailure(undefined)
    if (hasSignInErrors(nextErrors)) {
      const firstInvalid = nextErrors.email ? emailRef : passwordRef
      firstInvalid.current?.focus()
      return
    }
    const result = await onSubmit({ ...values, email: values.email.trim() })
    if (!result.ok) setFailure(getSignInFailure(result.error))
  }

  const isUnknown = failure?.place === "email"
  const isEmailInvalid = isUnknown || errors.email !== undefined

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* A disabled fieldset disables every control while signing in. */}
      <fieldset disabled={pending !== undefined} className="contents">
        {/* Each field keeps a line for its message, so nothing moves. */}
        <FieldGroup className="gap-(--density-8)">
          <Field data-invalid={isEmailInvalid || undefined}>
            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
            <Input
              ref={emailRef}
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="ada@acme.com"
              value={values.email}
              aria-invalid={isEmailInvalid || undefined}
              aria-describedby={
                isEmailInvalid ? "sign-in-email-error" : undefined
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
            <div className="min-h-lh text-(length:--density-text-12)">
              {isEmailInvalid && (
                <FieldError id="sign-in-email-error">
                  {errors.email}
                  {!errors.email && isUnknown && (
                    <>
                      {failure.message}{" "}
                      <a
                        href={signUpHref}
                        className="rounded-(--radius-mark) underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Create an account
                      </a>
                    </>
                  )}
                </FieldError>
              )}
            </div>
          </Field>
          <SignInPasswordField
            inputRef={passwordRef}
            value={values.password}
            error={errors.password}
            forgotPasswordHref={forgotPasswordHref}
            onChange={(value) => update("password", value)}
          />
          {failure?.place === "form" && (
            <Alert variant="error" className="mb-(--density-12)">
              <IconPlaceholder
                lucide="CircleAlertIcon"
                tabler="IconAlertCircle"
                hugeicons="AlertCircleIcon"
                phosphor="WarningCircleIcon"
                remixicon="RiErrorWarningLine"
              />
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full">
            {pending === "email" && <Spinner data-icon="inline-start" />}
            {pending === "email" ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
