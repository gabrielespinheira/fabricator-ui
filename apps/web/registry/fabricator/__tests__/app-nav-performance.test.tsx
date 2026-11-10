import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AppNav as AriaAppNav } from "@/registry/fabricator/aria/ui/app-nav"
import { SidebarProvider as AriaSidebarProvider } from "@/registry/fabricator/aria/ui/sidebar"
import { AppNav as BaseAppNav } from "@/registry/fabricator/base/ui/app-nav"
import { SidebarProvider as BaseSidebarProvider } from "@/registry/fabricator/base/ui/sidebar"
import { AppNav as RadixAppNav } from "@/registry/fabricator/radix/ui/app-nav"
import { SidebarProvider as RadixSidebarProvider } from "@/registry/fabricator/radix/ui/sidebar"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const BASES = [
  ["base", BaseAppNav, BaseSidebarProvider],
  ["radix", RadixAppNav, RadixSidebarProvider],
  ["aria", AriaAppNav, AriaSidebarProvider],
] as const

describe.each(BASES)("%s navigation", (_, AppNav, SidebarProvider) => {
  it("checks the icon column once per list rather than once per row", () => {
    let reads = 0
    const items = Array.from({ length: 40 }, (_, index) => ({
      id: String(index),
      label: `Page ${index}`,
      href: `/page-${index}`,
      get icon() {
        reads += 1
        return undefined
      },
    }))
    const html = renderToStaticMarkup(
      <SidebarProvider persist={false} shortcut={null}>
        <AppNav groups={[{ id: "pages", items }]} />
      </SidebarProvider>
    )
    expect(html).toContain("Page 39")
    expect(reads).toBeLessThan(items.length * 20)
  })
})
