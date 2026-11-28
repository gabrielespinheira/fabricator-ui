import { createLoader, createSerializer } from "nuqs/server"
import { describe, expect, it } from "vitest"

import { getPreviewSet, iconQueryParsers } from "./icon-query"

const readIconQuery = createLoader(iconQueryParsers)
const writeIconQuery = createSerializer(iconQueryParsers)

describe("icon preview links", () => {
  it("opens the All tab when the link has no set", () => {
    expect(readIconQuery("?q=github")).toMatchObject({ set: "all", page: 1 })
  })

  it("keeps an All results page in the URL", () => {
    const query = writeIconQuery({ q: "arrow", page: 3 })
    expect(readIconQuery(query)).toMatchObject({
      set: "all",
      q: "arrow",
      page: 3,
    })
  })

  it.each([
    "outline",
    "fill",
    "duotone",
    "animated",
    "brands",
    "files",
  ] as const)("keeps a selected %s icon in the All tab", (iconSet) => {
    const query = writeIconQuery({ set: "all", icon: "example", iconSet })
    const params = readIconQuery(query)
    expect(params).toMatchObject({ set: "all", icon: "example" })
    expect(getPreviewSet(params)).toBe(iconSet)
  })

  it("keeps the original set on existing preview links", () => {
    expect(getPreviewSet(readIconQuery("?icon=bell"))).toBe("outline")
    expect(getPreviewSet(readIconQuery("?set=animated&icon=bell"))).toBe(
      "animated"
    )
    expect(
      getPreviewSet(readIconQuery("?set=outline&iconSet=brands&icon=bell"))
    ).toBe("outline")
  })

  it.each([14, 18, 32, 48] as const)("round-trips a %d px preview", (size) => {
    const query = writeIconQuery({ set: "duotone", q: "archive", size })

    expect(query).toContain(`size=${size}`)
    expect(readIconQuery(query)).toMatchObject({
      set: "duotone",
      q: "archive",
      size,
    })
  })

  it.each(["", "?size=64", "?size=invalid"])(
    "defaults to 24 px when the link specifies no supported size: %s",
    (query) => {
      expect(readIconQuery(query).size).toBe(24)
    }
  )

  it.each([0.5, 0.55, 1.25, 2.95, 3])(
    "round-trips a stroke width of %d",
    (stroke) => {
      const query = writeIconQuery({ size: 48, stroke })
      expect(readIconQuery(query)).toMatchObject({ size: 48, stroke })
    }
  )

  it.each(["0.49", "3.1", "NaN", "Infinity", "2px"])(
    "uses 1.75 for an invalid preview stroke of %s",
    (stroke) => {
      expect(readIconQuery(`?stroke=${stroke}`).stroke).toBe(1.75)
    }
  )
})
