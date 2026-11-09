import { describe, expect, it } from "vitest"

import {
  applyExceptions,
  compareShapes,
  findMissingDemoValues,
  findUnresolvedImports,
  getItemClosure,
  getMissingComponentStatus,
  readComponentShape,
  readImports,
  type NativeItem,
  type ParityException,
} from "./native-parity"

const WEB = `
import { cva } from "class-variance-authority"

const thingVariants = cva("cn-thing flex", {
  variants: {
    variant: { default: "cn-thing-variant-default", ghost: "cn-thing-variant-ghost" },
    size: { default: "cn-thing-size-default", "icon-sm": "cn-thing-size-icon-sm" },
  },
})

function Thing({ className, onClick, showIcon, ...props }: React.ComponentProps<"div"> & { showIcon?: boolean; onClick?: () => void }) {
  return <div data-slot="thing" className={thingVariants({ className })} {...props} />
}

function ThingPart({ className }: { className?: string; nested?: { deep: string } }) {
  return <div data-slot="thing-part" className={className} />
}

function helper() {}

export { Thing, ThingPart, thingVariants }
`

describe("readComponentShape", () => {
  const shape = readComponentShape(WEB)

  it("reads named exports", () => {
    expect(shape.exports).toEqual(["Thing", "ThingPart", "thingVariants"])
  })

  it("reads cva axes and values", () => {
    expect(shape.variants).toEqual({
      variant: ["default", "ghost"],
      size: ["default", "icon-sm"],
    })
  })

  it("reads props a component declares, not nested ones", () => {
    expect(shape.props).toEqual(["className", "nested", "onClick", "showIcon"])
  })

  it("reads slots and placeholders", () => {
    expect(shape.slots).toEqual(["thing", "thing-part"])
    expect(shape.placeholders).toContain("cn-thing-variant-ghost")
  })

  it("leaves out the CLI's install-time markers", () => {
    expect(
      readComponentShape('const a = "cn-rtl-flip cn-x"').placeholders
    ).toEqual(["cn-x"])
  })
})

describe("compareShapes", () => {
  const web = readComponentShape(WEB)

  it("reports what native is missing", () => {
    const native = readComponentShape(`
      function Thing({ onPress }: { onPress?: () => void; className?: string; nested?: string }) {
        return <View data-slot="thing" />
      }
      export { Thing }
    `)
    expect(compareShapes(web, native)).toEqual(
      expect.arrayContaining([
        { kind: "export", name: "ThingPart" },
        { kind: "export", name: "thingVariants" },
        { kind: "variant", name: "variant.ghost" },
        { kind: "prop", name: "showIcon" },
        { kind: "slot", name: "thing-part" },
        { kind: "placeholder", name: "cn-thing" },
      ])
    )
  })

  it("maps onClick to onPress", () => {
    const native = readComponentShape(
      `function Thing(props: { onPress?: () => void }) {}\nexport { Thing }`
    )
    expect(compareShapes(web, native)).not.toContainEqual({
      kind: "prop",
      name: "onClick",
    })
  })

  it("passes when native only adds", () => {
    expect(compareShapes(web, web)).toEqual([])
  })
})

describe("findMissingDemoValues", () => {
  it("skips default and reports values a demo never mentions", () => {
    expect(
      findMissingDemoValues(
        readComponentShape(WEB),
        '<Thing variant="ghost" />'
      )
    ).toEqual([{ kind: "demo", name: "size.icon-sm" }])
  })
})

describe("imports", () => {
  const items = new Map<string, NativeItem>([
    [
      "button",
      {
        name: "button",
        dependencies: ["cn", "uniwind@1.13.1"],
        registryDependencies: ["@fabricator/text"],
        files: [{ path: "ui/button.tsx" }],
      },
    ],
    [
      "text",
      {
        name: "text",
        dependencies: ["@fabricator-ui/icons-react-native"],
        files: [{ path: "ui/text.tsx" }],
      },
    ],
  ])

  it("reads specifiers", () => {
    expect(
      readImports(
        'import a from "b"\nimport { c } from "@/registry/native/ui/d"'
      )
    ).toEqual(["b", "@/registry/native/ui/d"])
  })

  it("collects what dependencies bring", () => {
    const { packages, files } = getItemClosure("button", items)
    expect([...packages]).toEqual([
      "cn",
      "uniwind",
      "@fabricator-ui/icons-react-native",
    ])
    expect([...files]).toEqual(["ui/button.tsx", "ui/text.tsx"])
  })

  it("accepts what the item brings", () => {
    expect(
      findUnresolvedImports(
        "button",
        [
          "react",
          "react-native",
          "cn",
          "uniwind",
          "@fabricator-ui/icons-react-native",
          "@/registry/native/ui/text",
        ],
        items
      )
    ).toEqual([])
  })

  it("reports what an install wouldn't satisfy", () => {
    expect(
      findUnresolvedImports(
        "text",
        [
          "cn",
          "@/registry/native/ui/button",
          "@/apps/mobile/x",
          "../../../mobile/src/theme",
        ],
        items
      )
    ).toEqual([
      { kind: "import", name: "cn" },
      { kind: "import", name: "@/registry/native/ui/button" },
      { kind: "import", name: "@/apps/mobile/x" },
      { kind: "import", name: "../../../mobile/src/theme" },
    ])
  })
})

describe("applyExceptions", () => {
  it("drops reviewed gaps only", () => {
    expect(
      applyExceptions(
        "thing",
        [
          { kind: "prop", name: "showIcon" },
          { kind: "slot", name: "thing-part" },
        ],
        [
          {
            item: "thing",
            kind: "prop",
            name: "showIcon",
            reason: "x",
            date: "2026-11-04",
          },
        ]
      )
    ).toEqual([{ kind: "slot", name: "thing-part" }])
  })
})

describe("missing native components", () => {
  const exception: ParityException = {
    item: "file-tree",
    kind: "component",
    name: "file-tree",
    reason:
      "Desktop explorer ships on web first; native touch selection is deferred.",
    date: "2026-11-09",
  }

  it("reports an unlisted missing component as a failure", () => {
    expect(getMissingComponentStatus("chat-input", [exception])).toBe("missing")
  })

  it("reports an explicitly dated whole-component deferral separately", () => {
    expect(getMissingComponentStatus("file-tree", [exception])).toBe("deferred")
  })

  it.each([
    { ...exception, kind: "export" as const },
    { ...exception, name: "FileTree" },
    { ...exception, reason: " " },
    { ...exception, date: "" },
    { ...exception, date: "not a date" },
  ])("rejects incomplete or unrelated deferrals", (entry) => {
    expect(getMissingComponentStatus("file-tree", [entry])).toBe("missing")
  })

  it("does not waive API or install dependencies for an implemented component", () => {
    expect(
      applyExceptions(
        "file-tree",
        [
          { kind: "export", name: "FileTree" },
          { kind: "import", name: "missing-package" },
        ],
        [exception]
      )
    ).toHaveLength(2)
  })
})
