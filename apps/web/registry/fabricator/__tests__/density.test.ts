import { describe, expect, it } from "vitest"

import {
  DEFAULT_DENSITY,
  DENSITIES,
  DENSITY_CSS,
  DENSITY_ICON_STEPS,
  DENSITY_NAMES,
  DENSITY_ROOT_VARS,
  DENSITY_SPACE_STEPS,
  DENSITY_TEXT_STEPS,
  isDensityName,
  toDensityVars,
} from "@/registry/fabricator/density"

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
        expect(DENSITIES[smaller].icon[step]).toBeLessThan(
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
        DENSITY_ICON_STEPS.length
    )
  })

  it("puts the default density in :root", () => {
    expect(DENSITY_ROOT_VARS).toEqual(toDensityVars(DENSITIES[DEFAULT_DENSITY]))
  })

  it("switches with data-density and the density-* utilities", () => {
    for (const name of DENSITY_NAMES) {
      const vars = Object.fromEntries(
        Object.entries(toDensityVars(DENSITIES[name])).map(([key, value]) => [
          `--${key}`,
          value,
        ])
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
