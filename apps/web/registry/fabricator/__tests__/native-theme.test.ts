import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOOK,
  lookToSearchParams,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import {
  APP_SHELL_CARD_SHADOW_DARK,
  APP_SHELL_FRAME_BLACK,
  APP_SHELL_FRAME_MUTED_BLACK,
  getLookFromUrl,
  getNativeTheme,
  RADIUS_SCALE,
} from "@/registry/fabricator/native-theme"

// The website's computed values, measured in a browser on /app-shell.
describe("getNativeTheme at the default look", () => {
  it("matches the website in light mode", () => {
    const { colors } = getNativeTheme("light", DEFAULT_LOOK)
    expect(colors).toMatchObject({
      frame: "#ededed",
      main: "#fafafa",
      panel: "#fafafa",
      popover: "#ffffff",
      foreground: "#171717",
      muted: "#737373",
      mutedOnFrame: "#636363",
      primary: "#171717",
      primaryForeground: "#fafafa",
      hover: "rgba(0, 0, 0, 0.04)",
      active: "rgba(0, 0, 0, 0.07)",
      border: "rgba(23, 23, 23, 0.12)",
    })
  })

  it("matches the website in dark mode", () => {
    const { colors } = getNativeTheme("dark", DEFAULT_LOOK)
    expect(colors).toMatchObject({
      frame: "#0d0d0d",
      main: "#171717",
      panel: "#171717",
      popover: "#252525",
      foreground: "#f5f5f5",
      muted: "#a3a3a3",
      mutedOnFrame: "#a3a3a3",
      primary: "#f5f5f5",
      primaryForeground: "#171717",
      hover: "rgba(255, 255, 255, 0.06)",
      active: "rgba(255, 255, 255, 0.1)",
      border: "rgba(245, 245, 245, 0.12)",
    })
  })

  it("derives the fills the components use", () => {
    const { colors } = getNativeTheme("dark", DEFAULT_LOOK)
    expect(colors.foregroundSoft).toBe("rgba(245, 245, 245, 0.8)")
    expect(colors.wash).toBe("rgba(255, 255, 255, 0.03)")
    expect(colors.tabTrack).toBe("rgba(245, 245, 245, 0.05)")
    expect(colors.segmentedTrack).toBe("rgba(245, 245, 245, 0.06)")
    expect(colors.placeholder).toBe("rgba(30, 30, 30, 0.5)")
  })

  it("resolves shadows to values React Native can read", () => {
    const light = getNativeTheme("light", DEFAULT_LOOK).shadows
    const dark = getNativeTheme("dark", DEFAULT_LOOK).shadows
    expect(light.card).toBe(
      "0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 1px -0.5px rgba(0, 0, 0, 0.06)"
    )
    expect(dark.card).toBe(
      "inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.24)"
    )
    expect(light.selection).toBe(light.card)
    expect(dark.selection).toBe(
      "inset 0 1px 0 0 rgba(255, 255, 255, 0.01), inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 1px 1px -0.5px rgba(0, 0, 0, 0.18)"
    )
    for (const shadow of [light.raised, dark.raised, light.page, dark.page]) {
      expect(shadow).not.toMatch(/var\(|oklch\(/)
    }
  })

  it("takes the radius scale", () => {
    expect(getNativeTheme("light", DEFAULT_LOOK).radius).toMatchObject({
      sm: 4.8,
      md: 6.4,
      lg: 8,
      xl: 11.2,
    })
  })

  it("takes the default density", () => {
    const theme = getNativeTheme("light", DEFAULT_LOOK)
    expect(theme.space[30]).toBe(30)
    expect(theme.text[13]).toBe(13)
    expect(theme.icon[16]).toBe(16)
    expect(theme.compact.space[36]).toBe(28)
    expect(theme.spacious.space[36]).toBe(44)
  })

  it("takes the default motion speed", () => {
    expect(getNativeTheme("light", DEFAULT_LOOK).motion).toEqual({
      sheetEnterMs: 400,
      sheetExitMs: 250,
      sheetEasing: [0.32, 0.72, 0, 1],
      moveMs: 250,
      moveEasing: [0.77, 0, 0.175, 1],
    })
  })
})

describe("getNativeTheme with a look", () => {
  const look = (change: Partial<FabricatorLook>): FabricatorLook => ({
    ...DEFAULT_LOOK,
    ...change,
  })

  // Measured on /app-shell with the surface at 220_0.035 and primary at 260_0.17.
  const tinted = look({
    surface: { hue: 220, chroma: 0.035 },
    colors: { ...DEFAULT_LOOK.colors, primary: { hue: 260, chroma: 0.17 } },
  })

  it("follows the surface tint in light mode", () => {
    expect(getNativeTheme("light", tinted).colors).toMatchObject({
      main: "#e9f6fb",
      panel: "#e9f6fb",
      popover: "#edf8fc",
      frame: "#dce9ed",
      muted: "#6f6f6f",
      mutedOnFrame: "#606060",
      foreground: "#171717",
      placeholder: "rgba(229, 241, 245, 0.5)",
    })
  })

  it("follows the surface tint in dark mode", () => {
    expect(getNativeTheme("dark", tinted).colors).toMatchObject({
      main: "#041a21",
      panel: "#041a21",
      popover: "#15282e",
      frame: "#021014",
      muted: "#a3a3a3",
      mutedOnFrame: "#a3a3a3",
      foreground: "#f5f5f5",
      placeholder: "rgba(12, 33, 40, 0.5)",
    })
  })

  it("follows the primary colour", () => {
    expect(getNativeTheme("light", tinted).colors).toMatchObject({
      primary: "#1957bb",
      primaryForeground: "#fafafa",
    })
    const dark = getNativeTheme("dark", tinted).colors
    expect(dark.primaryForeground).toBe("#171717")
    // Chrome rounds this one to #79abfc, a step away in one channel.
    expect(dark.primary).toBe("#7aabfc")
  })

  it("follows the density", () => {
    const theme = getNativeTheme("light", look({ density: "spacious" }))
    expect(theme.space[30]).toBe(38)
    expect(theme.text[13]).toBe(15)
    expect(theme.icon[16]).toBe(18)
    expect(theme.compact.space[36]).toBe(28)
  })

  it("follows the radius", () => {
    expect(
      getNativeTheme("light", look({ radius: "pill" })).radius
    ).toMatchObject({ md: 16, lg: 20, xl: 28 })
  })

  it("follows the motion speed, off included", () => {
    expect(
      getNativeTheme("light", look({ motion: "smooth" })).motion
    ).toMatchObject({ sheetEnterMs: 500, sheetExitMs: 320, moveMs: 360 })
    expect(
      getNativeTheme("light", look({ motion: "off" })).motion
    ).toMatchObject({ sheetEnterMs: 0, sheetExitMs: 0, moveMs: 0 })
  })
})

describe("getLookFromUrl", () => {
  it("reads the website's look params", () => {
    expect(
      getLookFromUrl(
        "fabricator-ui://look?surface=220_0.035&shape=pill&motion=smooth&density=spacious"
      )
    ).toEqual({
      ...DEFAULT_LOOK,
      surface: { hue: 220, chroma: 0.035 },
      radius: "pill",
      motion: "smooth",
      density: "spacious",
    })
  })

  it("reads a link without params as the default look", () => {
    expect(getLookFromUrl("fabricator-ui://look")).toEqual(DEFAULT_LOOK)
  })

  it("round-trips lookToSearchParams", () => {
    const look: FabricatorLook = {
      ...DEFAULT_LOOK,
      surface: { hue: 145, chroma: 0.022 },
      density: "compact",
    }
    expect(
      getLookFromUrl(`fabricator-ui://look?${lookToSearchParams(look)}`)
    ).toEqual(look)
  })

  it("ignores other links and invalid looks", () => {
    expect(
      getLookFromUrl(
        "app.fabricator-ui.mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
      )
    ).toBeNull()
    expect(getLookFromUrl("fabricator-ui://look?shape=star")).toBeNull()
  })
})

describe("the App Shell's tokens", () => {
  const styleMap = readFileSync(
    path.join(__dirname, "../../styles/fabricator/app-shell.css"),
    "utf8"
  )

  it("stay in step with the style map", () => {
    const percent = (share: number) => `black_${Math.round(share * 100)}%`
    expect(styleMap).toContain(
      `[--app-shell-frame:color-mix(in_oklab,var(--surface-1),${percent(APP_SHELL_FRAME_BLACK.light)})]`
    )
    expect(styleMap).toContain(
      `dark:[--app-shell-frame:color-mix(in_oklab,var(--surface-1),${percent(APP_SHELL_FRAME_BLACK.dark)})]`
    )
    expect(styleMap).toContain(
      `[--app-shell-frame-muted:color-mix(in_oklab,var(--muted-foreground),${percent(APP_SHELL_FRAME_MUTED_BLACK.light)})]`
    )
    expect(styleMap).toContain(
      `dark:[--app-shell-card-shadow:${APP_SHELL_CARD_SHADOW_DARK.replaceAll(" ", "_")}]`
    )
  })

  it("use the website's radius scale", () => {
    const globals = readFileSync(
      path.join(__dirname, "../../../app/globals.css"),
      "utf8"
    )
    for (const [name, scale] of Object.entries(RADIUS_SCALE)) {
      expect(globals).toContain(
        scale === 1
          ? `--radius-${name}: var(--radius);`
          : `--radius-${name}: calc(var(--radius) * ${scale});`
      )
    }
  })
})
