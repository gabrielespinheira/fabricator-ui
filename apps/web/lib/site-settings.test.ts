import { runInNewContext } from "node:vm"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getSiteSettings,
  MOTION_SPEEDS,
  ROLE_PRESETS,
  SITE_SETTINGS_SCRIPT,
  SITE_SETTINGS_STORAGE_KEY,
} from "@/lib/site-settings"
import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_DEFAULTS,
  roleMaxChroma,
  sameRoleColor,
} from "@/registry/fabricator/color-roles"
import { MOTION_SPEED_NAMES } from "@/registry/fabricator/motion"

function fakeStorage(stored: unknown) {
  return {
    getItem: (key: string) =>
      key === SITE_SETTINGS_STORAGE_KEY ? JSON.stringify(stored) : null,
  }
}

/** Runs the before-paint script and returns the properties it set on <html>. */
function runBeforePaint(stored: unknown) {
  const properties: Record<string, string> = {}
  const documentElement = {
    dataset: {},
    style: {
      setProperty: (name: string, value: unknown) => {
        properties[name] = String(value)
      },
    },
  }
  runInNewContext(SITE_SETTINGS_SCRIPT, {
    localStorage: fakeStorage(stored),
    document: { documentElement },
  })
  return properties
}

describe("site settings", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("applies stored colour roles before paint", () => {
    expect(
      runBeforePaint({
        colors: {
          primary: { hue: 260, chroma: 0.12 },
          destructive: { hue: 15, chroma: 0.1 },
        },
      })
    ).toEqual({
      "--primary-hue": "260",
      "--primary-chroma": "0.12",
      "--destructive-hue": "15",
      "--destructive-chroma": "0.1",
    })
  })

  it("skips invalid colours before paint", () => {
    expect(
      runBeforePaint({
        colors: {
          primary: { hue: "blue", chroma: 0.1 },
          info: { hue: 200, chroma: 4 },
          unknown: { hue: 10, chroma: 0.1 },
        },
      })
    ).toEqual({})
  })

  it("reads each role, clamped to its hue's maximum", async () => {
    vi.stubGlobal("window", {})
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ colors: { primary: { hue: 190, chroma: 1 } } })
    )
    const { getSiteSettings: read } = await import("@/lib/site-settings")
    expect(read().colors).toEqual({
      ...ROLE_DEFAULTS,
      primary: { hue: 190, chroma: roleMaxChroma(190) },
    })
  })

  it("offers presets each role can hold, its default among them", () => {
    for (const role of COLOR_ROLES) {
      const presets = ROLE_PRESETS[role]
      expect(
        presets.some(({ color }) => sameRoleColor(color, ROLE_DEFAULTS[role]))
      ).toBe(true)
      for (const { color } of presets) {
        expect(normalizeRoleColor(role, color)).toEqual(color)
      }
    }
  })

  it("uses the defaults while rendering on the server", () => {
    expect(getSiteSettings().colors).toEqual(ROLE_DEFAULTS)
  })
})

describe("motion setting", () => {
  it("offers the foundations' speeds, slowest first, then Off", () => {
    expect(MOTION_SPEEDS.map((speed) => speed.value)).toEqual([
      ...MOTION_SPEED_NAMES,
      "off",
    ])
  })

  it("sets the stored speed on <html> before paint", () => {
    const dataset: Record<string, string> = {}
    runInNewContext(SITE_SETTINGS_SCRIPT, {
      localStorage: fakeStorage({ motion: "smooth" }),
      document: { documentElement: { dataset, style: { setProperty() {} } } },
    })
    expect(dataset.motion).toBe("smooth")
  })
})
