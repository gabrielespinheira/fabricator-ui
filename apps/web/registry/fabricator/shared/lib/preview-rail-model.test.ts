import { describe, expect, it } from "vitest"

import {
  getPreviewRailCardOffset,
  getPreviewRailIndexAtPoint,
  getPreviewRailLit,
  getPreviewRailTickScale,
  getPreviewRailValue,
  isPreviewRailDisabledAt,
  isPreviewRailExternalHref,
  isPreviewRailReleaseInside,
  PREVIEW_RAIL_REST_SCALE,
} from "./preview-rail-model"

const items = [
  { value: "overview", label: "Overview" },
  { value: "install", label: "Installation" },
  { value: "usage", label: "Usage", disabled: true },
  { value: "api", label: "API reference" },
  { value: "faq", label: "FAQ" },
]

describe("getPreviewRailTickScale", () => {
  it("swells the lit tick fully and its neighbours less with distance", () => {
    const scales = [0, 1, 2, 3, 4].map((index) =>
      getPreviewRailTickScale(index, 2)
    )
    expect(scales[2]).toBe(1)
    expect(scales[1]).toBe(scales[3])
    expect(scales[0]).toBe(scales[4])
    expect(scales[2]).toBeGreaterThan(scales[1])
    expect(scales[1]).toBeGreaterThan(scales[0])
    expect(scales[0]).toBeGreaterThan(PREVIEW_RAIL_REST_SCALE)
  })

  it("rests ticks three or more steps away", () => {
    expect(getPreviewRailTickScale(5, 2)).toBe(PREVIEW_RAIL_REST_SCALE)
    expect(getPreviewRailTickScale(9, 2)).toBe(PREVIEW_RAIL_REST_SCALE)
  })

  it("rests every tick when nothing is lit", () => {
    expect(getPreviewRailTickScale(0, -1)).toBe(PREVIEW_RAIL_REST_SCALE)
    expect(getPreviewRailTickScale(3, -1)).toBe(PREVIEW_RAIL_REST_SCALE)
  })
})

describe("getPreviewRailValue", () => {
  it("keeps a value that names an enabled item", () => {
    expect(getPreviewRailValue(items, "api")).toBe("api")
  })

  it("falls back to the first enabled item for an unknown or disabled value", () => {
    expect(getPreviewRailValue(items, "missing")).toBe("overview")
    expect(getPreviewRailValue(items, "usage")).toBe("overview")
    expect(getPreviewRailValue(items, undefined)).toBe("overview")
  })

  it("is undefined when no item can be current", () => {
    expect(getPreviewRailValue([], undefined)).toBeUndefined()
    expect(
      getPreviewRailValue([{ value: "a", label: "A", disabled: true }], "a")
    ).toBeUndefined()
  })
})

describe("getPreviewRailLit", () => {
  const none = { pressed: null, hovered: null, focused: null }

  it("centres the swell on the current item and shows no card at rest", () => {
    expect(getPreviewRailLit(items, none, "api")).toEqual({
      litIndex: 3,
      preview: null,
    })
  })

  it("lights and previews the hovered item", () => {
    expect(
      getPreviewRailLit(items, { ...none, hovered: "install" }, "api")
    ).toEqual({ litIndex: 1, preview: "install" })
  })

  it("prefers a finger, then the pointer, then focus", () => {
    const all = { pressed: "faq", hovered: "install", focused: "overview" }
    expect(getPreviewRailLit(items, all, "api").preview).toBe("faq")
    expect(
      getPreviewRailLit(items, { ...all, pressed: null }, "api").preview
    ).toBe("install")
    expect(
      getPreviewRailLit(items, { ...all, pressed: null, hovered: null }, "api")
        .preview
    ).toBe("overview")
  })

  it("never lights a disabled or unknown item", () => {
    expect(
      getPreviewRailLit(items, { ...none, hovered: "usage" }, "api")
    ).toEqual({ litIndex: 3, preview: null })
    expect(
      getPreviewRailLit(items, { ...none, focused: "gone" }, "api")
    ).toEqual({ litIndex: 3, preview: null })
  })

  it("lights nothing with no items", () => {
    expect(getPreviewRailLit([], none, undefined)).toEqual({
      litIndex: -1,
      preview: null,
    })
  })
})

