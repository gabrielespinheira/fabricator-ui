"use client"

import * as React from "react"

import { SignUpCheckEmail } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-check-email"
import { SignUpForm } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-form"
import { SignUpProviders } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-providers"
import {
  type SignUpResult,
  type SignUpValues,
} from "@/registry/bases/__base__/blocks/sign-up-01/lib/sign-up-form-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace with your auth library's sign-up. It resolves with
// { ok: false, error: "email-taken" } when the address has an account.
async function signUp(values: SignUpValues): Promise<SignUpResult> {
  await wait(900)
  return values.email === "taken@acme.com"
    ? { ok: false, error: "email-taken" }
    : { ok: true }
}

// Replace with your auth library's "send verification email".
async function resendVerification() {
  await wait(700)
}

export default function SignUpPage() {
  const [sentTo, setSentTo] = React.useState<string>()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-surface-0 px-(--density-16) py-(--density-40)">
      <main className="flex w-full max-w-96 flex-col gap-(--density-24)">
        {sentTo ? (
          <SignUpCheckEmail
            email={sentTo}
            onResend={resendVerification}
            onChangeEmail={() => setSentTo(undefined)}
          />
        ) : (
          <>
            <div className="flex flex-col items-center gap-(--density-16) text-center">
              <a
                href="/"
                aria-label="Acme home"
                className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div className="flex flex-col gap-(--density-4)">
                <h1 className="text-2xl font-semibold tracking-tight text-balance">
                  Create your Acme account
                </h1>
                <p className="text-[15px] text-pretty text-muted-foreground">
                  Free for 14 days. No card needed.
                </p>
              </div>
            </div>
            <SignUpProviders onSelect={() => {}} />
            {/* Space and a caption part the providers from the form; no rule. */}
            <p className="text-center text-(length:--density-text-12) text-muted-foreground">
              or sign up with email
            </p>
            <SignUpForm onSubmit={signUp} onSignedUp={setSentTo} />
            <p className="text-center text-(length:--density-text-13) text-muted-foreground">
              Already have an account?{" "}
              <a
                href="/sign-in"
                className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign in
              </a>
            </p>
          </>
        )}
      </main>
      <footer className="mt-(--density-40)">
        <p className="max-w-80 text-center text-(length:--density-text-12) text-balance text-muted-foreground">
          By creating an account, you agree to the{" "}
          <a
            href="/terms"
            className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
