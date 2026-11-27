// Password strength: a score from 0 (nothing typed) to 4, from length and the
// kinds of character used. Short passwords stay weak whatever they mix.

export type PasswordScore = 0 | 1 | 2 | 3 | 4

export const PASSWORD_SCORE_LABELS = [
  "",
  "Weak",
  "Fair",
  "Good",
  "Strong",
] as const

const MIN_LENGTH = 8
const LONG_LENGTH = 12

export function getPasswordScore(password: string): PasswordScore {
  if (password === "") return 0
  const points = [
    password.length >= MIN_LENGTH,
    password.length >= LONG_LENGTH,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length
  const score = Math.max(1, Math.min(4, points))
  return (password.length < MIN_LENGTH ? 1 : score) as PasswordScore
}
