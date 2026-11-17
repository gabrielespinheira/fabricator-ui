export type SignUpValues = {
  name: string
  email: string
  password: string
}

export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>

export type SignUpResult =
  | { ok: true }
  | { ok: false; error: "email-taken" | "network" }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PASSWORD_RULES = [
  {
    id: "length",
    label: "8 or more characters",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "number",
    label: "A number or a symbol",
    test: (password: string) => /[\d\W_]/.test(password.replace(/\s/g, "")),
  },
] as const

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
    return "Use 8 or more characters, with a number or a symbol."
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

export const SIGN_UP_MESSAGES = {
  "email-taken":
    "There's already an account with this email. Sign in instead, or reset your password.",
  network: "We couldn't reach the server. Check your connection and try again.",
} satisfies Record<Extract<SignUpResult, { ok: false }>["error"], string>
