import { describe, expect, it } from "vitest"

import {
  DEFAULT_MOTION_SPEED,
  MOTION_CSS,
  MOTION_ROLES,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
  MOTION_THEME,
  toMotionVars,
} from "@/registry/fabricator/motion"

const SLOWEST_FIRST = MOTION_SPEED_NAMES

describe("MOTION_SPEEDS", () => {
  it("runs from smooth to instant", () => {
    expect(SLOWEST_FIRST).toEqual(["smooth", "default", "snappy", "instant"])
    expect(DEFAULT_MOTION_SPEED).toBe("default")
  })

  it("never slows down from one speed to the next", () => {
    for (const role of MOTION_ROLES) {
      const enters = SLOWEST_FIRST.map(
        (speed) => MOTION_SPEEDS[speed].durations[role].enter
      )
      expect(enters).toEqual([...enters].sort((a, b) => b - a))
    }
  })

  it("exits no slower than it enters", () => {
    for (const speed of SLOWEST_FIRST) {
      for (const role of MOTION_ROLES) {
        const { enter, exit } = MOTION_SPEEDS[speed].durations[role]
        expect(exit).toBeLessThanOrEqual(enter)
      }
    }
  })

  it("keeps the default on Emil Kowalski's timings", () => {
    const { durations, scales } = MOTION_SPEEDS.default
    expect(durations.tooltip.enter).toBe(125)
    expect(durations.popup).toEqual({ enter: 180, exit: 120 })
    expect(durations.dialog.enter).toBe(250)
    expect(scales).toMatchObject({ press: 0.97, popup: 0.95, dialog: 0.95 })
  })

  it("never grows a surface from below 0.9", () => {
    for (const speed of SLOWEST_FIRST) {
      for (const scale of Object.values(MOTION_SPEEDS[speed].scales)) {
        expect(scale).toBeGreaterThanOrEqual(0.9)
      }
    }
  })

  it("makes instant tooltips and still surfaces", () => {
    const { durations, scales } = MOTION_SPEEDS.instant
    expect(durations.tooltip).toEqual({ enter: 0, exit: 0 })
    expect(scales).toEqual({ press: 1, tooltip: 1, popup: 1, dialog: 1 })
  })
})

describe("toMotionVars", () => {
  it("writes every role, curve and amplitude", () => {
    const vars = toMotionVars(MOTION_SPEEDS.default)
    for (const role of MOTION_ROLES) {
      expect(vars[`motion-${role}`]).toMatch(/^\d+ms$/)
      expect(vars[`motion-${role}-exit`]).toMatch(/^\d+ms$/)
    }
    expect(vars["motion-popup"]).toBe("180ms")
    expect(vars["motion-ease-enter"]).toBe("cubic-bezier(0.23, 1, 0.32, 1)")
    expect(vars["motion-popup-scale"]).toBe("0.95")
    expect(vars["motion-popup-travel"]).toBe("0px")
  })
})

describe("MOTION_THEME", () => {
  it("scales every role's duration by --motion-scale", () => {
    expect(MOTION_THEME["transition-duration-popup"]).toBe(
      "calc(var(--motion-popup) * var(--motion-scale, 1))"
    )
    expect(MOTION_THEME["transition-delay-move"]).toBe(
      "calc(var(--motion-move) * var(--motion-scale, 1))"
    )
  })

  it("keeps the old tier and spring names as aliases", () => {
    expect(MOTION_THEME["transition-duration-fast"]).toBe(
      MOTION_THEME["transition-duration-feedback"]
    )
    expect(MOTION_THEME["transition-duration-moderate-exit"]).toBe(
      MOTION_THEME["transition-duration-move-exit"]
    )
    expect(MOTION_THEME["transition-duration-slow"]).toBe(
      MOTION_THEME["transition-duration-dialog"]
    )
    expect(MOTION_THEME["ease-spring"]).toBe("var(--motion-ease-enter)")
  })
})

describe("MOTION_CSS", () => {
  it("lets any element pick a speed, the root included", () => {
    for (const speed of SLOWEST_FIRST) {
      const selector = `:root[data-motion="${speed}"], [data-motion="${speed}"]`
      expect(MOTION_CSS[selector]).toBeDefined()
    }
  })

  it("turns motion off without moving anything", () => {
    expect(
      MOTION_CSS[':root[data-motion="off"], [data-motion="off"]']
    ).toMatchObject({
      "--motion-scale": "0",
      "--motion-popup-scale": "1",
      "--motion-press-scale": "1",
    })
  })

  it("ships a utility for each kind of surface", () => {
    for (const name of [
      "tooltip",
      "popup",
      "dialog",
      "scrim",
      "sheet",
      "disclosure",
      "toast",
      "press",
    ]) {
      expect(MOTION_CSS[`@utility motion-${name}`]).toBeDefined()
    }
  })
})
