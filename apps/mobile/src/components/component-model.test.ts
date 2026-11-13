import { describe, expect, it } from "vitest"

import {
  COMPONENTS_HREF,
  getComponentSections,
  getExplorerComponents,
  getPathFromUrl,
} from "./component-model"

describe("the Components directory", () => {
  it("lists BotFace by its component name in Chat", () => {
    expect(getExplorerComponents(["bot-face"])).toEqual([
      { slug: "bot-face", title: "BotFace", group: "Chat" },
    ])
  })
  it("groups every component in docs order and sorts each group by title", () => {
    const components = getExplorerComponents([
      "tabs",
      "switch",
      "button",
      "editor",
    ])
    const sections = getComponentSections(components)

    expect(sections.map((section) => section.title)).toEqual([
      "Basics",
      "Structure",
      "Advanced",
    ])
    expect(sections[0]?.data.map((component) => component.slug)).toEqual([
      "button",
      "switch",
    ])
    expect(sections.flatMap((section) => section.data)).toHaveLength(
      components.length
    )
    expect(components[0]?.slug).toBe("tabs")
  })

  it("omits empty groups", () => {
    expect(getComponentSections([])).toEqual([])
  })

  it("opens the directory from its deep link", () => {
    expect(getPathFromUrl("fabricator-ui://components")).toBe(COMPONENTS_HREF)
    expect(getPathFromUrl("fabricator-ui://components/button")).toBe(
      "/components/button"
    )
    expect(getPathFromUrl("fabricator-ui://blocks")).toBe("/")
  })
})
