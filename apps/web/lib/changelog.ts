import fs from "fs"
import path from "path"
import fm from "front-matter"

import { sortNewestFirst } from "@/lib/changelog-order"
import { source } from "@/lib/source"

export type ChangelogPageData = {
  title: string
  description?: string
}

export type ChangelogPage = ReturnType<typeof source.getPages>[number] & {
  date: Date | null
}

// Reads the date from the frontmatter of a changelog file.
export function getDateFromFile(slugs: string[]) {
  const filePath = path.join(
    process.cwd(),
    "content/docs",
    ...slugs.slice(0, -1),
    `${slugs[slugs.length - 1]}.mdx`
  )
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const { attributes } = fm<{ date?: string | Date }>(content)
    if (attributes.date) {
      return new Date(attributes.date)
    }
  } catch {
    // File not found or parse error.
  }
  return null
}

export function isChangelogEntry(slugs: string[]) {
  return slugs[0] === "changelog" && slugs.length > 1
}

// A changelog entry's day as `yyyy-MM-dd`, for client components.
export function getChangelogDay(slugs: string[]) {
  return getDateFromFile(slugs)?.toISOString().slice(0, 10)
}

// Gets all changelog pages, newest first.
export function getChangelogPages() {
  return sortNewestFirst(
    source
      .getPages()
      .filter((page) => isChangelogEntry(page.slugs))
      .map((page) => ({
        ...page,
        title: page.data.title,
        date: getDateFromFile(page.slugs),
      }))
  )
}
