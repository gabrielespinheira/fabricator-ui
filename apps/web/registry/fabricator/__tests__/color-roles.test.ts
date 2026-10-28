import { describe, expect, it } from "vitest"

import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_CSS_VARS,
  ROLE_DEFAULTS,
  ROLE_HUE_RANGES,
  ROLE_PALETTE_LINKS,
  roleCss,
  roleLiterals,
  roleMaxChroma,
  rolePalette,
  roleStrength,
  roleToHex,
  SHADCN_ROLE_TOKENS,
} from "@/registry/fabricator/color-roles"
import { contrast, layer, parseOklch } from "@/registry/fabricator/contrast"
import {
  NEUTRAL_TINT,
  oklchToLinearRgb,
  SURFACE_MAX_CHROMA,
  surfaceLadder,
} from "@/registry/fabricator/surface-tint"

const MODES = ["light", "dark"] as const
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]
const HUES = Array.from({ length: 72 }, (_, index) => index * 5)
const STRENGTHS = [0, 0.25, 0.5, 0.75, 1]

// Every hue at five strengths, up to the hue's maximum.
const SETTINGS = HUES.flatMap((hue) =>
  STRENGTHS.map((strength) => ({
    hue,
    chroma: roleMaxChroma(hue) * strength,
  }))
)

// The neutral surfaces, and the tinted ones at full strength around the wheel.
function neutralSurfaces(mode: "light" | "dark") {
  return [
    NEUTRAL_TINT,
    ...Array.from({ length: 24 }, (_, index) => ({
      hue: index * 15,
      chroma: SURFACE_MAX_CHROMA,
    })),
  ].flatMap((tint) => surfaceLadder(mode, tint))
}

function inSrgb(color: string) {
  const { l, c, h } = parseOklch(color)
  return oklchToLinearRgb(l, c, h).every((v) => v >= -0.001 && v <= 1.001)
}

