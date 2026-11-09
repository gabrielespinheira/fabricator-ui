// Stepping, clamping, parsing and formatting for Number Field, with the rules
// of Base UI's NumberField, which the website's component is built on. Plain
// functions: no React Native, so the website's Vitest runs them.

export type NumberFieldRange = {
  min?: number
  max?: number
}

export type NumberFieldStep = NumberFieldRange & {
  /** `"any"` steps by 1, as on the website. */
  step?: number | "any"
}

export type NumberFieldFormat = {
  locale?: Intl.LocalesArgument
  format?: Intl.NumberFormatOptions
}

export type NumberFieldState = NumberFieldRange & {
  disabled?: boolean
  readOnly?: boolean
}

function getDecimalCount(value: number) {
  if (!Number.isFinite(value)) return 0
  const [mantissa, exponent] = String(value).toLowerCase().split("e")
  const decimals = mantissa?.split(".")[1]?.length ?? 0
  return Math.max(0, decimals - Number(exponent ?? 0))
}

/** Drops float noise: 0.1 + 0.2 is 0.3, to the precision of what was added. */
function roundToPrecision(value: number, ...parts: number[]) {
  const decimals = Math.min(
    20,
    Math.max(...parts.map((part) => getDecimalCount(part)))
  )
  return Number(value.toFixed(decimals))
}

function clampValue(value: number, { min, max }: NumberFieldRange) {
  let clamped = value
  if (max !== undefined) clamped = Math.min(clamped, max)
  if (min !== undefined) clamped = Math.max(clamped, min)
  return clamped
}

function getStepAmount(step: NumberFieldStep["step"]) {
  return typeof step === "number" && step > 0 ? step : 1
}

/**
 * The value one step up (`direction` 1) or down (-1), within min and max. An
 * empty field starts from the limit it moves away from, or from zero.
 */
function stepValue(
  value: number | null,
  direction: 1 | -1,
  { min, max, step }: NumberFieldStep,
  amount = getStepAmount(step)
) {
  if (value === null) {
    const start = direction > 0 ? min : max
    if (start !== undefined) return clampValue(start, { min, max })
    return clampValue(direction * amount, { min, max })
  }
  const next = roundToPrecision(value + direction * amount, value, amount)
  return clampValue(next, { min, max })
}

function getSeparators(locale: Intl.LocalesArgument) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  }
}

function escapeForPattern(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Reads typed text as a number: the locale's grouping and decimal separators,
 * a minus sign, and nothing else (currency signs and units drop out). A percent
 * field reads "15" as 0.15. Empty or unfinished text ("-", ".") is no value.
 */
function parseNumberText(
  text: string,
  { locale = "en-US", format }: NumberFieldFormat = {}
) {
  const { group, decimal } = getSeparators(locale)
  // Spaces stand in for a narrow no-break space group separator.
  const normalized = text
    .replace(new RegExp(escapeForPattern(group), "g"), "")
    .replace(/\s/g, "")
    .replace(new RegExp(escapeForPattern(decimal), "g"), ".")
    .replace(/[−‒–]/g, "-")
    .replace(/[^0-9.-]/g, "")
  if (!/\d/.test(normalized)) return null
  const isNegative = normalized.startsWith("-")
  const digits = normalized.replace(/-/g, "")
  const parsed = Number(digits)
  if (!Number.isFinite(parsed)) return null
  const value = isNegative ? -parsed : parsed
  if (format?.style !== "percent") return value
  return Number((value / 100).toFixed(Math.min(20, getDecimalCount(value) + 2)))
}

/** The value as the field shows it when it isn't being edited. */
function formatNumberValue(
  value: number | null,
  { locale, format }: NumberFieldFormat = {}
) {
  if (value === null || Number.isNaN(value)) return ""
  return new Intl.NumberFormat(locale, format).format(value)
}

/** What typed text commits to when the field loses focus: parsed, then clamped. */
function commitNumberText(
  text: string,
  { min, max, locale, format }: NumberFieldRange & NumberFieldFormat
) {
  const parsed = parseNumberText(text, { locale, format })
  if (parsed === null) return null
  return clampValue(parsed, { min, max })
}

function canDecrement(
  value: number | null,
  { min, disabled, readOnly }: NumberFieldState
) {
  if (disabled || readOnly) return false
  return value === null || min === undefined || value > min
}

function canIncrement(
  value: number | null,
  { max, disabled, readOnly }: NumberFieldState
) {
  if (disabled || readOnly) return false
  return value === null || max === undefined || value < max
}

export {
  canDecrement,
  canIncrement,
  clampValue,
  commitNumberText,
  formatNumberValue,
  getStepAmount,
  parseNumberText,
  stepValue,
}
