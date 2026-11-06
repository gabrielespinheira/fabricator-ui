import { describe, expect, it } from "vitest"

import {
  buildTauriConfig,
  getStaticOutput,
  getTauriFeatures,
  getWebDevUrl,
  patchStaticBuild,
  renderTemplate,
  toAppIdentifier,
} from "./desktop"

describe("the web app a window wraps", () => {
  it("knows each framework's dev server and static output", () => {
    expect(getWebDevUrl("next")).toBe("http://localhost:3000")
    expect(getWebDevUrl("astro")).toBe("http://localhost:4321")
    expect(getStaticOutput("next")).toBe("out")
    expect(getStaticOutput("start")).toBe("dist/client")
    expect(getStaticOutput("react-router")).toBe("build/client")
  })
})

describe("patchStaticBuild", () => {
  it("exports Next only for the desktop build", () => {
    const out = patchStaticBuild(
      "next",
      `import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
}
`
    )
    expect(out).toContain('output: isDesktop ? "export" : undefined,')
    expect(out).toContain(
      'const isDesktop = process.env.FABRICATOR_DESKTOP === "1"'
    )
    expect(out).toContain("images: { unoptimized: isDesktop },")
  })

  it("turns off React Router's server only for the desktop build", () => {
    expect(
      patchStaticBuild(
        "react-router",
        `export default {
  ssr: true,
} satisfies Config
`
      )
    ).toContain('ssr: process.env.FABRICATOR_DESKTOP !== "1",')
  })

  it("makes TanStack Start write an index page for the desktop build", () => {
    const out = patchStaticBuild(
      "start",
      `plugins: [tailwindcss(), tanstackStart(), viteReact()],`
    )
    expect(out).toContain('enabled: process.env.FABRICATOR_DESKTOP === "1"')
    expect(out).toContain('outputPath: "/index"')
  })

  it("has nothing to change where the build is static already", () => {
    expect(patchStaticBuild("vite", "x")).toBe("x")
    expect(patchStaticBuild("astro", "x")).toBe("x")
  })

  it("refuses a file it doesn't recognise, and repeats nothing", () => {
    expect(patchStaticBuild("next", "module.exports = {}")).toBeNull()
    const once =
      patchStaticBuild("next", "const nextConfig: NextConfig = {\n}\n") ?? ""
    expect(patchStaticBuild("next", once)).toBe(once)
  })
})

describe("buildTauriConfig", () => {
  const config = (changes = {}) =>
    buildTauriConfig({
      appName: "Acme",
      framework: "next",
      packageManager: "pnpm",
      isGlass: true,
      ...changes,
    })

  it("loads the dev server, and the static build in production", () => {
    expect(config().build).toEqual({
      devUrl: "http://localhost:3000",
      frontendDist: "../../web/out",
      beforeBuildCommand: { script: "pnpm run build:static", cwd: "../../web" },
    })
  })

  it("names the app", () => {
    expect(config().productName).toBe("Acme")
    expect(config().identifier).toBe("app.acme.desktop")
    expect(config().app.windows[0]?.title).toBe("Acme")
  })

  it("starts the lights where the layout needs them, since it can't move them", () => {
    expect(config().app.windows[0]?.trafficLightPosition).toEqual({
      x: 16,
      y: 23,
    })
  })

  it("is transparent only with glass", () => {
    expect(config().app.windows[0]?.transparent).toBe(true)
    expect(config().app.windows[0]?.windowEffects).toBeDefined()
    expect(config({ isGlass: false }).app.windows[0]?.transparent).toBe(false)
    expect(
      config({ isGlass: false }).app.windows[0]?.windowEffects
    ).toBeUndefined()
  })

  it("asks for macOS's private API only with glass, the same way in both files", () => {
    expect(config().app.macOSPrivateApi).toBe(true)
    expect(getTauriFeatures(true)).toBe('"macos-private-api"')
    expect(config({ isGlass: false }).app.macOSPrivateApi).toBe(false)
    expect(getTauriFeatures(false)).toBe("")
  })
})

describe("helpers", () => {
  it("makes a valid identifier from any name", () => {
    expect(toAppIdentifier("My App_2")).toBe("app.my-app-2.desktop")
    expect(toAppIdentifier("123")).toBe("app.a123.desktop")
  })

  it("fills a template's tokens", () => {
    expect(renderTemplate("a __X__ b __X__ __Y__", { X: "1", Y: "2" })).toBe(
      "a 1 b 1 2"
    )
  })
})
