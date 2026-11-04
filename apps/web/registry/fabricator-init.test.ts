import { describe, expect, it } from "vitest"

import {
  resolveFabricatorSearchParams,
  toFabricatorRegistryBase,
  usesFabricatorIcons,
} from "./fabricator-init"

type Config = { iconLibrary: string; registries?: unknown }

const CONFIG = { base: "base", style: "nova" } as const
const SITE = "https://example.com"
const params = (query: string) => new URLSearchParams(query)

describe("usesFabricatorIcons", () => {
  it("is the default, with or without the named preset", () => {
    expect(usesFabricatorIcons(params(""))).toBe(true)
    expect(usesFabricatorIcons(params("preset=fabricator&base=radix"))).toBe(
      true
    )
  })

  it("can be asked for by name", () => {
    expect(usesFabricatorIcons(params("iconLibrary=fabricator"))).toBe(true)
  })

  it("gives way to an explicit library", () => {
    expect(usesFabricatorIcons(params("iconLibrary=lucide"))).toBe(false)
    expect(usesFabricatorIcons(params("iconLibrary=tabler"))).toBe(false)
  })

  it("gives way to a shadcn preset code, which carries its own library", () => {
    expect(usesFabricatorIcons(params("preset=b0"))).toBe(false)
  })
})

describe("resolveFabricatorSearchParams", () => {
  it('writes "lucide" for shadcn, whose schema has no Fabricator library', () => {
    for (const query of ["", "iconLibrary=fabricator"]) {
      const resolved = resolveFabricatorSearchParams(params(query))
      expect(resolved.success && resolved.params.get("iconLibrary")).toBe(
        "lucide"
      )
    }
  })

  it("keeps an explicit library", () => {
    const resolved = resolveFabricatorSearchParams(params("iconLibrary=tabler"))
    expect(resolved.success && resolved.params.get("iconLibrary")).toBe(
      "tabler"
    )
  })
})

describe("toFabricatorRegistryBase", () => {
  const payload = {
    config: { iconLibrary: "lucide" } as Config,
    dependencies: ["cn", "lucide-react"],
    registryDependencies: ["utils", "@fabricator/already"],
  }

  it("points a Fabricator project at the Fabricator icons", () => {
    const base = toFabricatorRegistryBase(payload, {
      config: CONFIG,
      icons: true,
      siteUrl: SITE,
    })
    expect(base.config.registries).toEqual({
      "@fabricator": {
        url: `${SITE}/r/fabricator/{style}/{name}.json`,
        params: { icons: "fabricator" },
      },
    })
    // bare upstream items still resolve against a real shadcn library
    expect(base.config.iconLibrary).toBe("lucide")
    expect(base.dependencies).toEqual(["cn", "@fabricator-ui/icons"])
    expect(base.registryDependencies).toContain(
      `${SITE}/r/fabricator/base-nova/utils.json?icons=fabricator`
    )
    expect(base.registryDependencies).toContain("@fabricator/already")
  })

  it("leaves the project's registry entry alone in a partial payload", () => {
    const base = toFabricatorRegistryBase(payload, {
      config: CONFIG,
      icons: true,
      isPartial: true,
      siteUrl: SITE,
    })
    expect(base.config.registries).toBeUndefined()
  })

  it("leaves another icon library's project as it was", () => {
    const base = toFabricatorRegistryBase(payload, {
      config: CONFIG,
      icons: false,
      siteUrl: SITE,
    })
    expect(base.config.registries).toEqual({
      "@fabricator": `${SITE}/r/fabricator/{style}/{name}.json`,
    })
    expect(base.dependencies).toEqual(["cn", "lucide-react"])
    expect(base.registryDependencies).toContain(
      `${SITE}/r/fabricator/base-nova/utils.json`
    )
  })
})
