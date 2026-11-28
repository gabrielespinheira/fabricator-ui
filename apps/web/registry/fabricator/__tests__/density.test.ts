import { getAutoStrokeWidth } from "@fabricator-ui/icons"
import { describe, expect, it } from "vitest"

import {
  DEFAULT_DENSITY,
  DENSITIES,
  DENSITY_CSS,
  DENSITY_ICON_MIN,
  DENSITY_ICON_STEPS,
  DENSITY_NAMES,
  DENSITY_ROOT_VARS,
  DENSITY_SPACE_STEPS,
  DENSITY_TEXT_STEPS,
  isDensityName,
  toDensityVars,
} from "@/registry/fabricator/density"
import { RADIUS_ROLE_VARS } from "@/registry/fabricator/radius"

// Fabricator Icons' drawn stroke, at 24px.
const UI_STROKE_WIDTH = 1.75

const ORDER = ["compact", "default", "spacious"] as const

describe("densities", () => {
  it("names every step after its default size", () => {
    for (const step of DENSITY_SPACE_STEPS) {
      expect(DENSITIES.default.space[step]).toBe(step)
    }
    for (const step of DENSITY_TEXT_STEPS) {
      expect(DENSITIES.default.text[step]).toBe(step)
    }
    for (const step of DENSITY_ICON_STEPS) {
      expect(DENSITIES.default.icon[step]).toBe(step)
    }
  })

  it("never draws a component's own icon under 16px", () => {
    for (const name of DENSITY_NAMES) {
      for (const step of [16, 18] as const) {
        expect(DENSITIES[name].icon[step]).toBeGreaterThanOrEqual(
          DENSITY_ICON_MIN
        )
      }
    }
  })

  it("uses whole pixels everywhere", () => {
    for (const name of DENSITY_NAMES) {
      const { space, text, icon } = DENSITIES[name]
      for (const value of [
        ...Object.values(space),
        ...Object.values(text),
        ...Object.values(icon),
      ]) {
        expect(Number.isInteger(value)).toBe(true)
      }
    }
  })

  it("grows from compact to spacious on every step", () => {
    for (const [smaller, larger] of [
      [ORDER[0], ORDER[1]],
      [ORDER[1], ORDER[2]],
    ] as const) {
      for (const step of DENSITY_SPACE_STEPS) {
        expect(DENSITIES[smaller].space[step]).toBeLessThanOrEqual(
          DENSITIES[larger].space[step]
        )
      }
      for (const step of DENSITY_TEXT_STEPS) {
        expect(DENSITIES[smaller].text[step]).toBeLessThanOrEqual(
          DENSITIES[larger].text[step]
        )
      }
      for (const step of DENSITY_ICON_STEPS) {
        expect(DENSITIES[smaller].icon[step]).toBeLessThanOrEqual(
          DENSITIES[larger].icon[step]
        )
      }
    }
  })

  it("keeps each ladder in order", () => {
    for (const name of DENSITY_NAMES) {
      const space = DENSITY_SPACE_STEPS.map(
        (step) => DENSITIES[name].space[step]
      )
      const text = DENSITY_TEXT_STEPS.map((step) => DENSITIES[name].text[step])
      const icon = DENSITY_ICON_STEPS.map((step) => DENSITIES[name].icon[step])
      for (const ladder of [space, text, icon]) {
        expect(ladder).toEqual([...ladder].sort((a, b) => a - b))
      }
    }
  })

  // Tab lists, menubars and segmented groups hold 28px items in a 36px track
  // with 4px of padding; the corners only nest if that adds up everywhere.
  it("keeps segmented tracks concentric", () => {
    for (const name of DENSITY_NAMES) {
      const { space } = DENSITIES[name]
      expect(space[28] + 2 * space[4]).toBe(space[36])
    }
  })

  it("keeps controls within WCAG target sizes", () => {
    // 2.5.8 (AA): at least 24px. Spacious, for websites and touch, meets
    // 2.5.5 (AAA): at least 44px.
    expect(DENSITIES.compact.space[36]).toBeGreaterThanOrEqual(24)
    expect(DENSITIES.spacious.space[36]).toBeGreaterThanOrEqual(44)
  })
})

describe("list icons", () => {
  it("sizes the icons of a card's list a step above interface icons", () => {
    expect(DENSITY_NAMES.map((name) => DENSITIES[name].icon[18])).toEqual([
      16, 18, 20,
    ])
  })
})

describe("display text", () => {
  it("sizes card values on two display steps that follow the density", () => {
    expect(DENSITY_NAMES.map((name) => DENSITIES[name].text[24])).toEqual([
      20, 24, 28,
    ])
    expect(DENSITY_NAMES.map((name) => DENSITIES[name].text[32])).toEqual([
      28, 32, 36,
    ])
  })
})

describe("density tokens", () => {
  it("writes spacing in rem and text in px", () => {
    expect(toDensityVars(DENSITIES.default)).toMatchObject({
      "density-4": "0.25rem",
      "density-36": "2.25rem",
      "density-icon-16": "1rem",
      "density-text-13": "13px",
    })
    expect(toDensityVars(DENSITIES.spacious)).toMatchObject({
      "density-36": "2.75rem",
      "density-text-13": "15px",
    })
  })

  it("defines one token per step", () => {
    expect(Object.keys(toDensityVars(DENSITIES.compact))).toHaveLength(
      DENSITY_SPACE_STEPS.length +
        DENSITY_TEXT_STEPS.length +
        DENSITY_ICON_STEPS.length * 2
    )
  })

  it("gives each icon step the stroke Fabricator Icons picks for its size", () => {
    for (const name of DENSITY_NAMES) {
      const vars = toDensityVars(DENSITIES[name])
      for (const step of DENSITY_ICON_STEPS) {
        expect(Number(vars[`density-icon-stroke-${step}`])).toBeCloseTo(
          getAutoStrokeWidth(UI_STROKE_WIDTH, DENSITIES[name].icon[step]),
          3
        )
      }
    }
    expect(toDensityVars(DENSITIES.default)).toMatchObject({
      "density-icon-stroke-16": "2.125",
      "density-icon-stroke-18": "2",
    })
  })

  it("puts the default density in :root", () => {
    expect(DENSITY_ROOT_VARS).toEqual(toDensityVars(DENSITIES[DEFAULT_DENSITY]))
  })

  it("switches with data-density and the density-* utilities", () => {
    for (const name of DENSITY_NAMES) {
      // The corner roles are declared again, so they follow the scope's
      // control height.
      const vars = Object.fromEntries(
        Object.entries({
          ...toDensityVars(DENSITIES[name]),
          ...RADIUS_ROLE_VARS,
        }).map(([key, value]) => [`--${key}`, value])
      )
      expect(
        DENSITY_CSS[`:root[data-density="${name}"], [data-density="${name}"]`]
      ).toEqual(vars)
      expect(DENSITY_CSS[`@utility density-${name}`]).toEqual(vars)
    }
  })

  it("recognises density names", () => {
    expect(DENSITY_NAMES.every(isDensityName)).toBe(true)
    expect(isDensityName("comfortable")).toBe(false)
    expect(isDensityName(undefined)).toBe(false)
  })
})
