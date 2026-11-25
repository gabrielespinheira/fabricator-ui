"use client"

import * as React from "react"

import { ForgotPasswordField } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-field"
import {
  getNewPasswordError,
  getResetFailure,
  type ResetFailure,
  type ResetResult,
} from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
import { Alert, AlertDescription } from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import { FieldGroup } from "@/registry/bases/__base__/ui/field"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export function ForgotPasswordNewStep({
  email,
  onSubmit,
  onCodeFailure,
  onDone,
}: {
  email: string
  onSubmit: (password: string) => Promise<ResetResult>
  /** The code expired while they were choosing. */
  onCodeFailure: (failure: ResetFailure) => void
  onDone: () => void
}) {
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [failure, setFailure] = React.useState<ResetFailure>()
  const [isSaving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // On arrival, and once the field is enabled again after a failure.
  React.useEffect(() => {
    if (!isSaving) inputRef.current?.focus()
  }, [isSaving])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextError = getNewPasswordError(password)
    setError(nextError)
    setFailure(undefined)
    if (nextError) {
      inputRef.current?.focus()
      return
    }
    setSaving(true)
    const result = await onSubmit(password)
    setSaving(false)
    if (result.ok) {
      onDone()
      return
    }
    const nextFailure = getResetFailure("password", result.error)
    if (nextFailure.step === "code") {
      onCodeFailure(nextFailure)
      return
    }
    setFailure(nextFailure)
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* Tells a password manager whose password it is saving. */}
      <input
        hidden
        readOnly
        name="username"
        autoComplete="username"
        value={email}
      />
      <fieldset disabled={isSaving} className="contents">
        <FieldGroup>
          <ForgotPasswordField
            inputRef={inputRef}
            value={password}
            error={error}
            onChange={(value) => {
              setPassword(value)
              if (error) setError(undefined)
            }}
          />
          {failure && (
            <Alert variant="error">
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
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving ? "Updating password…" : "Update password"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
