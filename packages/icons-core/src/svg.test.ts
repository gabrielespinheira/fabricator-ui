import { describe, expect, it } from "vitest"

import { parseSvg, renderSvg } from "./svg"

const chevron = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m6 9 6 6 6-6" />
  <circle cx="12" cy="12" r="1" fill="currentColor" />
</svg>`

describe("parseSvg", () => {
  it("returns the root attributes and the child elements in order", () => {
    const parsed = parseSvg(chevron)
    expect(parsed.attributes.viewBox).toBe("0 0 24 24")
    expect(parsed.node).toEqual([
      ["path", { d: "m6 9 6 6 6-6" }],
      ["circle", { cx: "12", cy: "12", r: "1", fill: "currentColor" }],
    ])
    expect(parsed.groups).toEqual([])
  })

  it("collects top-level groups by id without flattening them into the node", () => {
    const parsed = parseSvg(
      `<svg viewBox="0 0 24 24"><path d="M1 1h2"/><g id="secondary"><rect x="4" y="4" width="2" height="2"/></g></svg>`
    )
    expect(parsed.node).toEqual([["path", { d: "M1 1h2" }]])
    expect(parsed.groups).toEqual([
      {
        attributes: { id: "secondary" },
        node: [["rect", { x: "4", y: "4", width: "2", height: "2" }]],
      },
    ])
  })

  it("rejects elements outside the allowed shapes", () => {
    expect(() =>
      parseSvg(`<svg viewBox="0 0 24 24"><use href="#a"/></svg>`)
    ).toThrow(/<use>/)
  })

  it("rejects a document whose root is not an svg", () => {
    expect(() => parseSvg(`<g><path d="M0 0"/></g>`)).toThrow()
  })
})

describe("renderSvg", () => {
  it("prints one attribute per line, like Lucide's source files", () => {
    const parsed = parseSvg(chevron)
    expect(renderSvg(parsed.attributes, parsed.node)).toBe(`${chevron}\n`)
  })
})