describe("colour roles", () => {
  it("gives every role the same tokens", () => {
    const names = (role: string) =>
      Object.keys(roleCss("info", "light")).map((name) =>
        name.replace(/^info/, role)
      )
    for (const role of COLOR_ROLES) {
      for (const mode of MODES) {
        expect(Object.keys(roleCss(role, mode))).toEqual(names(role))
      }
    }
  })

  it("derives every coloured token from the role's two variables", () => {
    for (const role of COLOR_ROLES) {
      for (const mode of MODES) {
        for (const [name, value] of Object.entries(roleCss(role, mode))) {
          if (name.endsWith("-foreground") && role !== "secondary") {
            expect(value).toMatch(/^oklch\([\d.]+ 0 0\)$/)
          } else {
            expect(value).toContain(`var(--${role}-hue)`)
            expect(value).toContain(`var(--${role}-chroma)`)
          }
        }
      }
    }
  })

  it("is neutral at strength 0", () => {
    for (const role of COLOR_ROLES) {
      for (const mode of MODES) {
        const tokens = roleLiterals(role, mode, { hue: 140, chroma: 0 })
        for (const value of Object.values(tokens)) {
          expect(parseOklch(value).c).toBe(0)
        }
      }
    }
    const neutral = {
      primary: NEUTRAL_TINT,
      secondary: NEUTRAL_TINT,
      info: NEUTRAL_TINT,
      success: NEUTRAL_TINT,
      warning: NEUTRAL_TINT,
      destructive: NEUTRAL_TINT,
    }
    expect(rolePalette("light", neutral)).toMatchObject({
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0 0 0 / 0.08)",
      "secondary-foreground": "oklch(0.205 0 0)",
    })
    expect(rolePalette("dark", neutral)).toMatchObject({
      primary: "oklch(0.97 0 0)",
      "primary-foreground": "oklch(0.205 0 0)",
      secondary: "oklch(1 0 0 / 0.25)",
      "secondary-foreground": "oklch(0.97 0 0)",
    })
  })

  it("keeps primary neutral and the statuses coloured by default", () => {
    expect(ROLE_DEFAULTS.primary.chroma).toBe(0)
    expect(ROLE_DEFAULTS.secondary.chroma).toBe(0)
    for (const role of ["info", "success", "warning", "destructive"] as const) {
      const color = ROLE_DEFAULTS[role]
      expect(color.chroma).toBeGreaterThan(0)
      expect(color.chroma).toBeLessThanOrEqual(roleMaxChroma(color.hue))
      expect(ROLE_CSS_VARS.light[`${role}-hue`]).toBe(String(color.hue))
      expect(ROLE_CSS_VARS.light[`${role}-chroma`]).toBe(String(color.chroma))
    }
  })

  it("leaves the shadcn token names to the palette", () => {
    for (const mode of MODES) {
      for (const name of SHADCN_ROLE_TOKENS) {
        expect(ROLE_CSS_VARS[mode]).not.toHaveProperty(name)
        expect(ROLE_PALETTE_LINKS[mode][name]).toMatch(/^oklch\(/)
        expect(rolePalette(mode)[name]).toMatch(/^oklch\(/)
      }
    }
    expect(ROLE_PALETTE_LINKS.light.primary).toContain("var(--primary-hue)")
    expect(ROLE_CSS_VARS.theme["color-destructive-foreground"]).toBe(
      "var(--destructive-foreground)"
    )
    expect(ROLE_CSS_VARS.theme).not.toHaveProperty("color-primary")
  })

  it("matches the literal colours to the CSS recipe", () => {
    // The CSS and the literals are written by separate code paths: evaluate
    // the CSS for one setting and compare.
    const color = { hue: 300, chroma: 0.04 }
    for (const mode of MODES) {
      const css = roleCss("info", mode)
      const literals = roleLiterals("info", mode, color)
      for (const [name, value] of Object.entries(css)) {
        const evaluated = value
          .replaceAll("var(--info-chroma)", String(color.chroma))
          .replaceAll("var(--info-hue)", String(color.hue))
        expect(evaluateOklch(evaluated), name).toEqual(
          parseOklch(literals[name])
        )
      }
    }
  })

  it("caps strength at the hue's maximum", () => {
    const max = roleMaxChroma(265)
    expect(normalizeRoleColor("primary", { hue: 625, chroma: 1 })).toEqual({
      hue: 265,
      chroma: max,
    })
    expect(normalizeRoleColor("info", { hue: "red" })).toEqual(
      ROLE_DEFAULTS.info
    )
    expect(roleStrength({ hue: 265, chroma: max / 2 })).toBeCloseTo(0.5)
  })

  it("keeps each status in its family of hues", () => {
    expect(ROLE_HUE_RANGES.primary).toEqual([0, 360])
    expect(ROLE_HUE_RANGES.secondary).toEqual([0, 360])
    for (const role of ["info", "success", "warning", "destructive"] as const) {
      const [from, to] = ROLE_HUE_RANGES[role]
      expect(ROLE_DEFAULTS[role].hue).toBeGreaterThanOrEqual(from)
      expect(ROLE_DEFAULTS[role].hue).toBeLessThanOrEqual(to)
      // The CSS clamps a hand-written hue, and so do the literals and the
      // stored setting.
      expect(roleCss(role, "light")[role]).toContain(
        `clamp(${from}, var(--${role}-hue), ${to})`
      )
      const outside = { hue: (to + 90) % 360, chroma: 0.08 }
      const hue = parseOklch(roleLiterals(role, "light", outside)[role]).h
      expect([from, to]).toContain(hue)
      expect([from, to]).toContain(normalizeRoleColor(role, outside).hue)
    }
    // Info is blue, success green, warning orange to yellow, destructive red
    // to orange.
    expect(ROLE_HUE_RANGES.info[0]).toBeGreaterThanOrEqual(200)
    expect(ROLE_HUE_RANGES.info[1]).toBeLessThanOrEqual(280)
    expect(ROLE_HUE_RANGES.success[0]).toBeGreaterThanOrEqual(120)
    expect(ROLE_HUE_RANGES.success[1]).toBeLessThanOrEqual(180)
    expect(ROLE_HUE_RANGES.warning[0]).toBeGreaterThanOrEqual(40)
    expect(ROLE_HUE_RANGES.warning[1]).toBeLessThanOrEqual(105)
    expect(ROLE_HUE_RANGES.destructive[0]).toBeGreaterThanOrEqual(0)
    expect(ROLE_HUE_RANGES.destructive[1]).toBeLessThanOrEqual(55)
  })

  it("draws a swatch for every setting", () => {
    expect(roleToHex(NEUTRAL_TINT)).toBe("#171717")
    for (const color of SETTINGS) {
      expect(roleToHex(color)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  for (const mode of MODES) {
    const neutral = neutralSurfaces(mode)

    it(`${mode}: fill, text and border stay inside sRGB`, () => {
      for (const color of SETTINGS) {
        for (const role of ["primary", "secondary"] as const) {
          const tokens = roleLiterals(role, mode, color)
          for (const [name, value] of Object.entries(tokens)) {
            if (name.includes("-surface-")) continue
            expect(inSrgb(value), `${name} ${value}`).toBe(true)
          }
        }
      }
    })

    // Hover is the fill at 90% and press at 80% (`hover:bg-primary/90`).
    // Pressed shows only while the pointer is down, so it keeps 3:1.
    it(`${mode}: the foreground is AA on the fill, at rest and on hover`, () => {
      for (const color of SETTINGS) {
        const tokens = roleLiterals("primary", mode, color)
        const foreground = tokens["primary-foreground"]
        expect(contrast(foreground, tokens.primary)).toBeGreaterThan(4.5)
        for (const surface of neutral) {
          const on = (opacity: number) =>
            contrast(foreground, layer(tokens.primary, surface, opacity))
          expect(on(0.9)).toBeGreaterThan(4.5)
          expect(on(0.8)).toBeGreaterThan(3)
        }
      }
    })

    it(`${mode}: text is AA on every surface`, () => {
      for (const color of SETTINGS) {
        const tokens = roleLiterals("primary", mode, color)
        const own = LEVELS.map((level) => tokens[`primary-surface-${level}`])
        for (const surface of [...own, ...neutral]) {
          expect(contrast(tokens["primary-text"], surface)).toBeGreaterThan(4.5)
        }
      }
    })

    it(`${mode}: the fill is 3:1 on every surface`, () => {
      for (const color of SETTINGS) {
        const tokens = roleLiterals("primary", mode, color)
        const own = LEVELS.map((level) => tokens[`primary-surface-${level}`])
        for (const surface of [...own, ...neutral]) {
          expect(contrast(tokens.primary, surface)).toBeGreaterThan(3)
        }
      }
    })

    // The soft fill is translucent, so it is checked on the levels a
    // secondary button sits on: the page up to dialogs (1 to 5).
    it(`${mode}: secondary text is AA on its soft fill`, () => {
      const levels = neutral.filter((_, index) => index % 8 < 5)
      for (const color of SETTINGS) {
        const tokens = roleLiterals("secondary", mode, color)
        for (const surface of levels) {
          for (const opacity of [1, 0.8]) {
            expect(
              contrast(
                tokens["secondary-foreground"],
                layer(tokens.secondary, surface, opacity)
              )
            ).toBeGreaterThan(4.5)
          }
        }
      }
    })

    it(`${mode}: every default role keeps its pairs AA`, () => {
      for (const role of [
        "info",
        "success",
        "warning",
        "destructive",
      ] as const) {
        const tokens = roleLiterals(role, mode, ROLE_DEFAULTS[role])
        const own = LEVELS.map((level) => tokens[`${role}-surface-${level}`])
        expect(
          contrast(tokens[`${role}-foreground`], tokens[role])
        ).toBeGreaterThan(4.5)
        for (const surface of [...own, ...neutral]) {
          expect(contrast(tokens[`${role}-text`], surface)).toBeGreaterThan(4.5)
          expect(contrast(tokens[role], surface)).toBeGreaterThan(3)
        }
      }
    })
  }
})

// Evaluates an oklch() whose channels are numbers, calc(), min(), clamp() and the
// four operators, once its variables are replaced: a small recursive-descent
// parser, so the test checks the CSS as a browser would compute it.
function evaluateOklch(css: string) {
  const tokens = css
    .slice("oklch(".length, -1)
    .match(/[\d.]+|calc|clamp|min|[()+\-*/,]/g)
  if (!tokens) throw new Error(`Empty colour: ${css}`)
  let position = 0
  const peek = () => tokens[position]
  const take = (expected?: string) => {
    const token = tokens[position++]
    if (expected && token !== expected) {
      throw new Error(`Expected ${expected}, got ${token} in ${css}`)
    }
    return token
  }

  function factor(): number {
    const token = take()
    if (token === "calc" || token === "(") {
      if (token === "calc") take("(")
      const value = expression()
      take(")")
      return value
    }
    if (token === "min" || token === "clamp") {
      take("(")
      const values = [expression()]
      while (peek() === ",") {
        take(",")
        values.push(expression())
      }
      take(")")
      if (token === "min") return Math.min(...values)
      const [lowest, value, highest] = values
      return Math.min(Math.max(value, lowest), highest)
    }
    return Number(token)
  }

  function term(): number {
    let value = factor()
    while (peek() === "*" || peek() === "/") {
      value = take() === "*" ? value * factor() : value / factor()
    }
    return value
  }

  function expression(): number {
    let value = term()
    while (peek() === "+" || peek() === "-") {
      value = take() === "+" ? value + term() : value - term()
    }
    return value
  }

  const round = (value: number, digits: number) =>
    Math.round(value * 10 ** digits) / 10 ** digits
  const l = round(factor(), 4)
  const c = round(factor(), 4)
  const h = factor()
  const alpha = peek() === "/" && take() ? round(factor(), 3) : 1
  return { l, c, h: c === 0 ? 0 : h, alpha }
}
