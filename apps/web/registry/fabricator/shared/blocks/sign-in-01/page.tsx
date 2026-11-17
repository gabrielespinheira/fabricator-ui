"use client"

import { SignInForm } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-form"
import { SignInProviders } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-providers"
import {
  type SignInResult,
  type SignInValues,
} from "@/registry/bases/__base__/blocks/sign-in-01/lib/sign-in-form-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Replace with your auth library's email sign-in. It resolves with
// { ok: false, error: "invalid-credentials" } when the password is wrong.
async function signIn(values: SignInValues): Promise<SignInResult> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return values.password.length < 8
    ? { ok: false, error: "invalid-credentials" }
    : { ok: true }
}

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-surface-0 px-(--density-16) py-(--density-40)">
      <main className="flex w-full max-w-96 flex-col gap-(--density-24)">
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
              Sign in to Acme
            </h1>
            <p className="text-[15px] text-pretty text-muted-foreground">
              Welcome back. Use your work account to continue.
            </p>
          </div>
        </div>
        <SignInProviders onSelect={() => {}} />
        {/* Space and a caption part the providers from the form; no rule. */}
        <p className="text-center text-(length:--density-text-12) text-muted-foreground">
          or continue with email
        </p>
        <SignInForm
          forgotPasswordHref="/forgot-password"
          onSubmit={signIn}
          // Send people into the app, e.g. router.push("/dashboard").
          onSignedIn={() => {}}
        />
        <p className="text-center text-(length:--density-text-13) text-muted-foreground">
          New to Acme?{" "}
          <a
            href="/sign-up"
            className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create an account
          </a>
        </p>
      </main>
      <footer className="mt-(--density-40)">
        <p className="max-w-80 text-center text-(length:--density-text-12) text-balance text-muted-foreground">
          By continuing, you agree to the{" "}
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
