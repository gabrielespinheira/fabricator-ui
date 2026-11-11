import { describe, expect, it } from "vitest"

import { COLOR_ROLES } from "@/registry/fabricator/color-roles"
import { DENSITIES, DENSITY_SPACE_STEPS } from "@/registry/fabricator/density"
import {
  FABRICATOR_PALETTE,
  FABRICATOR_TOKENS,
} from "@/registry/fabricator/foundation-tokens"
import { DEFAULT_LOOK, type FabricatorLook } from "@/registry/fabricator/look"
import {
  MOTION_ROLES,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
} from "@/registry/fabricator/motion"
import {
  DEFAULT_NATIVE_LOOK,
  getNativeCssVariables,
  getNativeRuntimeVariables,
  getNativeTheme,
  toNativeStylesheet,
} from "@/registry/fabricator/native-theme"

// A recipe's inputs and a shadow's parts; the popup blur, which React Native
// can't animate; and the curves, which come from --motion-speed.
const INPUT_TOKEN =
  /^(shadow-color|overlay|dm-.*|.*-hue|.*-chroma|motion-popup-blur|motion-ease-.*)$/

const look = (overrides: Partial<FabricatorLook>): FabricatorLook => ({
  ...DEFAULT_LOOK,
  ...overrides,
})

describe("getNativeCssVariables", () => {
  it.each(["light", "dark"] as const)(
    "resolves every token in %s mode to a value React Native can draw",
    (mode) => {
      const vars = getNativeCssVariables(mode, DEFAULT_LOOK)
      const names = [
        ...Object.keys(FABRICATOR_PALETTE[mode]),
        ...Object.keys(FABRICATOR_TOKENS[mode]),
        ...Object.keys(FABRICATOR_TOKENS.light),
      ].filter((name) => !INPUT_TOKEN.test(name))
      for (const name of names) {
        expect(vars, name).toHaveProperty([`--${name}`])
      }
      for (const [name, value] of Object.entries(vars)) {
        expect(String(value), name).not.toMatch(/var\(|calc\(|oklch\(|rem\b/)
      }
    }
  )

  // The website's computed values, measured in a browser.
  it("matches the website in light mode", () => {
    expect(getNativeCssVariables("light", DEFAULT_LOOK)).toMatchObject({
      "--background": "#fafafa",
      "--foreground": "#171717",
      "--card": "#ffffff",
      "--popover": "#ffffff",
      "--primary": "#171717",
      "--primary-foreground": "#fafafa",
      "--muted-foreground": "#737373",
      "--hover": "rgba(0, 0, 0, 0.04)",
      "--active": "rgba(0, 0, 0, 0.07)",
      "--border": "rgba(23, 23, 23, 0.12)",
    })
  })

  it("matches the website in dark mode", () => {
    expect(getNativeCssVariables("dark", DEFAULT_LOOK)).toMatchObject({
      "--background": "#171717",
      "--foreground": "#f5f5f5",
      "--popover": "#252525",
      "--primary": "#f5f5f5",
      "--primary-foreground": "#171717",
      "--muted-foreground": "#a3a3a3",
      "--hover": "rgba(255, 255, 255, 0.06)",
      "--border": "rgba(245, 245, 245, 0.12)",
    })
  })

  it("writes shadow colours without commas, which Uniwind splits on", () => {
    expect(getNativeCssVariables("light", DEFAULT_LOOK)["--shadow-2"]).toBe(
      "0 0 0 1px #0000000f, 0 1px 1px -0.5px #0000000f"
    )
    for (const level of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const shadow = getNativeCssVariables("dark", DEFAULT_LOOK)
      expect(shadow[`--shadow-${level}`]).not.toContain("rgba(")
    }
  })

  it("has every colour role's tokens", () => {
    const vars = getNativeCssVariables("light", DEFAULT_LOOK)
    for (const role of COLOR_ROLES) {
      expect(vars).toHaveProperty([`--${role}`])
      expect(vars).toHaveProperty([`--${role}-text`])
      expect(vars).toHaveProperty([`--${role}-border`])
      expect(vars).toHaveProperty([`--${role}-surface-8`])
    }
  })

  it("follows the surface tint and the colour roles", () => {
    const tinted = getNativeCssVariables(
      "light",
      look({
        surface: { hue: 260, chroma: 0.02 },
        colors: {
          ...DEFAULT_LOOK.colors,
          primary: { hue: 260, chroma: 0.18 },
        },
      })
    )
    const neutral = getNativeCssVariables("light", DEFAULT_LOOK)
    expect(tinted["--background"]).not.toBe(neutral["--background"])
    expect(tinted["--card"]).not.toBe(neutral["--card"])
    expect(tinted["--primary"]).not.toBe(neutral["--primary"])
    expect(tinted["--sidebar-primary"]).toBe(tinted["--primary"])
  })

  it.each(["light", "dark"] as const)(
    "has the App Shell's frame tokens in %s mode, as getNativeTheme resolves them",
    (mode) => {
      const vars = getNativeCssVariables(mode, DEFAULT_LOOK)
      const { colors } = getNativeTheme(mode, DEFAULT_LOOK)
      expect(vars).toMatchObject({
        "--app-shell-frame": colors.frame,
        "--app-shell-main": colors.main,
        "--app-shell-panel": colors.panel,
        "--app-shell-frame-muted": colors.mutedOnFrame,
      })
    }
  )

  it("follows the surface tint on the App Shell's frame", () => {
    const tint = look({ surface: { hue: 260, chroma: 0.02 } })
    const tinted = getNativeCssVariables("light", tint)
    expect(tinted["--app-shell-frame"]).toBe(
      getNativeTheme("light", tint).colors.frame
    )
    expect(tinted["--app-shell-frame"]).not.toBe(
      getNativeCssVariables("light", DEFAULT_LOOK)["--app-shell-frame"]
    )
  })

  it("writes the App Shell's card edge without commas in its colours", () => {
    const light = getNativeCssVariables("light", DEFAULT_LOOK)
    expect(light["--app-shell-card-shadow"]).toBe(light["--shadow-2"])
    const dark = String(
      getNativeCssVariables("dark", DEFAULT_LOOK)["--app-shell-card-shadow"]
    )
    expect(dark).toMatch(/^inset 0 0 0 1px #[0-9a-f]{8}, 0 1px 2px #0000003d$/)
  })

  it("sets the radius scale, with Pill at 20", () => {
    expect(getNativeCssVariables("light", DEFAULT_LOOK)).toMatchObject({
      "--radius": 8,
      "--radius-lg": 8,
      "--radius-sm": 4.8,
    })
    expect(
      getNativeCssVariables("light", look({ radius: "pill" }))
    ).toMatchObject({ "--radius": 20, "--radius-lg": 20, "--radius-xl": 28 })
  })

  it("sets the density's sizes as numbers", () => {
    const vars = getNativeCssVariables("light", look({ density: "spacious" }))
    for (const step of DENSITY_SPACE_STEPS) {
      expect(vars[`--density-${step}`]).toBe(DENSITIES.spacious.space[step])
    }
    expect(vars["--density-text-13"]).toBe(15)
    expect(vars["--density-icon-16"]).toBe(18)
  })

  it("sets the motion speed, and zero when off", () => {
    const snappy = getNativeCssVariables("light", look({ motion: "snappy" }))
    for (const role of MOTION_ROLES) {
      expect(snappy[`--motion-${role}`]).toBe(
        MOTION_SPEEDS.snappy.durations[role].enter
      )
      expect(snappy[`--motion-${role}-exit`]).toBe(
        MOTION_SPEEDS.snappy.durations[role].exit
      )
    }
    expect(snappy["--motion-scale"]).toBe(1)
    expect(snappy["--motion-press-scale"]).toBe(
      MOTION_SPEEDS.snappy.scales.press
    )
    expect(snappy["--motion-speed"]).toBe(MOTION_SPEED_NAMES.indexOf("snappy"))

    const off = getNativeCssVariables("light", look({ motion: "off" }))
    expect(off["--motion-scale"]).toBe(0)
    expect(off["--motion-dialog"]).toBe(0)
  })
})

describe("toNativeStylesheet", () => {
  const css = toNativeStylesheet(DEFAULT_NATIVE_LOOK)

  it("names the fonts, which a project's text falls back to the system without", () => {
    expect(css).toContain("--font-sans: Inter;")
    expect(css).toContain("--font-heading: Inter;")
  })

  it("defaults native projects to the Default density, which FabricatorRoot sizes for the device", () => {
    expect(DEFAULT_NATIVE_LOOK.density).toBe("default")
    expect(css).toContain("--density-36: 36px;")
  })

  it("nests the modes where Uniwind reads them", () => {
    expect(css).toMatch(/@layer theme \{\s+:root \{\s+@variant light \{/)
    expect(css).toMatch(/@variant dark \{/)
  })

  it("maps the same Tailwind names as the website", () => {
    for (const utility of [
      "--color-background: var(--background);",
      "--color-primary-foreground: var(--primary-foreground);",
      "--color-surface-3: var(--surface-3);",
      "--color-hover: var(--hover);",
      "--color-destructive-text: var(--destructive-text);",
      "--color-sidebar-border: var(--sidebar-border);",
      "--shadow-surface-2: var(--shadow-2);",
      "--color-app-shell-frame: var(--app-shell-frame);",
      "--color-app-shell-main: var(--app-shell-main);",
      "--color-app-shell-panel: var(--app-shell-panel);",
      "--shadow-app-shell-card: var(--app-shell-card-shadow);",
    ]) {
      expect(css).toContain(utility)
    }
  })

  it("writes sizes in pixels and the radius scale per mode", () => {
    expect(css).toContain("--radius: 8px;")
    expect(css).toContain("--radius-lg: 8px;")
    expect(css).toContain("--density-text-13: 13px;")
    expect(css).toContain("--motion-dialog: 250;")
  })

  it("leaves out the website's motion theme keys", () => {
    expect(css).not.toContain("--transition-duration")
    expect(css).not.toContain("--ease-enter")
  })
})

describe("getNativeRuntimeVariables", () => {
  // Uniwind's parseBoxShadow and React Native's length parser, as they run on a
  // value handed to Uniwind.updateCSSVariables.
  const addUnits = (shadow: string) =>
    shadow.replace(
      /(?<![#\w.-])[+-]?(?:\d*\.\d+|\d+)(?![\w-])/g,
      (match) => `${match}px`
    )
  const REACT_NATIVE_LENGTH = /^[+-]?\d*\.?\d+(px)?$/

  it.each(["light", "dark"] as const)(
    "keeps every %s shadow readable after Uniwind adds the units",
    (mode) => {
      const variables = getNativeRuntimeVariables(mode, DEFAULT_LOOK)
      const shadows = Object.entries(variables).filter(([name]) =>
        name.includes("shadow")
      )
      expect(shadows.length).toBeGreaterThan(0)
      for (const [, shadow] of shadows) {
        for (const layer of addUnits(String(shadow)).split(",")) {
          for (const part of layer.trim().split(/\s+/)) {
            if (part === "inset" || part.startsWith("#")) continue
            expect(part).toMatch(REACT_NATIVE_LENGTH)
          }
        }
      }
    }
  )

  it("leaves everything but the shadows as the stylesheet has them", () => {
    const stylesheet = getNativeCssVariables("light", DEFAULT_LOOK)
    const runtime = getNativeRuntimeVariables("light", DEFAULT_LOOK)
    expect(Object.keys(runtime)).toEqual(Object.keys(stylesheet))
    for (const [name, value] of Object.entries(stylesheet)) {
      if (!name.includes("shadow")) expect(runtime[name]).toBe(value)
    }
  })
})

it("declares a static spinner default without overwriting it when the look changes", () => {
  expect(toNativeStylesheet()).toContain("--spinner-variant: 0;")
  expect(toNativeStylesheet(DEFAULT_NATIVE_LOOK, 8)).toContain(
    "--spinner-variant: 8;"
  )
  expect(getNativeRuntimeVariables("light", DEFAULT_LOOK)).not.toHaveProperty(
    "--spinner-variant"
  )
})
