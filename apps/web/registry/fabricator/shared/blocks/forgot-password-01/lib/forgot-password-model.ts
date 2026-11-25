export type ResetStep = "email" | "code" | "password" | "done"

export type ResetError = "invalid-code" | "expired-code" | "network"

export type ResetResult = { ok: true } | { ok: false; error: ResetError }

/** The step a refusal belongs to, where it is said there, and the way on. */
export type ResetFailure = {
  step: ResetStep
  place: "code" | "form"
  message: string
  canResendNow: boolean
}

export const CODE_LENGTH = 6

const STEPS = ["email", "code", "password"] as const

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

/** The digits of a pasted code, however the email wrote it. */
export function normalizeCode(pasted: string) {
  return pasted.replace(/\D/g, "").slice(0, CODE_LENGTH)
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
    return "Use 8 characters or more, with a number or symbol."
  }
  return undefined
}

export function getResetFailure(
  step: ResetStep,
  error: ResetError
): ResetFailure {
  switch (error) {
    case "network":
      return {
        step,
        place: "form",
        message: "Can't reach the server. Check your connection.",
        canResendNow: false,
      }
    case "invalid-code":
      return {
        step: "code",
        place: "code",
        message: "That code doesn't match. Check the newest email.",
        canResendNow: false,
      }
    case "expired-code":
      return {
        step: "code",
        place: "code",
        message: "That code has expired. Resend to get a new one.",
        canResendNow: true,
      }
  }
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}
