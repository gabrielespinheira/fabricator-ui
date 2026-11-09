import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-native", () => ({ useColorScheme: () => "dark" }))
vi.mock("react-native-svg", () => ({
  Svg: "svg",
  Mask: "mask",
  Path: "path",
  Circle: "circle",
  Ellipse: "ellipse",
  Rect: "rect",
  Line: "line",
  Polyline: "polyline",
  Polygon: "polygon",
}))

const { FileTypeIcon } = await import("./files")
const { IconProvider } = await import("./context")

describe("native file icons", () => {
  it("uses the device palette without CSS functions", () => {
    const svg = renderToStaticMarkup(
      createElement(FileTypeIcon, { name: "index.ts" })
    )
    expect(svg).toContain('fill="#5D80FF"')
    expect(svg).not.toContain("var(")
    expect(svg).toContain('width="16"')
  })
  it("takes the app scheme and size from IconProvider", () => {
    const svg = renderToStaticMarkup(
      createElement(
        IconProvider,
        { colorScheme: "light", size: 20 },
        createElement(FileTypeIcon, { name: "index.ts" })
      )
    )
    expect(svg).toContain('fill="#4565d6"')
    expect(svg).toContain('width="20"')
  })
})
