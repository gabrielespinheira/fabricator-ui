import { describe, expect, it } from "vitest"

import { DENSITIES } from "@/registry/fabricator/density"
import { SHELL_BREAKPOINTS } from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  getDensityName,
  getDensityTokens,
  getDeviceDensity,
  getSizeDensity,
  getTouchSlop,
  getXsSize,
  LARGE_DENSITY,
  TABLET_DENSITY,
  TABLET_LARGE_DENSITY,
  TABLET_MIN_WIDTH,
  TABLET_SMALL_DENSITY,
  type SizeDensity,
} from "@/registry/native/lib/density-scale"

const ALL_DENSITIES: SizeDensity[] = [
  "compact",
  "default",
  "spacious",
  "large",
  "tablet",
  "tablet-sm",
  "tablet-lg",
]

describe("getDeviceDensity", () => {
  it("gives a tablet its own rung in place of the phone's base", () => {
    expect(getDeviceDensity("spacious", 768)).toBe("tablet")
    expect(getDeviceDensity("spacious", 1032)).toBe("tablet")
    expect(getDeviceDensity("spacious", 1376)).toBe("tablet")
  })

  it("leaves a phone on its base", () => {
    expect(getDeviceDensity("spacious", 390)).toBeUndefined()
    expect(getDeviceDensity("spacious", 767)).toBeUndefined()
  })

  it("leaves a density someone picked on purpose", () => {
    expect(getDeviceDensity("compact", 1032)).toBeUndefined()
    expect(getDeviceDensity("default", 1032)).toBeUndefined()
    expect(getDeviceDensity("compact", 390)).toBeUndefined()
  })

  it("sizes a phone's Default for a finger: the tablet's rung, not a pointer's", () => {
    expect(getDeviceDensity("default", 390)).toBe("tablet")
    expect(getDeviceDensity("default", 767)).toBe("tablet")
    expect(TABLET_DENSITY.space[36]).toBeGreaterThan(36)
    expect(TABLET_DENSITY.text[13]).toBeGreaterThan(13)
  })

  it("changes rung where the App Shell changes layout", () => {
    expect(TABLET_MIN_WIDTH).toBe(SHELL_BREAKPOINTS.tablet)
  })
})

describe("the tablet rungs", () => {
  it("sits between the website's controls and the phone's", () => {
    expect(TABLET_DENSITY.space[36]).toBe(40)
    expect(TABLET_DENSITY.space[36]).toBeGreaterThan(
      DENSITIES.default.space[36]
    )
    expect(TABLET_DENSITY.space[36]).toBeLessThan(DENSITIES.spacious.space[36])
  })

  it("keeps the phone's text and icons: only the chrome gets lighter", () => {
    expect(TABLET_DENSITY.text).toEqual(DENSITIES.spacious.text)
    expect(TABLET_DENSITY.icon).toEqual(DENSITIES.spacious.icon)
  })

  it("makes a tablet's sidebar rows as tall as its controls", () => {
    expect(TABLET_DENSITY.space[30]).toBe(TABLET_DENSITY.space[36])
  })

  it("gives `sm` 34pt and 14pt text, and `lg` 48pt and 16pt text", () => {
    expect(TABLET_SMALL_DENSITY.space[36]).toBe(34)
    expect(TABLET_SMALL_DENSITY.text[13]).toBe(14)
    expect(TABLET_LARGE_DENSITY.space[36]).toBe(48)
    expect(TABLET_LARGE_DENSITY.text[13]).toBe(16)
  })

  it("never drops text below what a tablet's distance can read", () => {
    for (const rung of [
      TABLET_SMALL_DENSITY,
      TABLET_DENSITY,
      TABLET_LARGE_DENSITY,
    ]) {
      for (const size of Object.values(rung.text)) {
        expect(size).toBeGreaterThanOrEqual(12)
      }
    }
  })

  it("orders every token small to large", () => {
    const { space, text, icon } = TABLET_DENSITY
    for (const step of Object.keys(space).map(Number)) {
      const key = step as keyof typeof space
      expect(TABLET_SMALL_DENSITY.space[key]).toBeLessThanOrEqual(space[key])
      expect(TABLET_LARGE_DENSITY.space[key]).toBeGreaterThanOrEqual(space[key])
    }
    for (const step of Object.keys(text).map(Number)) {
      const key = step as keyof typeof text
      expect(TABLET_SMALL_DENSITY.text[key]).toBeLessThanOrEqual(text[key])
      expect(TABLET_LARGE_DENSITY.text[key]).toBeGreaterThanOrEqual(text[key])
    }
    for (const step of Object.keys(icon).map(Number)) {
      const key = step as keyof typeof icon
      expect(TABLET_SMALL_DENSITY.icon[key]).toBeLessThanOrEqual(icon[key])
      expect(TABLET_LARGE_DENSITY.icon[key]).toBeGreaterThanOrEqual(icon[key])
    }
  })

  it("reaches a full touch target from every size", () => {
    expect(getTouchSlop(TABLET_DENSITY.space[36])).toBe(2)
    expect(getTouchSlop(TABLET_SMALL_DENSITY.space[36])).toBe(5)
    expect(getTouchSlop(TABLET_LARGE_DENSITY.space[36])).toBe(0)
  })
})

