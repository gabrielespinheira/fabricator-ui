import {
  getBezierPath as getReactFlowBezierPath,
  getSmoothStepPath as getReactFlowSmoothStepPath,
  getStraightPath as getReactFlowStraightPath,
  Position,
} from "@xyflow/react"
import { describe, expect, it } from "vitest"

import {
  getBezierPath,
  getCanvasEdgePath,
  getHandlePoint,
  getSmoothStepPath,
  getStraightPath,
  type CanvasSide,
} from "./canvas-geometry"

const SIDES: CanvasSide[] = ["top", "right", "bottom", "left"]
const POSITIONS: Record<CanvasSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}
const OFFSETS = [-240, -35, -12, 0, 8, 19, 140]

function* getFixtures() {
  for (const sourceSide of SIDES) {
    for (const targetSide of SIDES) {
      for (const dx of OFFSETS) {
        for (const dy of OFFSETS) {
          yield {
            sourceX: 100,
            sourceY: 80,
            sourceSide,
            targetX: 100 + dx,
            targetY: 80 + dy,
            targetSide,
          }
        }
      }
    }
  }
}

describe("canvas geometry matches React Flow", () => {
  it("draws the same bezier paths and labels", () => {
    for (const ends of getFixtures()) {
      const [path, labelX, labelY] = getReactFlowBezierPath({
        ...ends,
        sourcePosition: POSITIONS[ends.sourceSide],
        targetPosition: POSITIONS[ends.targetSide],
      })
      expect(getBezierPath(ends)).toEqual({ path, labelX, labelY })
    }
  })

  it("draws the same smooth step paths at any radius", () => {
    for (const radius of [0, 5, 8]) {
      for (const ends of getFixtures()) {
        const [path, labelX, labelY] = getReactFlowSmoothStepPath({
          ...ends,
          sourcePosition: POSITIONS[ends.sourceSide],
          targetPosition: POSITIONS[ends.targetSide],
          borderRadius: radius,
        })
        expect(getSmoothStepPath(ends, radius)).toEqual({
          path,
          labelX,
          labelY,
        })
      }
    }
  })

  it("draws the same straight paths", () => {
    for (const ends of getFixtures()) {
      const [path, labelX, labelY] = getReactFlowStraightPath(ends)
      expect(getStraightPath(ends)).toEqual({ path, labelX, labelY })
    }
  })
})

describe("getCanvasEdgePath", () => {
  const ends = {
    sourceX: 0,
    sourceY: 0,
    sourceSide: "right" as const,
    targetX: 200,
    targetY: 120,
    targetSide: "left" as const,
  }

  it("draws a step with hard corners and a smooth step with rounded ones", () => {
    expect(getCanvasEdgePath("step", ends).path).toContain("Q 100,0 100,0")
    expect(getCanvasEdgePath("smoothstep", ends).path).toContain(
      "L 92,0Q 100,0 100,8"
    )
  })

  it("defaults to a bezier", () => {
    expect(getCanvasEdgePath("bezier", ends)).toEqual(getBezierPath(ends))
  })
})

describe("getHandlePoint", () => {
  const rect = { x: 10, y: 20, width: 200, height: 80 }

  it("puts a handle in the middle of its side", () => {
    expect(getHandlePoint(rect, "left")).toEqual({ x: 10, y: 60 })
    expect(getHandlePoint(rect, "right")).toEqual({ x: 210, y: 60 })
    expect(getHandlePoint(rect, "top")).toEqual({ x: 110, y: 20 })
    expect(getHandlePoint(rect, "bottom")).toEqual({ x: 110, y: 100 })
  })

  it("places a handle along its side", () => {
    expect(getHandlePoint(rect, "right", 0.25)).toEqual({ x: 210, y: 40 })
  })
})
