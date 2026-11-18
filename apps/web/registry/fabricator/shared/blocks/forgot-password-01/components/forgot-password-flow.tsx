"use client"

import * as React from "react"
import { cn } from "cn"
import { REGEXP_ONLY_DIGITS } from "input-otp"

import {
  CODE_LENGTH,
  formatCountdown,
  getCodeError,
  getEmailError,
  getNewPasswordError,
  getPasswordChecks,
  getStepPosition,
  RESET_MESSAGES,
  type ResetResult,
  type ResetStep,
} from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
import { Alert, AlertDescription } from "@/registry/bases/__base__/ui/alert"
import { Button, buttonVariants } from "@/registry/bases/__base__/ui/button"
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/registry/bases/__base__/ui/input-otp"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const RESEND_SECONDS = 30

type FlowActions = {
  onSendCode: (email: string) => Promise<ResetResult>
  onVerifyCode: (email: string, code: string) => Promise<ResetResult>
  onResetPassword: (
    email: string,
    code: string,
    password: string
  ) => Promise<ResetResult>
}

export function ForgotPasswordFlow({
  signInHref,
  ...actions
}: FlowActions & { signInHref: string }) {
  const [step, setStep] = React.useState<ResetStep>("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const position = getStepPosition(step)

  return (
    <div className="flex flex-col gap-(--density-24)">
      {position && (
        <p className="text-center text-(length:--density-text-12) text-muted-foreground tabular-nums">
          Step {position.step} of {position.total}
        </p>
      )}
      {step === "email" && (
        <EmailStep
          defaultEmail={email}
          signInHref={signInHref}
          onSendCode={actions.onSendCode}
          onSent={(sentTo) => {
            setEmail(sentTo)
            setStep("code")
          }}
        />
      )}
      {step === "code" && (
        <CodeStep
          email={email}
          onSendCode={actions.onSendCode}
          onVerifyCode={actions.onVerifyCode}
          onVerified={(verified) => {
            setCode(verified)
            setStep("password")
          }}
          onChangeEmail={() => setStep("email")}
        />
      )}
      {step === "password" && (
        <PasswordStep
          onSubmit={(password) =>
            actions.onResetPassword(email, code, password)
          }
          onDone={() => setStep("done")}
          onBack={() => setStep("code")}
        />
      )}
      {step === "done" && <DoneStep signInHref={signInHref} />}
    </div>
  )
}

function StepHeading({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-(--density-4) text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="text-[15px] text-pretty text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

function FormAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <Alert variant="error">
      <IconPlaceholder
        lucide="CircleAlertIcon"
        tabler="IconAlertCircle"
        hugeicons="AlertCircleIcon"
        phosphor="WarningCircleIcon"
        remixicon="RiErrorWarningLine"
      />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

const textLinkClassName =
  "rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

function EmailStep({
  defaultEmail,
  signInHref,
  onSendCode,
  onSent,
}: {
  defaultEmail: string
  signInHref: string
  onSendCode: FlowActions["onSendCode"]
  onSent: (email: string) => void
}) {
  const [email, setEmail] = React.useState(defaultEmail)
  const [error, setError] = React.useState<string>()
  const [formError, setFormError] = React.useState<string>()
  const [isSending, setSending] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextError = getEmailError(email)
    setError(nextError)
    setFormError(undefined)
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
    setFormError(RESET_MESSAGES[result.error])
  }

  return (
    <>
      <StepHeading title="Reset your password">
        Enter the email you sign in with and we&apos;ll send you a code.
      </StepHeading>
      <form noValidate onSubmit={handleSubmit}>
        <fieldset disabled={isSending} className="contents">
          <FieldGroup>
            <FormAlert message={formError} />
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                ref={inputRef}
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="ada@acme.com"
                // Focused when someone comes back to change the address. On
                // page load it waits, so an embedded page doesn't take focus.
                autoFocus={defaultEmail !== ""}
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
              <FieldError id="reset-email-error">{error}</FieldError>
            </Field>
            <Button type="submit" className="w-full">
              {isSending && <Spinner data-icon="inline-start" />}
              {isSending ? "Sending code…" : "Send code"}
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
      <p className="text-center text-(length:--density-text-13) text-muted-foreground">
        Remembered it?{" "}
        <a href={signInHref} className={textLinkClassName}>
          Back to sign in
        </a>
      </p>
    </>
  )
}

function CodeStep({
  email,
  onSendCode,
  onVerifyCode,
  onVerified,
  onChangeEmail,
}: {
  email: string
  onSendCode: FlowActions["onSendCode"]
  onVerifyCode: FlowActions["onVerifyCode"]
  onVerified: (code: string) => void
  onChangeEmail: () => void
}) {
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [status, setStatus] = React.useState<"idle" | "verifying" | "sending">(
    "idle"
  )
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS)

  React.useEffect(() => {
    if (secondsLeft === 0) return
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const verify = async (value: string) => {
    const nextError = getCodeError(value)
    setError(nextError)
    if (nextError) return
    setStatus("verifying")
    const result = await onVerifyCode(email, value)
    setStatus("idle")
    if (result.ok) {
      onVerified(value)
      return
    }
    setError(RESET_MESSAGES[result.error])
    setCode("")
  }

  const resend = async () => {
    setStatus("sending")
    setError(undefined)
    setCode("")
    const result = await onSendCode(email)
    setStatus("idle")
    if (!result.ok) {
      setError(RESET_MESSAGES[result.error])
      return
    }
    setSecondsLeft(RESEND_SECONDS)
  }

  const isBusy = status !== "idle"

  return (
    <>
      <StepHeading title="Enter the code">
        We sent a {CODE_LENGTH}-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>.
      </StepHeading>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void verify(code)
        }}
      >
        <fieldset disabled={isBusy} className="contents">
          <FieldGroup>
            <Field
              data-invalid={error ? true : undefined}
              className="items-center"
            >
              <FieldLabel htmlFor="reset-code" className="sr-only">
                Verification code
              </FieldLabel>
              <InputOTP
                id="reset-code"
                containerClassName="w-full justify-center"
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                autoComplete="one-time-code"
                autoFocus
                value={code}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "reset-code-error" : undefined}
                onChange={(value) => {
                  setCode(value)
                  if (error) setError(undefined)
                }}
                // A full code verifies itself; the button is for keyboards
                // and pasted codes the person wants to check first.
                onComplete={(value: string) => void verify(value)}
              >
                {[0, 3].map((start) => (
                  <React.Fragment key={start}>
                    {start > 0 && <InputOTPSeparator />}
                    <InputOTPGroup>
                      {[start, start + 1, start + 2].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          aria-invalid={error ? true : undefined}
                        />
                      ))}
                    </InputOTPGroup>
                  </React.Fragment>
                ))}
              </InputOTP>
              <FieldError id="reset-code-error" className="text-center">
                {error}
              </FieldError>
            </Field>
            <Button type="submit" className="w-full">
              {status === "verifying" && <Spinner data-icon="inline-start" />}
              {status === "verifying" ? "Verifying…" : "Verify code"}
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
      <div className="flex flex-col items-center gap-(--density-8) text-(length:--density-text-13) text-muted-foreground">
        <p className="tabular-nums" aria-live="polite">
          Didn&apos;t get it?{" "}
          {status === "sending" ? (
            "Sending a new code…"
          ) : secondsLeft > 0 ? (
            `Send a new code in ${formatCountdown(secondsLeft)}`
          ) : (
            <button
              type="button"
              className={textLinkClassName}
              onClick={resend}
            >
              Send a new code
            </button>
          )}
        </p>
        <button
          type="button"
          className={textLinkClassName}
          onClick={onChangeEmail}
          disabled={isBusy}
        >
          Use a different email
        </button>
      </div>
    </>
  )
}

