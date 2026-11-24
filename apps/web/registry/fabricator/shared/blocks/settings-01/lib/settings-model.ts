// What a workspace's settings are, how one change is made and put back, and
// what each choice costs the people in it.

import { type NumberStyle } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-format-model"

export type JoinPolicy = "invite" | "domain" | "link" | "sso"
export type WeekStart = "saturday" | "sunday" | "monday"
export type SettingsDensity = "compact" | "default" | "spacious"
export type DigestFrequency = "never" | "daily" | "weekly" | "monthly"

export type WorkspaceSettings = {
  name: string
  address: string
  logo: string | null
  brandColor: string
  density: SettingsDensity
  language: string
  timeZone: string
  weekStart: WeekStart
  numberStyle: NumberStyle
  currency: string
  joinPolicy: JoinPolicy
  domains: string[]
  requiresTwoFactor: boolean
  digest: DigestFrequency
  notifiesFailedPayments: boolean
  notifiesNewSignIns: boolean
  notifiesMentions: boolean
  retentionDays: number
}

export type SettingKey = keyof WorkspaceSettings

/** A text waiting to be saved differs from the saved one and isn't blank. */
export function isTextDirty(text: string, saved: string) {
  return text.trim() !== saved
}

export function canSaveName(text: string, saved: string) {
  return text.trim().length > 0 && isTextDirty(text, saved)
}

// Sign-in domains

const DOMAIN =
  /^(?=.{4,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/

const PUBLIC_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
]

export function cleanDomain(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^.*@/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
}

/** Why a domain can't be added, or null. */
export function getDomainError(domain: string) {
  if (!DOMAIN.test(domain)) return `${domain} is not a domain. Try acme.com.`
  if (PUBLIC_DOMAINS.includes(domain)) {
    return `Anyone can get an address at ${domain}. Use a domain your company owns.`
  }
  return null
}

export type DomainResult = { domains: string[]; error: string | null }

/** Adds a typed or pasted list; the first one refused is explained. */
export function addDomains(
  domains: readonly string[],
  text: string
): DomainResult {
  const next = [...domains]
  let error: string | null = null
  for (const part of text.split(/[\s,;]+/)) {
    const domain = cleanDomain(part)
    if (!domain || next.includes(domain)) continue
    const reason = getDomainError(domain)
    if (reason) error ??= reason
    else next.push(domain)
  }
  return { domains: next, error }
}

// Retention

export const RETENTION_STOPS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
  { days: Infinity, label: "Forever" },
] as const

export function getRetentionIndex(days: number) {
  return Math.max(
    0,
    RETENTION_STOPS.findIndex((stop) => stop.days === days)
  )
}

export function getRetentionLabel(days: number) {
  return RETENTION_STOPS[getRetentionIndex(days)]?.label ?? ""
}

export type FileAge = { days: number; files: number }

/** Files a retention would delete: those older than it. */
export function countExpiredFiles(ages: readonly FileAge[], days: number) {
  return ages.reduce((sum, age) => (age.days > days ? sum + age.files : sum), 0)
}

export function describeRetention(
  ages: readonly FileAge[],
  days: number,
  deletesOn: string
) {
  if (days === Infinity)
    return "Deleted files stay in Trash until someone empties it."
  const count = countExpiredFiles(ages, days)
  if (count === 0) return "Nothing in Trash is that old yet."
  return `${count.toLocaleString("en-US")} ${count === 1 ? "file" : "files"} in Trash ${
    count === 1 ? "is" : "are"
  } older, and will be gone on ${deletesOn}.`
}

// Export

export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; progress: number }
  | { kind: "ready" }

export const EXPORT_STEPS = [
  { until: 30, label: "Collecting 248 customers" },
  { until: 80, label: "Copying 1,204 files" },
  { until: 100, label: "Packing the archive" },
] as const

export function getExportStep(progress: number) {
  return (
    EXPORT_STEPS.find(({ until }) => progress < until)?.label ??
    EXPORT_STEPS.at(-1)?.label ??
    ""
  )
}

export function getExportTimeLeft(progress: number, totalSeconds: number) {
  const left = Math.ceil(((100 - progress) / 100) * totalSeconds)
  return left <= 1 ? "Almost done" : `About ${left} seconds left`
}

// Deleting

/** The typed name matches, give or take case and the spaces around it. */
export function isNameConfirmed(typed: string, name: string) {
  return typed.trim().toLowerCase() === name.trim().toLowerCase()
}
