import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AppShellHeaderActions as AriaHeaderActions } from "@/registry/fabricator/aria/ui/app-shell"
import { AppShellHeaderActions as BaseHeaderActions } from "@/registry/fabricator/base/ui/app-shell"
import { AppShellHeaderActions as RadixHeaderActions } from "@/registry/fabricator/radix/ui/app-shell"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg data-icon-placeholder="" />,
}))

const BASES = [
  ["base", BaseHeaderActions],
  ["radix", RadixHeaderActions],
  ["aria", AriaHeaderActions],
] as const

const actions = [{ id: "export", label: "Export", onSelect: () => {} }]

/** The ellipsis trigger: the one button named for the header's menu. */
function getMenuTrigger(markup: string, label: string) {
  const match = markup.match(
    new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`)
  )
  return match?.[0]
}

describe.each(BASES)("%s header menu", (_, AppShellHeaderActions) => {
  it("folds the actions into a menu shown on phones only", () => {
    const markup = renderToStaticMarkup(
      <AppShellHeaderActions actions={actions} />
    )
    expect(getMenuTrigger(markup, "More actions")).toContain(
      "@min-[48rem]/app-shell:hidden"
    )
  })

  it("keeps a page menu's trigger on every width, under its own name", () => {
    const markup = renderToStaticMarkup(
      <AppShellHeaderActions
        actions={actions}
        menu={<span>Compare to previous period</span>}
        menuLabel="Dashboard options"
      />
    )
    const trigger = getMenuTrigger(markup, "Dashboard options")
    expect(trigger).toBeDefined()
    expect(trigger).not.toContain("@min-[48rem]/app-shell:hidden")
    expect(getMenuTrigger(markup, "More actions")).toBeUndefined()
  })

  it("names a page menu Page options by default", () => {
    const markup = renderToStaticMarkup(
      <AppShellHeaderActions menu={<span>Density</span>} />
    )
    expect(getMenuTrigger(markup, "Page options")).toBeDefined()
  })
})