function PasswordStep({
  onSubmit,
  onDone,
  onBack,
}: {
  onSubmit: (password: string) => Promise<ResetResult>
  onDone: () => void
  onBack: () => void
}) {
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [formError, setFormError] = React.useState<string>()
  const [isVisible, setVisible] = React.useState(false)
  const [isSaving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const checks = getPasswordChecks(password)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextError = getNewPasswordError(password)
    setError(nextError)
    setFormError(undefined)
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
    setFormError(RESET_MESSAGES[result.error])
  }

  return (
    <>
      <StepHeading title="Choose a new password">
        You&apos;ll use it the next time you sign in.
      </StepHeading>
      <form noValidate onSubmit={handleSubmit}>
        <fieldset disabled={isSaving} className="contents">
          <FieldGroup>
            <FormAlert message={formError} />
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  ref={inputRef}
                  id="reset-password"
                  type={isVisible ? "text" : "password"}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  aria-invalid={error ? true : undefined}
                  aria-describedby="reset-password-rules reset-password-error"
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError(undefined)
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
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
              <ul
                id="reset-password-rules"
                aria-label="Password rules"
                className="flex flex-wrap gap-x-(--density-16) gap-y-(--density-4)"
              >
                {checks.map((check) => (
                  <li
                    key={check.id}
                    className={cn(
                      "flex items-center gap-(--density-6) text-(length:--density-text-12) transition-colors duration-feedback ease-feedback [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0",
                      check.isMet
                        ? "text-success-text"
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
              <FieldError id="reset-password-error">{error}</FieldError>
            </Field>
            <Button type="submit" className="w-full">
              {isSaving && <Spinner data-icon="inline-start" />}
              {isSaving ? "Updating password…" : "Update password"}
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
      <p className="text-center text-(length:--density-text-13) text-muted-foreground">
        <button
          type="button"
          className={textLinkClassName}
          onClick={onBack}
          disabled={isSaving}
        >
          Back
        </button>
      </p>
    </>
  )
}

function DoneStep({ signInHref }: { signInHref: string }) {
  return (
    <>
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-surface-1 text-success dark:bg-success-surface-3 [&_svg]:size-6">
        <IconPlaceholder
          lucide="CircleCheckIcon"
          tabler="IconCircleCheck"
          hugeicons="CheckmarkCircle02Icon"
          phosphor="CheckCircleIcon"
          remixicon="RiCheckboxCircleLine"
        />
      </div>
      <StepHeading title="Password updated">
        You&apos;re signed out on other devices. Sign in with your new password.
      </StepHeading>
      <a
        href={signInHref}
        data-slot="button"
        className={cn(buttonVariants(), "w-full")}
      >
        Back to sign in
      </a>
    </>
  )
}
