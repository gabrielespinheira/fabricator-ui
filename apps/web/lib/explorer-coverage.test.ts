import { existsSync, readdirSync, readFileSync } from "node:fs"
import ts from "typescript"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { nativeItems } from "@/registry/native/_registry"

import { getExplorerComponents } from "../../mobile/src/components/component-model"
import { getExplorerNavGroups } from "./component-explorer"
import { COMPONENT_GROUPS, getComponentGroup } from "./component-groups"
import { getDocsExplorerGroups } from "./docs-explorer"

const examples = new URL("../examples/native/", import.meta.url)
const appShellDocs = new URL("../content/docs/app-shell/", import.meta.url)

describe("cross-platform explorer coverage", () => {
  it("lists a reference for every App Shell component export", () => {
    const source = readFileSync(
      new URL("../registry/fabricator/base/ui/app-shell.tsx", import.meta.url),
      "utf8"
    )
    const shell = ts.createSourceFile(
      "app-shell.tsx",
      source,
      ts.ScriptTarget.Latest
    )
    const exports = shell.statements
      .filter(ts.isExportDeclaration)
      .flatMap(({ exportClause }) =>
        exportClause && ts.isNamedExports(exportClause)
          ? exportClause.elements
          : []
      )
      .filter(({ isTypeOnly, name }) => !isTypeOnly && /^[A-Z]/.test(name.text))
      .map(({ name }) => name.text)
      .filter((name) => name !== "AppShell")

    const pages = readdirSync(appShellDocs)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => ({
        url: `/docs/app-shell/${file.slice(0, -4)}`,
        title:
          /^title: (.+)$/m.exec(
            readFileSync(new URL(file, appShellDocs), "utf8")
          )?.[1] ?? "",
      }))
    const group = getDocsExplorerGroups(pages, "base").find(
      (group) => group.id === "group-app-shell"
    )
    expect(group?.items.map((item) => item.label).sort()).toEqual(
      exports.sort()
    )
    expect(group?.items.map((item) => item.href).sort()).toEqual(
      pages.map((page) => page.url).sort()
    )
  })

  it.each(["base", "radix", "aria", "native"])(
    "lists every %s component in the page tree used by the command menu",
    (base) => {
      const directory = new URL(
        `../content/docs/components/${base}/`,
        import.meta.url
      )
      const metadata = z
        .object({ pages: z.array(z.string()) })
        .parse(
          JSON.parse(readFileSync(new URL("meta.json", directory), "utf8"))
        )
      const missing = readdirSync(directory)
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => name.replace(/\.mdx$/, ""))
        .filter((name) => !metadata.pages.includes(name))
      expect(missing).toEqual([])
    }
  )
  it.each(["base", "radix", "aria", "native"])(
    "keeps the %s component taxonomy and gives App Shell its own docs group",
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
      const groups = docsGroups.filter((group) => group.collapsible)
      expect(groups.map((item) => item.label)).toEqual([
        "App Shell",
        ...COMPONENT_GROUPS,
      ])
      const appShell = groups.find((group) => group.id === "group-app-shell")
      expect(appShell?.items.map((item) => item.href)).toEqual(
        [
          "app-shell",
          "sidebar",
          "app-nav",
          "tab-strip",
          "workspace-switcher",
          "user-menu",
        ].map((name) => `/docs/components/${base}/${name}`)
      )
      const shellPages = new Set(appShell?.items.map((item) => item.id))
      expect(
        groups.slice(1).map((group) => ({
          id: group.id,
          pages: group.items.map((item) => item.href),
        }))
      ).toEqual(
        exampleGroups[1]?.items.map((item) => ({
          id: item.id,
          pages: item.children
            ?.map((child) => `/docs/components/${base}/${child.id}`)
            .filter((url) => !shellPages.has(url)),
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
