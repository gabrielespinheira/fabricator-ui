"use client"

import * as React from "react"

import { SignUpCheckEmail } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-check-email"
import { SignUpForm } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-form"
import {
  SignUpFrame,
  SignUpHeading,
} from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-frame"
import { SignUpProviders } from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-providers"
import {
  type ProviderResult,
  type SignUpMethod,
  type SignUpProvider,
  type SignUpResult,
  type SignUpValues,
} from "@/registry/bases/__base__/blocks/sign-up-01/lib/sign-up-form-model"

// Sign up. Someone who wants to try Acme gets an account with three answers or
// one button, then confirms the address from their inbox.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace with your auth library's sign-up. To see each answer, use
// taken@acme.com or offline@acme.com.
async function signUpWithEmail({ email }: SignUpValues): Promise<SignUpResult> {
  await wait(900)
  if (email === "taken@acme.com") return { ok: false, error: "email-taken" }
  if (email === "offline@acme.com") return { ok: false, error: "network" }
  return { ok: true }
}

// Replace with your auth library's social sign-up. Here Apple is the window
// someone closes.
async function signUpWithProvider(
  provider: SignUpProvider
): Promise<ProviderResult> {
  await wait(1600)
  return provider === "apple" ? { ok: false, error: "cancelled" } : { ok: true }
}

// Replace with your auth library's "send verification email".
async function sendVerification() {
  await wait(700)
}

// Replace with your auth library's "has this address been confirmed". Open the
// app when it has, e.g. router.push("/welcome"). Here the link is never opened.
async function checkVerification() {
  await wait(700)
  return false
}

export default function SignUpPage() {
  const [pending, setPending] = React.useState<SignUpMethod>()
  const [submitted, setSubmitted] = React.useState<SignUpValues>()
  const [isSent, setSent] = React.useState(false)

  // Back from a provider can restore this page as it was left, still waiting.
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(undefined)
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  const submit = async (values: SignUpValues) => {
    setPending("email")
    const result = await signUpWithEmail(values)
    setPending(undefined)
    if (result.ok) {
      setSubmitted(values)
      setSent(true)
    }
    return result
  }

  // A success stays pending until the provider's page opens.
  const selectProvider = async (provider: SignUpProvider) => {
    setPending(provider)
    const result = await signUpWithProvider(provider)
    if (!result.ok) setPending(undefined)
    return result
  }

  if (isSent && submitted) {
    return (
      <SignUpFrame>
        <SignUpCheckEmail
          email={submitted.email}
          onResend={sendVerification}
          onContinue={checkVerification}
          onChangeEmail={() => setSent(false)}
        />
      </SignUpFrame>
    )
  }

  return (
    <SignUpFrame>
      <SignUpHeading title="Create your Acme account">
        Free for 14 days. No card needed.
      </SignUpHeading>
      <SignUpForm
        defaultValues={submitted}
        pending={pending}
        signInHref="/sign-in"
        onSubmit={submit}
      />
      <SignUpProviders pending={pending} onSelect={selectProvider} />
      <p className="text-(length:--density-text-12) text-balance text-muted-foreground">
        By continuing you agree to the{" "}
        <a
          href="/terms"
          className="rounded-(--radius-mark) underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Terms
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="rounded-(--radius-mark) underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Privacy Policy
        </a>
        .
      </p>
    </SignUpFrame>
  )
}
