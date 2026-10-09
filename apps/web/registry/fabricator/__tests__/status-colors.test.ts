import { describe, expect, it } from "vitest"

import { contrast } from "@/registry/fabricator/__tests__/contrast"
import { STATUS_CSS_VARS, STATUSES } from "@/registry/fabricator/status-colors"
import {
  NEUTRAL_TINT,
  SURFACE_MAX_CHROMA,
  surfaceLadder,
} from "@/registry/fabricator/surface-tint"

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

describe("status colours", () => {
  for (const mode of ["light", "dark"] as const) {
    const vars = STATUS_CSS_VARS[mode] as Record<string, string>
    // The neutral surfaces, and the tinted ones at full strength around the
    // hue wheel.
    const neutral = [
      NEUTRAL_TINT,
      ...Array.from({ length: 24 }, (_, index) => ({
        hue: index * 15,
        chroma: SURFACE_MAX_CHROMA,
      })),
    ].flatMap((tint) => surfaceLadder(mode, tint))

    for (const status of STATUSES) {
      const surfaces = [
        ...LEVELS.map((level) => vars[`${status}-surface-${level}`]),
        ...neutral,
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
