import { describe, expect, it } from "vitest"

import { createPlatformBotFaceGeometry } from "@/registry/fabricator/platform-bot-face"
import {
  BOT_FACE_SHAPES,
  getBotFacePath,
} from "@/registry/fabricator/shared/lib/bot-face-model"
import {
  BOT_FACE_STATES,
  getBotFaceEyeContours,
  getBotFaceTarget,
} from "@/registry/fabricator/shared/lib/bot-face-motion"

describe("native BotFace geometry", () => {
  it("uses each canonical silhouette and each state's distinct eye contours", () => {
    const asset = createPlatformBotFaceGeometry()
    expect(Object.keys(asset.shapes)).toEqual([...BOT_FACE_SHAPES])
    expect(Object.keys(asset.frames)).toEqual([...BOT_FACE_STATES])
    for (const shape of BOT_FACE_SHAPES)
      expect(asset.shapes[shape]).toBe(getBotFacePath(shape))
    for (const state of BOT_FACE_STATES) {
      for (const style of ["slant", "dots", "square"] as const) {
        const first = asset.frames[state]?.[style]?.[0]
        expect(first?.left).toEqual(
          getBotFaceEyeContours(getBotFaceTarget(state, 0), style, "left").map(
            (contour) => contour.map((value) => Number(value.toFixed(3)))
          )
        )
      }
    }
    expect(asset.frames.speaking?.slant).toHaveLength(18)
    expect(JSON.stringify(asset)).not.toMatch(/NaN|Infinity/)
  })
})
