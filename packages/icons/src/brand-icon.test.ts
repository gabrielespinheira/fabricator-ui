import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  BrandIcon,
  GithubIcon,
  GoogleIcon,
  Instagram,
  InstagramIcon,
  PinterestIcon,
  XIcon,
} from "./brands"
import type { BrandIconData } from "./generated/runtime/types"
import { XIcon as CloseIcon } from "./index"

const render = renderToStaticMarkup

describe("brand icons", () => {
  it("draw in one colour that follows the text colour by default", () => {
    expect(render(createElement(GithubIcon))).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="fab-icon fab-brand-github" aria-hidden="true"><path d="/
    )
  })

  it("take any colour", () => {
    expect(render(createElement(GithubIcon, { color: "#333" }))).toContain(
      'fill="#333"'
    )
  })

  it("widen the viewBox for marks with an optical correction", () => {
    expect(render(createElement(XIcon))).toContain(
      'viewBox="-2.286 -2.286 28.571 28.571"'
    )
  })

  it("export the same component under both names", () => {
    expect(Instagram).toBe(InstagramIcon)
  })

  it("are separate from outline icons with the same name", () => {
    expect(XIcon).not.toBe(CloseIcon)
  })

  it("ignore stroke props, so mixed lists can share props", () => {
    const markup = render(
      createElement(GithubIcon, { strokeWidth: 1.5, absoluteStrokeWidth: true })
    )
    expect(markup).not.toContain("stroke")
  })

  it("stay hidden from assistive tech unless labelled", () => {
    expect(
      render(createElement(GithubIcon, { "aria-label": "GitHub" }))
    ).not.toContain("aria-hidden")
  })
})

describe('color="brand"', () => {
  it("paints the official hex, switching to the lifted one in dark mode", () => {
    const markup = render(createElement(PinterestIcon, { color: "brand" }))
    expect(markup).toContain('fill="#BD081C"')
    expect(markup).toMatch(/style="fill:light-dark\(#BD081C, #[0-9a-f]{6}\)"/i)
  })

  it("leaves achromatic marks on the text colour", () => {
    const markup = render(createElement(GithubIcon, { color: "brand" }))
    expect(markup).toContain('fill="currentColor"')
    expect(markup).not.toContain("light-dark")
  })

  it("draws multi-colour art in its own box", () => {
    const markup = render(createElement(GoogleIcon, { color: "brand" }))
    expect(markup).toContain('viewBox="0 0 256 262"')
    expect(markup).toContain('fill="currentColor"')
    expect(markup.match(/<path fill="#/g)?.length).toBeGreaterThan(1)
  })

  it("skips the dark-mode style when the hex needs no lift", () => {
    const data: BrandIconData = {
      name: "demo",
      node: [["path", { d: "M0 0h24v24H0z" }]],
      colors: { inherit: false, light: "#1ED760", dark: "#1ED760" },
    }
    const markup = render(createElement(BrandIcon, { data, color: "brand" }))
    expect(markup).toContain('fill="#1ED760"')
    expect(markup).not.toContain("style")
  })
})
