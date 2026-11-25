"use client"

import { ForgotPasswordFlow } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-flow"
import { type ResetResult } from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"

// Reset a password. Someone locked out gets back in with three short steps
// that keep their place: an email, a code that submits itself, a new password.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace these with your auth library's password reset calls. Sending a code
// succeeds for any address, so the page never reveals which emails have an
// account. To see each answer, use offline@acme.com, the code 000000 (wrong)
// or 111111 (expired), or a new password of "expired-1".
async function sendResetCode(email: string): Promise<ResetResult> {
  await wait(800)
  return email === "offline@acme.com"
    ? { ok: false, error: "network" }
    : { ok: true }
}

async function verifyResetCode(
  _email: string,
  code: string
): Promise<ResetResult> {
  await wait(700)
  if (code === "000000") return { ok: false, error: "invalid-code" }
  if (code === "111111") return { ok: false, error: "expired-code" }
  return { ok: true }
}

async function resetPassword(
  _email: string,
  _code: string,
  password: string
): Promise<ResetResult> {
  await wait(800)
  return password === "expired-1"
    ? { ok: false, error: "expired-code" }
    : { ok: true }
}

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordFlow
      signInHref="/sign-in"
      onSendCode={sendResetCode}
      onVerifyCode={verifyResetCode}
      onResetPassword={resetPassword}
    />
  )
}
