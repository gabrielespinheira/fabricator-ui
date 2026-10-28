import { describe, expect, it } from "vitest"

import {
  ROLE_DEFAULTS,
  ROLE_PALETTE_LINKS,
} from "@/registry/fabricator/color-roles"
import { SURFACE_PALETTE_LINKS } from "@/registry/fabricator/foundations"
import {
  DEFAULT_LOOK,
  lookCssVars,
  lookToSearchParams,
  parseLook,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import { MOTION_SPEEDS, toMotionVars } from "@/registry/fabricator/motion"

const CUSTOM_LOOK: FabricatorLook = {
  surface: { hue: 145, chroma: 0.022 },
  colors: {
    ...ROLE_DEFAULTS,
    primary: { hue: 260, chroma: 0.15 },
    success: { hue: 165, chroma: 0.09 },
  },
  radius: "pill",
  motion: "snappy",
}

describe("lookToSearchParams", () => {
  it("writes nothing for the default look", () => {
    expect(lookToSearchParams(DEFAULT_LOOK).toString()).toBe("")
  })

  it("writes only what differs from the defaults", () => {
    expect(Object.fromEntries(lookToSearchParams(CUSTOM_LOOK))).toEqual({
      surface: "145_0.022",
      primary: "260_0.15",
      success: "165_0.09",
      shape: "pill",
      motion: "snappy",
    })
  })

  it("keeps every value unencoded, so the URL stays readable", () => {
    expect(lookToSearchParams(CUSTOM_LOOK).toString()).not.toMatch(/%/)
  })
})

describe("parseLook", () => {
  it("reads the default look from no params", () => {
    expect(parseLook(new URLSearchParams())).toEqual({
      success: true,
      look: DEFAULT_LOOK,
    })
  })

  it("reads back what lookToSearchParams writes", () => {
    expect(parseLook(lookToSearchParams(CUSTOM_LOOK))).toEqual({
      success: true,
      look: CUSTOM_LOOK,
    })
  })

  it("ignores params it doesn't own", () => {
    const params = new URLSearchParams("base=radix&radius=large&shape=pill")
    expect(parseLook(params)).toEqual({
      success: true,
      look: { ...DEFAULT_LOOK, radius: "pill" },
    })
  })

  it("keeps a status colour in its family", () => {
    const result = parseLook(new URLSearchParams("destructive=150_0.19"))
    expect(result.success && result.look.colors.destructive.hue).toBe(50)
  })

  it("caps the surface strength", () => {
    const result = parseLook(new URLSearchParams("surface=145_0.5"))
    expect(result.success && result.look.surface).toEqual({
      hue: 145,
      chroma: 0.04,
    })
  })

  it.each([
    ["surface=sage", "surface"],
    ["primary=260", "primary"],
    ["primary=blue_0.2", "primary"],
    ["shape=square", "shape"],
    ["motion=fast", "motion"],
  ])("rejects %s", (query, param) => {
    const result = parseLook(new URLSearchParams(query))
    expect(result.success).toBe(false)
    expect(!result.success && result.error).toContain(`"${param}"`)
  })
})

describe("lookCssVars", () => {
  it("adds nothing for the default look", () => {
    expect(lookCssVars(DEFAULT_LOOK)).toEqual({ light: {}, dark: {} })
  })

  it("tints the surfaces and links the theme tokens to them", () => {
    const { light, dark } = lookCssVars({
      ...DEFAULT_LOOK,
      surface: { hue: 145, chroma: 0.022 },
    })
    expect(light).toEqual({
      "surface-hue": "145",
      "surface-chroma": "0.022",
      ...SURFACE_PALETTE_LINKS.light,
    })
    expect(dark).toEqual(SURFACE_PALETTE_LINKS.dark)
  })

  it("sets the colour roles and links the theme tokens to them", () => {
    const { light, dark } = lookCssVars({
      ...DEFAULT_LOOK,
      colors: { ...ROLE_DEFAULTS, primary: { hue: 260, chroma: 0.2 } },
    })
    expect(light).toMatchObject({
      "primary-hue": "260",
      "primary-chroma": "0.2",
      ...ROLE_PALETTE_LINKS.light,
    })
    expect(light).not.toHaveProperty("success-hue")
    expect(dark).toEqual(ROLE_PALETTE_LINKS.dark)
  })

  it("sets a status colour without relinking the theme tokens", () => {
    const { light, dark } = lookCssVars({
      ...DEFAULT_LOOK,
      colors: { ...ROLE_DEFAULTS, success: { hue: 165, chroma: 0.09 } },
    })
    expect(light).toEqual({ "success-hue": "165", "success-chroma": "0.09" })
    expect(dark).toEqual({})
  })

  it("rounds the corners into pills", () => {
    expect(lookCssVars({ ...DEFAULT_LOOK, radius: "pill" }).light).toEqual({
      radius: "1.25rem",
    })
  })

  it("sets the motion speed's tokens", () => {
    expect(lookCssVars({ ...DEFAULT_LOOK, motion: "snappy" }).light).toEqual(
      toMotionVars(MOTION_SPEEDS.snappy)
    )
  })

  it("stops motion", () => {
    expect(lookCssVars({ ...DEFAULT_LOOK, motion: "off" }).light).toEqual({
      "motion-scale": "0",
    })
  })
})
