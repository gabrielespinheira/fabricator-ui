import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { DENSITIES } from "@/registry/fabricator/density"
import { FABRICATOR_PALETTE } from "@/registry/fabricator/foundation-tokens"
import { DEFAULT_LOOK } from "@/registry/fabricator/look"
import { MOTION_SPEEDS } from "@/registry/fabricator/motion"
import {
  getNativeCssVariables,
  resolveNativeColor,
} from "@/registry/fabricator/native-theme"
import {
  collectPlatformItems,
  createPlatformContract,
  platformContractSchema,
} from "@/registry/fabricator/platform-contracts"
import { BOT_FACE_COLORS } from "@/registry/fabricator/shared/lib/bot-face-model"
import { getColumnTypeDefaults } from "@/registry/fabricator/shared/lib/data-table-model"
import {
  EVENT_CALENDAR_COLORS,
  EVENT_CALENDAR_ROLES,
  EVENT_CHIP_WASH,
  getEventColorVariables,
} from "@/registry/fabricator/shared/lib/event-calendar-model"

describe("native platform contract", () => {
  it("exports Data Table type widths, bounds, alignment and first sort direction", () => {
    const contract = createPlatformContract([], [])
    expect(Object.keys(contract.dataTable)).toHaveLength(12)
    for (const type of [
      "text",
      "number",
      "currency",
      "percent",
      "date",
      "status",
      "tags",
      "person",
      "link",
      "email",
      "boolean",
      "progress",
    ] as const) {
      expect(contract.dataTable[type]).toEqual(getColumnTypeDefaults(type))
    }
  })
  it("exports the web's variable font weights instead of native named weights", () => {
    const contract = createPlatformContract([], [])
    expect(contract.typography.weights).toEqual({
      medium: Number(FABRICATOR_PALETTE.theme["font-weight-medium"]),
      semibold: Number(FABRICATOR_PALETTE.theme["font-weight-semibold"]),
    })
  })
  it("exports each surface shadow without substituting an app-shell elevation", () => {
    const contract = createPlatformContract([], [])
    for (const mode of ["light", "dark"] as const) {
      for (let level = 1; level <= 8; level++) {
        expect(contract.themes[mode].shadows[`surface-${level}`]).toBe(
          contract.themes[mode].variables[`--shadow-${level}`]
        )
      }
    }
  })
  it("resolves every canonical calendar color fill and text in both modes", () => {
    const contract = createPlatformContract([], [])
    for (const mode of ["light", "dark"] as const) {
      for (const [name, hue] of Object.entries(EVENT_CALENDAR_COLORS)) {
        const values = getEventColorVariables(hue)
        expect(contract.themes[mode].colors[`calendar-color-${name}`]).toBe(
          resolveNativeColor(values[`--event-calendar-fill-${mode}`])
        )
        expect(
          contract.themes[mode].colors[`calendar-color-${name}-text`]
        ).toBe(resolveNativeColor(values[`--event-calendar-text-${mode}`]))
      }
      for (const role of EVENT_CALENDAR_ROLES) {
        expect(contract.themes[mode].colors[`calendar-color-${role}`]).toBe(
          contract.themes[mode].colors[role]
        )
        expect(
          contract.themes[mode].colors[`calendar-color-${role}-text`]
        ).toBe(contract.themes[mode].colors[`${role}-text`])
      }
    }
    expect(contract.calendar.chipWash).toEqual(EVENT_CHIP_WASH)
  })
  it("resolves all named BotFace fills and eye colors, including fixed gray", () => {
    const contract = createPlatformContract([], [])
    const source = readFileSync(
      "registry/styles/fabricator/bot-face.css",
      "utf8"
    )
    const match =
      /\.cn-bot-face-color-gray\s*\{[^}]*?text-\[([^\]]+)\][^}]*?dark:text-\[([^\]]+)\]/.exec(
        source
      )
    if (!match?.[1] || !match[2])
      throw new Error("Missing canonical BotFace gray style")
    for (const mode of ["light", "dark"] as const) {
      for (const color of BOT_FACE_COLORS) {
        expect(contract.themes[mode].colors[`bot-face-${color}-fill`]).toMatch(
          /^(#|rgba?\()/
        )
        expect(contract.themes[mode].colors[`bot-face-${color}-eyes`]).toMatch(
          /^(#|rgba?\()/
        )
      }
      expect(contract.themes[mode].colors["bot-face-gray-fill"]).toBe(
        resolveNativeColor(
          (mode === "light" ? match[1] : match[2]).replaceAll("_", " ")
        )
      )
    }
  })

  it("resolves every existing semantic token without browser CSS expressions", () => {
    const contract = createPlatformContract([], [])
    for (const mode of ["light", "dark"] as const) {
      expect(contract.themes[mode].variables).toEqual(
        getNativeCssVariables(mode, DEFAULT_LOOK)
      )
      expect(contract.themes[mode].colors.background).toMatch(/^#/)
      expect(contract.themes[mode].colors.destructive).toMatch(/^#/)
      for (const [name, value] of Object.entries(
        contract.themes[mode].variables
      )) {
        if (
          typeof value === "string" &&
          /^(#|rgba?\(|transparent$)/.test(value)
        )
          expect(contract.themes[mode].colors[name.replace(/^--/, "")]).toBe(
            value
          )
      }
      expect(JSON.stringify(contract.themes[mode])).not.toMatch(
        /oklch\(|var\(|calc\(|color-mix\(/
      )
    }
    expect(contract.themes.light.radius.lg).toBe(8)
    expect(contract.densities).toEqual(DENSITIES)
    expect(contract.motion).toEqual(MOTION_SPEEDS)
  })

  it("deduplicates public families, keeps blocks, and includes native-only families", () => {
    const items = collectPlatformItems([
      { name: "button", title: "Button", type: "registry:ui" },
      { name: "button", title: "Button", type: "registry:ui" },
      { name: "form", type: "registry:ui" },
      { name: "text", type: "registry:ui" },
      { name: "app-nav", type: "registry:component" },
      { name: "login-01", type: "registry:block" },
      { name: "utils", type: "registry:lib" },
    ])
    expect(items.map((item) => item.name)).toEqual([
      "app-nav",
      "button",
      "form",
      "login-01",
      "text",
      "typography",
    ])
    expect(items.find((item) => item.name === "form")?.group).toBe("Forms")
    expect(items.find((item) => item.name === "login-01")?.group).toBe("Blocks")
  })

  it("rejects duplicate items and invalid icon geometry", () => {
    const button = {
      name: "button",
      title: "Button",
      group: "Basics",
      type: "registry:ui",
    }
    const contract = createPlatformContract([], [])
    expect(
      platformContractSchema.safeParse({ ...contract, items: [button, button] })
        .success
    ).toBe(false)
    expect(
      platformContractSchema.safeParse({
        ...contract,
        icons: [{ name: "broken", node: [["script", {}]] }],
      }).success
    ).toBe(false)
  })

  it("preserves Fabricator icon geometry rather than substituting OS symbols", () => {
    const icons = [
      { name: "check", node: [["path", { d: "m20 6-11 11-5-5" }]] },
    ]
    const contract = createPlatformContract([], icons)
    expect(contract.icons).toEqual(icons)
    expect(platformContractSchema.parse(contract)).toEqual(contract)
  })
})
