export type SignUpValues = {
  name: string
  email: string
  password: string
}

export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>

export type SignUpProvider = "google" | "apple"

export type SignUpMethod = SignUpProvider | "email"

export type SignUpError = "email-taken" | "network"

export type SignUpResult = { ok: true } | { ok: false; error: SignUpError }

export type ProviderError = "cancelled" | "network"

export type ProviderResult = { ok: true } | { ok: false; error: ProviderError }

/** Where a refusal is said: at the field it belongs to, or above the button. */
export type SignUpFailure = { place: "email" | "form"; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PASSWORD_RULES = [
  {
    id: "length",
    label: "8 characters or more",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "number",
    label: "A number or symbol",
    test: (password: string) => /[\d\W_]/.test(password.replace(/\s/g, "")),
  },
] as const

export const PROVIDER_NAMES: Record<SignUpProvider, string> = {
  google: "Google",
  apple: "Apple",
}

export function getPasswordChecks(password: string) {
  return PASSWORD_RULES.map(({ id, label, test }) => ({
    id,
    label,
    isMet: test(password),
  }))
}

export function isPasswordStrong(password: string) {
  return PASSWORD_RULES.every(({ test }) => test(password))
}

export function getNameError(name: string) {
  return name.trim() ? undefined : "Enter your name."
}

export function getEmailError(email: string) {
  const value = email.trim()
  if (!value) return "Enter your work email."
  if (!EMAIL.test(value)) return "Enter an email address like ada@acme.com."
  return undefined
}

export function getPasswordError(password: string) {
  if (!password) return "Choose a password."
  if (!isPasswordStrong(password)) {
    return "Use 8 characters or more, with a number or symbol."
  }
  return undefined
}

export function getSignUpErrors({ name, email, password }: SignUpValues) {
  const errors: SignUpErrors = {}
  const nameError = getNameError(name)
  const emailError = getEmailError(email)
  const passwordError = getPasswordError(password)
  if (nameError) errors.name = nameError
  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError
  return errors
}

const FAILURES: Record<SignUpError, SignUpFailure> = {
  "email-taken": {
    place: "email",
    message: "This email already has an account.",
  },
  network: {
    place: "form",
    message: "Can't reach the server. Check your connection.",
  },
}

export function getSignUpFailure(error: SignUpError) {
  return FAILURES[error]
}

export function getProviderMessage(
  provider: SignUpProvider,
  error: ProviderError
) {
  const name = PROVIDER_NAMES[provider]
  return error === "cancelled"
    ? `${name} sign-up was closed before it finished.`
    : `We couldn't reach ${name}. Check your connection.`
}

const GMAIL = { name: "Gmail", href: "https://mail.google.com" }
const OUTLOOK = { name: "Outlook", href: "https://outlook.live.com/mail" }

const INBOXES = new Map([
  ["gmail.com", GMAIL],
  ["googlemail.com", GMAIL],
  ["outlook.com", OUTLOOK],
  ["hotmail.com", OUTLOOK],
  ["live.com", OUTLOOK],
  ["icloud.com", { name: "iCloud Mail", href: "https://www.icloud.com/mail" }],
  ["yahoo.com", { name: "Yahoo Mail", href: "https://mail.yahoo.com" }],
  ["proton.me", { name: "Proton Mail", href: "https://mail.proton.me" }],
])

/** The web inbox of a personal address; a company's mail could be anywhere. */
export function getInbox(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(-1) ?? ""
  return INBOXES.get(domain) ?? null
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}
