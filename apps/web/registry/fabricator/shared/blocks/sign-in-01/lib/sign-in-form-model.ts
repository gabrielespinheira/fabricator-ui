export type SignInValues = {
  email: string
  password: string
}

export type SignInErrors = Partial<Record<keyof SignInValues, string>>

export type SignInResult =
  | { ok: true }
  | { ok: false; error: "invalid-credentials" | "network" }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export const SIGN_IN_MESSAGES = {
  "invalid-credentials":
    "That email and password don't match. Try again or reset your password.",
  network: "We couldn't reach the server. Check your connection and try again.",
} satisfies Record<Extract<SignInResult, { ok: false }>["error"], string>
