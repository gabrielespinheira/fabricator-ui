import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  getFittedSide,
  getMenuAvailableSpace,
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

  it("never runs past the space on the side it opens to", () => {
    expect(getMenuMaxHeight(956, 440, 520)).toBe(520)
    expect(getMenuMaxHeight(956, 440, 900)).toBeCloseTo(764.8)
    expect(getMenuMaxHeight(956, 440, -20)).toBe(0)
  })
})

describe("getMenuAvailableSpace", () => {
  const base = {
    triggerHeight: 44,
    offset: 4,
    windowHeight: 956,
    insets: { top: 67, bottom: 42 },
  }

  it("measures up to the safe area above a trigger near the bottom", () => {
    expect(getMenuAvailableSpace({ ...base, side: "top", triggerY: 563 })).toBe(
      492
    )
  })

  it("measures down to the safe area below a trigger", () => {
    expect(
      getMenuAvailableSpace({ ...base, side: "bottom", triggerY: 100 })
    ).toBe(766)
  })

  it("knows nothing before the trigger is measured", () => {
    expect(
      getMenuAvailableSpace({ ...base, side: "top", triggerY: undefined })
    ).toBeUndefined()
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
