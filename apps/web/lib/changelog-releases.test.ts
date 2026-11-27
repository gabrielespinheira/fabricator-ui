import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import { getChangelogReleases } from "./changelog-releases"

const DOCS_DIRECTORY = path.join(process.cwd(), "content/docs")
const PLATFORMS = ["base", "radix", "aria", "native"]

function hasDocsPage(entry: string) {
  if (entry.startsWith("/docs/")) {
    const file = entry.slice("/docs/".length)
    return [`${file}.mdx`, `${file}/index.mdx`].some((candidate) =>
      fs.existsSync(path.join(DOCS_DIRECTORY, candidate))
    )
  }
  return PLATFORMS.some((platform) =>
    fs.existsSync(
      path.join(DOCS_DIRECTORY, "components", platform, `${entry}.mdx`)
    )
  )
}

describe("changelog releases", () => {
  const releases = getChangelogReleases()

  it("reads unreleased changes and dated releases", () => {
    expect(releases.filter((release) => !release.date)).toHaveLength(1)
    expect(
      releases.find((release) => release.title === "Version 0.8.0")
    ).toMatchObject({
      date: "2026-11-13T00:00:00.000Z",
      new: expect.arrayContaining(["data-table"]),
    })
  })

  it("lists only components and docs pages that exist", () => {
    const missing = releases.flatMap((release) =>
      [...release.new, ...release.updated]
        .filter((entry) => !hasDocsPage(entry))
        .map((entry) => `${release.title}: ${entry}`)
    )
    expect(missing).toEqual([])
  })
})
