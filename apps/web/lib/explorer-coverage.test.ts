import { existsSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { nativeItems } from "@/registry/native/_registry"

import { getComponentGroup } from "./component-groups"

const examples = new URL("../examples/native/", import.meta.url)
describe("cross-platform explorer coverage", () => {
  it("has a native example for every documented web component", () => {
    const pages = readdirSync(
      new URL("../content/docs/components/base/", import.meta.url)
    ).filter((name) => name.endsWith(".mdx"))
    expect(
      pages.filter(
        (page) =>
          !existsSync(new URL(page.replace(".mdx", "-example.tsx"), examples))
      )
    ).toEqual([])
  })
  it("makes every published native component browsable in a known group", () => {
    const components = nativeItems.filter((item) => item.type === "registry:ui")
    expect(
      components
        .filter(
          (item) => !existsSync(new URL(`${item.name}-example.tsx`, examples))
        )
        .map((item) => item.name)
    ).toEqual([])
    for (const item of components)
      expect(() => getComponentGroup(item.name)).not.toThrow()
  })
})
