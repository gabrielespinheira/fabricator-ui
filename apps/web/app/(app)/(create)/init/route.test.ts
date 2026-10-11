import { describe, expect, it } from "vitest"

import {
  buildRegistryBase,
  DEFAULT_CONFIG,
  POINTER_CURSOR_SELECTOR,
} from "@/registry/config"
import { toFabricatorRegistryBase } from "@/registry/fabricator-init"
import { FABRICATOR_PALETTE } from "@/registry/fabricator/foundations"

import { GET } from "./route"

function createRequest(search = "") {
  const searchParams = new URLSearchParams(
    Object.entries(DEFAULT_CONFIG).map(([key, value]) => [key, String(value)])
  )
  const url = new URL(`http://localhost:4000/init${search}`)

  for (const [key, value] of url.searchParams) {
    searchParams.set(key, value)
  }

  return {
    nextUrl: new URL(`http://localhost:4000/init?${searchParams}`),
  } as Parameters<typeof GET>[0]
}

describe("GET /init", () => {
  it("returns the full registry base when only is omitted", async () => {
    const response = await GET(createRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual(
      toFabricatorRegistryBase(buildRegistryBase(DEFAULT_CONFIG), {
        config: DEFAULT_CONFIG,
        palette: true,
      })
    )
    expect(json.css["@layer base"][POINTER_CURSOR_SELECTOR]).toBeUndefined()
  })

  it("returns pointer cursor css when pointer is enabled", async () => {
    const response = await GET(createRequest("?pointer=true"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.css["@layer base"][POINTER_CURSOR_SELECTOR]).toEqual({
      cursor: "pointer",
    })
  })

  it("returns a sparse registry base when only is provided", async () => {
    const response = await GET(createRequest("?only=theme"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.type).toBe("registry:base")
    expect(json.config).toEqual({
      $schema: "https://fabricator-ui.vercel.app/schema.json",
      menuColor: "default",
      menuAccent: "subtle",
      tailwind: {
        baseColor: "neutral",
      },
      registries: {
        "@fabricator": expect.stringMatching(
          /\/r\/fabricator\/\{style\}\/\{name\}\.json$/
        ),
      },
    })
    expect(json.cssVars.light).toBeDefined()
    // The default (fabricator) preset applies the Fabricator palette.
    expect(json.cssVars.light.radius).toBe(FABRICATOR_PALETTE.light.radius)
    expect(json.dependencies).toBeUndefined()
    expect(json.registryDependencies).toBeUndefined()
  })

  it("configures the @fabricator registry", async () => {
    const response = await GET(createRequest())
    const json = await response.json()

    expect(json.config.style).toBe("base-nova")
    expect(json.config.registries["@fabricator"]).toMatch(
      /\/r\/fabricator\/\{style\}\/\{name\}\.json$/
    )
    for (const dependency of json.registryDependencies) {
      expect(dependency).toMatch(/\/r\/fabricator\/base-nova\/[\w-]+\.json$/)
    }
  })

  it("uses the Fabricator registry for any upstream style", async () => {
    const response = await GET(createRequest("?style=vega"))
    const json = await response.json()

    expect(json.config.style).toBe("base-vega")
    expect(json.config.registries["@fabricator"]).toMatch(
      /\/r\/fabricator\/\{style\}\/\{name\}\.json$/
    )
    expect(json.registryDependencies[0]).toMatch(
      /\/r\/fabricator\/base-vega\/utils\.json$/
    )
  })

  it("fills missing params from the default Fabricator preset", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:4000/init?base=radix&template=vite"),
    } as Parameters<typeof GET>[0])
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.config.style).toBe("radix-nova")
  })

  it("installs the foundations", async () => {
    const response = await GET(createRequest())
    const json = await response.json()

    expect(json.registryDependencies).toContainEqual(
      expect.stringMatching(/\/r\/fabricator\/base-nova\/foundations\.json$/)
    )
    expect(json.cssVars.light.background).toBe(
      FABRICATOR_PALETTE.light.background
    )
  })

  it("keeps a shadcn preset code's own colours", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:4000/init?preset=b0"),
    } as Parameters<typeof GET>[0])
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.cssVars.light.background).not.toBe(
      FABRICATOR_PALETTE.light.background
    )
  })

  it("rejects unknown preset names", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:4000/init?preset=nope"),
    } as Parameters<typeof GET>[0])

    expect(response.status).toBe(400)
  })

  it("rejects unsupported only values", async () => {
    const response = await GET(createRequest("?only=icon"))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe(
      "Invalid only value. Use one or more of: theme, font"
    )
  })
})
