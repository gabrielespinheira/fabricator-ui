import { describe, expect, it } from "vitest"

import { type CanvasNode } from "./canvas-model"
import {
  canvasToScreen,
  getAutoPanVelocity,
  getLevelOfDetail,
  getMotionDuration,
  getNextZoom,
  getViewportForBounds,
  getViewportToReveal,
  getVisibleNodeIds,
  screenToCanvas,
  zoomAt,
} from "./canvas-viewport"

const size = { width: 800, height: 600 }

describe("coordinates", () => {
  it("converts screen and canvas points both ways", () => {
    const viewport = { x: 40, y: -20, zoom: 2 }
    const point = screenToCanvas({ x: 140, y: 80 }, viewport)
    expect(point).toEqual({ x: 50, y: 50 })
    expect(canvasToScreen(point, viewport)).toEqual({ x: 140, y: 80 })
  })

  it("zooms about a point without moving it", () => {
    const viewport = { x: 0, y: 0, zoom: 1 }
    const anchor = { x: 200, y: 100 }
    const next = zoomAt(viewport, 2, anchor)
    expect(canvasToScreen(screenToCanvas(anchor, viewport), next)).toEqual(
      anchor
    )
    expect(zoomAt(viewport, 10, anchor).zoom).toBe(2)
  })
})

describe("getViewportForBounds", () => {
  it("fits and centres the bounds with padding", () => {
    const viewport = getViewportForBounds(
      { x: 0, y: 0, width: 400, height: 300 },
      size,
      { padding: 0 }
    )
    expect(viewport).toEqual({ x: 0, y: 0, zoom: 2 })
  })

  it("respects the zoom limits", () => {
    expect(
      getViewportForBounds({ x: 0, y: 0, width: 10, height: 10 }, size).zoom
    ).toBe(2)
    expect(
      getViewportForBounds({ x: 0, y: 0, width: 1e6, height: 10 }, size).zoom
    ).toBe(0.1)
  })

  it("centres in the space padding leaves on each side", () => {
    const viewport = getViewportForBounds(
      { x: 0, y: 0, width: 400, height: 300 },
      size,
      {
        padding: { left: "200px", top: 0, right: 0, bottom: 0 },
      }
    )
    expect(viewport).toEqual({ x: 200, y: 75, zoom: 1.5 })
  })

  it("takes pixel padding", () => {
    const viewport = getViewportForBounds(
      { x: 0, y: 0, width: 760, height: 100 },
      size,
      { padding: "20px", maxZoom: 4 }
    )
    expect(viewport.zoom).toBe(1)
  })
})

describe("getVisibleNodeIds", () => {
  const nodes: CanvasNode[] = [
    { id: "in", position: { x: 10, y: 10 }, data: {}, width: 50, height: 50 },
    {
      id: "near",
      position: { x: 850, y: 10 },
      data: {},
      width: 50,
      height: 50,
    },
    {
      id: "far",
      position: { x: 5000, y: 10 },
      data: {},
      width: 50,
      height: 50,
    },
    { id: "unmeasured", position: { x: 5000, y: 10 }, data: {} },
  ]

  it("keeps nodes in view, in the margin and not yet measured", () => {
    expect([
      ...getVisibleNodeIds(nodes, { x: 0, y: 0, zoom: 1 }, size, 100),
    ]).toEqual(["in", "near", "unmeasured"])
  })
})

describe("zoom steps and detail", () => {
  it("moves to the next stop", () => {
    expect(getNextZoom(1, "in")).toBe(1.25)
    expect(getNextZoom(1, "out")).toBe(0.75)
    expect(getNextZoom(0.8, "out")).toBe(0.75)
    expect(getNextZoom(2, "in")).toBe(2)
  })

  it("drops detail as the zoom falls", () => {
    expect(getLevelOfDetail(1)).toBe("full")
    expect(getLevelOfDetail(0.4)).toBe("compact")
    expect(getLevelOfDetail(0.2)).toBe("outline")
  })
})

describe("getViewportToReveal", () => {
  const viewport = { x: 0, y: 0, zoom: 1 }

  it("leaves a visible rect alone", () => {
    expect(
      getViewportToReveal(
        { x: 100, y: 100, width: 50, height: 50 },
        viewport,
        size
      )
    ).toBe(viewport)
  })

  it("pans the least amount to show an offscreen rect", () => {
    expect(
      getViewportToReveal(
        { x: 1000, y: 100, width: 100, height: 50 },
        viewport,
        size,
        48
      )
    ).toEqual({
      x: -348,
      y: 0,
      zoom: 1,
    })
  })
})

describe("getAutoPanVelocity", () => {
  it("pans towards an edge the pointer is near", () => {
    expect(getAutoPanVelocity({ x: 400, y: 300 }, size)).toEqual({ x: 0, y: 0 })
    expect(getAutoPanVelocity({ x: 0, y: 300 }, size).x).toBe(12)
    expect(getAutoPanVelocity({ x: 800, y: 300 }, size).x).toBe(-12)
  })
})

describe("getMotionDuration", () => {
  it("reads ms and s and applies the scale", () => {
    expect(getMotionDuration("250ms", "")).toBe(250)
    expect(getMotionDuration(".25s", "2")).toBe(500)
    expect(getMotionDuration("", "1")).toBe(0)
    expect(getMotionDuration("200ms", "0")).toBe(0)
  })
})
