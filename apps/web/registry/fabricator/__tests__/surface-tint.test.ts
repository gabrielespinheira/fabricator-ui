import { describe, expect, it } from "vitest"

import { contrast } from "@/registry/fabricator/__tests__/contrast"
import {
  FABRICATOR_FOUNDATIONS,
  FABRICATOR_PALETTE,
} from "@/registry/fabricator/foundations"
import {
  MUTED_FOREGROUND_STEP,
  NEUTRAL_TINT,
  oklchToLinearRgb,
  SURFACE_MAX_CHROMA,
  SURFACE_STEPS,
  surfaceLadder,
  TINTED_NEUTRALS,
  tintedLiteral,
  tintToHex,
} from "@/registry/fabricator/surface-tint"

const HUES = Array.from({ length: 72 }, (_, index) => index * 5)
const STRENGTHS = [SURFACE_MAX_CHROMA / 2, SURFACE_MAX_CHROMA]

function inGamut(color: string) {
  const [l, c, h] = color.match(/[\d.]+/g)!.map(Number)
  return oklchToLinearRgb(l, c, h).every((v) => v >= -0.001 && v <= 1.001)
}

describe("surface tint", () => {
  it("is neutral by default", () => {
    const light = FABRICATOR_FOUNDATIONS.cssVars.light
    expect(light["surface-hue"]).toBe("0")
    expect(light["surface-chroma"]).toBe("0")
    expect(surfaceLadder("light", NEUTRAL_TINT)).toEqual([
      "oklch(0.985 0 0)",
      "oklch(0.991 0 0)",
      ...Array(6).fill("oklch(1 0 0)"),
    ])
    expect(surfaceLadder("dark", NEUTRAL_TINT)[0]).toBe("oklch(0.205 0 0)")
  })

  it("derives every surface from the two vars", () => {
    for (const mode of ["light", "dark"] as const) {
      SURFACE_STEPS[mode].forEach((step, index) => {
        const value = FABRICATOR_FOUNDATIONS.cssVars[mode][
          `surface-${index + 1}`
        ] as string
        if (step.share === 0) expect(value).toBe(`oklch(${step.l} 0 0)`)
        else expect(value).toContain("var(--surface-hue)")
      })
    }
  })

  it("keeps the palette's literal surfaces in step with the ladder", () => {
    for (const mode of ["light", "dark"] as const) {
      const ladder = surfaceLadder(mode, NEUTRAL_TINT)
      const palette = FABRICATOR_PALETTE[mode]
      expect(palette.background).toBe(ladder[0])
      expect(palette.sidebar).toBe(ladder[1])
      expect(palette.card).toBe(ladder[2])
      expect(palette.popover).toBe(ladder[2])
    }
  })

  for (const mode of ["light", "dark"] as const) {
    const palette = FABRICATOR_PALETTE[mode]
    const steps = [
      ...SURFACE_STEPS[mode],
      ...Object.values(TINTED_NEUTRALS[mode]),
      MUTED_FOREGROUND_STEP,
    ]

    it(`${mode}: rises level by level and keeps the tint to the top`, () => {
      for (const chroma of STRENGTHS) {
        const values = SURFACE_STEPS[mode].map((step) => ({
          l: step.l - chroma * (step.drop ?? 0),
          c: chroma * step.share,
        }))
        values.slice(1).forEach((value, index) => {
          expect(value.l).toBeGreaterThan(values[index].l)
        })
        // Like dark, the top level carries a good part of the page's tint.
        expect(values[7].c / values[0].c).toBeGreaterThanOrEqual(0.4)
      }
    })

    it(`${mode}: stays inside sRGB for every hue`, () => {
      for (const hue of HUES) {
        for (const chroma of STRENGTHS) {
          for (const step of steps) {
            const color = tintedLiteral(step, { hue, chroma })
            expect(inGamut(color), color).toBe(true)
          }
        }
      }
    })

    // Light: muted text (darkened with the tint) is AA on every level.
    // Dark: lightness doesn't move, so muted text is AA up to dialogs
    // (level 5), as on the neutral ladder, and the tint barely shifts it.
    it(`${mode}: text contrast holds on every tinted surface`, () => {
      const neutral = surfaceLadder(mode, NEUTRAL_TINT)
      for (const hue of HUES) {
        for (const chroma of STRENGTHS) {
          const tint = { hue, chroma }
          const muted =
            mode === "light"
              ? tintedLiteral(MUTED_FOREGROUND_STEP, tint)
              : palette["muted-foreground"]
          surfaceLadder(mode, tint).forEach((surface, index) => {
            expect(contrast(palette.foreground, surface)).toBeGreaterThan(4.5)
            if (mode === "light" || index < 5) {
              expect(contrast(muted, surface)).toBeGreaterThan(4.5)
            } else {
              expect(
                Math.abs(
                  contrast(muted, surface) - contrast(muted, neutral[index])
                )
              ).toBeLessThan(0.1)
            }
          })
        }
      }
    })
  }

  it("draws a swatch for every tint", () => {
    expect(tintToHex(NEUTRAL_TINT)).toMatch(/^#([0-9a-f]{2})\1\1$/)
    for (const hue of HUES) {
      expect(tintToHex({ hue, chroma: SURFACE_MAX_CHROMA })).toMatch(
        /^#[0-9a-f]{6}$/
      )
    }
  })
})
