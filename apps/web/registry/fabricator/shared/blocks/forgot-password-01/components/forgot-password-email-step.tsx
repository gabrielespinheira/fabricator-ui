"use client"

import * as React from "react"

import {
  getEmailError,
  getResetFailure,
  type ResetFailure,
  type ResetResult,
} from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
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

export function ForgotPasswordEmailStep({
  defaultEmail,
  onSendCode,
  onSent,
}: {
  defaultEmail: string
  onSendCode: (email: string) => Promise<ResetResult>
  onSent: (email: string) => void
}) {
  const [email, setEmail] = React.useState(defaultEmail)
  const [error, setError] = React.useState<string>()
  const [failure, setFailure] = React.useState<ResetFailure>()
  const [isSending, setSending] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isReturning = defaultEmail !== ""

  // A touch screen would open its keyboard over the page, and a framed page
  // would take the focus from the one around it. Coming back to change the
  // address, the keyboard is what they asked for.
  React.useEffect(() => {
    if (isReturning) {
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (isTouch || window.self !== window.top) return
    inputRef.current?.focus({ preventScroll: true })
  }, [isReturning])

  // Runs once the field is enabled again, so it can take the focus.
  React.useEffect(() => {
    if (failure) inputRef.current?.focus()
  }, [failure])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextError = getEmailError(email)
    setError(nextError)
    setFailure(undefined)
    if (nextError) {
      inputRef.current?.focus()
      return
    }
    setSending(true)
    const result = await onSendCode(email.trim())
    setSending(false)
    if (result.ok) {
      onSent(email.trim())
      return
    }
    setFailure(getResetFailure("email", result.error))
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* A disabled fieldset disables every control while sending. */}
      <fieldset disabled={isSending} className="contents">
        {/* The field keeps a line for its message, so nothing moves. */}
        <FieldGroup className="gap-(--density-8)">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              ref={inputRef}
              id="reset-email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              placeholder="ada@acme.com"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "reset-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError(undefined)
              }}
              onBlur={() => {
                if (email) setError(getEmailError(email))
              }}
            />
            <div className="min-h-lh text-(length:--density-text-12)">
              <FieldError id="reset-email-error">{error}</FieldError>
            </div>
          </Field>
          {failure && (
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
            {isSending && <Spinner data-icon="inline-start" />}
            {isSending ? "Sending code…" : "Send code"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
