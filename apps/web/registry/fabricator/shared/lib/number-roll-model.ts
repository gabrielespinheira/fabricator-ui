// Which way a number field's value rolls when it steps: up into place when it
// grows, down when it shrinks. Values arrive as the formatted text the input
// shows, so digits and the sign are read and grouping is ignored.

export type NumberRollDirection = "up" | "down"

// The last "." or "," followed by one to three digits at the end is taken as
// the decimal mark only when the other mark also appears, or when it is
// followed by fewer than three digits; otherwise it groups thousands.
function parseShownNumber(text: string) {
  const sign = /-|−/.test(text) ? -1 : 1
  const digits = text.replace(/[^\d.,]/g, "")
  if (!/\d/.test(digits)) return null
  const lastMark = Math.max(digits.lastIndexOf("."), digits.lastIndexOf(","))
  const decimals = lastMark === -1 ? "" : digits.slice(lastMark + 1)
  const hasBothMarks = digits.includes(".") && digits.includes(",")
  const isDecimal = lastMark !== -1 && (hasBothMarks || decimals.length !== 3)
  const whole = isDecimal ? digits.slice(0, lastMark) : digits
  const value = Number(
    `${whole.replace(/[.,]/g, "")}${isDecimal ? `.${decimals}` : ""}`
  )
  return Number.isFinite(value) ? sign * value : null
}

export function getNumberRollDirection(
  previous: string,
  next: string
): NumberRollDirection | null {
  const from = parseShownNumber(previous)
  const to = parseShownNumber(next)
  if (from === null || to === null || from === to) return null
  return to > from ? "up" : "down"
}
