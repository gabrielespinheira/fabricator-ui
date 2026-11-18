"use client"

import { ForgotPasswordFlow } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-flow"
import { type ResetResult } from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace these with your auth library's password reset calls. Sending a
// code always succeeds, so the page never reveals which emails have an
// account.
async function sendResetCode(): Promise<ResetResult> {
  await wait(800)
  return { ok: true }
}

async function verifyResetCode(
  _email: string,
  code: string
): Promise<ResetResult> {
  await wait(700)
  return code === "000000" ? { ok: false, error: "invalid-code" } : { ok: true }
}

async function resetPassword(): Promise<ResetResult> {
  await wait(800)
  return { ok: true }
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-surface-0 px-(--density-16) py-(--density-40)">
      <main className="flex w-full max-w-96 flex-col gap-(--density-24)">
        <a
          href="/"
          aria-label="Acme home"
          className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconPlaceholder
            lucide="GalleryVerticalEndIcon"
            tabler="IconLayoutRows"
            hugeicons="LayoutBottomIcon"
            phosphor="RowsIcon"
            remixicon="RiGalleryView"
            className="size-5"
          />
        </a>
        <ForgotPasswordFlow
          signInHref="/sign-in"
          onSendCode={sendResetCode}
          onVerifyCode={verifyResetCode}
          onResetPassword={resetPassword}
        />
      </main>
    </div>
  )
}
