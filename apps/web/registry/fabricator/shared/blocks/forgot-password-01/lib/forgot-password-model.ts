export type ResetStep = "email" | "code" | "password" | "done"

export type ResetResult =
  | { ok: true }
  | { ok: false; error: "invalid-code" | "expired-code" | "network" }

export const CODE_LENGTH = 6

const STEPS = ["email", "code", "password"] as const

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

/** "Step 2 of 3"; the confirmation at the end has no number. */
export function getStepPosition(step: ResetStep) {
  if (step === "done") return null
  return { step: STEPS.indexOf(step) + 1, total: STEPS.length }
}

export function getEmailError(email: string) {
  const value = email.trim()
  if (!value) return "Enter the email you sign in with."
  if (!EMAIL.test(value)) return "Enter an email address like ada@acme.com."
  return undefined
}

export function getCodeError(code: string) {
  return code.length === CODE_LENGTH
    ? undefined
    : `Enter all ${CODE_LENGTH} digits of the code.`
}

export function getPasswordChecks(password: string) {
  return PASSWORD_RULES.map(({ id, label, test }) => ({
    id,
    label,
    isMet: test(password),
  }))
}

export function getNewPasswordError(password: string) {
  if (!password) return "Choose a new password."
  if (!PASSWORD_RULES.every(({ test }) => test(password))) {
    return "Use 8 or more characters, with a number or a symbol."
  }
  return undefined
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}

export const RESET_MESSAGES = {
  "invalid-code":
    "That code doesn't match. Check the latest email and try again.",
  "expired-code": "That code has expired. Send a new one and try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
} satisfies Record<Extract<ResetResult, { ok: false }>["error"], string>
