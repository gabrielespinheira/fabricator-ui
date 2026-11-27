// "New" and "Updated" badges in the docs sidebar, read from the changelog:
// each page lists the components (by slug) and other docs pages (by path) it
// adds or changes in its `new` and `updated` frontmatter. The two newest
// versions count, with unreleased changes as the next version: a badge stays
// for the version that ships it and the next one. Pure, safe for client
// components.

import { sortNewestFirst } from "./changelog-order"

const RECENT_VERSION_COUNT = 2
const COMPONENT_PAGE = /^\/docs\/components\/[^/]+\/([^/]+)$/

export const RELEASE_BADGE_LABELS = { new: "New", updated: "Updated" } as const

export type ReleaseBadge = keyof typeof RELEASE_BADGE_LABELS

export type ChangelogRelease = {
  title: string
  /** The release's ISO time; unreleased changes have none. */
  date?: string
  new: string[]
  updated: string[]
}

/** Slug or docs path → its badge. New wins over Updated. */
export function getReleaseBadges(releases: ChangelogRelease[]) {
  const recent = sortNewestFirst(releases).slice(0, RECENT_VERSION_COUNT)
  const badges = new Map<string, ReleaseBadge>()
  for (const entry of recent.flatMap((release) => release.updated)) {
    badges.set(entry, "updated")
  }
  for (const entry of recent.flatMap((release) => release.new)) {
    badges.set(entry, "new")
  }
  return badges
}

/** The release a nav row's badge names, if it names one. */
export function getReleaseBadgeFromLabel(
  badge: number | string | undefined
): ReleaseBadge | undefined {
  if (badge === RELEASE_BADGE_LABELS.new) return "new"
  if (badge === RELEASE_BADGE_LABELS.updated) return "updated"
  return undefined
}

/** A component page takes its slug's badge on every platform. */
export function getPageReleaseBadge(
  badges: Map<string, ReleaseBadge>,
  url: string
) {
  return badges.get(COMPONENT_PAGE.exec(url)?.[1] ?? url)
}
