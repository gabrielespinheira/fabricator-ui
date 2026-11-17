"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getEmailError,
  getNameError,
  getPasswordChecks,
  getSignUpErrors,
  SIGN_UP_MESSAGES,
  type SignUpErrors,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/__base__/ui/input-group"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const FIELDS = ["name", "email", "password"] as const

export function SignUpForm({
  onSubmit,
  onSignedUp,
}: {
  onSubmit: (values: SignUpValues) => Promise<SignUpResult>
  onSignedUp: (email: string) => void
}) {
  const [values, setValues] = React.useState<SignUpValues>({
    name: "",
    email: "",
    password: "",
  })
  const [errors, setErrors] = React.useState<SignUpErrors>({})
  const [formError, setFormError] = React.useState<string>()
  const [isSubmitting, setSubmitting] = React.useState(false)
  const [isPasswordVisible, setPasswordVisible] = React.useState(false)
  const nameRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const checks = getPasswordChecks(values.password)

  const update = (field: keyof SignUpValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
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
    setFormError(undefined)
    const firstInvalid = FIELDS.find((field) => nextErrors[field])
    if (firstInvalid) {
      const refs = { name: nameRef, email: emailRef, password: passwordRef }
      refs[firstInvalid].current?.focus()
      return
    }

    setSubmitting(true)
    const email = values.email.trim()
    const result = await onSubmit({
      ...values,
      name: values.name.trim(),
      email,
    })
    setSubmitting(false)
    if (result.ok) {
      onSignedUp(email)
      return
    }
    setFormError(SIGN_UP_MESSAGES[result.error])
    if (result.error === "email-taken") emailRef.current?.focus()
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* A disabled fieldset disables every control while the account is created. */}
      <fieldset disabled={isSubmitting} className="contents">
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
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="sign-up-name">Full name</FieldLabel>
            <Input
              ref={nameRef}
              id="sign-up-name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={values.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "sign-up-name-error" : undefined}
              onChange={(event) => update("name", event.target.value)}
              onBlur={() => checkOnBlur("name")}
            />
            <FieldError id="sign-up-name-error">{errors.name}</FieldError>
          </Field>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="sign-up-email">Work email</FieldLabel>
            <Input
              ref={emailRef}
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ada@acme.com"
              value={values.email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={
                errors.email ? "sign-up-email-error" : undefined
              }
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => checkOnBlur("email")}
            />
            <FieldError id="sign-up-email-error">{errors.email}</FieldError>
          </Field>
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                ref={passwordRef}
                id="sign-up-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={values.password}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby="sign-up-password-rules sign-up-password-error"
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
            {/* The rules update as they type, so the password is right the first time. */}
            <ul
              id="sign-up-password-rules"
              aria-label="Password rules"
              className="flex flex-wrap gap-x-(--density-16) gap-y-(--density-4)"
            >
              {checks.map((check) => (
                <li
                  key={check.id}
                  className={cn(
                    "flex items-center gap-(--density-6) text-(length:--density-text-12) transition-colors duration-feedback ease-feedback [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0",
                    check.isMet ? "text-success-text" : "text-muted-foreground"
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
            <FieldError id="sign-up-password-error">
              {errors.password}
            </FieldError>
          </Field>
          <Button type="submit" className="w-full">
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
