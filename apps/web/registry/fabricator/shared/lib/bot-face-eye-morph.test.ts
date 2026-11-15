import { describe, expect, it } from "vitest"

import {
  createBotFaceEyeMorph,
  getBotFaceMorphedEyePath,
  stepBotFaceEyeMorph,
} from "./bot-face-eye-morph"
import { BOT_FACE_STATES, getBotFaceTarget } from "./bot-face-motion"

function getArea(contour: number[]) {
  let area = 0
  for (let index = 0; index < contour.length; index += 2) {
    const next = (index + 2) % contour.length
    area +=
      contour[index] * contour[next + 1] - contour[next] * contour[index + 1]
  }
  return Math.abs(area) / 2
}

describe("BotFace eye morphs", () => {
  it("keeps visible eye outlines during every state pair, in all eye styles", () => {
    for (const style of ["slant", "dots", "square"] as const) {
      for (const from of BOT_FACE_STATES)
        for (const to of BOT_FACE_STATES) {
          let morph = createBotFaceEyeMorph(
            getBotFaceTarget(from, 850),
            style,
            from
          )
          const target = getBotFaceTarget(to)
          for (let frame = 0; frame < 24; frame++) {
            const previous = morph
            morph = stepBotFaceEyeMorph(
              morph,
              target,
              style,
              to,
              1000 / 60,
              315
            )
            for (const part of [0, 3]) {
              expect(
                getArea(morph.contours[part]),
                `${style} ${from} → ${to}`
              ).toBeGreaterThan(3)
              expect(morph.contours[part].every(Number.isFinite)).toBe(true)
              expect(
                Math.max(
                  ...morph.contours[part].map((value, index) =>
                    Math.abs(value - previous.contours[part][index])
                  )
                )
              ).toBeLessThan(4.5)
            }
          }
        }
    }
  })

  it("retargets an interrupted outline without resetting position or velocity", () => {
    let morph = createBotFaceEyeMorph(getBotFaceTarget("idle"), "slant", "idle")
    for (let frame = 0; frame < 7; frame++)
      morph = stepBotFaceEyeMorph(
        morph,
        getBotFaceTarget("questioning"),
        "slant",
        "questioning",
        16,
        315
      )
    const interrupted = stepBotFaceEyeMorph(
      morph,
      getBotFaceTarget("error"),
      "slant",
      "error",
      0,
      315
    )
    expect(interrupted).toBe(morph)
    expect(
      interrupted.velocity.flat().some((value) => Math.abs(value) > 0.001)
    ).toBe(true)
    expect(getBotFaceMorphedEyePath(interrupted, "left")).toBe(
      getBotFaceMorphedEyePath(morph, "left")
    )
  })

  it("keeps thinking eyes visible when interrupted at different gesture phases", () => {
    for (const elapsed of [425, 850, 1275, 2550]) {
      let morph = createBotFaceEyeMorph(
        getBotFaceTarget("thinking", elapsed),
        "dots",
        "thinking"
      )
      for (let frame = 0; frame < 40; frame++) {
        morph = stepBotFaceEyeMorph(
          morph,
          getBotFaceTarget("speaking", frame * 16),
          "dots",
          "speaking",
          16,
          315
        )
        expect(getArea(morph.contours[0])).toBeGreaterThan(8)
        expect(getArea(morph.contours[3])).toBeGreaterThan(8)
      }
    }
  })

  it("has equivalent fixed-target results at 60 and 120Hz", () => {
    function sample(rate: number) {
      let morph = createBotFaceEyeMorph(
        getBotFaceTarget("idle"),
        "square",
        "idle"
      )
      for (let frame = 0; frame < rate; frame++)
        morph = stepBotFaceEyeMorph(
          morph,
          getBotFaceTarget("questioning"),
          "square",
          "questioning",
          1000 / rate,
          315
        )
      return morph.contours.flat()
    }
    const slow = sample(60)
    const fast = sample(120)
    slow.forEach((value, index) => expect(value).toBeCloseTo(fast[index], 8))
  })

  it("settles exactly when motion is disabled and keeps path topology stable", () => {
    const before = createBotFaceEyeMorph(
      getBotFaceTarget("idle"),
      "dots",
      "idle"
    )
    for (const state of BOT_FACE_STATES) {
      const target = getBotFaceTarget(state)
      const still = stepBotFaceEyeMorph(before, target, "dots", state, 16, 0)
      expect(still.contours).toEqual(
        createBotFaceEyeMorph(target, "dots", state).contours
      )
      expect(still.velocity.flat().every((value) => value === 0)).toBe(true)
      expect(getBotFaceMorphedEyePath(still, "left").match(/[A-Z]/g)).toEqual(
        getBotFaceMorphedEyePath(before, "left").match(/[A-Z]/g)
      )
    }
  })

  it("preserves visible outlines when states and eye styles interrupt rapidly", () => {
    let morph = createBotFaceEyeMorph(getBotFaceTarget("idle"), "slant", "idle")
    const styles = ["slant", "dots", "square"] as const
    for (let frame = 0; frame < 360; frame++) {
      const state =
        BOT_FACE_STATES[Math.floor(frame / 4) % BOT_FACE_STATES.length]
      const style = styles[Math.floor(frame / 12) % styles.length]
      morph = stepBotFaceEyeMorph(
        morph,
        getBotFaceTarget(state, (frame % 4) * 16),
        style,
        state,
        16,
        315
      )
      for (const part of [0, 3])
        expect(getArea(morph.contours[part])).toBeGreaterThan(3)
      expect(morph.contours.flat().every(Number.isFinite)).toBe(true)
    }
  })
})
