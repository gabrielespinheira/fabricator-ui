import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  getFittedSide,
  getMenuMaxHeight,
  getMenuMinWidth,
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
  it("takes most of a phone's height", () => {
    expect(getMenuMaxHeight(800, 390)).toBe(640)
    expect(getMenuMaxHeight(430, 932)).toBe(344)
  })

  it("stops at what a long list needs on a tablet's tall screen", () => {
    expect(getMenuMaxHeight(1376, 1032)).toBe(480)
    expect(getMenuMaxHeight(1032, 1376)).toBe(480)
  })

  it("keeps to the window on a short tablet window", () => {
    expect(getMenuMaxHeight(500, 800)).toBe(400)
  })
})

describe("getFittedSide", () => {
  const near = {
    triggerY: 1215,
    triggerHeight: 40,
    offset: 4,
    windowHeight: 1376,
    insets: { top: 8, bottom: 8 },
  }

  it("flips above when it doesn't fit below and there's more room above", () => {
    expect(getFittedSide({ ...near, side: "bottom", contentHeight: 488 })).toBe(
      "top"
    )
  })

  it("stays below when it fits", () => {
    expect(getFittedSide({ ...near, side: "bottom", contentHeight: 100 })).toBe(
      "bottom"
    )
  })

  it("flips below from the top of the screen", () => {
    expect(
      getFittedSide({
        ...near,
        triggerY: 40,
        side: "top",
        contentHeight: 300,
      })
    ).toBe("bottom")
  })

  it("stays where it was asked when neither side has the room and there's less", () => {
    expect(
      getFittedSide({
        ...near,
        triggerY: 100,
        windowHeight: 300,
        side: "top",
        contentHeight: 280,
      })
    ).toBe("bottom")
    expect(
      getFittedSide({
        ...near,
        triggerY: 600,
        windowHeight: 800,
        side: "top",
        contentHeight: 700,
      })
    ).toBe("top")
  })

  it("stays where it was asked until it's been measured", () => {
    expect(
      getFittedSide({ ...near, side: "bottom", contentHeight: null })
    ).toBe("bottom")
  })

  it("has nothing to do before the trigger is measured", () => {
    expect(
      getFittedSide({
        ...near,
        triggerY: undefined,
        triggerHeight: undefined,
        side: "bottom",
        contentHeight: 488,
      })
    ).toBe("bottom")
  })
})

describe("getMenuMinWidth", () => {
  it("matches a short trigger", () => {
    expect(getMenuMinWidth(192, 1032)).toBe(192)
  })

  it("stops following a stretched trigger on a tablet", () => {
    expect(getMenuMinWidth(638, 1032)).toBe(360)
  })

  it("matches any trigger on a phone", () => {
    expect(getMenuMinWidth(638, 700)).toBe(638)
  })

  it("has nothing to match before the trigger is measured", () => {
    expect(getMenuMinWidth(undefined, 1032)).toBeUndefined()
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
