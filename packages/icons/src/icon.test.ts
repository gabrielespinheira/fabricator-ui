import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { iconData as houseData } from "./generated/icons/house"
import { getArtworkViewBox } from "./generated/runtime/attributes"
import type { IconData } from "./generated/runtime/types"
import { HomeIcon, House, HouseIcon, Icon } from "./index"

function render(element: Parameters<typeof renderToStaticMarkup>[0]) {
  return renderToStaticMarkup(element)
}

const duotone: IconData = {
  name: "square-demo",
  node: [["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]],
  secondary: [["rect", { x: "5", y: "5", width: "14", height: "14" }]],
}

describe("outline icons", () => {
  it("renders the Fabricator grid and stroke, hidden from assistive tech", () => {
    const viewBox = getArtworkViewBox(24, 24, houseData.opticalScale)
    const markup = render(createElement(HouseIcon))
    expect(markup).toContain(
      `width="24" height="24" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.75"`
    )
    expect(markup).toContain(
      'class="fab-icon fab-icon-house" aria-hidden="true"><path '
    )
  })

  it("exports the same component under its name and aliases", () => {
    expect(House).toBe(HouseIcon)
    expect(HomeIcon).toBe(HouseIcon)
  })

  it("size, colour and stroke from props", () => {
    const markup = render(
      createElement(HouseIcon, { size: 16, color: "red", strokeWidth: 1.5 })
    )
    expect(markup).toContain('width="16" height="16"')
    expect(markup).toContain('stroke="red" stroke-width="1.5"')
  })

  it.each([0.125, 1.25, 3.75])(
    "renders a numeric strokeWidth of %d",
    (strokeWidth) => {
      expect(render(createElement(HouseIcon, { strokeWidth }))).toContain(
        `stroke-width="${strokeWidth}"`
      )
    }
  )

  it("keeps the pixel stroke width on a scaled drawing", () => {
    const markup = render(
      createElement(Icon, {
        data: { ...houseData, opticalScale: 0.8 },
        size: 48,
        absoluteStrokeWidth: true,
      })
    )
    expect(markup).toContain('viewBox="-3 -3 30 30"')
    const stroke = Number(markup.match(/ stroke-width="([^"]+)"/)?.[1])
    expect((stroke * 48) / 30).toBeCloseTo(1.75, 8)
    const override = render(
      createElement(Icon, {
        data: { ...houseData, opticalScale: 0.8 },
        size: 48,
        absoluteStrokeWidth: true,
        viewBox: "0 0 24 24",
      })
    )
    expect(override).toContain('viewBox="0 0 24 24"')
    expect(override).toContain('stroke-width="0.875"')
  })

  it("pick the stroke from a pixel size when none is given", () => {
    expect(render(createElement(HouseIcon, { size: 16 }))).toContain(
      'stroke-width="2.125"'
    )
    expect(render(createElement(HouseIcon, { size: "12" }))).toContain(
      'stroke-width="2.5"'
    )
    expect(render(createElement(HouseIcon, { size: "1em" }))).toContain(
      'stroke-width="1.75"'
    )
  })

  it("keep a given stroke at any size", () => {
    expect(
      render(createElement(HouseIcon, { size: 16, strokeWidth: 1.75 }))
    ).toContain('stroke-width="1.75"')
  })

  it("add a non-scaling stroke to every shape when asked", () => {
    const markup = render(createElement(HouseIcon, { nonScalingStroke: true }))
    expect(markup.match(/vector-effect="non-scaling-stroke"/g)).toHaveLength(2)
  })

  it("merge className after their own classes", () => {
    expect(render(createElement(HouseIcon, { className: "size-4" }))).toContain(
      'class="fab-icon fab-icon-house size-4"'
    )
  })

  it("become visible to assistive tech when labelled or given a title", () => {
    expect(
      render(createElement(HouseIcon, { "aria-label": "Home" }))
    ).not.toContain("aria-hidden")
    const titled = render(
      createElement(HouseIcon, null, createElement("title", null, "Home"))
    )
    expect(titled).not.toContain("aria-hidden")
    expect(titled).toMatch(/<\/path><title>Home<\/title><\/svg>$/)
  })

  it("pass other SVG attributes through", () => {
    const slot: Record<string, string> = { "data-icon": "inline-start" }
    expect(render(createElement(HouseIcon, slot))).toContain(
      'data-icon="inline-start"'
    )
  })
})

describe("Icon", () => {
  it("renders custom icon data", () => {
    expect(render(createElement(Icon, { data: duotone }))).toContain(
      "fab-icon-square-demo"
    )
  })

  it("draws a duotone layer under the outline, themed by CSS variables", () => {
    const markup = render(
      createElement(Icon, {
        data: duotone,
        secondaryColor: "var(--primary)",
        secondaryOpacity: 0.3,
      })
    )
    expect(markup).toContain(
      'style="--icon-secondary-color:var(--primary);--icon-secondary-opacity:0.3"'
    )
    expect(markup).toMatch(
      /<rect stroke="none" style="fill:var\(--icon-secondary-color, currentColor\);fill-opacity:var\(--icon-secondary-opacity, 0.2\)" x="5" y="5" width="14" height="14"><\/rect><rect x="3"/
    )
  })
})
