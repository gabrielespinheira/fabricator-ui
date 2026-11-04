// What the website's `input-otp` package does for its slots, without a DOM: the
// value a change leaves, and what each slot shows.

export const REGEXP_ONLY_DIGITS = "^\\d+$"
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$"
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$"

export type OtpPattern = string | RegExp

/** The website's caret-blink keyframes: a caret isn't a motion role. */
export const OTP_CARET_BLINK = { fadeMs: 250, holdMs: 375 } as const

/** The value after a change: cut to the slots, or unchanged if the pattern refuses it. */
export function getNextOtpValue(
  text: string,
  current: string,
  {
    maxLength,
    pattern,
    transform,
  }: {
    maxLength: number
    pattern?: OtpPattern
    transform?: (text: string) => string
  }
) {
  const next = (transform ? transform(text) : text).slice(0, maxLength)
  if (next.length > 0 && pattern && !new RegExp(pattern).test(next)) {
    return current
  }
  return next
}

export function getOtpSlots(
  value: string,
  maxLength: number,
  isFocused: boolean
) {
  const activeIndex = Math.min(value.length, maxLength - 1)
  return Array.from({ length: maxLength }, (_, index) => {
    const char = value[index] ?? null
    const isActive = isFocused && index === activeIndex
    return { char, isActive, hasFakeCaret: isActive && char === null }
  })
}

export function isOtpComplete(
  previous: string,
  value: string,
  maxLength: number
) {
  return previous.length < maxLength && value.length === maxLength
}

/** Digits unless the pattern takes letters too. */
export function getOtpKeyboardType(pattern: OtpPattern | undefined) {
  if (!pattern) return "number-pad" as const
  return new RegExp(pattern).test("a")
    ? ("default" as const)
    : ("number-pad" as const)
}
