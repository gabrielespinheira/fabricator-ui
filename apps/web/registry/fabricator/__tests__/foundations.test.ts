import { describe, expect, it } from "vitest"

import { FABRICATOR_PALETTE } from "@/registry/fabricator/foundations"

// The CLI maps a token to `--color-<name>` in `@theme inline` only when its
// value is a colour. A var() or color-mix() value leaves utilities such as
// `border-border` undefined in a fresh install.
const LITERAL_COLOR = /^(oklch|oklab|lab|lch|hsl|hsla|rgb|rgba)\(|^#/

describe("FABRICATOR_PALETTE", () => {
  for (const mode of ["light", "dark"] as const) {
    it(`uses literal colours for ${mode} colour tokens`, () => {
      const offending = Object.entries(FABRICATOR_PALETTE[mode]).filter(
        ([name, value]) => name !== "radius" && !LITERAL_COLOR.test(value)
      )
      expect(offending).toEqual([])
    })
  }
})
