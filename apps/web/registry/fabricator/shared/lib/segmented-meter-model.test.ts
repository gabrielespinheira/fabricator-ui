import { describe, expect, it } from "vitest"

import { getMeterShares, getMeterTotals } from "./segmented-meter-model"

describe("getMeterShares", () => {
  it("gives each segment its share of the bar", () => {
    expect(getMeterShares([{ value: 32 }, { value: 16 }], 128)).toEqual([
      25, 12.5,
    ])
  })

  it("cuts a segment that would overflow the bar", () => {
    expect(getMeterShares([{ value: 80 }, { value: 40 }], 100)).toEqual([
      80, 20,
    ])
  })

  it("draws nothing without a max or for a negative value", () => {
    expect(getMeterShares([{ value: 5 }], 0)).toEqual([0])
    expect(getMeterShares([{ value: -5 }], 10)).toEqual([0])
  })
})

describe("getMeterTotals", () => {
  it("sums the segments and what is left", () => {
    expect(getMeterTotals([{ value: 74.2 }, { value: 10 }], 128)).toEqual({
      used: 84.2,
      free: 43.8,
    })
    expect(getMeterTotals([{ value: 200 }], 128).free).toBe(0)
  })
})
