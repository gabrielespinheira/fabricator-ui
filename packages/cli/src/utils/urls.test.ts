import { describe, expect, it } from "vitest"

import {
  blendRegistryTemplate,
  buildInitUrl,
  DEFAULT_BASE_URL,
  fabricatorCatalogUrl,
  fabricatorRegistryTemplate,
  getBaseUrl,
} from "./urls"

const BASE = "https://fabricator-ui.com"

describe("getBaseUrl", () => {
  it("defaults to the production site", () => {
    expect(getBaseUrl({})).toBe(DEFAULT_BASE_URL)
    expect(getBaseUrl({ FABRICATOR_REGISTRY_URL: "  " })).toBe(DEFAULT_BASE_URL)
  })

  it("reads FABRICATOR_REGISTRY_URL and strips trailing slashes", () => {
    expect(
      getBaseUrl({ FABRICATOR_REGISTRY_URL: "http://localhost:4000" })
    ).toBe("http://localhost:4000")
    expect(
      getBaseUrl({ FABRICATOR_REGISTRY_URL: "http://localhost:4000//" })
    ).toBe("http://localhost:4000")
    expect(
      getBaseUrl({
        FABRICATOR_REGISTRY_URL: "https://preview.example.com/sub/",
      })
    ).toBe("https://preview.example.com/sub")
  })

  it("rejects values that are not http(s) URLs", () => {
    expect(() =>
      getBaseUrl({ FABRICATOR_REGISTRY_URL: "localhost:4000" })
    ).toThrow(/FABRICATOR_REGISTRY_URL/)
  })
})

describe("registry templates", () => {
  it("builds the fabricator and blend mode templates", () => {
    expect(fabricatorRegistryTemplate(BASE)).toBe(
      "https://fabricator-ui.com/r/fabricator/{style}/{name}.json"
    )
    expect(blendRegistryTemplate(BASE)).toBe(
      "https://fabricator-ui.com/r/{style}/{name}.json"
    )
    expect(fabricatorCatalogUrl(BASE, "base-nova")).toBe(
      "https://fabricator-ui.com/r/fabricator/base-nova/registry.json"
    )
  })
})

describe("buildInitUrl", () => {
  it("uses base=base and preset=fabricator by default", () => {
    expect(buildInitUrl({}, BASE)).toBe(
      "https://fabricator-ui.com/init?base=base&preset=fabricator"
    )
  })

  it("writes overrides in a stable order", () => {
    const url = buildInitUrl(
      {
        base: "radix",
        preset: "fabricator",
        style: "vega",
        theme: "zinc",
        iconLibrary: "tabler",
        font: "inter",
        radius: "large",
        rtl: true,
        pointer: true,
        template: "next",
        only: "theme,font",
      },
      BASE
    )
    expect(url).toBe(
      "https://fabricator-ui.com/init?base=radix&preset=fabricator&style=vega&theme=zinc&iconLibrary=tabler&font=inter&radius=large&rtl=true&pointer=true&template=next&only=theme%2Cfont"
    )
  })

  it("writes rtl=false only when explicitly disabled", () => {
    expect(buildInitUrl({ rtl: false }, BASE)).toContain("rtl=false")
    expect(buildInitUrl({}, BASE)).not.toContain("rtl")
  })

  it("passes shadcn preset codes through for the server to decode", () => {
    expect(buildInitUrl({ preset: "b0" }, BASE)).toBe(
      "https://fabricator-ui.com/init?base=base&preset=b0"
    )
  })

  it("returns a preset URL untouched", () => {
    const url = "https://example.com/init?base=aria&preset=custom"
    expect(buildInitUrl({ preset: url, base: "radix", rtl: true }, BASE)).toBe(
      url
    )
  })

  it("suffixes monorepo templates", () => {
    expect(buildInitUrl({ template: "next", monorepo: true }, BASE)).toContain(
      "template=next-monorepo"
    )
    expect(
      buildInitUrl({ template: "next-monorepo", monorepo: true }, BASE)
    ).toContain("template=next-monorepo")
    expect(buildInitUrl({ template: "vite", monorepo: false }, BASE)).toContain(
      "template=vite"
    )
  })

  it("adds registry=blend in blend mode", () => {
    expect(buildInitUrl({ registry: "blend" }, BASE)).toBe(
      "https://fabricator-ui.com/init?base=base&preset=fabricator&registry=blend"
    )
  })

  it("uses the environment override by default", () => {
    const previous = process.env.FABRICATOR_REGISTRY_URL
    process.env.FABRICATOR_REGISTRY_URL = "http://localhost:4000/"
    try {
      expect(buildInitUrl()).toBe(
        "http://localhost:4000/init?base=base&preset=fabricator"
      )
    } finally {
      if (previous === undefined) delete process.env.FABRICATOR_REGISTRY_URL
      else process.env.FABRICATOR_REGISTRY_URL = previous
    }
  })
})
