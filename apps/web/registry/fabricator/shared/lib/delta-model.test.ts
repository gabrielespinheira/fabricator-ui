import { describe, expect, it } from "vitest"

import { getDelta } from "@/registry/fabricator/shared/lib/delta-model"

describe("getDelta", () => {
  it("signs a rise and calls it good when up is good", () => {
    expect(getDelta({ change: 12.44, isGoodWhenUp: true })).toEqual({
      direction: "up",
      tone: "good",
      label: "+12.4%",
    })
  })

  it("uses a real minus sign for a fall", () => {
    expect(getDelta({ change: -3.1, isGoodWhenUp: true })).toEqual({
      direction: "down",
      tone: "bad",
      label: "−3.1%",
    })
  })

  it("flips the tone for metrics where down is good", () => {
    expect(getDelta({ change: -0.4, isGoodWhenUp: false }).tone).toBe("good")
    expect(getDelta({ change: 2.1, isGoodWhenUp: false }).tone).toBe("bad")
  })

  it("writes rates in points", () => {
    expect(
      getDelta({ change: -0.4, isGoodWhenUp: false, unit: "pt" }).label
    ).toBe("−0.4 pt")
  })

  it("keeps one decimal", () => {
    expect(getDelta({ change: 5, isGoodWhenUp: true }).label).toBe("+5.0%")
  })

  it("calls no change neutral, also when it rounds to zero", () => {
    expect(getDelta({ change: 0, isGoodWhenUp: true })).toEqual({
      direction: "flat",
      tone: "neutral",
      label: "0%",
    })
    expect(getDelta({ change: -0.04, isGoodWhenUp: true })).toEqual({
      direction: "flat",
      tone: "neutral",
      label: "0%",
    })
    expect(getDelta({ change: 0, isGoodWhenUp: true, unit: "pt" }).label).toBe(
      "0 pt"
    )
  })

  it("says No data when there is nothing to compare", () => {
    expect(getDelta({ change: null, isGoodWhenUp: true })).toEqual({
      direction: "none",
      tone: "neutral",
      label: "No data",
    })
  })

  it("formats with the locale", () => {
    expect(
      getDelta({ change: 1234.5, isGoodWhenUp: true, locale: "de-DE" }).label
    ).toBe("+1.234,5%")
  })
})
