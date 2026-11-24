"use client"

import * as React from "react"

import { type ResetResult } from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"

const RESEND_SECONDS = 30

// The wait between two codes, and the sending itself.
export function useResetResend({
  isReady,
  onResend,
}: {
  /** The wait is over from the start: the code sent before has expired. */
  isReady: boolean
  onResend: () => Promise<ResetResult>
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(
    isReady ? 0 : RESEND_SECONDS
  )
  const [isSending, setSending] = React.useState(false)
  const [hasResent, setResent] = React.useState(false)

  React.useEffect(() => {
    if (secondsLeft === 0) return
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const resend = async () => {
    setSending(true)
    const result = await onResend()
    setSending(false)
    if (result.ok) {
      setResent(true)
      setSecondsLeft(RESEND_SECONDS)
    }
    return result
  }

  const skipWait = () => setSecondsLeft(0)

  return { secondsLeft, isSending, hasResent, resend, skipWait }
}
