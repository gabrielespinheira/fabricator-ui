"use client"

import * as React from "react"

import { SignUpPasswordField } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-password-field"
import {
  getEmailError,
  getNameError,
  getSignUpErrors,
  getSignUpFailure,
  type SignUpErrors,
  type SignUpFailure,
  type SignUpMethod,
  type SignUpResult,
  type SignUpValues,
} from "@/registry/bases/__base__/blocks/sign-up-01/lib/sign-up-form-model"
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

const FIELDS = ["name", "email", "password"] as const

const EMPTY: SignUpValues = { name: "", email: "", password: "" }

export function SignUpForm({
  defaultValues,
  pending,
  signInHref,
  onSubmit,
}: {
  /** What was sent, when someone comes back to change the address. */
  defaultValues?: SignUpValues
  /** The method under way; the others wait for it. */
  pending?: SignUpMethod
  signInHref: string
  onSubmit: (values: SignUpValues) => Promise<SignUpResult>
}) {
  const [values, setValues] = React.useState(defaultValues ?? EMPTY)
  const [errors, setErrors] = React.useState<SignUpErrors>({})
  const [failure, setFailure] = React.useState<SignUpFailure>()
  const nameRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const isReturning = defaultValues !== undefined

  // A touch screen would open its keyboard over the page, and a framed page
  // would take the focus from the one around it. Coming back to change the
  // address, the keyboard is what they asked for.
  React.useEffect(() => {
    if (isReturning) {
      emailRef.current?.focus()
      emailRef.current?.select()
      return
    }
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (isTouch || window.self !== window.top) return
    nameRef.current?.focus({ preventScroll: true })
  }, [isReturning])

  // Runs once the fields are enabled again, so they can take the focus.
  React.useEffect(() => {
    if (!failure) return
    const ref = failure.place === "email" ? emailRef : passwordRef
    ref.current?.focus()
    ref.current?.select()
  }, [failure])

  const update = (field: keyof SignUpValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
    if (failure?.place === "email" && field === "email") setFailure(undefined)
  }

  // Checks a field once the person leaves it with something typed.
  const checkOnBlur = (field: "name" | "email") => {
    if (!values[field]) return
    const getError = field === "name" ? getNameError : getEmailError
    setErrors((current) => ({ ...current, [field]: getError(values[field]) }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getSignUpErrors(values)
    setErrors(nextErrors)
    setFailure(undefined)
    const firstInvalid = FIELDS.find((field) => nextErrors[field])
    if (firstInvalid) {
      const refs = { name: nameRef, email: emailRef, password: passwordRef }
      refs[firstInvalid].current?.focus()
      return
    }
    const result = await onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    })
    if (!result.ok) setFailure(getSignUpFailure(result.error))
  }

  const isTaken = failure?.place === "email"
  const isEmailInvalid = isTaken || errors.email !== undefined

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* A disabled fieldset disables every control while signing up. */}
      <fieldset disabled={pending !== undefined} className="contents">
        {/* Each field keeps a line for its message, so nothing moves. */}
        <FieldGroup className="gap-(--density-8)">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="sign-up-name">Full name</FieldLabel>
            <Input
              ref={nameRef}
              id="sign-up-name"
              name="name"
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Ada Lovelace"
              value={values.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "sign-up-name-error" : undefined}
              onChange={(event) => update("name", event.target.value)}
              onBlur={() => checkOnBlur("name")}
            />
            <div className="min-h-lh text-(length:--density-text-12)">
              <FieldError id="sign-up-name-error">{errors.name}</FieldError>
            </div>
          </Field>
          <Field data-invalid={isEmailInvalid || undefined}>
            <FieldLabel htmlFor="sign-up-email">Work email</FieldLabel>
            <Input
              ref={emailRef}
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="ada@acme.com"
              value={values.email}
              aria-invalid={isEmailInvalid || undefined}
              aria-describedby={
                isEmailInvalid ? "sign-up-email-error" : undefined
              }
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => checkOnBlur("email")}
            />
            <div className="min-h-lh text-(length:--density-text-12)">
              {isEmailInvalid && (
                <FieldError id="sign-up-email-error">
                  {errors.email}
                  {!errors.email && isTaken && (
                    <>
                      {failure.message}{" "}
                      <a
                        href={signInHref}
                        className="rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Sign in
                      </a>
                    </>
                  )}
                </FieldError>
              )}
            </div>
          </Field>
          <SignUpPasswordField
            inputRef={passwordRef}
            value={values.password}
            error={errors.password}
            onChange={(value) => update("password", value)}
          />
          {failure?.place === "form" && (
            <Alert variant="error" className="mt-(--density-12)">
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
          <Button type="submit" className="mt-(--density-16) w-full">
            {pending === "email" && <Spinner data-icon="inline-start" />}
            {pending === "email" ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
