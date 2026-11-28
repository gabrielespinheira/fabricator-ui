import { describe, expect, it } from "vitest"

import { getBrandVars } from "./branding"

describe("getBrandVars", () => {
  it("sets the primary and surface inputs", () => {
    expect(
      getBrandVars({ hue: 260, chroma: 0.2 }, { hue: 75, chroma: 0.018 })
    ).toEqual({
      "--primary-hue": "260",
      "--primary-chroma": "0.2",
      "--surface-hue": "75",
      "--surface-chroma": "0.018",
    })
  })
})
