import { describe, expect, it } from "vitest"

import {
  FRAME_READY_MESSAGE,
  getFrameScale,
  isFrameReadyMessage,
} from "./frame-preview-model"

describe("getFrameScale", () => {
  const options = { minWidth: 1280, scaleFrom: 640 }

  it("scales a page down to fit between scaleFrom and minWidth", () => {
    expect(getFrameScale(1024, options)).toBe(0.8)
  })

  it("renders as is on phones and once the frame is wide enough", () => {
    expect(getFrameScale(390, options)).toBe(1)
    expect(getFrameScale(1440, options)).toBe(1)
  })

  it("never scales without a minimum width", () => {
    expect(getFrameScale(390, { minWidth: 0, scaleFrom: 0 })).toBe(1)
  })
})

describe("isFrameReadyMessage", () => {
  it("knows the frame's ready message and nothing else", () => {
    expect(isFrameReadyMessage({ type: FRAME_READY_MESSAGE })).toBe(true)
    expect(isFrameReadyMessage({ type: "fabricator-frame-height" })).toBe(false)
    expect(isFrameReadyMessage("ready")).toBe(false)
    expect(isFrameReadyMessage(null)).toBe(false)
  })
})
