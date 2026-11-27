import { describe, expect, it } from "vitest"

import {
  getPageReleaseBadge,
  getReleaseBadgeFromLabel,
  getReleaseBadges,
} from "./release-badges"

const release = (
  title: string,
  date: string | undefined,
  entries: { new?: string[]; updated?: string[] } = {}
) => ({
  title,
  date,
  new: entries.new ?? [],
  updated: entries.updated ?? [],
})

describe("release badges", () => {
  it("badges the two newest versions, counting unreleased as the next", () => {
    const badges = getReleaseBadges([
      release("Version 0.7.0", "2026-10-01", { new: ["editor"] }),
      release("Unreleased", undefined, { new: ["folder"] }),
      release("Version 0.9.0", "2026-11-17", { updated: ["avatar"] }),
      release("Version 0.8.0", "2026-11-04", { new: ["rating"] }),
    ])

    expect(Object.fromEntries(badges)).toEqual({
      folder: "new",
      avatar: "updated",
    })
  })

  it("keeps New over Updated while both are recent", () => {
    const badges = getReleaseBadges([
      release("Unreleased", undefined, { updated: ["data-table"] }),
      release("Version 0.8.0", "2026-11-04", { new: ["data-table"] }),
    ])

    expect(badges.get("data-table")).toBe("new")
  })

  it("keeps a badge for its own version and the next one", () => {
    const shipped = release("Version 0.10.0", "2026-12-01", { new: ["folder"] })
    const badge = (...releases: ReturnType<typeof release>[]) =>
      getReleaseBadges([shipped, ...releases]).get("folder")

    expect(badge()).toBe("new")
    expect(badge(release("Unreleased", undefined))).toBe("new")
    expect(badge(release("Version 0.11.0", "2026-12-15"))).toBe("new")
    expect(
      badge(
        release("Version 0.11.0", "2026-12-15"),
        release("Unreleased", undefined)
      )
    ).toBeUndefined()
  })

  it("matches a component on every platform and other pages by path", () => {
    const badges = getReleaseBadges([
      release("Unreleased", undefined, {
        new: ["folder"],
        updated: ["/docs/foundations/motion"],
      }),
    ])

    expect(getPageReleaseBadge(badges, "/docs/components/base/folder")).toBe(
      "new"
    )
    expect(getPageReleaseBadge(badges, "/docs/components/native/folder")).toBe(
      "new"
    )
    expect(getPageReleaseBadge(badges, "/docs/foundations/motion")).toBe(
      "updated"
    )
    expect(
      getPageReleaseBadge(badges, "/docs/advanced/folder/props")
    ).toBeUndefined()
  })

  it("reads the release back from a row's badge, not from a count", () => {
    expect(getReleaseBadgeFromLabel("New")).toBe("new")
    expect(getReleaseBadgeFromLabel("Updated")).toBe("updated")
    expect(getReleaseBadgeFromLabel(24)).toBeUndefined()
    expect(getReleaseBadgeFromLabel("Nov 17")).toBeUndefined()
  })
})
