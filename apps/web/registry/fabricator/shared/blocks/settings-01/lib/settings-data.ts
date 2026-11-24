import {
  type FileAge,
  type WorkspaceSettings,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"

// Sample data. Replace it with your workspace's; the shapes are in the model.

export const SAMPLE_NOW = "2026-11-24T14:20:00Z"

export const ME = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  avatarUrl: getPhoto("1580489944761-15a19d654956"),
}

function getPhoto(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

export const WORKSPACE_ID = "ws_8f2k41acme"
export const ADDRESS_ENDING = ".fabricator.app"
export const TAKEN_ADDRESSES = [
  "acme-labs",
  "acme-labs-hq",
  "northwind",
  "admin",
]
export const LAST_CHANGE = "Last changed by Maya Chen yesterday at 4:12 PM."

export const SAMPLE_SETTINGS: WorkspaceSettings = {
  name: "Acme Inc",
  address: "acme",
  logo: null,
  brandColor: "#0e7a5f",
  density: "default",
  language: "en-US",
  timeZone: "Europe/Lisbon",
  weekStart: "monday",
  numberStyle: "comma",
  currency: "USD",
  joinPolicy: "domain",
  domains: ["acme.com", "acme.dev"],
  requiresTwoFactor: false,
  digest: "weekly",
  notifiesFailedPayments: true,
  notifiesNewSignIns: true,
  notifiesMentions: false,
  retentionDays: 365,
}

export const PEOPLE_COUNT = 8
export const SEATS = { used: 10, total: 12 }

/** People who haven't set up two-factor yet. */
export const WITHOUT_TWO_FACTOR: {
  id: string
  name: string
  photo?: string
}[] = [
  {
    id: "tom",
    name: "Tom Becker",
    photo: getPhoto("1472099645785-5658abf4ff4e"),
  },
  {
    id: "nora",
    name: "Nora Ahmed",
    photo: getPhoto("1544005313-94ddf0286df2"),
  },
  { id: "priya", name: "Priya Raman" },
]

/** Who the workspace can be handed to. */
export const NEXT_OWNERS = [
  { value: "maya", label: "Maya Chen" },
  { value: "daniel", label: "Daniel Okafor" },
  { value: "emma", label: "Emma Lindqvist" },
]

export const BRAND_SWATCHES = [
  { color: "#0e7a5f", label: "Pine" },
  { color: "#2563eb", label: "Blue" },
  { color: "#b4235a", label: "Raspberry" },
  { color: "#c2410c", label: "Rust" },
  { color: "#facc15", label: "Yellow" },
  { color: "#38bdf8", label: "Sky" },
  { color: "#111827", label: "Ink" },
]

export const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "pt-PT", label: "Português" },
  { value: "ja-JP", label: "日本語" },
]

export const CURRENCIES = [
  { value: "USD", label: "US dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "Pound sterling (£)" },
  { value: "CHF", label: "Swiss franc (CHF)" },
  { value: "JPY", label: "Japanese yen (¥)" },
  { value: "BRL", label: "Brazilian real (R$)" },
]

export const TIME_ZONES = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Stockholm",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

/** Files in Trash, by the days since they were deleted. */
export const TRASH: FileAge[] = [
  { days: 800, files: 41 },
  { days: 400, files: 118 },
  { days: 200, files: 264 },
  { days: 100, files: 312 },
  { days: 45, files: 190 },
  { days: 12, files: 279 },
]
