"use client"

import * as React from "react"

import { Button } from "@/registry/bases/__base__/ui/button"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const RESEND_SECONDS = 30

// Shown after the account exists: the link in the email confirms it.
export function SignUpCheckEmail({
  email,
  onResend,
  onChangeEmail,
}: {
  email: string
  onResend: () => Promise<void>
  onChangeEmail: () => void
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS)
  const [isSending, setSending] = React.useState(false)

  React.useEffect(() => {
    if (secondsLeft === 0) return
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const resend = async () => {
    setSending(true)
    await onResend()
    setSending(false)
    setSecondsLeft(RESEND_SECONDS)
  }

  const canResend = secondsLeft === 0 && !isSending

  return (
    <div className="flex flex-col items-center gap-(--density-24) text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-success-surface-1 text-success dark:bg-success-surface-3 [&_svg]:size-6">
        <IconPlaceholder
          lucide="MailCheckIcon"
          tabler="IconMailCheck"
          hugeicons="MailValidation01Icon"
          phosphor="EnvelopeSimpleOpenIcon"
          remixicon="RiMailCheckLine"
        />
      </div>
      <div className="flex flex-col gap-(--density-4)">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Check your email
        </h1>
        <p className="text-[15px] text-pretty text-muted-foreground">
          We sent a link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Open it
          to confirm your account. It expires in 24 hours.
        </p>
      </div>
      <fieldset
        disabled={!canResend}
        className="flex w-full flex-col items-center gap-(--density-8)"
      >
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={canResend ? resend : undefined}
        >
          {isSending && <Spinner data-icon="inline-start" />}
          {isSending
            ? "Sending…"
            : secondsLeft > 0
              ? `Resend email in 0:${String(secondsLeft).padStart(2, "0")}`
              : "Resend email"}
        </Button>
      </fieldset>
      <p className="text-(length:--density-text-13) text-muted-foreground">
        Wrong address?{" "}
        <button
          type="button"
          onClick={onChangeEmail}
          className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Use a different email
        </button>
      </p>
    </div>
  )
}
