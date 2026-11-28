import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

import { SiteHeader } from "./site-header"

vi.mock("@/lib/source", () => ({
  source: { pageTree: { name: "Docs", children: [] } },
}))
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}))

it("offers an accessible search trigger outside the docs shell", () => {
  const html = renderToStaticMarkup(<SiteHeader />)
  expect(html).toContain('aria-label="Search documentation"')
})

it("links to /create once, from Get started, not again in the nav", () => {
  const html = renderToStaticMarkup(<SiteHeader />)
  expect(html.match(/href="\/create"/g)).toHaveLength(1)
  expect(html).toContain("Get started")
})
