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
