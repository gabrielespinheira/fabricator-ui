import { describe, expect, it } from "vitest"

import { buildUnderlayArt, parseBrandArt, toMonoPath } from "./brand-art"

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

describe("parseBrandArt options", () => {
  it("paints unfilled shapes, which the logos set means as black", () => {
    expect(
      parseBrandArt(
        '<path d="M0 0h1"/><path fill="#fff" d="M1 1h1"/>',
        10,
        10,
        { unfilled: "#000000" }
      )
    ).toEqual([
      ["path", { fill: "#000000", d: "M0 0h1" }],
      ["path", { fill: "#fff", d: "M1 1h1" }],
    ])
  })

  it("swaps outdated colours for the brand's current ones", () => {
    expect(
      parseBrandArt('<path fill="#C12127" d="M0 0h1"/>', 10, 10, {
        recolor: { "#c12127": "#CB3837" },
      })
    ).toEqual([["path", { fill: "#CB3837", d: "M0 0h1" }]])
  })
})

describe("buildUnderlayArt", () => {
  it("puts a white disc under a round mark, so its cut-outs read white", () => {
    expect(
      buildUnderlayArt(
        "M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24z",
        "#0866FF",
        "circle"
      )
    ).toEqual({
      width: 24,
      height: 24,
      node: [
        ["circle", { cx: "12", cy: "12", r: "11", fill: "#ffffff" }],
        [
          "path",
          { d: "M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24z", fill: "#0866FF" },
        ],
      ],
    })
  })

  it("puts an inset white square under a square mark", () => {
    expect(
      buildUnderlayArt("M0 0h24v24H0z", "#3178C6", "square").node[0]
    ).toEqual([
      "rect",
      { x: "1", y: "1", width: "22", height: "22", fill: "#ffffff" },
    ])
  })
})

describe("element transforms", () => {
  it("flattens a circle's similarity transform into its centre and radius", () => {
    expect(
      parseBrandArt(
        '<circle cx="10" cy="20" r="5" transform="matrix(-1 0 0 -1 20 40)"/>',
        40,
        40
      )
    ).toEqual([["circle", { cx: "10", cy: "20", r: "5" }]])
  })

  it("flattens a path's transform into its data", () => {
    expect(
      parseBrandArt('<path d="M0 0h2" transform="translate(1 1)"/>', 10, 10)
    ).toEqual([["path", { d: "M1 1h2" }]])
  })

  it("refuses transforms that would turn a circle into an ellipse", () => {
    expect(() =>
      parseBrandArt(
        '<circle cx="1" cy="1" r="1" transform="matrix(2 0 0 1 0 0)"/>',
        10,
        10
      )
    ).toThrow(/circle/)
  })
})
