// The card form: what a number is, how it is written and what is wrong with it.

export type BillingCardBrand = "visa" | "mastercard" | "amex" | "card"

export type BillingCard = {
  brand: BillingCardBrand
  last4: string
  month: number
  year: number
}

export type BillingCardValues = {
  number: string
  expiry: string
  code: string
}

export type BillingCardErrors = Partial<Record<keyof BillingCardValues, string>>

const AMEX_GROUPS = [4, 6, 5]
const GROUPS = [4, 4, 4, 4]
const DECLINED_SAMPLE = "4000000000000002"

function getDigits(text: string) {
  return text.replace(/\D/g, "")
}

export function getCardBrand(number: string): BillingCardBrand {
  const digits = getDigits(number)
  if (digits.startsWith("4")) return "visa"
  if (/^3[47]/.test(digits)) return "amex"
  if (/^5[1-5]/.test(digits)) return "mastercard"
  const prefix = Number(digits.slice(0, 4))
  return prefix >= 2221 && prefix <= 2720 ? "mastercard" : "card"
}

export function getCardBrandName(brand: BillingCardBrand) {
  const names = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    card: "Card",
  } satisfies Record<BillingCardBrand, string>
  return names[brand]
}

function getGroups(number: string) {
  return getCardBrand(number) === "amex" ? AMEX_GROUPS : GROUPS
}

export function formatCardNumber(text: string) {
  const digits = getDigits(text)
  const parts: string[] = []
  let start = 0
  for (const length of getGroups(digits)) {
    const part = digits.slice(start, start + length)
    if (part) parts.push(part)
    start += length
  }
  return parts.join(" ")
}

export function formatExpiry(text: string) {
  const digits = getDigits(text).slice(0, 4)
  if (digits.length === 1 && Number(digits) > 1) return `0${digits}`
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function getCodeLength(number: string) {
  return getCardBrand(number) === "amex" ? 4 : 3
}

export function isCardNumberValid(number: string) {
  const digits = getDigits(number)
  const length = getGroups(digits).reduce((sum, group) => sum + group, 0)
  if (digits.length !== length) return false
  const sum = [...digits].reverse().reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 1 ? 2 : 1)
    return total + (value > 9 ? value - 9 : value)
  }, 0)
  return sum % 10 === 0
}

/** A card works through the last day of its month. */
export function getExpiryState(
  { month, year }: Pick<BillingCard, "month" | "year">,
  now: Date
): "ok" | "soon" | "expired" {
  const monthsLeft =
    (year - now.getUTCFullYear()) * 12 + (month - 1 - now.getUTCMonth())
  if (monthsLeft < 0) return "expired"
  return monthsLeft <= 1 ? "soon" : "ok"
}

export function formatCardExpiry({
  month,
  year,
}: Pick<BillingCard, "month" | "year">) {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`
}

export function parseExpiry(expiry: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry)
  if (!match) return null
  return { month: Number(match[1]), year: 2000 + Number(match[2]) }
}

function getNumberError(number: string) {
  if (getDigits(number) === "") return "Enter the number on the card."
  if (!isCardNumberValid(number)) {
    return "That number has a typo. Check the digits."
  }
  return undefined
}

function getExpiryError(expiry: string, now: Date) {
  const parsed = parseExpiry(expiry)
  if (!parsed) return "Enter the month and year."
  if (parsed.month < 1 || parsed.month > 12) {
    return "Use a month from 01 to 12."
  }
  if (getExpiryState(parsed, now) !== "expired") return undefined
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)))
  return `This card expired in ${date}.`
}

function getCodeError(code: string, number: string) {
  const length = getCodeLength(number)
  if (getDigits(code).length === length) return undefined
  return `Enter the ${length} digits on the ${length === 4 ? "front" : "back"}.`
}

export function getCardErrors(
  { number, expiry, code }: BillingCardValues,
  now: Date
): BillingCardErrors {
  const errors = {
    number: getNumberError(number),
    expiry: getExpiryError(expiry, now),
    code: getCodeError(code, number),
  }
  return {
    ...(errors.number && { number: errors.number }),
    ...(errors.expiry && { expiry: errors.expiry }),
    ...(errors.code && { code: errors.code }),
  }
}

export function toCard({ number, expiry }: BillingCardValues): BillingCard {
  const parsed = parseExpiry(expiry)
  return {
    brand: getCardBrand(number),
    last4: getDigits(number).slice(-4),
    month: parsed?.month ?? 1,
    year: parsed?.year ?? 2000,
  }
}

/** The sample bank: one number is always declined. Yours answers for real. */
export function getCardOutcome(number: string): "approved" | "declined" {
  return getDigits(number) === DECLINED_SAMPLE ? "declined" : "approved"
}
