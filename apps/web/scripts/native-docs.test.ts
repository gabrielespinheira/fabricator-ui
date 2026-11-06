import { describe, expect, it } from "vitest"

import {
  getPartsList,
  getPropsList,
  getRoles,
  getUsageImports,
  getUsageSnippet,
  getVariantsTable,
  toReaderSource,
  toTitleCase,
} from "./native-docs"

const DEMO = `import { Example, ExampleWrapper } from "@/examples/native/example"
import { Button } from "@/registry/native/ui/button"
import { cn } from "@/registry/native/lib/utils"

function ButtonExample() {
  return (
    <ExampleWrapper>
      <Example title="Variants" className="flex-row">
        <Button variant="outline">
          Outline
        </Button>
      </Example>
      <Example title="More">
        <Button />
      </Example>
    </ExampleWrapper>
  )
}
`

describe("toReaderSource", () => {
  it("writes user-facing paths and drops the demo wrappers' import", () => {
    const source = toReaderSource(DEMO)
    expect(source).toContain('from "@/components/ui/button"')
    expect(source).toContain('from "@/lib/utils"')
    expect(source).not.toContain("@/examples/native")
  })
})

describe("getUsageSnippet", () => {
  it("takes the first example's body, dedented", () => {
    expect(getUsageSnippet(DEMO)).toBe(
      '<Button variant="outline">\n  Outline\n</Button>'
    )
  })

  it("returns null without an example", () => {
    expect(getUsageSnippet("function A() {}")).toBeNull()
  })
})

describe("getUsageImports", () => {
  it("keeps the library's imports", () => {
    expect(getUsageImports(DEMO)).toBe(
      'import { Button } from "@/components/ui/button"'
    )
  })
})

const SHAPE = {
  exports: ["Button", "buttonVariants"],
  variants: { size: ["default", "sm"], variant: ["default", "ghost"] },
  props: ["className", "render", "children", "showIcon"],
  slots: ["button"],
  placeholders: [],
}

describe("the API sections", () => {
  it("lists parts, not helpers", () => {
    expect(getPartsList(SHAPE)).toEqual(["Button"])
  })

  it("tables the variants", () => {
    expect(getVariantsTable(SHAPE)).toContain(
      "| `variant` | `default`, `ghost` |"
    )
    expect(getVariantsTable({ ...SHAPE, variants: {} })).toBeNull()
  })

  it("leaves out inherited props", () => {
    expect(getPropsList(SHAPE)).toEqual(["render", "showIcon"])
  })
})

describe("getRoles", () => {
  it("reads roles", () => {
    expect(getRoles('<A role="switch" /><B role="button" />')).toEqual([
      "button",
      "switch",
    ])
  })
})

describe("toTitleCase", () => {
  it("titles a slug", () => {
    expect(toTitleCase("dropdown-menu")).toBe("Dropdown Menu")
  })
})
