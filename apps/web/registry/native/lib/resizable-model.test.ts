import { describe, expect, it } from "vitest"

import {
  getHandleValue,
  getInitialLayout,
  layoutFromMap,
  layoutToMap,
  parseSize,
  resizeLayout,
} from "@/registry/native/lib/resizable-model"

describe("parseSize", () => {
  it("reads sizes the way react-resizable-panels does", () => {
    expect(parseSize("50%", 400)).toBe(50)
    expect(parseSize("50", 400)).toBe(50)
    expect(parseSize("100px", 400)).toBe(25)
    expect(parseSize(100, 400)).toBe(25)
    expect(parseSize(undefined, 400)).toBeUndefined()
  })

  it("has no pixel size until the group is measured", () => {
    expect(parseSize(100, 0)).toBeUndefined()
    expect(parseSize("100px", 0)).toBeUndefined()
    expect(parseSize("25%", 0)).toBe(25)
  })
})

describe("getInitialLayout", () => {
  it("shares evenly without sizes", () => {
    expect(getInitialLayout([{}, {}], 400)).toEqual([50, 50])
  })

  it("keeps given sizes and shares what's left", () => {
    expect(getInitialLayout([{ defaultSize: "25%" }, {}], 400)).toEqual([
      25, 75,
    ])
    expect(getInitialLayout([{ defaultSize: "20%" }, {}, {}], 400)).toEqual([
      20, 40, 40,
    ])
  })

  it("scales sizes that don't add up to 100", () => {
    expect(
      getInitialLayout([{ defaultSize: "20%" }, { defaultSize: "20%" }], 400)
    ).toEqual([50, 50])
  })

  it("honours minimums and maximums", () => {
    expect(
      getInitialLayout(
        [{ defaultSize: "10%", minSize: "30%" }, { defaultSize: "90%" }],
        400
      )
    ).toEqual([30, 70])
    expect(
      getInitialLayout(
        [{ defaultSize: "90%", maxSize: "60%" }, { defaultSize: "10%" }],
        400
      )
    ).toEqual([60, 40])
  })
})

describe("resizeLayout", () => {
  const panels = [{}, {}]

  it("moves size across the handle", () => {
    expect(resizeLayout([50, 50], panels, 0, 10, 400)).toEqual([60, 40])
    expect(resizeLayout([50, 50], panels, 0, -10, 400)).toEqual([40, 60])
  })

  it("stops at a minimum", () => {
    expect(
      resizeLayout([50, 50], [{ minSize: "40%" }, {}], 0, -30, 400)
    ).toEqual([40, 60])
    expect(
      resizeLayout([50, 50], [{}, { minSize: "40%" }], 0, 30, 400)
    ).toEqual([60, 40])
  })

  it("stops at a maximum", () => {
    expect(
      resizeLayout([50, 50], [{ maxSize: "55%" }, {}], 0, 30, 400)
    ).toEqual([55, 45])
    expect(
      resizeLayout([50, 50], [{}, { maxSize: "55%" }], 0, -30, 400)
    ).toEqual([45, 55])
  })

  it("takes from the next panels once the nearest hits its minimum", () => {
    expect(
      resizeLayout([40, 30, 30], [{}, { minSize: "20%" }, {}], 0, 20, 400)
    ).toEqual([60, 20, 20])
  })

  it("gives to the next panels once the nearest hits its maximum", () => {
    expect(
      resizeLayout(
        [40, 30, 30],
        [{ maxSize: "45%" }, { maxSize: "35%" }, {}],
        1,
        15,
        400
      )
    ).toEqual([45, 35, 20])
    expect(
      resizeLayout([20, 30, 50], [{}, { maxSize: "35%" }, {}], 0, -25, 400)
    ).toEqual([0, 35, 65])
  })

  it("leaves the layout alone at the end of its travel", () => {
    expect(resizeLayout([100, 0], panels, 0, 10, 400)).toEqual([100, 0])
  })

  it("keeps the total", () => {
    const next = resizeLayout([33, 33, 34], [{}, {}, {}], 1, 7.5, 400)
    expect(next.reduce((sum, size) => sum + size, 0)).toBeCloseTo(100)
  })

  it("leaves a disabled panel out of it", () => {
    expect(
      resizeLayout([30, 30, 40], [{}, { disabled: true }, {}], 0, 10, 400)
    ).toEqual([40, 30, 30])
  })
})

describe("getHandleValue", () => {
  it("reports where the handle can travel", () => {
    expect(
      getHandleValue([50, 50], [{ minSize: "20%" }, { minSize: "30%" }], 0, 400)
    ).toEqual({ now: 50, min: 20, max: 70 })
  })

  it("counts every panel on a side", () => {
    expect(
      getHandleValue([25, 25, 50], [{}, {}, { minSize: "10%" }], 1, 400)
    ).toEqual({ now: 50, min: 0, max: 90 })
  })
})

describe("layout maps", () => {
  it("converts to and from the web's id map", () => {
    expect(layoutToMap([25, 75], ["a", "b"])).toEqual({ a: 25, b: 75 })
    expect(layoutFromMap({ a: 25, b: 75 }, ["a", "b"])).toEqual([25, 75])
  })

  it("rejects a map that doesn't fit the panels", () => {
    expect(layoutFromMap({ a: 100 }, ["a", "b"])).toBeUndefined()
  })
})
