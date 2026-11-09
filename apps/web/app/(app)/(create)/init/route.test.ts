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

// What the CLI sends: no library unless the person picked one.
function createCliRequest(search = "") {
  return {
    nextUrl: new URL(
      `http://localhost:4000/init?base=base&preset=fabricator${search}`
    ),
  } as Parameters<typeof GET>[0]
}

describe("GET /init?platform=native", () => {
  const nativeRequest = (search = "") =>
    ({
      nextUrl: new URL(`http://localhost:4000/init?platform=native${search}`),
    }) as Parameters<typeof GET>[0]

  it("returns the React Native setup with its theme", async () => {
    const response = await GET(nativeRequest())
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.registryDependencies).toEqual(["@fabricator/index"])
    expect(json.files[0].content).toContain("--density-36: 44px;")
  })

  it("takes a look", async () => {
    const response = await GET(nativeRequest("&shape=pill"))
    const json = await response.json()
    expect(json.files[0].content).toContain("--radius: 20px;")
  })

  it("rejects a bad look", async () => {
    const response = await GET(nativeRequest("&motion=warp"))
    expect(response.status).toBe(400)
  })
})

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
    })
    expect(json.cssVars.light).toBeDefined()
    // The default (fabricator) preset applies the Fabricator palette.
    expect(json.cssVars.light.radius).toBe(FABRICATOR_PALETTE.light.radius)
    expect(json.dependencies).toBeUndefined()
    expect(json.registryDependencies).toBeUndefined()
  })

  it("installs Fabricator's icons by default", async () => {
    const response = await GET(createCliRequest())
    const json = await response.json()

    // shadcn's schema has no Fabricator library, so the field stays valid.
    expect(json.config.iconLibrary).toBe("lucide")
    expect(json.config.registries["@fabricator"].params).toEqual({
      icons: "fabricator",
    })
    expect(json.dependencies).toContain("@fabricator-ui/icons")
    expect(json.dependencies).not.toContain("lucide-react")
    expect(json.registryDependencies.join()).toContain("?icons=fabricator")
  })

  it("accepts Fabricator by name, as the setup page's share link can", async () => {
    const response = await GET(createCliRequest("&iconLibrary=fabricator"))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.config.registries["@fabricator"].params).toBeDefined()
  })

  it("keeps Lucide when asked, with a plain registry entry", async () => {
    const response = await GET(createCliRequest("&iconLibrary=lucide"))
    const json = await response.json()

    expect(json.config.registries["@fabricator"]).toMatch(
      /\/r\/fabricator\/\{style\}\/\{name\}\.json$/
    )
    expect(json.dependencies).toContain("lucide-react")
    expect(json.dependencies).not.toContain("@fabricator-ui/icons")
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

  it("applies the look from the setup page", async () => {
    const response = await GET(
      createRequest("?surface=145_0.022&primary=260_0.15&shape=pill")
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.cssVars.light).toMatchObject({
      radius: "1.25rem",
      "surface-hue": "145",
      "primary-hue": "260",
      "primary-chroma": "0.15",
      background: "var(--surface-1)",
    })
    expect(json.cssVars.dark.background).toBe("var(--surface-1)")
  })

  it("sets the project's density", async () => {
    const response = await GET(createRequest("?density=spacious"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.cssVars.light).toMatchObject({
      "density-36": "2.75rem",
      "density-text-13": "15px",
    })
  })

  it("rejects an invalid look", async () => {
    const response = await GET(createRequest("?motion=fast"))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('"motion"')
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

describe("spinner defaults", () => {
  it("writes the selected default into the web theme", async () => {
    const response = await GET(createCliRequest("&spinner=ripple"))
    const item = await response.json()
    expect(response.status).toBe(200)
    expect(item.cssVars.light["spinner-ripple"]).toBe("inline")
    expect(item.cssVars.light["spinner-orbit"]).toBe("none")
  })

  it("writes the same selection for native", async () => {
    const response = await GET(
      createCliRequest("&platform=native&spinner=ripple")
    )
    const item = await response.json()
    expect(item.cssVars.light["spinner-variant"]).toBe("1")
  })

  it("rejects an unknown spinner", async () => {
    const response = await GET(createCliRequest("&spinner=unknown"))
    expect(response.status).toBe(400)
  })
})
