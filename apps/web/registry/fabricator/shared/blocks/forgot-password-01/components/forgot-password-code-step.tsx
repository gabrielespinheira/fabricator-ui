"use client"

import * as React from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"

import { captionLinkClassName } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-frame"
import { useResetResend } from "@/registry/bases/__base__/blocks/forgot-password-01/hooks/use-reset-resend"
import {
  CODE_LENGTH,
  formatCountdown,
  getCodeError,
  getResetFailure,
  normalizeCode,
  type ResetFailure,
  type ResetResult,
} from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/registry/bases/__base__/ui/input-otp"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

const SLOT_GROUPS = [
  [0, 1, 2],
  [3, 4, 5],
]

export function ForgotPasswordCodeStep({
  email,
  defaultFailure,
  onSendCode,
  onVerifyCode,
  onVerified,
  onChangeEmail,
}: {
  email: string
  /** Why someone was sent back here, such as a code that expired. */
  defaultFailure?: ResetFailure
  onSendCode: () => Promise<ResetResult>
  onVerifyCode: (code: string) => Promise<ResetResult>
  onVerified: (code: string) => void
  onChangeEmail: () => void
}) {
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState(defaultFailure?.message)
  const [isVerifying, setVerifying] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { secondsLeft, isSending, hasResent, resend, skipWait } =
    useResetResend({
      isReady: defaultFailure?.canResendNow ?? false,
      onResend: onSendCode,
    })
  const isBusy = isVerifying || isSending

  // On arrival, and each time the slots are ready for another try.
  React.useEffect(() => {
    if (!isBusy) inputRef.current?.focus()
  }, [isBusy])

  const verify = async (value: string) => {
    if (isBusy) return
    const nextError = getCodeError(value)
    setError(nextError)
    if (nextError) {
      inputRef.current?.focus()
      return
    }
    setVerifying(true)
    const result = await onVerifyCode(value)
    setVerifying(false)
    if (result.ok) {
      onVerified(value)
      return
    }
    const failure = getResetFailure("code", result.error)
    setError(failure.message)
    if (failure.canResendNow) skipWait()
    // A code that couldn't be checked may still be right.
    if (failure.place === "code") setCode("")
  }

  const sendAgain = async () => {
    setError(undefined)
    setCode("")
    const result = await resend()
    if (!result.ok) setError(getResetFailure("code", result.error).message)
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void verify(code)
      }}
    >
      <fieldset disabled={isBusy} className="contents">
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <div className="flex items-center justify-between gap-(--density-8)">
              <FieldLabel htmlFor="reset-code">Code</FieldLabel>
              <span className="text-(length:--density-text-12) leading-none text-muted-foreground tabular-nums">
                {isSending && "Sending…"}
                {!isSending &&
                  secondsLeft > 0 &&
                  `Resend in ${formatCountdown(secondsLeft)}`}
                {!isSending && secondsLeft === 0 && (
                  <button
                    type="button"
                    className={`font-medium text-foreground ${captionLinkClassName}`}
                    onClick={() => void sendAgain()}
                  >
                    Resend code
                  </button>
                )}
              </span>
            </div>
            <InputOTP
              ref={inputRef}
              id="reset-code"
              name="code"
              containerClassName="w-full"
              maxLength={CODE_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              pasteTransformer={normalizeCode}
              autoComplete="one-time-code"
              enterKeyHint="go"
              value={code}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "reset-code-error" : "reset-code-sent"}
              onChange={(value) => {
                setCode(value)
                if (error) setError(undefined)
              }}
              // A full code verifies itself; the button is for keyboards and
              // for a second try.
              onComplete={(value: string) => void verify(value)}
            >
              {SLOT_GROUPS.map((slots, group) => (
                <React.Fragment key={group}>
                  {group > 0 && <InputOTPSeparator />}
                  <InputOTPGroup className="flex-1">
                    {slots.map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-(--density-48) w-0 flex-1 text-(length:--density-text-16)"
                        aria-invalid={error ? true : undefined}
                      />
                    ))}
                  </InputOTPGroup>
                </React.Fragment>
              ))}
            </InputOTP>
            <div className="min-h-lh text-(length:--density-text-12)">
              {error ? (
                <FieldError id="reset-code-error">{error}</FieldError>
              ) : (
                <FieldDescription id="reset-code-sent" role="status">
                  {hasResent ? "New code sent to" : "Sent to"}{" "}
                  <span className="wrap-anywhere text-foreground">{email}</span>
                  {". "}
                  <button
                    type="button"
                    className={`underline ${captionLinkClassName}`}
                    onClick={onChangeEmail}
                  >
                    Change
                  </button>
                </FieldDescription>
              )}
            </div>
          </Field>
          <Button type="submit" className="w-full">
            {isVerifying && <Spinner data-icon="inline-start" />}
            {isVerifying ? "Verifying…" : "Verify code"}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
