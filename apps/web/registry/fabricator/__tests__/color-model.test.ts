import { describe, expect, it } from "vitest"

import {
  buildParsedColor,
  formatColor,
  getAreaValueFromPoint,
  getChannelFields,
  getHexText,
  getInitialColorState,
  getScrubbedValue,
  getSwatchKey,
  isColorFormat,
  nudgeArea,
  parseChannelText,
  parseColor,
  setColorChannel,
  setColorFromRgba,
  stepChannelValue,
  type ColorState,
} from "@/registry/fabricator/shared/lib/color-model"

function stateOf(value: string): ColorState {
  return getInitialColorState(value)
}

describe("parseColor", () => {
  it("reads 3, 4, 6 and 8 digit hex, with or without #", () => {
    expect(parseColor("#6B97FF")).toEqual({ r: 107, g: 151, b: 255, a: 1 })
    expect(parseColor("6b97ff")).toEqual({ r: 107, g: 151, b: 255, a: 1 })
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor("#0008")).toEqual({ r: 0, g: 0, b: 0, a: 136 / 255 })
    expect(parseColor("#ff000080")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 128 / 255,
    })
  })

  it("rejects 5 and 7 digit hex and anything unreadable", () => {
    expect(parseColor("#12345")).toBeNull()
    expect(parseColor("#1234567")).toBeNull()
    expect(parseColor("tomato")).toBeNull()
    expect(parseColor("")).toBeNull()
    expect(parseColor("rgb(1, 2)")).toBeNull()
  })

  it("reads rgb() and rgba() with commas, spaces or a slash", () => {
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 })
    expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.5,
    })
    expect(parseColor("rgb(10 20 30 / 25%)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.25,
    })
  })

  it("clamps channels and alpha into range", () => {
    expect(parseColor("rgb(300, -4, 30 / 2)")).toEqual({
      r: 255,
      g: 0,
      b: 30,
      a: 1,
    })
  })

  it("reads hsl() and hsla()", () => {
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    })
    expect(parseColor("hsla(120 100% 25% / 0.5)")).toEqual({
      r: 0,
      g: 127.5,
      b: 0,
      a: 0.5,
    })
  })

  it("reads oklch() with L as a percent or a fraction", () => {
    const red = parseColor("oklch(62.8% 0.2577 29.23)")
    expect(red?.r).toBeCloseTo(255, 0)
    expect(red?.g).toBeCloseTo(0, 0)
    expect(red?.b).toBeCloseTo(0, 0)
    expect(parseColor("oklch(1 0 0)")?.r).toBeCloseTo(255, 0)
  })
})

describe("buildParsedColor and formatColor", () => {
  it("writes every format from one color", () => {
    const parsed = buildParsedColor(stateOf("#ff0000").hsva)
    expect(parsed.hex).toBe("#ff0000")
    expect(formatColor(parsed, "hex")).toBe("#ff0000")
    expect(formatColor(parsed, "rgb")).toBe("rgb(255, 0, 0)")
    expect(formatColor(parsed, "hsl")).toBe("hsl(0, 100%, 50%)")
    expect(formatColor(parsed, "oklch")).toBe("oklch(62.8% 0.258 29.2)")
  })

  it("adds alpha only below 1", () => {
    const parsed = buildParsedColor({ h: 0, s: 1, v: 1, a: 0.5 })
    expect(parsed.hex).toBe("#ff000080")
    expect(parsed.rgb).toBe("rgba(255, 0, 0, 0.5)")
    expect(parsed.hsl).toBe("hsla(0, 100%, 50%, 0.5)")
    expect(parsed.oklch).toBe("oklch(62.8% 0.258 29.2 / 0.5)")
  })

  it("writes a hue of 0 for colors without chroma", () => {
    const parsed = buildParsedColor(stateOf("#ffffff").hsva)
    expect(parsed.oklch).toBe("oklch(100.0% 0.000 0.0)")
  })
})

describe("getHexText", () => {
  it("writes six uppercase digits without # or alpha", () => {
    expect(getHexText(buildParsedColor({ h: 0, s: 1, v: 1, a: 0.5 }))).toBe(
      "FF0000"
    )
  })
})

