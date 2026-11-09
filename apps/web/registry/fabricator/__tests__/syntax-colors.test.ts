import { describe, expect, it } from "vitest"

import {
  normalizeRoleColor,
  ROLE_DEFAULTS,
  roleLiterals,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import { contrast, layer, parseOklch } from "@/registry/fabricator/contrast"
import { FABRICATOR_TOKENS } from "@/registry/fabricator/foundation-tokens"
import {
  NEUTRAL_TINT,
  oklchToLinearRgb,
  SURFACE_MAX_CHROMA,
  surfaceLadder,
} from "@/registry/fabricator/surface-tint"
import {
  SYNTAX_COLORS,
  SYNTAX_CSS_VARS,
  SYNTAX_DEFAULTS,
  SYNTAX_SOURCES,
  SYNTAX_TOKENS,
  syntaxCss,
  syntaxLiterals,
} from "@/registry/fabricator/syntax-colors"

const MODES = ["light", "dark"] as const

// Code sits on the page, a sidebar or a card: the first four levels.
const CODE_LEVELS = 4

function codeSurfaces(mode: "light" | "dark") {
  return [
    NEUTRAL_TINT,
    ...Array.from({ length: 12 }, (_, index) => ({
      hue: index * 30,
      chroma: SURFACE_MAX_CHROMA,
    })),
  ].flatMap((tint) => surfaceLadder(mode, tint).slice(0, CODE_LEVELS))
}

function inSrgb(color: string) {
  const { l, c, h } = parseOklch(color)
  return oklchToLinearRgb(l, c, h).every((v) => v >= -0.001 && v <= 1.001)
}

function withRole(role: ColorRole, color: RoleColor) {
  return { ...ROLE_DEFAULTS, [role]: color }
}

const linkedRoles = SYNTAX_COLORS.flatMap((name) => {
  const role = SYNTAX_SOURCES[name]
  return role ? [{ name, role }] : []
})

describe("syntax colours", { timeout: 60_000 }, () => {
  it("names every token the same in light and dark", () => {
    const names = SYNTAX_TOKENS.map((name) => `syntax-${name}`)
    for (const mode of MODES) {
      expect(Object.keys(syntaxCss(mode)).sort()).toEqual([...names].sort())
    }
  })

  it("takes each linked colour from its role's two variables", () => {
    for (const { name, role } of linkedRoles) {
      for (const mode of MODES) {
        const value = syntaxCss(mode)[`syntax-${name}`]
        expect(value).toContain(`--${role}-hue`)
        expect(value).toContain(`var(--${role}-chroma)`)
      }
    }
  })

  it("gives the colours no role covers their own variables", () => {
    for (const name of SYNTAX_COLORS.filter((key) => !SYNTAX_SOURCES[key])) {
      const value = syntaxCss("light")[`syntax-${name}`]
      expect(value).toContain(`var(--syntax-${name}-hue)`)
      expect(value).toContain(`var(--syntax-${name}-chroma)`)
      expect(SYNTAX_CSS_VARS.light[`syntax-${name}-hue`]).toBe(
        String(SYNTAX_DEFAULTS[name as keyof typeof SYNTAX_DEFAULTS].hue)
      )
    }
  })

  it("maps every token to a Tailwind colour", () => {
    for (const name of SYNTAX_TOKENS) {
      expect(SYNTAX_CSS_VARS.theme[`color-syntax-${name}`]).toBe(
        `var(--syntax-${name})`
      )
    }
  })

  it("ships with the foundations", () => {
    for (const name of SYNTAX_TOKENS) {
      expect(FABRICATOR_TOKENS.light[`syntax-${name}`]).toBeDefined()
      expect(FABRICATOR_TOKENS.dark[`syntax-${name}`]).toBeDefined()
      expect(FABRICATOR_TOKENS.theme[`color-syntax-${name}`]).toBeDefined()
    }
  })

  it("keeps every token readable on code surfaces at the defaults", () => {
    for (const mode of MODES) {
      const colors = syntaxLiterals(mode, ROLE_DEFAULTS, NEUTRAL_TINT)
      for (const surface of codeSurfaces(mode)) {
        for (const [name, color] of Object.entries(colors)) {
          expect(
            contrast(color, surface),
            `${mode} ${name} on ${surface}`
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it("keeps every token readable on marked lines", () => {
    for (const mode of MODES) {
      const code = surfaceLadder(mode, NEUTRAL_TINT)[1]
      const fill = (role: "success" | "destructive") =>
        roleLiterals(role, mode, ROLE_DEFAULTS[role])[role]
      const bands = {
        highlighted: layer(FABRICATOR_TOKENS[mode].active, code),
        inserted: layer(fill("success"), code, 0.12),
        deleted: layer(fill("destructive"), code, 0.12),
      }
      const colors = syntaxLiterals(mode, ROLE_DEFAULTS, NEUTRAL_TINT)
      for (const [band, background] of Object.entries(bands)) {
        for (const [name, color] of Object.entries(colors)) {
          expect(
            contrast(color, background),
            `${mode} ${name} on a ${band} line`
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it("stays readable and inside sRGB for any setting of its role", () => {
    for (const { name, role } of linkedRoles) {
      for (let hue = 0; hue < 360; hue += 10) {
        for (const strength of [0, 0.5, 1]) {
          // The role's hue, moved into its range, at its strongest.
          const strongest = normalizeRoleColor(role, { hue, chroma: 1 })
          const color = { ...strongest, chroma: strongest.chroma * strength }
          for (const mode of MODES) {
            const value = syntaxLiterals(
              mode,
              withRole(role, color),
              NEUTRAL_TINT
            )[name]
            expect(inSrgb(value), `${mode} ${name} ${value}`).toBe(true)
            for (const surface of surfaceLadder(mode, NEUTRAL_TINT).slice(
              0,
              CODE_LEVELS
            )) {
              expect(contrast(value, surface)).toBeGreaterThanOrEqual(4.5)
            }
          }
        }
      }
    }
  })

  it("draws its own hues inside sRGB", () => {
    for (const mode of MODES) {
      const colors = syntaxLiterals(mode, ROLE_DEFAULTS, NEUTRAL_TINT)
      for (const name of SYNTAX_COLORS) {
        expect(inSrgb(colors[name]), `${mode} ${name}`).toBe(true)
      }
    }
  })

  it("turns a linked colour neutral when its role is", () => {
    const neutral = syntaxLiterals(
      "light",
      withRole("info", { hue: 260, chroma: 0 }),
      NEUTRAL_TINT
    )
    expect(parseOklch(neutral.function).c).toBe(0)
  })

  it("keeps the six colours apart at the defaults", () => {
    for (const mode of MODES) {
      const colors = syntaxLiterals(mode, ROLE_DEFAULTS, NEUTRAL_TINT)
      const hues = SYNTAX_COLORS.map((name) => parseOklch(colors[name]).h)
      for (const [index, hue] of hues.entries()) {
        for (const other of hues.slice(index + 1)) {
          const distance = Math.min(
            Math.abs(hue - other),
            360 - Math.abs(hue - other)
          )
          expect(distance).toBeGreaterThanOrEqual(35)
        }
      }
    }
  })
})
