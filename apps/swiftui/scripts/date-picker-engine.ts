import { TZDate } from "@date-fns/tz"
import * as locales from "date-fns/locale"
import { z } from "zod"

import {
  commitDateText,
  formatDateValue,
  parseDateText,
} from "../../web/registry/fabricator/shared/lib/date-picker-model"

const civilDateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
})
const requestSchema = z.object({
  action: z.enum(["commit", "parse", "format"]),
  text: z.string(),
  value: civilDateSchema.nullable(),
  referenceDate: civilDateSchema,
  minDate: civilDateSchema.optional(),
  maxDate: civilDateSchema.optional(),
  granularity: z.enum(["day", "month", "year"]),
  format: z.string().optional(),
  locale: z.string(),
})
const localeMap = new Map(
  Object.values(locales).map((locale) => [locale.code.toLowerCase(), locale])
)

function readLocale(identifier: string) {
  const code =
    identifier.replaceAll("_", "-").split("@")[0]?.toLowerCase() ?? ""
  const withoutScript = code.replace(/-(latn|cyrl|hans|hant)(?=-|$)/, "")
  const language = code.split("-")[0] ?? ""
  const defaultCode =
    language === "en"
      ? "en-us"
      : language === "zh"
        ? code.includes("hant")
          ? "zh-tw"
          : "zh-cn"
        : language
  const locale =
    localeMap.get(code) ??
    localeMap.get(withoutScript) ??
    localeMap.get(defaultCode)
  if (!locale)
    throw new RangeError(`Unsupported Date Picker locale: ${identifier}`)
  return locale
}
function readDate(value: z.infer<typeof civilDateSchema>) {
  // The bridge carries civil dates; the caller's Calendar owns the actual zone.
  const date = new TZDate(0, "UTC")
  date.setFullYear(value.year, value.month - 1, value.day)
  date.setHours(0, 0, 0, 0)
  if (
    date.getFullYear() !== value.year ||
    date.getMonth() !== value.month - 1 ||
    date.getDate() !== value.day
  )
    throw new RangeError("Invalid civil date")
  return date
}
function writeDate(date: Date | undefined) {
  return date
    ? {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      }
    : null
}
export function callDatePickerEngine(input: string) {
  try {
    const request = requestSchema.parse(JSON.parse(input))
    const options = {
      granularity: request.granularity,
      format: request.format,
      locale: readLocale(request.locale),
      referenceDate: readDate(request.referenceDate),
      minDate: request.minDate ? readDate(request.minDate) : undefined,
      maxDate: request.maxDate ? readDate(request.maxDate) : undefined,
    }
    if (request.action === "format") {
      const date = request.value ? readDate(request.value) : undefined
      return JSON.stringify({
        ok: true,
        value: {
          value: writeDate(date),
          text: formatDateValue(date, options),
          isInvalid: false,
        },
      })
    }
    if (request.action === "parse") {
      const date = parseDateText(request.text, options)
      return JSON.stringify({
        ok: true,
        value: {
          value: writeDate(date),
          text: request.text,
          isInvalid: !date && Boolean(request.text.trim()),
        },
      })
    }
    const commit = commitDateText(request.text, options)
    return JSON.stringify({
      ok: true,
      value: { ...commit, value: writeDate(commit.value) },
    })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
Object.assign(globalThis, { fabricatorDatePickerCall: callDatePickerEngine })
