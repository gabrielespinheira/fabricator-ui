import { expect, it } from "vitest"

import { collectExplorerItems } from "@/registry/fabricator/explorer-catalog"

it("lists a web family and block without requiring native preview ownership", () => {
  const webFamily = {
    name: "kanban",
    title: "Kanban",
    type: "registry:component",
    meta: { nativeLanguages: false },
  }
  const items = collectExplorerItems([
    { name: "kanban", type: "registry:ui" },
    webFamily,
    { name: "sign-in-01", title: "Sign in", type: "registry:block" },
    { name: "utils", type: "registry:lib" },
  ])

  expect(items.map(({ name }) => name)).toEqual([
    "kanban",
    "sign-in-01",
    "typography",
  ])
  expect(items[0]).toMatchObject({
    name: "kanban",
    title: "Kanban",
    type: "registry:component",
  })
  expect(items[1]).toMatchObject({ group: "Blocks", title: "Sign in" })
})
