export type BlockSummary = {
  name: string
  title: string
  description: string
  categories: string[]
  /** The URL path its page installs to, shown in the preview's address bar. */
  route: string
}

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun"

// The gallery's sections, in order. A block sits in its first category.
export const BLOCK_CATEGORIES = [
  {
    id: "authentication",
    title: "Authentication",
    description:
      "Sign in, sign up and password reset, with errors in the form.",
  },
  {
    id: "dashboard",
    title: "Dashboards",
    description:
      "Pages of cards on one grid: numbers, trends and what needs you.",
  },
  {
    id: "chat",
    title: "Chat",
    description:
      "An AI assistant and a messenger, with streaming and attachments.",
  },
  {
    id: "mail",
    title: "Email",
    description:
      "An inbox to work through: threads, labels, replies and bulk actions.",
  },
  {
    id: "calendar",
    title: "Calendar",
    description:
      "A week to plan, calendars to show, and event details beside it.",
  },
] as const

export function groupBlocks<T extends BlockSummary>(blocks: T[]) {
  return BLOCK_CATEGORIES.map((category) => ({
    ...category,
    blocks: blocks.filter((block) => block.categories[0] === category.id),
  })).filter((group) => group.blocks.length > 0)
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
