import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { readDataTableExamples } from "./sync-data-table-examples"

describe("SwiftUI's canonical React account fixture", () => {
  it("keeps every generated account, column type, label and status tone", async () => {
    const source = await readFile(
      new URL(
        "../../../apps/web/examples/base/data-table-demo.tsx",
        import.meta.url
      ),
      "utf8"
    )
    const examples = readDataTableExamples(source)
    expect(examples.rows).toHaveLength(10_000)
    expect(new Set(examples.rows.map((row) => row.id)).size).toBe(10_000)
    expect(examples.columns.map((column) => column.meta.type)).toEqual([
      "text",
      "status",
      "person",
      "tags",
      "currency",
      "percent",
      "progress",
      "number",
      "date",
      "link",
      "email",
      "boolean",
    ])
    expect(examples.columns[0]).toMatchObject({
      id: "company",
      size: 210,
      meta: {
        label: "Company",
        primary: true,
        pin: "start",
        aggregate: "count",
      },
    })
    expect(examples.columns[1]?.meta.options).toContainEqual({
      value: "won",
      label: "Won",
      tone: "success",
    })
    expect(examples.columns[2]?.meta.options?.[0]).toMatchObject({
      value: "Maya Chen",
      image: "https://avatar.vercel.sh/maya-chen",
    })
    expect(examples.columns[4]?.meta.format?.fractionDigits).toBe(0)
    expect(examples.now).toBe(Date.UTC(2026, 10, 12, 12))
    expect(examples.rows[0]).toMatchObject({ id: "acc-1" })
    expect(readDataTableExamples(source)).toEqual(examples)
  })

  it("reports a changed fixture instead of silently substituting demo data", () => {
    expect(() => readDataTableExamples("const rows = []")).toThrow(
      "Missing canonical Data Table declaration"
    )
  })
})
