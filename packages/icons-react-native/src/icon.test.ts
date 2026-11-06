import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const scheme = vi.hoisted((): { current: "light" | "dark" } => ({
  current: "light",
}))

// The two native boundaries: the device scheme, and the SVG primitives,
// rendered here as plain SVG elements so the markup can be read.
vi.mock("react-native", () => ({ useColorScheme: () => scheme.current }))
vi.mock("react-native-svg", () => ({
  Svg: "svg",
  Path: "path",
  Circle: "circle",
  Ellipse: "ellipse",
  Rect: "rect",
  Line: "line",
  Polyline: "polyline",
  Polygon: "polygon",
  Defs: "defs",
  LinearGradient: "linearGradient",
  RadialGradient: "radialGradient",
  Stop: "stop",
}))

const { HouseIcon, House, IconProvider, Icon, VaultIcon } = await import(
  "./index"
)
const { GithubIcon, GoogleIcon, PinterestIcon } = await import("./brands")

const render = renderToStaticMarkup

beforeEach(() => {
  scheme.current = "light"
})

describe("outline icons", () => {
  it("draw with Lucide's attributes in the scheme's foreground", () => {
    expect(render(createElement(HouseIcon))).toMatch(
      /^<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=/
    )
  })

  it("follow dark mode with no provider", () => {
    scheme.current = "dark"
    expect(render(createElement(HouseIcon))).toContain('stroke="#f5f5f5"')
  })

  it("take defaults from the provider, and props over them", () => {
    const markup = render(
      createElement(
        IconProvider,
        { color: "#2563eb", size: 20, strokeWidth: 1.5 },
        createElement(HouseIcon, { size: 16 })
      )
    )
    expect(markup).toContain('width="16" height="16"')
    expect(markup).toContain('stroke="#2563eb" stroke-width="1.5"')
  })

  it("colour Lucide's filled dots like the stroke", () => {
    expect(render(createElement(VaultIcon, { color: "red" }))).not.toContain(
      "currentColor"
    )
  })

  it("export the same component under both names", () => {
    expect(House).toBe(HouseIcon)
  })

  it("draw a duotone layer from props", () => {
    const markup = render(
      createElement(Icon, {
        data: {
          name: "demo",
          node: [["rect", { x: "3", y: "3", width: "18", height: "18" }]],
          secondary: [["rect", { x: "5", y: "5", width: "14", height: "14" }]],
        },
        secondaryColor: "#2563eb",
      })
    )
    expect(markup).toContain(
      '<rect stroke="none" fill="#2563eb" fill-opacity="0.2" x="5"'
    )
  })
})

describe("brand icons", () => {
  it("draw in the scheme's foreground by default", () => {
    scheme.current = "dark"
    expect(render(createElement(GithubIcon))).toContain('fill="#f5f5f5"')
  })

  it('paint the lifted hex in dark mode with color="brand"', () => {
    expect(render(createElement(PinterestIcon, { color: "brand" }))).toContain(
      'fill="#BD081C"'
    )
    scheme.current = "dark"
    expect(
      render(createElement(PinterestIcon, { color: "brand" }))
    ).not.toContain('fill="#BD081C"')
  })

  it("draw multi-colour art in its own box", () => {
    const markup = render(createElement(GoogleIcon, { color: "brand" }))
    expect(markup).toContain('viewBox="0 0 256 262"')
    expect(markup.match(/<path fill="#/g)?.length).toBeGreaterThan(1)
  })

  it("follow a provider's colour scheme over the device's", () => {
    const markup = render(
      createElement(
        IconProvider,
        { colorScheme: "dark" },
        createElement(GithubIcon, { color: "brand" })
      )
    )
    expect(markup).toContain('fill="#f5f5f5"')
  })
})

describe("gradient brand marks", () => {
  it('draw their gradients with per-copy ids, with color="brand"', async () => {
    const { FirefoxIcon } = await import("./brands")
    const markup = render(
      createElement(
        "div",
        null,
        createElement(FirefoxIcon, { color: "brand" }),
        createElement(FirefoxIcon, { color: "brand" })
      )
    )
    const ids = [...markup.matchAll(/<radialgradient id="([^"]+)g0"/gi)].map(
      (match) => match[1]
    )
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    expect(markup).toMatch(/fill="url\(#[^"]+g0\)"/)
  })
})
