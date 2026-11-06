import { describe, expect, it } from "vitest"

import {
  getFadeOpacity,
  getHeaderFade,
  withAlpha,
} from "@/registry/native/lib/scroll-fade-model"

describe("withAlpha", () => {
  it("handles every format the theme writes", () => {
    expect(withAlpha("#171717", 0)).toBe("rgba(23, 23, 23, 0)")
    expect(withAlpha("#abc", 0.5)).toBe("rgba(170, 187, 204, 0.5)")
    expect(withAlpha("#17171780", 0)).toBe("rgba(23, 23, 23, 0)")
    expect(withAlpha("rgb(1, 2, 3)", 0)).toBe("rgba(1, 2, 3, 0)")
    expect(withAlpha("rgba(1, 2, 3, 0.4)", 0)).toBe("rgba(1, 2, 3, 0)")
  })

  it("falls back to transparent for what it can't read", () => {
    expect(withAlpha("oklch(0.5 0.1 200)", 0)).toBe("transparent")
  })
})

describe("getFadeOpacity", () => {
  it("grows with the distance to the edge, up to the fade's size", () => {
    expect(getFadeOpacity(0, 24)).toBe(0)
    expect(getFadeOpacity(12, 24)).toBe(0.5)
    expect(getFadeOpacity(48, 24)).toBe(1)
  })

  it("is off past the edge, while bouncing", () => {
    expect(getFadeOpacity(-10, 24)).toBe(0)
  })
})

describe("getHeaderFade", () => {
  const fade = getHeaderFade({ color: "#FAFAFA", insetTop: 59, rowHeight: 56 })
  const alphaAt = (position: number) => {
    const location = position / fade.height
    const index = fade.locations.findIndex((stop) => stop >= location)
    const [start, end] = [fade.locations[index - 1], fade.locations[index]]
    const read = (color: string) =>
      Number(color.split(", ").at(-1)?.slice(0, -1))
    const [from, to] = [read(fade.colors[index - 1]), read(fade.colors[index])]
    return from + (to - from) * ((location - start) / (end - start))
  }

  it("stays solid behind the clock and the island", () => {
    expect(alphaAt(1)).toBe(1)
    expect(alphaAt(59)).toBe(1)
  })

  it("keeps the header's row legible", () => {
    expect(alphaAt(59 + 28)).toBeGreaterThan(0.75)
  })

  it("ends past the row, with nothing left of the colour", () => {
    expect(fade.height).toBeGreaterThan(59 + 56)
    expect(fade.colors.at(-1)).toBe("rgba(250, 250, 250, 0)")
    expect(fade.locations.at(-1)).toBe(1)
  })

  it("only ever fades, with a stop for every colour", () => {
    expect(fade.locations).toHaveLength(fade.colors.length)
    for (let position = 1; position + 4 < fade.height; position += 4) {
      expect(alphaAt(position + 4)).toBeLessThanOrEqual(alphaAt(position))
    }
  })

  it("works with no safe area, as a shell inside a frame has", () => {
    const flush = getHeaderFade({ color: "#000", insetTop: 0, rowHeight: 48 })
    expect(flush.locations[0]).toBe(0)
    expect(flush.height).toBeGreaterThan(48)
  })
})
