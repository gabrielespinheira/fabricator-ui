// How dates, times and money read for a workspace, for the examples beside
// the settings that change them.

export type NumberStyle = "comma" | "period" | "space" | "apostrophe"

// The locale that writes numbers this way.
const NUMBER_LOCALES: Record<NumberStyle, string> = {
  comma: "en-US",
  period: "de-DE",
  space: "fr-FR",
  apostrophe: "de-CH",
}

export const NUMBER_STYLES: { value: NumberStyle; label: string }[] = [
  { value: "comma", label: "1,234.56" },
  { value: "period", label: "1.234,56" },
  { value: "space", label: "1 234,56" },
  { value: "apostrophe", label: "1’234.56" },
]

export function isNumberStyle(value: unknown): value is NumberStyle {
  return NUMBER_STYLES.some((style) => style.value === value)
}

export function formatAmount(
  amount: number,
  { currency, numberStyle }: { currency: string; numberStyle: NumberStyle }
) {
  return new Intl.NumberFormat(NUMBER_LOCALES[numberStyle], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount)
}

export function formatLongDate(
  iso: string,
  language: string,
  timeZone: string
) {
  return new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(iso))
}

export function formatTimeIn(timeZone: string, iso: string, language = "en") {
  return new Intl.DateTimeFormat(language, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso))
}

/** "Lisbon" for "Europe/Lisbon", "New York" for "America/New_York". */
export function getZoneCity(timeZone: string) {
  return (timeZone.split("/").at(-1) ?? timeZone).replaceAll("_", " ")
}

/** "+05:30", for a list that sorts by distance from UTC. */
export function getZoneOffset(timeZone: string, iso: string) {
  const name = new Intl.DateTimeFormat("en", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(iso))
    .find(({ type }) => type === "timeZoneName")?.value
  return name?.replace("GMT", "") || "+00:00"
}

export type ZoneOption = { value: string; label: string; detail: string }

export function getZoneOptions(
  zones: readonly string[],
  iso: string
): ZoneOption[] {
  const minutes = (zone: string) => {
    const [hours = "0", rest = "0"] = getZoneOffset(zone, iso).split(":")
    return Number(hours) * 60 + (hours.startsWith("-") ? -1 : 1) * Number(rest)
  }
  return zones
    .toSorted((a, b) => minutes(a) - minutes(b) || a.localeCompare(b))
    .map((zone) => ({
      value: zone,
      label: getZoneCity(zone),
      detail: formatTimeIn(zone, iso),
    }))
}
