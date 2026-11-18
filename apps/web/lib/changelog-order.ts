// Pure changelog helpers, safe for client components (lib/changelog.ts reads
// the filesystem).

const DATE_FORMATS = {
  long: { month: "long", day: "numeric", year: "numeric" },
  short: { month: "short", day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>

// Frontmatter dates are calendar days parsed at UTC midnight, so they are
// formatted in UTC to keep the same day in every time zone.
export function formatChangelogDate(
  date: Date | string,
  format: keyof typeof DATE_FORMATS = "long"
) {
  return new Intl.DateTimeFormat("en-US", {
    ...DATE_FORMATS[format],
    timeZone: "UTC",
  }).format(new Date(date))
}

// Undated pages hold unreleased changes, so they sort ahead of every release.
function getTime(date: Date | string | null | undefined) {
  return date ? new Date(date).getTime() : Infinity
}

export function sortNewestFirst<
  T extends { title: string; date?: Date | string | null },
>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const timeA = getTime(a.date)
    const timeB = getTime(b.date)
    if (timeA === timeB) return a.title.localeCompare(b.title)
    return timeB > timeA ? 1 : -1
  })
}
