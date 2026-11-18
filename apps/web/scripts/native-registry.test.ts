import { describe, expect, it } from "vitest"

import {
  assembleNativeStyleMap,
  findPlaceholders,
  findUnstyledPlaceholders,
  getNativeSourcePath,
  getPublishedPath,
  rewriteSharedImports,
} from "./native-registry"

describe("getNativeSourcePath", () => {
  it("reads components from the native tree", () => {
    expect(getNativeSourcePath("ui/button.tsx")).toBe(
      "registry/native/ui/button.tsx"
    )
    expect(getNativeSourcePath("lib/motion.ts")).toBe(
      "registry/native/lib/motion.ts"
    )
  })

  it("reads tokens from the modules the website is generated from", () => {
    expect(getNativeSourcePath("lib/fabricator/density-scale.ts")).toBe(
      "registry/fabricator/density.ts"
    )
    expect(getNativeSourcePath("lib/fabricator/look.ts")).toBe(
      "registry/fabricator/look.ts"
    )
  })

  it("reads the models from the shared overlay", () => {
    expect(getNativeSourcePath("lib/app-shell-model.ts")).toBe(
      "registry/fabricator/shared/lib/app-shell-model.ts"
    )
    expect(getNativeSourcePath("lib/date-picker-model.ts")).toBe(
      "registry/fabricator/shared/lib/date-picker-model.ts"
    )
    expect(getNativeSourcePath("lib/event-calendar-model.ts")).toBe(
      "registry/fabricator/shared/lib/event-calendar-model.ts"
    )
  })

  it("reads the shared hooks from the shared overlay", () => {
    expect(getNativeSourcePath("hooks/use-event-calendar.ts")).toBe(
      "registry/fabricator/shared/hooks/use-event-calendar.ts"
    )
    expect(getNativeSourcePath("hooks/use-mobile.ts")).toBe(
      "registry/native/hooks/use-mobile.ts"
    )
  })
})

describe("rewriteSharedImports", () => {
  it("points shared imports at their installed copies", () => {
    expect(
      rewriteSharedImports(
        'import { DENSITIES } from "@/registry/fabricator/density"\nimport { x } from "@/registry/fabricator/shared/lib/app-shell-model"\nimport { y } from "@/registry/native/ui/text"'
      )
    ).toBe(
      'import { DENSITIES } from "@/registry/native/lib/fabricator/density-scale"\nimport { x } from "@/registry/native/lib/app-shell-model"\nimport { y } from "@/registry/native/ui/text"'
    )
  })

  it("points a shared module's relative imports at the installed copies", () => {
    expect(
      rewriteSharedImports(
        'import { a } from "./editor-model"\nimport type { b } from "./not-shared"'
      )
    ).toBe(
      'import { a } from "@/registry/native/lib/editor-model"\nimport type { b } from "./not-shared"'
    )
  })

  it("points shared hooks and their per-base imports at the installed copies", () => {
    expect(
      rewriteSharedImports(
        'import { a } from "@/registry/fabricator/shared/hooks/use-event-calendar"\nimport { b } from "@/registry/bases/__base__/lib/event-calendar-model"'
      )
    ).toBe(
      'import { a } from "@/registry/native/hooks/use-event-calendar"\nimport { b } from "@/registry/native/lib/event-calendar-model"'
    )
  })
})

describe("findPlaceholders", () => {
  it("finds what the style map didn't replace", () => {
    expect(
      findPlaceholders('cva("cn-button flex-row", { a: "cn-button-size-sm" })')
    ).toEqual(["cn-button", "cn-button-size-sm"])
  })

  it("ignores the cn function and words containing it", () => {
    expect(findPlaceholders('cn("flex", className) // scan-result')).toEqual([])
  })
})

describe("findUnstyledPlaceholders", () => {
  it("reports placeholders the style map has no rule for", () => {
    expect(
      findUnstyledPlaceholders('cva("cn-a cn-b")', { "cn-a": "flex" })
    ).toEqual(["cn-b"])
  })

  it("passes when every placeholder has a rule", () => {
    expect(findUnstyledPlaceholders('cn("cn-a")', { "cn-a": "flex" })).toEqual(
      []
    )
  })
})

describe("assembleNativeStyleMap", () => {
  it("nests the parts under one selector", () => {
    expect(assembleNativeStyleMap([".cn-a {}\n", ".cn-b {}"])).toContain(
      ".style-native {\n.cn-a {}\n\n.cn-b {}\n}"
    )
  })
})

describe("getPublishedPath", () => {
  it("writes the same shape as the website's items", () => {
    expect(getPublishedPath("ui/button.tsx")).toBe(
      "registry/native/ui/button.tsx"
    )
  })

  it("refuses test files", () => {
    expect(() => getPublishedPath("lib/motion.test.ts")).toThrow()
  })
})
