import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import * as AriaTabs from "@/registry/fabricator/aria/ui/tabs"
import * as BaseTabs from "@/registry/fabricator/base/ui/tabs"
import * as RadixTabs from "@/registry/fabricator/radix/ui/tabs"

const BASES = [
  ["base", BaseTabs],
  ["radix", RadixTabs],
  ["aria", AriaTabs],
] as const

type TabsModule = (typeof BASES)[number][1]

function renderTabs(
  { Tabs, TabsList, TabsTrigger }: TabsModule,
  variant: "default" | "subtle" | "line"
) {
  // Each base names its value props differently; the shared ones are enough.
  const TabsRoot = Tabs as React.ComponentType<Record<string, unknown>>
  const Trigger = TabsTrigger as React.ComponentType<Record<string, unknown>>
  return renderToStaticMarkup(
    <TabsRoot defaultValue="home" defaultSelectedKey="home">
      <TabsList variant={variant}>
        <Trigger value="home" id="home">
          <svg data-icon="home" />
          Home
        </Trigger>
        <Trigger value="files" id="files">
          <svg data-icon="files" />
          Files {2}
        </Trigger>
      </TabsList>
    </TabsRoot>
  )
}

function getLabels(html: string) {
  return Array.from(
    html.matchAll(/<span data-slot="tabs-trigger-label"[^>]*>([^<]*)<\/span>/g),
    (match) => match[1]
  )
}

describe.each(BASES)("%s tabs", (_, tabs) => {
  it("wraps each trigger's text in a label, after its icon", () => {
    const html = renderTabs(tabs, "subtle")
    expect(getLabels(html)).toEqual(["Home", "Files 2"])
    expect(html).toMatch(/data-icon="home"[^]*?tabs-trigger-label/)
  })

  it("marks the list subtle", () => {
    expect(renderTabs(tabs, "subtle")).toContain('data-variant="subtle"')
  })

  it("renders the retired line variant as the default", () => {
    const html = renderTabs(tabs, "line")
    expect(html).toContain('data-variant="default"')
    expect(html).not.toContain('data-variant="line"')
  })
})
