import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PreviewRail } from "../shared/ui/preview-rail"

const links = [
  { value: "overview", label: "Overview", href: "#overview" },
  {
    value: "install",
    label: "Installation",
    description: "Add it with the CLI.",
    href: "#install",
  },
  { value: "usage", label: "Usage", href: "#usage", disabled: true },
  {
    value: "docs",
    label: "Docs",
    href: "https://example.com",
    target: "_blank" as const,
  },
]

const buttons = [
  { value: "inbox", label: "Inbox" },
  { value: "drafts", label: "Drafts" },
]

describe("PreviewRail", () => {
  it("is a labelled navigation landmark with one tick per item", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={links} />)
    expect(markup).toMatch(/^<nav[^>]*data-slot="preview-rail"/)
    expect(markup).toContain('aria-label="Section navigation"')
    expect(markup.match(/data-slot="preview-rail-item"/g)).toHaveLength(4)
    expect(markup.match(/data-slot="preview-rail-tick"/g)).toHaveLength(4)
  })

  it("takes its own label", () => {
    const markup = renderToStaticMarkup(
      <PreviewRail items={links} aria-label="On this page" />
    )
    expect(markup).toContain('aria-label="On this page"')
    expect(markup).not.toContain("Section navigation")
  })

  it("renders links for items with an href and names each by its label", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={links} />)
    expect(markup).toContain('href="#overview"')
    expect(markup).toContain('aria-label="Installation"')
    expect(markup).toContain('rel="noreferrer noopener"')
  })

  it("renders buttons for items without an href", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={buttons} />)
    expect(markup.match(/<button/g)).toHaveLength(2)
    expect(markup).toContain('type="button"')
  })

  it("marks the first enabled item current by default", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={links} />)
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-label="Overview"[^>]*aria-current="page"/)
  })

  it("marks the given item current, as a page for links and true for buttons", () => {
    expect(
      renderToStaticMarkup(<PreviewRail items={links} defaultValue="install" />)
    ).toMatch(/aria-label="Installation"[^>]*aria-current="page"/)
    expect(
      renderToStaticMarkup(<PreviewRail items={buttons} value="drafts" />)
    ).toMatch(/aria-label="Drafts"[^>]*aria-current="true"/)
  })

  it("rests the swell on the current item and shows no card", () => {
    const markup = renderToStaticMarkup(
      <PreviewRail items={links} defaultValue="install" />
    )
    expect(markup).toMatch(
      /data-lit=""[^>]*aria-label="Installation"[^>]*--preview-rail-scale:1"/
    )
    expect(markup).not.toContain('data-slot="preview-rail-card"')
  })

  it("describes a tick by its item's description", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={links} />)
    const id = markup.match(
      /aria-label="Installation"[^>]*aria-describedby="([^"]+)"/
    )?.[1]
    expect(id).toBeDefined()
    expect(markup).toContain(`id="${id}" hidden="">Add it with the CLI.</span>`)
  })

  it("disables an item without an href to follow", () => {
    const markup = renderToStaticMarkup(<PreviewRail items={links} />)
    expect(markup).toMatch(
      /<a[^>]*data-disabled=""[^>]*aria-label="Usage"[^>]*role="link"[^>]*aria-disabled="true"/
    )
    expect(markup).not.toContain('href="#usage"')
    expect(
      renderToStaticMarkup(
        <PreviewRail items={[{ value: "a", label: "A", disabled: true }]} />
      )
    ).toContain("disabled")
  })

  it("puts the card after a vertical rail and above a horizontal one", () => {
    expect(renderToStaticMarkup(<PreviewRail items={links} />)).toMatch(
      /data-orientation="vertical" data-side="end"/
    )
    expect(
      renderToStaticMarkup(
        <PreviewRail items={links} orientation="horizontal" />
      )
    ).toMatch(/data-orientation="horizontal" data-side="start"/)
  })
})
