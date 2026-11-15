import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// A placeholder's rules are merged from every style map file that defines it,
// so a chart placeholder that shares its name with another component's (the
// excluded upstream Chart's `cn-chart-tooltip`, say) silently takes that
// component's look as well. Each one must have exactly one rule.

const ROOT = process.cwd()

const CHART_SOURCES = [
  "registry/fabricator/shared/ui",
  "registry/native/ui",
].flatMap((directory) =>
  readdirSync(path.join(ROOT, directory))
    .filter((file) =>
      /^(chart-|.*-chart\.tsx$|treemap\.tsx$|heat-calendar\.tsx$|status-bar\.tsx$)/.test(
        file
      )
    )
    .map((file) => path.join(directory, file))
)

function readPlaceholders(file: string) {
  const source = readFileSync(path.join(ROOT, file), "utf8")
  return new Set(source.match(/\bcn-[a-z][a-z0-9-]*/g) ?? [])
}

function countRules(directory: string, placeholder: string) {
  const pattern = new RegExp(`\\.${placeholder}\\s*\\{`, "g")
  return readdirSync(path.join(ROOT, directory))
    .filter((file) => file.endsWith(".css"))
    .reduce(
      (count, file) =>
        count +
        (readFileSync(path.join(ROOT, directory, file), "utf8").match(pattern)
          ?.length ?? 0),
      0
    )
}

describe("chart placeholders", () => {
  const web = new Set(
    CHART_SOURCES.filter((file) => file.includes("fabricator/shared")).flatMap(
      (file) => [...readPlaceholders(file)]
    )
  )
  const native = new Set(
    CHART_SOURCES.filter((file) => file.includes("registry/native")).flatMap(
      (file) => [...readPlaceholders(file)]
    )
  )

  it("finds the chart sources", () => {
    expect(web.size).toBeGreaterThan(20)
    expect(native.size).toBeGreaterThan(20)
  })

  it.each([...web])("gives %s one rule in the Fabricator style map", (name) => {
    expect(countRules("registry/styles/fabricator", name)).toBe(1)
  })

  it.each([...native])("gives %s one rule in the native style map", (name) => {
    expect(countRules("registry/styles/native", name)).toBe(1)
  })
})
