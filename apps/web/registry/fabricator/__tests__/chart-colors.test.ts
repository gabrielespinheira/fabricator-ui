import { describe, expect, it } from "vitest"

import {
  CHART_CSS_VARS,
  CHART_SERIES,
  CHART_SERIES_COUNT,
} from "@/registry/fabricator/chart-colors"
import { contrast, parseOklch } from "@/registry/fabricator/contrast"
import { FABRICATOR_TOKENS } from "@/registry/fabricator/foundation-tokens"
import { DEFAULT_LOOK } from "@/registry/fabricator/look"
import { getNativeCssVariables } from "@/registry/fabricator/native-theme"
import {
  NEUTRAL_TINT,
  oklchToLinearRgb,
  surfaceLadder,
} from "@/registry/fabricator/surface-tint"

// The data-viz checks for a categorical palette, measured, never eyeballed:
// a lightness band and a chroma floor per mode, separation between
// neighbouring slots under simulated colour blindness (Machado, Oliveira and
// Fernandes 2009 at severity 1.0) and under normal vision, as OKLab ΔE ×100,
// and 3:1 against the surfaces charts sit on.

type Mode = "light" | "dark"
type Vector = readonly [number, number, number]

const BAND: Record<Mode, readonly [number, number]> = {
  light: [0.43, 0.77],
  dark: [0.48, 0.67],
}
const CHROMA_FLOOR = 0.1
const CVD_TARGET = 8
const NORMAL_FLOOR = 15

const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const

function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

function toLinearRgb(color: string): Vector {
  const { l, c, h } = parseOklch(color)
  const [r, g, b] = oklchToLinearRgb(l, c, h)
  return [clamp(r), clamp(g), clamp(b)]
}

function toOklab([r, g, b]: Vector): Vector {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function simulate(rgb: Vector, kind: keyof typeof MACHADO): Vector {
  const [row0, row1, row2] = MACHADO[kind]
  const apply = (row: readonly number[]) =>
    clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])
  return [apply(row0), apply(row1), apply(row2)]
}

function deltaE(a: string, b: string, kind?: keyof typeof MACHADO) {
  const toLab = (color: string) => {
    const rgb = toLinearRgb(color)
    return toOklab(kind ? simulate(rgb, kind) : rgb)
  }
  const [la, aa, ba] = toLab(a)
  const [lb, ab, bb] = toLab(b)
  return 100 * Math.hypot(la - lb, aa - ab, ba - bb)
}

function getPairs(count: number, all: boolean) {
  if (!all) return Array.from({ length: count - 1 }, (_, i) => [i, i + 1])
  return Array.from({ length: count }, (_, i) =>
    Array.from({ length: count - i - 1 }, (_, k) => [i, i + 1 + k])
  ).flat()
}

function getWorstSeparation(colors: readonly string[], all = false) {
  const pairs = getPairs(colors.length, all)
  const cvd = Math.min(
    ...pairs.flatMap(([i, j]) => [
      deltaE(colors[i], colors[j], "protan"),
      deltaE(colors[i], colors[j], "deutan"),
    ])
  )
  const normal = Math.min(
    ...pairs.map(([i, j]) => deltaE(colors[i], colors[j]))
  )
  return { cvd, normal }
}

const MODES: Mode[] = ["light", "dark"]

describe("chart series palette", () => {
  it.each(MODES)("has eight slots in %s", (mode) => {
    expect(CHART_SERIES[mode]).toHaveLength(CHART_SERIES_COUNT)
    expect(CHART_SERIES_COUNT).toBe(8)
  })

  it.each(MODES)("sits inside the %s lightness band", (mode) => {
    const [low, high] = BAND[mode]
    for (const color of CHART_SERIES[mode]) {
      const { l } = parseOklch(color)
      expect(l).toBeGreaterThanOrEqual(low)
      expect(l).toBeLessThanOrEqual(high)
    }
  })

  it.each(MODES)("keeps every %s slot above the chroma floor", (mode) => {
    for (const color of CHART_SERIES[mode]) {
      expect(parseOklch(color).c).toBeGreaterThanOrEqual(CHROMA_FLOOR)
    }
  })

  it.each(MODES)("separates neighbouring %s slots", (mode) => {
    const { cvd, normal } = getWorstSeparation(CHART_SERIES[mode])
    expect(cvd).toBeGreaterThanOrEqual(CVD_TARGET)
    expect(normal).toBeGreaterThanOrEqual(NORMAL_FLOOR)
  })

  it.each(MODES)(
    "separates the first three %s slots from each other",
    (mode) => {
      const { cvd, normal } = getWorstSeparation(
        CHART_SERIES[mode].slice(0, 3),
        true
      )
      expect(cvd).toBeGreaterThanOrEqual(CVD_TARGET)
      expect(normal).toBeGreaterThanOrEqual(NORMAL_FLOOR)
    }
  )

  it.each(MODES)("reaches 3:1 on the page and the card in %s", (mode) => {
    const surfaces = surfaceLadder(mode, NEUTRAL_TINT)
    for (const surface of [surfaces[0], surfaces[2]]) {
      for (const color of CHART_SERIES[mode]) {
        expect(contrast(color, surface)).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

describe("chart series tokens", () => {
  it("maps every slot to a colour utility", () => {
    for (let slot = 1; slot <= CHART_SERIES_COUNT; slot++) {
      expect(CHART_CSS_VARS.theme[`color-chart-series-${slot}`]).toBe(
        `var(--chart-series-${slot})`
      )
    }
  })

  it("ships in the foundations for both modes", () => {
    for (const mode of MODES) {
      CHART_SERIES[mode].forEach((color, index) => {
        expect(FABRICATOR_TOKENS[mode][`chart-series-${index + 1}`]).toBe(color)
      })
    }
  })

  it("reaches React Native under the same names", () => {
    for (const mode of MODES) {
      const variables = getNativeCssVariables(mode, DEFAULT_LOOK)
      for (let slot = 1; slot <= CHART_SERIES_COUNT; slot++) {
        expect(variables[`--chart-series-${slot}`]).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})
