import { describe, expect, it } from "vitest"

import { prefixGradientFills, renderGradientMarkup } from "./gradients"
import type { BrandGradient } from "./types"

const gradient: BrandGradient = {
  type: "linearGradient",
  id: "g0",
  attributes: { x1: "0", x2: "1" },
  stops: [{ offset: "0", color: "#ff0000", opacity: ".5" }],
}

describe("gradients", () => {
  it("prefixes gradient fills and leaves plain ones alone", () => {
    expect(
      prefixGradientFills(
        [
          ["path", { fill: "url(#g0)", d: "M0 0" }],
          ["path", { fill: "#fff", d: "M1 1" }],
        ],
        "fab-a-"
      )
    ).toEqual([
      ["path", { fill: "url(#fab-a-g0)", d: "M0 0" }],
      ["path", { fill: "#fff", d: "M1 1" }],
    ])
  })

  it("prints definitions with prefixed ids", () => {
    expect(renderGradientMarkup([gradient], "fab-a-")).toBe(
      '<defs><linearGradient id="fab-a-g0" x1="0" x2="1"><stop offset="0" stop-color="#ff0000" stop-opacity=".5"/></linearGradient></defs>'
    )
    expect(renderGradientMarkup(undefined)).toBe("")
  })
})
