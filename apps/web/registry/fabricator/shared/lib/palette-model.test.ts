import { describe, expect, it } from "vitest"

import { getPaletteMark, getPaletteVariables } from "./palette-model"

describe("palette marks", () => {
  it("draws a palette name through the role recipe, per scheme", () => {
    expect(getPaletteMark("blue")).toEqual({
      light: "oklch(0.6 0.184 260)",
      dark: "oklch(0.74 0.13 260)",
    })
  })

  it("rests gray on the muted text colour", () => {
    expect(getPaletteMark("gray").dark).toBe("var(--muted-foreground)")
  })

  it("links a role to its token and passes other CSS colours through", () => {
    expect(getPaletteMark("warning").light).toBe("var(--warning)")
    expect(getPaletteVariables("#ff0000")).toEqual({
      "--palette-light": "#ff0000",
      "--palette-dark": "#ff0000",
    })
  })
})
