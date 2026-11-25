export type SignInValues = {
  email: string
  password: string
}

export type SignInErrors = Partial<Record<keyof SignInValues, string>>

export type SignInProvider = "google" | "apple"

export type SignInMethod = SignInProvider | "email"

export type SignInError =
  | "wrong-password"
  | "unknown-email"
  | "too-many-attempts"
  | "network"

export type SignInResult = { ok: true } | { ok: false; error: SignInError }

export type ProviderError = "cancelled" | "network"

export type ProviderResult = { ok: true } | { ok: false; error: ProviderError }

/** Where a refusal is said, and the field people go back to. */
export type SignInFailure = {
  place: "email" | "form"
  message: string
  focus: keyof SignInValues
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PROVIDER_NAMES: Record<SignInProvider, string> = {
  google: "Google",
  apple: "Apple",
}

export function getEmailError(email: string) {
  const value = email.trim()
  if (!value) return "Enter your email address."
  if (!EMAIL.test(value)) return "Enter an email address like ada@acme.com."
  return undefined
}

export function getSignInErrors({ email, password }: SignInValues) {
  const errors: SignInErrors = {}
  const emailError = getEmailError(email)
  if (emailError) errors.email = emailError
  if (!password) errors.password = "Enter your password."
  return errors
}

export function hasSignInErrors(errors: SignInErrors) {
  return Object.values(errors).some(Boolean)
}

const FAILURES: Record<SignInError, SignInFailure> = {
  "wrong-password": {
    place: "form",
    message: "That email and password don't match.",
    focus: "password",
  },
  "unknown-email": {
    place: "email",
    message: "No account uses this email.",
    focus: "email",
  },
  "too-many-attempts": {
    place: "form",
    message: "Too many attempts. Try again in 5 minutes.",
    focus: "password",
  },
  network: {
    place: "form",
    message: "Can't reach the server. Check your connection.",
    focus: "password",
  },
}

export function getSignInFailure(error: SignInError) {
  return FAILURES[error]
}

export function getProviderMessage(
  provider: SignInProvider,
  error: ProviderError
) {
  const name = PROVIDER_NAMES[provider]
  return error === "cancelled"
    ? `${name} sign-in was closed before it finished.`
    : `We couldn't reach ${name}. Check your connection.`
}
