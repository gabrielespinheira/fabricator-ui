import { describe, expect, it } from "vitest"

import { getGlideOffset } from "@/registry/fabricator/shared/lib/radio-glide-model"

const rect = (left: number, top: number, size = 18) => ({
  left,
  top,
  width: size,
  height: size,
})

describe("getGlideOffset", () => {
  it("starts the dot over the radio it leaves", () => {
    expect(getGlideOffset(rect(0, 0), rect(0, 34))).toEqual({ x: 0, y: -34 })
    expect(getGlideOffset(rect(120, 10), rect(0, 10))).toEqual({
      x: 120,
      y: 0,
    })
  })

  it("measures between centres, so a radio scaled by its press still lines up", () => {
    // The pressed radio shrinks to 90% around its centre.
    expect(getGlideOffset(rect(0.9, 0.9, 16.2), rect(0, 34))).toEqual({
      x: 0,
      y: -34,
    })
  })

  it("undoes an ancestor's scale, since the translate is in local pixels", () => {
    expect(getGlideOffset(rect(0, 0), rect(0, 17), 0.5)).toEqual({
      x: 0,
      y: -34,
    })
  })

  it("has nothing to glide from on the first pick", () => {
    expect(getGlideOffset(null, rect(0, 34))).toBeNull()
  })

  it("doesn't glide in place", () => {
    expect(getGlideOffset(rect(4, 4), rect(4, 4))).toBeNull()
  })
})
