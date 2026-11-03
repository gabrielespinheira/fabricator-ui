import { describe, expect, it } from "vitest"

import { parseBrandArt, toMonoPath } from "./brand-art"

describe("parseBrandArt", () => {
  it("keeps paths and their fills, writing colour keywords as hex", () => {
    expect(
      parseBrandArt(
        '<path fill="red" d="M0 0h10v10z"/><path fill="#fff" d="M2 2h2v2z"/>',
        10,
        10
      )
    ).toEqual([
      ["path", { fill: "#ff0000", d: "M0 0h10v10z" }],
      ["path", { fill: "#fff", d: "M2 2h2v2z" }],
    ])
  })

  it("flattens a translated group into its paths", () => {
    expect(
      parseBrandArt(
        '<g transform="translate(-10 -20)"><path d="M10 20h5"/></g>',
        10,
        10
      )
    ).toEqual([["path", { d: "M0 0h5" }]])
  })

  it("refuses gradients, which need ids that collide on a page", () => {
    expect(() =>
      parseBrandArt(
        '<defs><linearGradient id="a"/></defs><path d="M0 0"/>',
        10,
        10
      )
    ).toThrow()
  })

  it("refuses transforms it can't flatten", () => {
    expect(() =>
      parseBrandArt('<g transform="rotate(45)"><path d="M0 0h1"/></g>', 10, 10)
    ).toThrow(/plain translate/)
  })
})

describe("toMonoPath", () => {
  it("scales a square artwork onto the 24 × 24 box", () => {
    expect(toMonoPath([["path", { d: "M0 0h256v256H0z" }]], 256, 256)).toBe(
      "M0 0h24v24H0z"
    )
  })

  it("refuses multi-colour art", () => {
    expect(() =>
      toMonoPath(
        [
          ["path", { d: "M0 0h1" }],
          ["path", { d: "M1 1h1" }],
        ],
        10,
        10
      )
    ).toThrow()
  })
})
