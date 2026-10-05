import { describe, expect, it } from "vitest"

import {
  buildRegistryBase,
  DEFAULT_CONFIG,
  POINTER_CURSOR_SELECTOR,
} from "@/registry/config"
import { toFabricatorRegistryBase } from "@/registry/fabricator-init"

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
        mode: "fabricator",
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
      $schema: "https://fabricator-ui.com/schema.json",
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
    expect(json.cssVars.light.radius).toBe("0.625rem")
    expect(json.dependencies).toBeUndefined()
    expect(json.registryDependencies).toBeUndefined()
  })

  it("configures the @fabricator registry in fabricator mode", async () => {
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

  it("configures blend mode when registry=blend", async () => {
    const response = await GET(createRequest("?registry=blend&style=vega"))
    const json = await response.json()

    expect(json.config.style).toBe("base-vega")
    expect(json.config.registries["@fabricator"]).toMatch(
      /\/r\/\{style\}\/\{name\}\.json$/
    )
    expect(json.registryDependencies[0]).toMatch(/\/r\/base-vega\/utils\.json$/)
  })

  it("fills missing params from the default Fabricator preset", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:4000/init?base=radix&template=vite"),
    } as Parameters<typeof GET>[0])
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.config.style).toBe("radix-nova")
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