describe("getInitialColorState", () => {
  it("starts an unreadable value at pure red", () => {
    expect(getInitialColorState("nope").hsva).toEqual({
      h: 0,
      s: 1,
      v: 1,
      a: 1,
    })
  })

  it("starts a gray at hue 0", () => {
    expect(getInitialColorState("#808080").hsva.h).toBe(0)
  })
})

describe("setColorFromRgba", () => {
  it("keeps the current hue when the new color has none", () => {
    const blue = stateOf("#0000ff")
    const gray = setColorFromRgba(blue, { r: 128, g: 128, b: 128, a: 1 })
    expect(gray.hsva.h).toBe(240)
    expect(gray.hsva.s).toBe(0)
  })

  it("drops the held OKLCH hue", () => {
    const state: ColorState = { ...stateOf("#0000ff"), oklchHue: 200 }
    expect(
      setColorFromRgba(state, { r: 255, g: 0, b: 0, a: 1 }).oklchHue
    ).toBeNull()
  })
})

describe("getChannelFields", () => {
  it("lists the RGB channels; alpha has its own slider", () => {
    const fields = getChannelFields(stateOf("#6b97ff80"), "rgb")
    expect(fields.map((field) => [field.channel, field.value])).toEqual([
      ["red", 107],
      ["green", 151],
      ["blue", 255],
    ])
  })

  it("lists HSL channels with whole percents", () => {
    const fields = getChannelFields(stateOf("#ff0000"), "hsl")
    expect(fields.map((field) => field.value)).toEqual([0, 100, 50])
    expect(fields[0]).toMatchObject({ channel: "hslHue", wrap: true, max: 360 })
  })

  it("lists OKLCH channels with chroma in hundredths", () => {
    const fields = getChannelFields(stateOf("#ff0000"), "oklch")
    expect(fields.map((field) => field.value)).toEqual([63, 0.26, 29])
    expect(fields[1]).toMatchObject({ step: 0.01, decimals: 2, max: 0.4 })
  })

  it("shows the held OKLCH hue over the one read back from RGB", () => {
    const state: ColorState = { ...stateOf("#808080"), oklchHue: 145 }
    expect(getChannelFields(state, "oklch")[2]?.value).toBe(145)
  })

  it("lists no channels for hex, which has its own field", () => {
    expect(getChannelFields(stateOf("#6b97ff80"), "hex")).toEqual([])
  })
})