describe("getSizeDensity on a tablet", () => {
  it("steps either side of the tablet's base", () => {
    expect(getSizeDensity("sm", "tablet")).toBe("tablet-sm")
    expect(getSizeDensity("lg", "tablet")).toBe("tablet-lg")
  })

  it("stays on the tablet's ladder inside a sized region", () => {
    expect(getSizeDensity("sm", "tablet-sm")).toBe("tablet-sm")
    expect(getSizeDensity("lg", "tablet-sm")).toBe("tablet-lg")
    expect(getSizeDensity("sm", "tablet-lg")).toBe("tablet-sm")
    expect(getSizeDensity("lg", "tablet-lg")).toBe("tablet-lg")
  })

  it("leaves the default size to the density around it", () => {
    expect(getSizeDensity(undefined, "tablet")).toBeUndefined()
    expect(getSizeDensity("default", "tablet")).toBeUndefined()
  })
})

describe("getXsSize", () => {
  it("is a phone's and a desktop's 24pt floor", () => {
    expect(getXsSize("spacious")).toEqual({ height: 24, icon: 12 })
    expect(getXsSize("default")).toEqual({ height: 24, icon: 12 })
  })

  it("is 28pt on a tablet, whichever step it sits in", () => {
    expect(getXsSize("tablet")).toEqual({ height: 28, icon: 14 })
    expect(getXsSize("tablet-sm")).toEqual({ height: 28, icon: 14 })
    expect(getXsSize("tablet-lg")).toEqual({ height: 28, icon: 14 })
  })
})

describe("every density", () => {
  it("has its own control height, so a height names one density", () => {
    const heights = ALL_DENSITIES.map(
      (density) => getDensityTokens(density).space[36]
    )
    expect(new Set(heights).size).toBe(ALL_DENSITIES.length)
  })

  it("reads back from its control height", () => {
    for (const density of ALL_DENSITIES) {
      expect(getDensityName(getDensityTokens(density).space[36])).toBe(density)
    }
  })
})

describe("getSizeDensity", () => {
  it("gives the phone's base a step either side", () => {
    expect(getSizeDensity("sm", "spacious")).toBe("default")
    expect(getSizeDensity("lg", "spacious")).toBe("large")
  })

  it("pins compact and spacious elsewhere, as the website does", () => {
    expect(getSizeDensity("sm", "default")).toBe("compact")
    expect(getSizeDensity("lg", "default")).toBe("spacious")
    expect(getSizeDensity("sm", "compact")).toBe("compact")
    expect(getSizeDensity("lg", "compact")).toBe("spacious")
  })

  it("keeps a step down inside a large region", () => {
    expect(getSizeDensity("sm", "large")).toBe("default")
    expect(getSizeDensity("lg", "large")).toBe("large")
  })

  it("leaves the default size to the density around it", () => {
    expect(getSizeDensity(undefined, "spacious")).toBeUndefined()
    expect(getSizeDensity("default", "spacious")).toBeUndefined()
  })
})

describe("getDensityName", () => {
  it("reads a density from its control height", () => {
    expect(getDensityName(28)).toBe("compact")
    expect(getDensityName(36)).toBe("default")
    expect(getDensityName(44)).toBe("spacious")
    expect(getDensityName(52)).toBe("large")
  })

  it("takes the default for what it doesn't know", () => {
    expect(getDensityName(30)).toBe("default")
  })
})

describe("LARGE_DENSITY", () => {
  it("is a step above spacious on every token", () => {
    const { space, text, icon } = DENSITIES.spacious
    for (const step of Object.keys(space).map(Number)) {
      const key = step as keyof typeof space
      expect(LARGE_DENSITY.space[key]).toBeGreaterThanOrEqual(space[key])
    }
    for (const step of Object.keys(text).map(Number)) {
      const key = step as keyof typeof text
      expect(LARGE_DENSITY.text[key]).toBeGreaterThan(text[key])
    }
    for (const step of Object.keys(icon).map(Number)) {
      const key = step as keyof typeof icon
      expect(LARGE_DENSITY.icon[key]).toBeGreaterThan(icon[key])
    }
  })

  it("makes a 52pt control with 17pt text", () => {
    expect(LARGE_DENSITY.space[36]).toBe(52)
    expect(LARGE_DENSITY.text[13]).toBe(17)
  })
})

describe("getDensityTokens", () => {
  it("finds the library's densities and the large one", () => {
    expect(getDensityTokens("spacious")).toBe(DENSITIES.spacious)
    expect(getDensityTokens("large")).toBe(LARGE_DENSITY)
  })
})

describe("getTouchSlop", () => {
  it("takes a control to a 44pt target", () => {
    expect(getTouchSlop(24)).toBe(10)
    expect(getTouchSlop(28)).toBe(8)
    expect(getTouchSlop(36)).toBe(4)
  })

  it("rounds up, so the target is never short", () => {
    expect(getTouchSlop(37)).toBe(4)
  })

  it("adds nothing to what's already big enough", () => {
    expect(getTouchSlop(44)).toBe(0)
    expect(getTouchSlop(52)).toBe(0)
  })
})
