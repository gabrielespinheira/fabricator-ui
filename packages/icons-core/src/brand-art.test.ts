import { describe, expect, it } from "vitest"

import {
  buildUnderlayArt,
  parseBrandArt,
  parseBrandArtWithGradients,
  renderArtBody,
  toMonoPath,
} from "./brand-art"

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

describe("gradients", () => {
  const body =
    '<defs><linearGradient id="SVGabc" x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff" stop-opacity=".5"/></linearGradient></defs><path fill="url(#SVGabc)" d="M0 0h10v10H0z"/>'

  it("keeps gradients with short local ids, and points fills at them", () => {
    expect(parseBrandArtWithGradients(body, 10, 10)).toEqual({
      node: [["path", { fill: "url(#g0)", d: "M0 0h10v10H0z" }]],
      gradients: [
        {
          type: "linearGradient",
          id: "g0",
          attributes: {
            x1: "0",
            y1: "0",
            x2: "1",
            y2: "1",
            gradientUnits: "userSpaceOnUse",
          },
          stops: [
            { offset: "0", color: "#ff0000" },
            { offset: "1", color: "#0000ff", opacity: ".5" },
          ],
        },
      ],
    })
  })

  it("refuses filters and masks, which can't be reproduced everywhere", () => {
    expect(() =>
      parseBrandArtWithGradients(
        '<defs><filter id="f"/></defs><path filter="url(#f)" d="M0 0h1"/>',
        10,
        10
      )
    ).toThrow(/filter/)
  })

  it("flattens nested translated groups, in paint order", () => {
    const { node } = parseBrandArtWithGradients(
      '<g transform="translate(4 2)"><circle cx="1" cy="1" r="1" fill="#000"/><g transform="translate(9.688 8.719)"><circle cx="1" cy="1" r="1" fill="#111"/></g><circle cx="2" cy="2" r="1" fill="#222"/></g>',
      20,
      20
    )
    expect(node).toEqual([
      ["circle", { cx: "5", cy: "3", r: "1", fill: "#000" }],
      ["circle", { cx: "14.688", cy: "11.719", r: "1", fill: "#111" }],
      ["circle", { cx: "6", cy: "4", r: "1", fill: "#222" }],
    ])
  })

  describe("dropShadows", () => {
    const shadow =
      '<filter id="f"><feOffset dy="2" in="SourceAlpha" result="a"/><feGaussianBlur in="a" result="b" stdDeviation="2"/><feColorMatrix in="b" result="c" values="0 0 0 0 0"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'

    it("removes a filter that only paints a shadow, and keeps the shape", () => {
      const { node } = parseBrandArtWithGradients(
        `<defs>${shadow}</defs><g transform="translate(1 1)"><circle cx="1" cy="1" r="1" fill="#fff" filter="url(#f)"/></g><path d="M0 0h1" filter="url(#f)"/>`,
        10,
        10,
        { dropShadows: true, unfilled: "#000000" }
      )
      expect(node).toEqual([
        ["circle", { cx: "2", cy: "2", r: "1", fill: "#fff" }],
        ["path", { d: "M0 0h1", fill: "#000000" }],
      ])
    })

    it("still refuses a shadow filter unless the entry asks", () => {
      expect(() =>
        parseBrandArtWithGradients(
          `<defs>${shadow}</defs><path filter="url(#f)" d="M0 0h1"/>`,
          10,
          10
        )
      ).toThrow(/filter/)
    })

    it("still refuses a filter that changes the shape itself", () => {
      for (const filter of [
        '<filter id="f"><feGaussianBlur stdDeviation="2"/></filter>',
        '<filter id="f"><feTurbulence/><feMerge><feMergeNode in="SourceGraphic"/></feMerge></filter>',
        '<filter id="f"><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="c"/></feMerge></filter>',
      ]) {
        expect(() =>
          parseBrandArtWithGradients(
            `<defs>${filter}</defs><path filter="url(#f)" d="M0 0h1"/>`,
            10,
            10,
            { dropShadows: true }
          )
        ).toThrow(/filter/)
      }
    })
  })

  it("refuses fills that point at a gradient it doesn't have", () => {
    expect(() =>
      parseBrandArtWithGradients('<path fill="url(#nope)" d="M0 0h1"/>', 10, 10)
    ).toThrow(/nope/)
  })

  it("prints art with its gradients, and reads it back", () => {
    const art = {
      width: 10,
      height: 10,
      ...parseBrandArtWithGradients(body, 10, 10),
    }
    expect(parseBrandArtWithGradients(renderArtBody(art), 10, 10)).toEqual({
      node: art.node,
      gradients: art.gradients,
    })
  })
})
