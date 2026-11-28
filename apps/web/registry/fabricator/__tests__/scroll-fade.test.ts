import { fileURLToPath } from "node:url"
import { compile } from "@tailwindcss/node"
import { describe, expect, it } from "vitest"

import { serializeCss } from "@/registry/fabricator/foundations"
import { getFadeRamp, SCROLL_FADE_CSS } from "@/registry/fabricator/scroll-fade"

const WEB_ROOT = fileURLToPath(new URL("../../..", import.meta.url))

// The utilities as a project gets them: Tailwind, then shadcn's scroll-fade,
// then the foundations (the CLI appends them to the global CSS file).
async function build(candidates: string[]) {
  const compiler = await compile(
    [
      '@import "tailwindcss/utilities.css" source(none);',
      '@import "shadcn/tailwind.css";',
      serializeCss(SCROLL_FADE_CSS),
    ].join("\n"),
    { base: WEB_ROOT, onDependency: () => {} }
  )
  return compiler.build(candidates)
}

// Every rule for a class, nested rules included, in output order.
function rulesFor(css: string, className: string) {
  const escaped = className.replace(/[[\]().%:]/g, (char) => `\\${char}`)
  const opener = `.${escaped} {`
  const rules: string[] = []
  for (let start = css.indexOf(opener); start !== -1; ) {
    let depth = 0
    let end = start + opener.length - 1
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1
      if (css[end] === "}" && --depth === 0) break
    }
    rules.push(css.slice(start + opener.length, end))
    start = css.indexOf(opener, end)
  }
  return rules
}

describe("getFadeRamp", () => {
  const ramp = getFadeRamp()

  it("runs from the edge (clear) to the content (solid)", () => {
    expect(ramp[0]).toEqual({ position: 0, alpha: 0 })
    expect(ramp.at(-1)).toEqual({ position: 1, alpha: 1 })
  })

  it("only ever gets more opaque", () => {
    for (let index = 1; index < ramp.length; index += 1) {
      expect(ramp[index]!.alpha).toBeGreaterThan(ramp[index - 1]!.alpha)
      expect(ramp[index]!.position).toBeGreaterThan(ramp[index - 1]!.position)
    }
  })

  it("eases into both ends, so neither shows a line", () => {
    const first = ramp[1]!.alpha - ramp[0]!.alpha
    const last = ramp.at(-1)!.alpha - ramp.at(-2)!.alpha
    const steepest = Math.max(
      ...ramp.slice(1).map((stop, index) => stop.alpha - ramp[index]!.alpha)
    )
    expect(first).toBeLessThan(steepest / 2)
    expect(last).toBeLessThan(steepest / 2)
  })
})

describe("scroll-fade", () => {
  it("replaces the linear mask with the eased one on every axis and edge", async () => {
    const css = await build(["scroll-fade", "scroll-fade-x", "scroll-fade-b"])
    for (const [name, edge] of [
      ["scroll-fade", "t"],
      ["scroll-fade-x", "s"],
      ["scroll-fade-b", "b"],
    ] as const) {
      const body = rulesFor(css, name).join("")
      expect(body).toContain(`--scroll-fade-${edge}-strength`)
      expect(body).toMatch(/animation-timeline: scroll\(self (y|inline)\)/)
    }
  })

  it("keeps scroll-fade-none winning in any class order", async () => {
    const css = await build(["scroll-fade-b", "scroll-fade-none"])
    expect(css.indexOf(".scroll-fade-none")).toBeGreaterThan(
      css.indexOf(".scroll-fade-b")
    )
  })

  it("keeps the upstream size and reveal variables", async () => {
    const body = rulesFor(await build(["scroll-fade"]), "scroll-fade").join("")
    expect(body).toContain("var(--scroll-fade-t-size, var(--scroll-fade-size")
    expect(body).toContain("var(--scroll-fade-reveal")
    expect(body).toContain("var(--scroll-fade-mask, var(--scroll-fade-block))")
  })

  it("fades both edges at full strength without scroll-driven animations", () => {
    const fallback = serializeCss(SCROLL_FADE_CSS)
    expect(fallback).toContain("@supports not (animation-timeline: scroll())")
    expect(fallback).toMatch(/--scroll-fade-t-strength: 1;/)
    expect(fallback).toMatch(/--scroll-fade-b-strength: 1;/)
  })

  it("mirrors the inline fades in right-to-left text", async () => {
    const css = await build(["scroll-fade-x"])
    expect(css).toMatch(/\[dir="rtl"\]/)
  })
})

describe("scroll-fade-inset", () => {
  it("starts an edge's fade past a sticky region, on the spacing scale", async () => {
    const css = await build(["scroll-fade-inset-t-12", "scroll-fade-inset-e-4"])
    expect(rulesFor(css, "scroll-fade-inset-t-12")[0]).toContain(
      "--scroll-fade-t-inset: calc(var(--spacing) * 12)"
    )
    expect(rulesFor(css, "scroll-fade-inset-e-4")[0]).toContain(
      "--scroll-fade-e-inset: calc(var(--spacing) * 4)"
    )
  })

  it("takes a length or a variable", async () => {
    const css = await build([
      "scroll-fade-inset-b-[72px]",
      "scroll-fade-inset-t-[var(--header-height)]",
    ])
    expect(css).toContain("--scroll-fade-b-inset: 72px")
    expect(css).toContain("--scroll-fade-t-inset: var(--header-height)")
  })
})

describe("sticky-fade", () => {
  it("paints the page's colour past the sticky element's edge", async () => {
    const css = await build(["sticky-fade-b", "sticky-fade-t"])
    expect(css).toContain("var(--sticky-fade-color, var(--background))")
    expect(css).toMatch(
      /\.sticky-fade-b \{[\s\S]*?&::after|\.sticky-fade-b::after/
    )
    expect(css).toMatch(/top: 100%/)
    expect(css).toMatch(/bottom: 100%/)
  })

  it("shows only while content is scrolled under the element", async () => {
    const css = await build(["sticky-fade-b"])
    expect(css).toMatch(/animation-timeline: scroll\(nearest block\)/)
  })
})
