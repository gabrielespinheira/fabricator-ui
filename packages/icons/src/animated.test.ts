import { createElement, type ComponentType } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import * as Animated from "./animated"
import { composeHandlers, isMotionOff } from "./animated-icon"
import { animatedCatalog, getIconEntry, searchIcons } from "./catalog"
import * as Outline from "./index"

const render = (component: ComponentType, props = {}) =>
  renderToStaticMarkup(createElement(component, props))

describe("animated icons", () => {
  it("exports every catalog entry under Lucide's names", () => {
    const exported = new Set(Object.keys(Animated))
    expect(animatedCatalog.length).toBeGreaterThan(400)
    for (const { name, aliases } of animatedCatalog) {
      for (const each of [name, ...aliases]) {
        const pascal = each
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")
        expect(exported.has(`${pascal}Icon`), each).toBe(true)
        expect(exported.has(pascal), each).toBe(true)
      }
    }
  })

  it("only animates icons the outline set has", () => {
    for (const { name } of animatedCatalog) {
      expect(getIconEntry(name, "outline"), name).toBeDefined()
    }
  })

  it("render a real svg with Lucide's attributes, like an outline icon", () => {
    expect(render(Animated.BellIcon)).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fab-icon fab-icon-bell" aria-hidden="true"/
    )
    expect(render(Animated.BellIcon)).not.toContain("<div")
  })

  it("take the same props as an outline icon", () => {
    const markup = render(Animated.BellIcon, {
      size: 16,
      color: "red",
      strokeWidth: 1.5,
      className: "mine",
      "data-icon": "inline-start",
    })
    expect(markup).toContain('width="16"')
    expect(markup).toContain('stroke="red"')
    expect(markup).toContain('stroke-width="1.5"')
    expect(markup).toContain('class="fab-icon fab-icon-bell mine"')
    expect(markup).toContain('data-icon="inline-start"')
  })

  it("stay hidden from assistive tech unless labelled", () => {
    expect(
      render(Animated.BellIcon, { "aria-label": "Notifications" })
    ).not.toContain("aria-hidden")
  })

  it("render every icon at rest on the server", () => {
    for (const [name, component] of Object.entries(Animated)) {
      expect(renderToStaticMarkup(createElement(component)), name).toMatch(
        /^<svg /
      )
    }
  })

  it("share the outline icon's names, so the import is the only change", () => {
    expect(Animated.HouseIcon).toBe(Animated.HomeIcon)
    expect(Outline.HouseIcon).toBe(Outline.HomeIcon)
    expect(Animated.HouseIcon).not.toBe(Outline.HouseIcon)
  })
})

describe("the catalog", () => {
  it("lists animated icons as their own set, with Lucide's search terms", () => {
    const [bell] = searchIcons("alarm", { set: "animated" })
    expect(bell?.set).toBe("animated")
    expect(getIconEntry("home", "animated")?.name).toBe("house")
  })

  it("flags the icons that animate an older drawing", () => {
    expect(getIconEntry("arrow-big-up", "animated")).toMatchObject({
      isOlderDrawing: true,
    })
    expect(getIconEntry("house", "animated")).not.toHaveProperty(
      "isOlderDrawing"
    )
  })
})

describe("isMotionOff", () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubPage({
    motion,
    reduced,
  }: {
    motion?: string
    reduced: boolean
  }) {
    vi.stubGlobal("document", {
      documentElement: { dataset: { motion } },
    })
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) })
  }

  it("is on the server, where nothing can animate", () => {
    expect(isMotionOff()).toBe(true)
  })

  it("follows the reduced motion preference", () => {
    stubPage({ reduced: true })
    expect(isMotionOff()).toBe(true)
    stubPage({ reduced: false })
    expect(isMotionOff()).toBe(false)
  })

  it('follows data-motion="off" on the page', () => {
    stubPage({ motion: "off", reduced: false })
    expect(isMotionOff()).toBe(true)
    stubPage({ motion: "snappy", reduced: false })
    expect(isMotionOff()).toBe(false)
  })
})

describe("composeHandlers", () => {
  it("runs the icon's handler, then the consumer's, once each", () => {
    const calls: string[] = []
    const handler = composeHandlers(
      () => calls.push("icon"),
      () => calls.push("consumer")
    )
    const event = new Event("mouseenter")
    Reflect.apply(handler, undefined, [event])
    expect(calls).toEqual(["icon", "consumer"])
  })
})
