import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { getIconEntry, searchIcons } from "./catalog"
import { DynamicIcon, loadIcon } from "./dynamic"

describe("DynamicIcon", () => {
  it("renders an icon by name or alias once it has loaded", async () => {
    await loadIcon("home")
    expect(
      renderToStaticMarkup(
        createElement(DynamicIcon, { name: "home", size: 16 })
      )
    ).toContain('class="fab-icon fab-icon-house"')
  })

  it("resolves SharpOS's stored slugs to brand marks", async () => {
    await loadIcon("googleanalytics", "brands")
    expect(
      renderToStaticMarkup(
        createElement(DynamicIcon, { name: "googleanalytics", set: "brands" })
      )
    ).toContain("fab-brand-google-analytics")
  })

  it("renders the fallback for a name the set doesn't have", async () => {
    expect(await loadIcon("not-an-icon")).toBeNull()
    expect(
      renderToStaticMarkup(
        createElement(DynamicIcon, { name: "not-an-icon", fallback: "?" })
      )
    ).toBe("?")
  })
})

describe("catalog", () => {
  it("finds a platform by its former name", () => {
    expect(
      searchIcons("twitter", { set: "brands" }).map((entry) => entry.name)
    ).toEqual(["x"])
  })

  it("finds a family by its parent brand", () => {
    const names = searchIcons("meta", { set: "brands" }).map(
      (entry) => entry.name
    )
    expect(names).toEqual(
      expect.arrayContaining(["facebook", "instagram", "meta", "threads"])
    )
  })

  it("finds outline icons by alias", () => {
    expect(getIconEntry("home")?.name).toBe("house")
  })

  it("keeps brand provenance for every mark", () => {
    const github = getIconEntry("github", "brands")
    expect(github?.set === "brands" && github.license).toBe("CC0-1.0")
  })
})
