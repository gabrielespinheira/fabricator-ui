import { createElement } from "react"
import {
  loadOutlineIcons,
  loadUiIcons,
  readLock,
} from "@fabricator-ui/icons-core"
import { icons as lucideData } from "@lucide/icons"
import * as lucideReact from "lucide-react-parity"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import * as Animated from "./animated"
import * as Duotone from "./duotone"
import * as Fill from "./fill"
import { outlineImports } from "./generated/dynamic-imports"
import * as fabricator from "./index"

const lucideIcons = loadOutlineIcons().filter(
  (icon) => icon.origin === "lucide"
)
const published = new Map(
  Object.values(lucideData).map((icon) => [icon.name, icon])
)

function withoutKeys(
  node: readonly (readonly [string, Record<string, unknown>, ...unknown[]])[]
) {
  return node.map(([tag, attributes]) => {
    const { key: _key, ...rest } = attributes
    return [tag, rest]
  })
}

describe("Lucide parity", () => {
  it("vendors the same Lucide release the parity packages come from", () => {
    expect(readLock().lucide?.tag).toBe("1.73.0")
  })

  it("covers every icon @lucide/icons publishes", () => {
    expect(lucideIcons.map((icon) => icon.name).sort()).toEqual(
      [...published.keys()].sort()
    )
  })

  it("keeps the vendored geometry as the compatibility fixture", () => {
    const mismatches = lucideIcons.filter((icon) => {
      const theirs = published.get(icon.name)
      return (
        !theirs ||
        JSON.stringify(withoutKeys(theirs.node)) !== JSON.stringify(icon.node)
      )
    })
    expect(mismatches.map((icon) => icon.name)).toEqual([])
  })

  it("renders the rounded drawing, preserving size, stroke and SVG props", async () => {
    const outline = loadUiIcons().find(({ name }) => name === "bookmark")
    const load = outlineImports.bookmark
    if (!outline || !load) throw new Error("Bookmark is missing")
    const { default: Bookmark } = await load()
    const props = { size: 20, strokeWidth: 2, "data-slot": "icon" }
    const markup = renderToStaticMarkup(createElement(Bookmark, props))
    expect(markup).toContain('width="20"')
    expect(markup).toContain('stroke-width="2"')
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain(outline.node[0]?.[1].d)
  })

  it("exports the same canonical components and aliases at every weight", () => {
    const names = Object.keys(fabricator).filter(
      (name) =>
        name.endsWith("Icon") &&
        !["Icon", "createIcon", "renderIcon"].includes(name)
    )
    for (const variant of [Fill, Duotone, Animated]) {
      expect(
        Object.keys(variant)
          .filter((name) => name.endsWith("Icon"))
          .sort()
      ).toEqual(names.sort())
    }
    expect(Fill.HomeIcon).toBe(Fill.HouseIcon)
    expect(Duotone.HomeIcon).toBe(Duotone.HouseIcon)
  })

  it("exports every name lucide-react exports, except its Lucide-prefixed forms", () => {
    const missing = Object.keys(lucideReact).filter(
      (name) =>
        !name.startsWith("Lucide") &&
        /^[A-Z]/.test(name) &&
        !(name in fabricator)
    )
    expect(missing).toEqual([])
  })
})
