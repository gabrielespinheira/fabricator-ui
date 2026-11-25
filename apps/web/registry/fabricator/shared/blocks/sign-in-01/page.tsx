"use client"

import * as React from "react"

import { SignInForm } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-form"
import {
  SignInFrame,
  SignInHeading,
} from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-frame"
import { SignInProviders } from "@/registry/bases/__base__/blocks/sign-in-01/components/sign-in-providers"
import {
  type ProviderResult,
  type SignInMethod,
  type SignInProvider,
  type SignInResult,
  type SignInValues,
} from "@/registry/bases/__base__/blocks/sign-in-01/lib/sign-in-form-model"
import { Button } from "@/registry/bases/__base__/ui/button"

// Sign in. Someone who works in Acme every day gets back to work: one field is
// focused, the way they came last time is marked, and nothing moves when an
// answer is wrong.

// Set a cookie when someone signs in and read it here, so the mark is in the
// first paint.
const LAST_USED: SignInMethod = "google"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Replace with your auth library's email sign-in. To see each answer, use
// unknown@, limited@ or offline@acme.com, or a password under 8 characters.
async function signInWithEmail({
  email,
  password,
}: SignInValues): Promise<SignInResult> {
  await wait(900)
  if (email === "unknown@acme.com") return { ok: false, error: "unknown-email" }
  if (email === "offline@acme.com") return { ok: false, error: "network" }
  if (email === "limited@acme.com") {
    return { ok: false, error: "too-many-attempts" }
  }
  return password.length < 8
    ? { ok: false, error: "wrong-password" }
    : { ok: true }
}

// Replace with your auth library's social sign-in. Here Apple is the window
// someone closes.
async function signInWithProvider(
  provider: SignInProvider
): Promise<ProviderResult> {
  await wait(1600)
  return provider === "apple" ? { ok: false, error: "cancelled" } : { ok: true }
}

export default function SignInPage() {
  const [pending, setPending] = React.useState<SignInMethod>()
  const [isSignedIn, setSignedIn] = React.useState(false)
  const resultRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isSignedIn) resultRef.current?.focus()
  }, [isSignedIn])

  // Back from a provider can restore this page as it was left, still waiting.
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(undefined)
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  const run = async <Result extends { ok: boolean }>(
    method: SignInMethod,
    signIn: () => Promise<Result>
  ) => {
    setPending(method)
    const result = await signIn()
    setPending(undefined)
    // Replace the preview confirmation with your app's post-sign-in route.
    if (result.ok) setSignedIn(true)
    return result
  }

  if (isSignedIn) {
    return (
      <SignInFrame>
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <SignInHeading title="Sign-in complete">
            Your app opens here after successful sign-in.
          </SignInHeading>
        </div>
        <Button variant="outline" onClick={() => setSignedIn(false)}>
          Back to sign in
        </Button>
      </SignInFrame>
    )
  }

  return (
    <SignInFrame>
      <SignInHeading title="Sign in to Acme">
        Welcome back. Use your work account.
      </SignInHeading>
      <SignInForm
        pending={pending}
        forgotPasswordHref="/forgot-password"
        signUpHref="/sign-up"
        onSubmit={(values) => run("email", () => signInWithEmail(values))}
      />
      <SignInProviders
        pending={pending}
        lastUsed={LAST_USED}
        onSelect={(provider) =>
          run(provider, () => signInWithProvider(provider))
        }
      />
    </SignInFrame>
  )
}
