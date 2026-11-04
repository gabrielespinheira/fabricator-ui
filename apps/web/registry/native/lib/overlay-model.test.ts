import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  getMenuMaxHeight,
  getTextContent,
  getTriggerAction,
  getVerticalSide,
} from "@/registry/native/lib/overlay-model"

describe("getTriggerAction", () => {
  it("does nothing when the primitive already agrees", () => {
    expect(getTriggerAction(true, true)).toBeNull()
    expect(getTriggerAction(false, false)).toBeNull()
  })

  it("opens and closes the primitive through its trigger", () => {
    expect(getTriggerAction(true, false)).toBe("open")
    expect(getTriggerAction(false, true)).toBe("close")
  })
})

describe("getVerticalSide", () => {
  it("keeps the sides the primitives place", () => {
    expect(getVerticalSide("top")).toBe("top")
    expect(getVerticalSide("bottom")).toBe("bottom")
  })

  it("puts the sides they can't below the anchor", () => {
    expect(getVerticalSide("left")).toBe("bottom")
    expect(getVerticalSide("right")).toBe("bottom")
  })
})

describe("getMenuMaxHeight", () => {
  it("leaves room around a long menu", () => {
    expect(getMenuMaxHeight(800)).toBe(640)
  })
})

describe("getTextContent", () => {
  const { createElement: h, Fragment } = React

  it("reads strings and numbers", () => {
    expect(getTextContent("Add to library")).toBe("Add to library")
    expect(getTextContent(3)).toBe("3")
  })

  it("reads through elements and fragments", () => {
    expect(
      getTextContent(h(Fragment, null, h("p", null, "Save "), h("b", null, 3)))
    ).toBe("Save 3")
  })

  it("skips what has no text", () => {
    expect(getTextContent(null)).toBe("")
    expect(getTextContent(false)).toBe("")
    expect(getTextContent(h("hr"))).toBe("")
  })
})