describe("setColorChannel", () => {
  it("edits one RGB channel", () => {
    const next = setColorChannel(stateOf("#000000"), "red", 255)
    expect(buildParsedColor(next.hsva).hex).toBe("#ff0000")
  })

  it("keeps the hue when an RGB edit makes a gray", () => {
    const next = setColorChannel(stateOf("#0000ff"), "blue", 0)
    expect(next.hsva.h).toBe(240)
  })

  it("makes a typed HSL hue the hue of a gray", () => {
    const next = setColorChannel(stateOf("#808080"), "hslHue", 120)
    expect(next.hsva.h).toBe(120)
  })

  it("keeps the hue when HSL saturation goes to 0 and back", () => {
    const gray = setColorChannel(stateOf("#0000ff"), "hslSaturation", 0)
    expect(gray.hsva.h).toBe(240)
    const blue = setColorChannel(gray, "hslSaturation", 100)
    expect(buildParsedColor(blue.hsva).hex).toBe("#0000ff")
  })

  it("holds the OKLCH hue through chroma 0", () => {
    const gray = setColorChannel(stateOf("#ff0000"), "oklchChroma", 0)
    expect(gray.oklchHue).toBeCloseTo(29.23, 1)
    const back = setColorChannel(gray, "oklchChroma", 0.2)
    expect(back.oklchHue).toBeCloseTo(29.23, 1)
    const { r, g, b } = buildParsedColor(back.hsva)
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it("keeps alpha when a channel changes", () => {
    const next = setColorChannel(stateOf("#ffffff80"), "red", 0)
    expect(next.hsva.a).toBeCloseTo(128 / 255)
  })

  it("drops the held OKLCH hue on an RGB edit", () => {
    const state: ColorState = { ...stateOf("#808080"), oklchHue: 145 }
    expect(setColorChannel(state, "red", 0).oklchHue).toBeNull()
  })
})

describe("stepChannelValue", () => {
  const red = { min: 0, max: 255, wrap: false, decimals: 0 }
  const hue = { min: 0, max: 360, wrap: true, decimals: 0 }

  it("clamps at the ends", () => {
    expect(stepChannelValue(red, 250, 10)).toBe(255)
    expect(stepChannelValue(red, 4, -10)).toBe(0)
  })

  it("wraps hue-like channels", () => {
    expect(stepChannelValue(hue, 360, 1)).toBe(1)
    expect(stepChannelValue(hue, 0, -1)).toBe(359)
    expect(stepChannelValue(hue, 359, 1)).toBe(360)
  })

  it("rounds to the channel's decimals", () => {
    const chroma = { min: 0, max: 0.4, wrap: false, decimals: 2 }
    expect(stepChannelValue(chroma, 0.1, 0.01)).toBe(0.11)
  })
})

describe("parseChannelText", () => {
  const alpha = { min: 0, max: 100, wrap: false, decimals: 0 }

  it("reads a number, with or without a percent sign", () => {
    expect(parseChannelText(alpha, "40%")).toBe(40)
    expect(parseChannelText(alpha, " 72 ")).toBe(72)
  })

  it("clamps or wraps what it reads", () => {
    expect(parseChannelText(alpha, "140")).toBe(100)
    expect(
      parseChannelText({ min: 0, max: 360, wrap: true, decimals: 0 }, "370")
    ).toBe(10)
  })

  it("rejects text that is not a number", () => {
    expect(parseChannelText(alpha, "abc")).toBeNull()
    expect(parseChannelText(alpha, "")).toBeNull()
  })
})

describe("getScrubbedValue", () => {
  const red = { min: 0, max: 255, wrap: false, decimals: 0, step: 1 }

  it("moves one step for every two pixels", () => {
    expect(getScrubbedValue(red, 100, 20, false)).toBe(110)
    expect(getScrubbedValue(red, 100, -21, false)).toBe(90)
  })

  it("moves ten times faster with Shift", () => {
    expect(getScrubbedValue(red, 100, 4, true)).toBe(120)
  })

  it("clamps at the ends", () => {
    expect(getScrubbedValue(red, 250, 40, false)).toBe(255)
  })
})

describe("getAreaValueFromPoint", () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 }

  it("maps x to saturation and y to brightness", () => {
    expect(getAreaValueFromPoint(rect, { x: 110, y: 45 })).toEqual({
      s: 0.5,
      v: 0.75,
    })
  })

  it("clamps points outside the area", () => {
    expect(getAreaValueFromPoint(rect, { x: -50, y: 500 })).toEqual({
      s: 0,
      v: 0,
    })
  })
})

describe("nudgeArea", () => {
  it("moves saturation with left and right, brightness with up and down", () => {
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "ArrowRight", false)).toEqual({
      s: 0.51,
      v: 0.5,
    })
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "ArrowDown", true)).toEqual({
      s: 0.5,
      v: 0.4,
    })
  })

  it("jumps to the ends with Home, End, PageUp and PageDown", () => {
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "Home", false)).toEqual({
      s: 0,
      v: 0.5,
    })
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "End", false)).toEqual({
      s: 1,
      v: 0.5,
    })
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "PageUp", false)).toEqual({
      s: 0.5,
      v: 1,
    })
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "PageDown", false)).toEqual({
      s: 0.5,
      v: 0,
    })
  })

  it("clamps at the edges and ignores other keys", () => {
    expect(nudgeArea({ s: 1, v: 1 }, "ArrowRight", true)).toEqual({
      s: 1,
      v: 1,
    })
    expect(nudgeArea({ s: 0.5, v: 0.5 }, "Enter", false)).toBeNull()
  })
})

describe("getSwatchKey", () => {
  it("matches the same color written different ways", () => {
    expect(getSwatchKey("#FFF")).toBe("#ffffff")
    expect(getSwatchKey("rgb(255, 255, 255)")).toBe("#ffffff")
    expect(getSwatchKey("#ffffff80")).toBe("#ffffff80")
  })

  it("returns null for colors it can't read", () => {
    expect(getSwatchKey("tomato")).toBeNull()
  })
})

describe("isColorFormat", () => {
  it("accepts the four formats only", () => {
    expect(["hex", "rgb", "hsl", "oklch"].every(isColorFormat)).toBe(true)
    expect(isColorFormat("cmyk")).toBe(false)
    expect(isColorFormat(null)).toBe(false)
  })
})
