export type BlockSummary = {
  name: string
  title: string
  description: string
  /** One line for the gallery's card. */
  summary: string
  categories: readonly string[]
}

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun"

// The gallery's filters, in order. A block sits in its first category.
export const BLOCK_CATEGORIES = [
  { id: "dashboard", title: "Dashboards" },
  { id: "chat", title: "Chat" },
  { id: "mail", title: "Email" },
  { id: "calendar", title: "Calendar" },
  { id: "settings", title: "Settings and team" },
  { id: "onboarding", title: "Onboarding" },
  { id: "authentication", title: "Authentication" },
] as const

export const ALL_BLOCKS = "all"

export type BlockFilter =
  | typeof ALL_BLOCKS
  | (typeof BLOCK_CATEGORIES)[number]["id"]

export const BLOCK_FILTERS: BlockFilter[] = [
  ALL_BLOCKS,
  ...BLOCK_CATEGORIES.map(({ id }) => id),
]

export function isBlockFilter(value: unknown): value is BlockFilter {
  return BLOCK_FILTERS.some((filter) => filter === value)
}

type Categorized = { categories: readonly string[] }

export function getBlockCategory({ categories }: Categorized) {
  return BLOCK_CATEGORIES.find(({ id }) => id === categories[0])
}

/**
 * The screen blocks in the gallery's order. The App Shell starters have no
 * category here: they are documented with App Shell.
 */
export function orderBlocks<T extends Categorized>(blocks: readonly T[]) {
  return BLOCK_CATEGORIES.flatMap(({ id }) => filterBlocks(blocks, id))
}

export function filterBlocks<T extends Categorized>(
  blocks: readonly T[],
  filter: BlockFilter
) {
  if (filter === ALL_BLOCKS) return [...blocks]
  return blocks.filter((block) => block.categories[0] === filter)
}

/** "All", then each category that has a block. */
export function getBlockFilters(
  blocks: readonly Categorized[]
): { id: BlockFilter; title: string }[] {
  return [
    { id: ALL_BLOCKS, title: "All" },
    ...BLOCK_CATEGORIES.filter(({ id }) => filterBlocks(blocks, id).length > 0),
  ]
}

export function getFilterHref(filter: BlockFilter) {
  return filter === ALL_BLOCKS ? "/blocks" : `/blocks?category=${filter}`
}

/**
 * Where a link to the page's old sections goes now: a block (#finance-01) has
 * its own page, a category (#chat) is a filter.
 */
export function getHashHref(
  hash: string,
  blocks: ReadonlyArray<{ name: string }>
) {
  const id = hash.slice(1)
  if (blocks.some(({ name }) => name === id)) return `/blocks/${id}`
  const category = BLOCK_CATEGORIES.find((category) => category.id === id)
  return category ? getFilterHref(category.id) : null
}

export function getBlockNeighbours<T extends { name: string }>(
  blocks: readonly T[],
  name: string
) {
  const index = blocks.findIndex((block) => block.name === name)
  if (index === -1) return { previous: null, next: null }
  return {
    previous: blocks[index - 1] ?? null,
    next: blocks[index + 1] ?? null,
  }
}

/** The block's dependencies that have a docs page, by title. */
export function getComponentLinks(
  dependencies: readonly string[],
  getTitle: (slug: string) => string | undefined
) {
  return [...new Set(dependencies)]
    .flatMap((slug) => {
      const title = getTitle(slug)
      return title ? [{ title, href: `/docs/components/base/${slug}` }] : []
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

// What each screen is for. A block's own description lists what is on it, in
// two or three lines: too long for a card.
const SUMMARIES: Record<string, string> = {
  "finance-01": "Cash, runway and the payments waiting for approval.",
  "assistant-01": "An AI chat that shows its work, from steps to sources.",
  "messenger-01": "Conversations with photos, files and voice messages.",
  "mail-01": "An inbox to work through, with the open thread beside it.",
  "calendar-app-01": "A week to plan, and the next event ready to join.",
  "settings-01": "Workspace settings that save as you change them.",
  "members-01": "Roles, invitations and seats for a team.",
  "billing-01": "The plan, usage against each limit, and invoices.",
  "onboarding-01": "A first run in a few choices, previewed as you go.",
  "sign-in-01": "Company providers, or an email and password.",
  "sign-up-01": "An account in one form, then a check-your-email screen.",
  "forgot-password-01": "An email, a six-digit code and a new password.",
}

export function getBlockSummary(name: string, description: string) {
  return SUMMARIES[name] ?? `${description.split(/[:.]/)[0]}.`
}

const RUNNERS: Record<PackageManager, string> = {
  npm: "npx",
  yarn: "yarn dlx",
  pnpm: "pnpm dlx",
  bun: "bunx --bun",
}

export function getAddCommand(packageManager: PackageManager, name: string) {
  return `${RUNNERS[packageManager]} fabricator-ui@latest add ${name}`
}
