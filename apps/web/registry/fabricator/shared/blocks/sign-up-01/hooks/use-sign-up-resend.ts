"use client"

import * as React from "react"

const RESEND_SECONDS = 30

// The wait between two emails, and the sending itself.
export function useSignUpResend(onResend: () => Promise<void>) {
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS)
  const [isSending, setSending] = React.useState(false)
  const [hasResent, setResent] = React.useState(false)

  React.useEffect(() => {
    if (secondsLeft === 0) return
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const resend = async () => {
    setSending(true)
    await onResend()
    setSending(false)
    setResent(true)
    setSecondsLeft(RESEND_SECONDS)
  }

  return { secondsLeft, isSending, hasResent, resend }
}
