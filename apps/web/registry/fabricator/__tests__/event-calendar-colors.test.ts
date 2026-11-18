// An event chip's text sits on a wash of its fill over the calendar's
// surface. Every palette colour keeps that text at 4.5:1 in light and dark,
// on the page and on the card, at rest, hovered and past; and the style map
// draws exactly the washes the shared model names (React Native reads them
// from the model).
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { contrast, layer } from "@/registry/fabricator/contrast"
import {
  EVENT_CALENDAR_COLORS,
  EVENT_CHIP_WASH,
  getEventColorVariables,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import { NEUTRAL_TINT, surfaceLadder } from "@/registry/fabricator/surface-tint"

const MODES = ["light", "dark"] as const

describe("event chip colours", () => {
  it("keep the chip's text at 4.5:1 on every wash", () => {
    const failures: string[] = []
    for (const mode of MODES) {
      const ladder = surfaceLadder(mode, NEUTRAL_TINT)
      for (const [state, alpha] of Object.entries(EVENT_CHIP_WASH[mode])) {
        for (const [name, color] of Object.entries(EVENT_CALENDAR_COLORS)) {
          const variables = getEventColorVariables(color)
          const fill = variables[`--event-calendar-fill-${mode}`]
          const text = variables[`--event-calendar-text-${mode}`]
          for (const level of [0, 2]) {
            const ratio = contrast(text, layer(fill, ladder[level], alpha))
            if (ratio < 4.5) {
              failures.push(
                `${mode} ${state} ${name} surface ${level + 1}: ${ratio.toFixed(2)}`
              )
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("are the washes the style map draws", () => {
    const css = readFileSync(
      path.join(process.cwd(), "registry/styles/fabricator/event-calendar.css"),
      "utf8"
    )
    const washes = [
      ...css.matchAll(
        /((?:dark:)?(?:hover:|data-past:)?)\[--event-calendar-wash:(\d+)%\]/g
      ),
    ].map(([, prefix, value]) => [prefix, Number(value) / 100])
    expect(Object.fromEntries(washes)).toEqual({
      "": EVENT_CHIP_WASH.light.rest,
      "hover:": EVENT_CHIP_WASH.light.hover,
      "data-past:": EVENT_CHIP_WASH.light.past,
      "dark:": EVENT_CHIP_WASH.dark.rest,
      "dark:hover:": EVENT_CHIP_WASH.dark.hover,
      "dark:data-past:": EVENT_CHIP_WASH.dark.past,
    })
  })
})
