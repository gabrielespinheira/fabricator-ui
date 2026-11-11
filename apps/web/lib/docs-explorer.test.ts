import { describe, expect, it } from "vitest"

import { getDocsExplorerGroups, getDocsNeighbours } from "./docs-explorer"

describe("docs explorer", () => {
  it("keeps guide links and groups only the selected platform's components", () => {
    const groups = getDocsExplorerGroups(
      [
        { url: "/docs", title: "Introduction" },
        { url: "/docs/components", title: "Components" },
        { url: "/docs/installation", title: "Installation" },
        { url: "/docs/javascript", title: "JavaScript" },
        { url: "/docs/components/base/button", title: "Button" },
        { url: "/docs/components/native/button", title: "Button" },
      ],
      "native"
    )
    expect(groups[0]?.items.map((item) => item.label)).toEqual(["Overview"])
    expect(groups[1]?.items[0]?.children?.[0]?.href).toBe(
      "/docs/components/native/button"
    )
    expect(
      groups[2]?.items.flatMap(
        (item) => item.children?.map((child) => child.href) ?? []
      )
    ).toEqual(["/docs/installation", "/docs/javascript"])
  })
})

describe("docs pagination", () => {
  const components = [
    { slug: "badge", title: "Badge" },
    { slug: "bot-face", title: "BotFace" },
    { slug: "breadcrumb", title: "Breadcrumb" },
    { slug: "bubble", title: "Bubble" },
    { slug: "attachment", title: "Attachment" },
    { slug: "button", title: "Button" },
  ]
  const pages = [
    { url: "/docs/cli", title: "CLI" },
    { url: "/docs", title: "Introduction" },
    { url: "/docs/javascript", title: "JavaScript" },
    { url: "/docs/installation", title: "Installation" },
    { url: "/docs/foundations/colors", title: "Colors" },
    ...["base", "radix", "aria", "native"].flatMap((base) =>
      components.map(({ slug, title }) => ({
        url: `/docs/components/${base}/${slug}`,
        title,
      }))
    ),
  ]

  it.each(["base", "radix", "aria", "native"])(
    "follows the %s sidebar's alphabetical order within a category",
    (base) => {
      expect(
        getDocsNeighbours(pages, `/docs/components/${base}/bot-face`)
      ).toEqual({
        previous: {
          url: `/docs/components/${base}/attachment`,
          title: "Attachment",
        },
        next: { url: `/docs/components/${base}/bubble`, title: "Bubble" },
      })
    }
  )

  it("follows category order when crossing category boundaries", () => {
    expect(
      getDocsNeighbours(pages, "/docs/components/base/breadcrumb")
    ).toEqual({
      previous: { url: "/docs/components/base/button", title: "Button" },
      next: { url: "/docs/components/base/attachment", title: "Attachment" },
    })
  })

  it("starts at Overview and follows the sidebar into the guides", () => {
    expect(getDocsNeighbours(pages, "/docs")).toEqual({
      previous: undefined,
      next: { url: "/docs/components/base/badge", title: "Badge" },
    })
    expect(getDocsNeighbours(pages, "/docs/components/base/bubble")).toEqual({
      previous: { url: "/docs/components/base/bot-face", title: "BotFace" },
      next: { url: "/docs/installation", title: "Installation" },
    })
  })

  it("follows guide section order and stops at the last sidebar page", () => {
    expect(getDocsNeighbours(pages, "/docs/foundations/colors")).toEqual({
      previous: { url: "/docs/installation", title: "Installation" },
      next: { url: "/docs/cli", title: "CLI" },
    })
    expect(getDocsNeighbours(pages, "/docs/javascript")).toEqual({
      previous: { url: "/docs/cli", title: "CLI" },
      next: undefined,
    })
  })

  it.each(["/docs/components", "/docs/new", "/docs/rtl"])(
    "does not paginate %s when it is absent from the sidebar",
    (url) => {
      expect(
        getDocsNeighbours([...pages, { url, title: "Hidden" }], url)
      ).toEqual({ previous: undefined, next: undefined })
    }
  )

  it("returns no neighbours for an unknown page", () => {
    expect(getDocsNeighbours(pages, "/docs/missing")).toEqual({
      previous: undefined,
      next: undefined,
    })
  })
})