describe("getPreviewRailIndexAtPoint", () => {
  it("finds the tick whose step holds the point", () => {
    expect(getPreviewRailIndexAtPoint(items, 0, 24)).toBe(0)
    expect(getPreviewRailIndexAtPoint(items, 30, 24)).toBe(1)
    expect(getPreviewRailIndexAtPoint(items, 80, 24)).toBe(3)
  })

  it("clamps points before and past the rail", () => {
    expect(getPreviewRailIndexAtPoint(items, -40, 24)).toBe(0)
    expect(getPreviewRailIndexAtPoint(items, 400, 24)).toBe(4)
  })

  it("moves off a disabled tick to the nearest enabled one", () => {
    // Usage (index 2) is disabled: its upper half goes to Installation, its
    // lower half to API reference.
    expect(getPreviewRailIndexAtPoint(items, 50, 24)).toBe(1)
    expect(getPreviewRailIndexAtPoint(items, 70, 24)).toBe(3)
  })

  it("is -1 when nothing can be lit", () => {
    expect(getPreviewRailIndexAtPoint([], 10, 24)).toBe(-1)
    expect(
      getPreviewRailIndexAtPoint(
        [{ value: "a", label: "A", disabled: true }],
        10,
        24
      )
    ).toBe(-1)
  })
})

describe("isPreviewRailReleaseInside", () => {
  const rail = { width: 48, height: 120 }

  it("accepts a release on the rail or within the slack around it", () => {
    expect(isPreviewRailReleaseInside({ x: 24, y: 60 }, rail, 16)).toBe(true)
    expect(isPreviewRailReleaseInside({ x: -10, y: 60 }, rail, 16)).toBe(true)
    expect(isPreviewRailReleaseInside({ x: 60, y: 130 }, rail, 16)).toBe(true)
  })

  it("rejects a release beyond the slack", () => {
    expect(isPreviewRailReleaseInside({ x: 90, y: 60 }, rail, 16)).toBe(false)
    expect(isPreviewRailReleaseInside({ x: 24, y: -40 }, rail, 16)).toBe(false)
  })
})

describe("isPreviewRailExternalHref", () => {
  it("accepts a URL with a scheme, which an app can open", () => {
    expect(isPreviewRailExternalHref("https://example.com/docs")).toBe(true)
    expect(isPreviewRailExternalHref("mailto:gabs@fabricator.dev")).toBe(true)
    expect(isPreviewRailExternalHref("myapp://settings")).toBe(true)
  })

  it("rejects anchors and paths, which only a page can follow", () => {
    expect(isPreviewRailExternalHref("#install")).toBe(false)
    expect(isPreviewRailExternalHref("/docs/install")).toBe(false)
    expect(isPreviewRailExternalHref("docs")).toBe(false)
  })
})

describe("getPreviewRailCardOffset", () => {
  // Ten ticks of 24: a 240-long rail.
  const rail = { step: 24, count: 10 }

  it("centres the card on its tick", () => {
    expect(
      getPreviewRailCardOffset({ ...rail, index: 4, cardLength: 60 })
    ).toBe(78)
  })

  it("keeps a card shorter than the rail within its ends", () => {
    expect(
      getPreviewRailCardOffset({ ...rail, index: 0, cardLength: 60 })
    ).toBe(0)
    expect(
      getPreviewRailCardOffset({ ...rail, index: 9, cardLength: 60 })
    ).toBe(180)
  })

  it("lets a card longer than the rail overhang both ends, no further", () => {
    // A 300-long card over a 240-long rail sits between -60 and 0.
    expect(
      getPreviewRailCardOffset({ ...rail, index: 0, cardLength: 300 })
    ).toBe(-60)
    expect(
      getPreviewRailCardOffset({ ...rail, index: 9, cardLength: 300 })
    ).toBe(0)
    expect(
      getPreviewRailCardOffset({ ...rail, index: 5, cardLength: 300 })
    ).toBe(-18)
  })
})

describe("isPreviewRailDisabledAt", () => {
  it("is true over a disabled tick's own step", () => {
    // Usage (index 2) spans 48 to 72.
    expect(isPreviewRailDisabledAt(items, 50, 24)).toBe(true)
    expect(isPreviewRailDisabledAt(items, 71, 24)).toBe(true)
  })

  it("is false over enabled ticks and past the rail's ends", () => {
    expect(isPreviewRailDisabledAt(items, 30, 24)).toBe(false)
    expect(isPreviewRailDisabledAt(items, 80, 24)).toBe(false)
    expect(isPreviewRailDisabledAt(items, -20, 24)).toBe(false)
    expect(isPreviewRailDisabledAt(items, 500, 24)).toBe(false)
  })
})
