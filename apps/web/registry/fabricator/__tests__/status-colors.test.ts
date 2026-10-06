import { describe, expect, it } from "vitest"

import { FABRICATOR_FOUNDATIONS } from "@/registry/fabricator/foundations"
import { STATUS_CSS_VARS, STATUSES } from "@/registry/fabricator/status-colors"

// OKLCH → relative luminance (WCAG), via OKLab and linear sRGB.
function luminance(color: string) {
  const match = color.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/)
  if (!match) throw new Error(`Not an opaque oklch() colour: ${color}`)
  const [l, c, h] = match.slice(1).map(Number)
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const r = clamp(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp)
  const g = clamp(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp)
  const bl = clamp(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp)
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

describe("status colours", () => {
  for (const mode of ["light", "dark"] as const) {
    const vars = STATUS_CSS_VARS[mode] as Record<string, string>
    const neutral = FABRICATOR_FOUNDATIONS.cssVars[mode] as Record<
      string,
      string
    >

    for (const status of STATUSES) {
      const surfaces = [
        ...LEVELS.map((level) => vars[`${status}-surface-${level}`]),
        ...LEVELS.map((level) => neutral[`surface-${level}`]),
      ]

      it(`${mode} ${status}: text is AA (4.5:1) on every surface`, () => {
        for (const surface of surfaces) {
          expect(contrast(vars[`${status}-text`], surface)).toBeGreaterThan(4.5)
        }
      })

      it(`${mode} ${status}: the solid is 3:1 on every surface`, () => {
        for (const surface of surfaces) {
          expect(contrast(vars[status], surface)).toBeGreaterThan(3)
        }
      })

      it(`${mode} ${status}: foreground is AA on the solid`, () => {
        expect(
          contrast(vars[`${status}-foreground`], vars[status])
        ).toBeGreaterThan(4.5)
      })

      it(`${mode} ${status}: has a full surface ladder`, () => {
        for (const level of LEVELS) {
          expect(vars[`${status}-surface-${level}`]).toMatch(/^oklch\(/)
        }
      })
    }
  }
})
