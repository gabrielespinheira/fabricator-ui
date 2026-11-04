import { registryItemSchema } from "shadcn/schema"
import { describe, expect, it } from "vitest"

import { DEFAULT_NATIVE_LOOK } from "@/registry/fabricator/native-theme"
import {
  buildNativeInit,
  isNativeInit,
  parseNativeLook,
} from "@/registry/native-init"

describe("isNativeInit", () => {
  it("reads the platform param", () => {
    expect(isNativeInit(new URLSearchParams("platform=native"))).toBe(true)
    expect(isNativeInit(new URLSearchParams("platform=web"))).toBe(false)
    expect(isNativeInit(new URLSearchParams(""))).toBe(false)
  })
})

describe("parseNativeLook", () => {
  const look = (search: string) => {
    const result = parseNativeLook(new URLSearchParams(search))
    if (!result.success) throw new Error(result.error)
    return result.look
  }

  it("defaults to a phone's density", () => {
    expect(look("").density).toBe("spacious")
  })

  it("keeps a density the URL names", () => {
    expect(look("density=compact").density).toBe("compact")
  })

  it("takes the same look params as the website", () => {
    const parsed = look("shape=pill&primary=260_0.1&motion=snappy")
    expect(parsed.radius).toBe("pill")
    expect(parsed.motion).toBe("snappy")
    expect(parsed.colors.primary).toEqual({ hue: 260, chroma: 0.1 })
  })

  it("reports a bad look", () => {
    expect(parseNativeLook(new URLSearchParams("motion=warp")).success).toBe(
      false
    )
  })
})

describe("buildNativeInit", () => {
  const item = buildNativeInit(DEFAULT_NATIVE_LOOK)

  it("is a valid registry item", () => {
    expect(registryItemSchema.safeParse(item).success).toBe(true)
  })

  it("installs the setup through the namespaced registry", () => {
    expect(item.registryDependencies).toEqual(["@fabricator/index"])
  })

  it("ships the theme as a file and imports it", () => {
    expect(item.files?.[0]?.target).toBe("fabricator.css")
    expect(item.files?.[0]?.content).toContain("@variant dark")
    expect(item.css).toEqual({ '@import "./fabricator.css"': {} })
  })

  it("writes the look into the theme", () => {
    const pill = buildNativeInit({ ...DEFAULT_NATIVE_LOOK, radius: "pill" })
    expect(pill.files?.[0]?.content).toContain("--radius: 20px;")
    expect(item.files?.[0]?.content).toContain("--radius: 8px;")
  })
})
