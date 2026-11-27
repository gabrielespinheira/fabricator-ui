import fs from "fs"
import path from "path"
import fm from "front-matter"
import { z } from "zod"

import type { ChangelogRelease } from "./release-badges"

const CHANGELOG_DIRECTORY = path.join(process.cwd(), "content/docs/changelog")

// The index page lists releases; it has no title of its own to badge.
const INDEX_FILE = "index.mdx"

const releaseSchema = z.object({
  title: z.string(),
  // YAML reads an unquoted day or time as a Date.
  date: z
    .date()
    .transform((date) => date.toISOString())
    .optional(),
  new: z.array(z.string()).default([]),
  updated: z.array(z.string()).default([]),
})

/** Every changelog page's release day and its `new` and `updated` lists. */
export function getChangelogReleases(): ChangelogRelease[] {
  return fs
    .readdirSync(CHANGELOG_DIRECTORY)
    .filter((file) => file.endsWith(".mdx") && file !== INDEX_FILE)
    .map((file) =>
      releaseSchema.parse(
        fm(fs.readFileSync(path.join(CHANGELOG_DIRECTORY, file), "utf-8"))
          .attributes
      )
    )
}
