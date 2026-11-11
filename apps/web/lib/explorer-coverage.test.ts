import { existsSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { nativeItems } from "@/registry/native/_registry"

import { getExplorerComponents } from "../../mobile/src/components/component-model"
import { getExplorerNavGroups } from "./component-explorer"
import { COMPONENT_GROUPS, getComponentGroup } from "./component-groups"
import { getDocsExplorerGroups } from "./docs-explorer"

const examples = new URL("../examples/native/", import.meta.url)
describe("cross-platform explorer coverage", () => {
  it.each(["base", "radix", "aria", "native"])(
    "keeps %s docs and the native examples in the same six groups",
    (base) => {
      const names = readdirSync(
        new URL(`../content/docs/components/${base}/`, import.meta.url)
      )
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => name.replace(".mdx", ""))
      const components = getExplorerComponents(names)
      const docsGroups = getDocsExplorerGroups(
        components.map((component) => ({
          url: `/docs/components/${base}/${component.slug}`,
          title: component.title,
        })),
        base
      )
      const exampleGroups = getExplorerNavGroups(components, {
        overview: undefined,
        groups: {},
      })
      expect(docsGroups[1]?.items.map((item) => item.label)).toEqual(
        COMPONENT_GROUPS
      )
      expect(docsGroups[0]?.items.map((item) => item.id)).toEqual(["overview"])
      expect(
        docsGroups[1]?.items.map((item) => ({
          id: item.id,
          count: item.badge,
          components: item.children?.map((child) => child.id),
        }))
      ).toEqual(
        exampleGroups[1]?.items.map((item) => ({
          id: item.id,
          count: item.badge,
          components: item.children?.map((child) => child.id),
        }))
      )
      for (const name of names)
        expect(existsSync(new URL(`${name}-example.tsx`, examples))).toBe(true)
    }
  )
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
