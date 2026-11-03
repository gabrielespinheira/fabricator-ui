import { describe, expect, it } from "vitest"

import { parseSvg } from "./svg"
import { validateOutlineSvg } from "./validate"

function svg(children: string, root = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${root}>${children}</svg>`
}

describe("validateOutlineSvg", () => {
  it("accepts an icon that follows the spec", () => {
    expect(
      validateOutlineSvg(parseSvg(svg(`<path d="m6 9 6 6 6-6"/>`)), {
        strict: true,
      })
    ).toEqual([])
  })

  it("requires Lucide's root attributes", () => {
    const parsed = parseSvg(
      svg(`<path d="m6 9 6 6 6-6"/>`).replace(
        'stroke-width="2"',
        'stroke-width="1.5"'
      )
    )
    expect(validateOutlineSvg(parsed, { strict: false })).toEqual([
      'root attribute stroke-width is "1.5", expected "2"',
    ])
  })

  it("rejects attributes a shape doesn't allow", () => {
    const parsed = parseSvg(svg(`<path d="M2 2h4" transform="rotate(45)"/>`))
    expect(validateOutlineSvg(parsed, { strict: false })).toEqual([
      "<path> has a transform attribute, which is not allowed",
    ])
  })

  it("allows the currentColor fill Lucide uses for dots", () => {
    const parsed = parseSvg(
      svg(`<circle cx="12" cy="12" r="1" fill="currentColor"/>`)
    )
    expect(validateOutlineSvg(parsed, { strict: true })).toEqual([])
  })

  it("rejects groups in outline icons", () => {
    const parsed = parseSvg(svg(`<path d="M4 8h4"/><g><path d="M4 4h4"/></g>`))
    expect(validateOutlineSvg(parsed, { strict: false })).toEqual([
      "groups (<g>) are not allowed",
    ])
  })

  it("in strict mode, keeps strokes 1px inside the canvas", () => {
    const parsed = parseSvg(svg(`<path d="M1 12h22"/>`))
    expect(validateOutlineSvg(parsed, { strict: true })).toEqual([
      "the stroke reaches x 0 to 24, y 11 to 13; keep it inside 1 to 23",
    ])
  })

  it("in strict mode, limits numbers to 3 decimals", () => {
    const parsed = parseSvg(svg(`<circle cx="12.12345" cy="12" r="2"/>`))
    expect(validateOutlineSvg(parsed, { strict: true })).toEqual([
      "<circle> cx has more than 3 decimals",
    ])
  })
})
