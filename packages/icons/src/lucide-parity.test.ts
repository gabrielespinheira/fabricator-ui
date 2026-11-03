import { createElement } from "react"
import { loadOutlineIcons, readLock } from "@fabricator-ui/icons-core"
import { icons as lucideData } from "@lucide/icons"
import * as lucideReact from "lucide-react-parity"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

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

function withoutClass(markup: string) {
  return markup.replace(/ class="[^"]*"/, "")
}

describe("Lucide parity", () => {
  it("vendors the same Lucide release the parity packages come from", () => {
    expect(readLock().lucide?.tag).toBe("1.66.0")
  })

  it("covers every icon @lucide/icons publishes", () => {
    expect(lucideIcons.map((icon) => icon.name).sort()).toEqual(
      [...published.keys()].sort()
    )
  })

  it("has the same shapes as @lucide/icons for every icon", () => {
    const mismatches = lucideIcons.filter((icon) => {
      const theirs = published.get(icon.name)
      return (
        !theirs ||
        JSON.stringify(withoutKeys(theirs.node)) !== JSON.stringify(icon.node)
      )
    })
    expect(mismatches.map((icon) => icon.name)).toEqual([])
  })

  it("renders the same markup as lucide-react for every icon, apart from class names", async () => {
    const props = { size: 20, strokeWidth: 1.5, "data-slot": "icon" }
    const mismatches: string[] = []
    for (const icon of lucideIcons) {
      const load = outlineImports[icon.name]
      const theirs = published.get(icon.name)
      if (!load || !theirs) {
        mismatches.push(icon.name)
        continue
      }
      const { default: ours } = await load()
      const oursMarkup = renderToStaticMarkup(createElement(ours, props))
      const theirsMarkup = renderToStaticMarkup(
        createElement(lucideReact.Icon, { ...props, icon: theirs })
      )
      if (withoutClass(oursMarkup) !== withoutClass(theirsMarkup))
        mismatches.push(icon.name)
    }
    expect(mismatches).toEqual([])
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
