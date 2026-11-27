// Edge paths for the Canvas, shared by React web and React Native so an edge
// is the same curve on every platform. Native recomputes a dragged node's
// edges on the UI thread, so every function here is a worklet and touches
// nothing but its arguments.
//
// The path maths is React Flow's (@xyflow/system, MIT, Copyright (c) 2019-2025
// webkid GmbH), ported without behaviour changes; canvas-geometry.test.ts
// compares both over a grid of positions and fails on any difference.

type CanvasSide = "top" | "right" | "bottom" | "left"

type CanvasPoint = { x: number; y: number }

type CanvasEdgeShape = "bezier" | "smoothstep" | "step" | "straight"

type CanvasEdgeEnds = {
  sourceX: number
  sourceY: number
  sourceSide?: CanvasSide
  targetX: number
  targetY: number
  targetSide?: CanvasSide
}

/** A drawn edge: its SVG path and where its label sits. */
type CanvasEdgePath = {
  path: string
  labelX: number
  labelY: number
}

const SIDE_DIRECTIONS: Record<CanvasSide, CanvasPoint> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
}

function getEdgeCenter(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): [number, number, number, number] {
  "worklet"
  const xOffset = Math.abs(targetX - sourceX) / 2
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset
  const yOffset = Math.abs(targetY - sourceY) / 2
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset
  return [centerX, centerY, xOffset, yOffset]
}

function getControlOffset(distance: number, curvature: number) {
  "worklet"
  if (distance >= 0) return 0.5 * distance
  return curvature * 25 * Math.sqrt(-distance)
}

function getBezierControl(
  side: CanvasSide,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number
): [number, number] {
  "worklet"
  if (side === "left") return [x1 - getControlOffset(x1 - x2, curvature), y1]
  if (side === "right") return [x1 + getControlOffset(x2 - x1, curvature), y1]
  if (side === "top") return [x1, y1 - getControlOffset(y1 - y2, curvature)]
  return [x1, y1 + getControlOffset(y2 - y1, curvature)]
}

function getBezierPath(
  {
    sourceX,
    sourceY,
    sourceSide = "bottom",
    targetX,
    targetY,
    targetSide = "top",
  }: CanvasEdgeEnds,
  curvature = 0.25
): CanvasEdgePath {
  "worklet"
  const [sourceControlX, sourceControlY] = getBezierControl(
    sourceSide,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature
  )
  const [targetControlX, targetControlY] = getBezierControl(
    targetSide,
    targetX,
    targetY,
    sourceX,
    sourceY,
    curvature
  )
  // The curve's point at t = 0.5.
  const labelX =
    sourceX * 0.125 +
    sourceControlX * 0.375 +
    targetControlX * 0.375 +
    targetX * 0.125
  const labelY =
    sourceY * 0.125 +
    sourceControlY * 0.375 +
    targetControlY * 0.375 +
    targetY * 0.125
  return {
    path: `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
  }
}

function getStraightPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: CanvasEdgeEnds): CanvasEdgePath {
  "worklet"
  const [labelX, labelY] = getEdgeCenter(sourceX, sourceY, targetX, targetY)
  return {
    path: `M ${sourceX},${sourceY}L ${targetX},${targetY}`,
    labelX,
    labelY,
  }
}

function getDistance(a: CanvasPoint, b: CanvasPoint) {
  "worklet"
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

// Whether b lies on the straight segment from a to c, including b === c.
function isBetween(a: CanvasPoint, b: CanvasPoint, c: CanvasPoint) {
  "worklet"
  return (
    (a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0) ||
    (a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0)
  )
}

function getStepPoints(
  source: CanvasPoint,
  sourceSide: CanvasSide,
  target: CanvasPoint,
  targetSide: CanvasSide,
  offset: number,
  stepPosition: number
): [CanvasPoint[], number, number] {
  "worklet"
  const sourceDir = SIDE_DIRECTIONS[sourceSide]
  const targetDir = SIDE_DIRECTIONS[targetSide]
  const sourceGapped = {
    x: source.x + sourceDir.x * offset,
    y: source.y + sourceDir.y * offset,
  }
  const targetGapped = {
    x: target.x + targetDir.x * offset,
    y: target.y + targetDir.y * offset,
  }
  const isHorizontalSource = sourceSide === "left" || sourceSide === "right"
  const dir = isHorizontalSource
    ? { x: sourceGapped.x < targetGapped.x ? 1 : -1, y: 0 }
    : { x: 0, y: sourceGapped.y < targetGapped.y ? 1 : -1 }
  const axis: "x" | "y" = dir.x !== 0 ? "x" : "y"
  const currentDir = dir[axis]

  let points: CanvasPoint[]
  let centerX: number
  let centerY: number
  const sourceGapOffset = { x: 0, y: 0 }
  const targetGapOffset = { x: 0, y: 0 }

  if (sourceDir[axis] * targetDir[axis] === -1) {
    if (axis === "x") {
      centerX =
        sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition
      centerY = (sourceGapped.y + targetGapped.y) / 2
    } else {
      centerX = (sourceGapped.x + targetGapped.x) / 2
      centerY =
        sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition
    }
    const verticalSplit = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y },
    ]
    const horizontalSplit = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY },
    ]
    if (sourceDir[axis] === currentDir) {
      points = axis === "x" ? verticalSplit : horizontalSplit
    } else {
      points = axis === "x" ? horizontalSplit : verticalSplit
    }
  } else {
    const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }]
    const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }]
    if (axis === "x") {
      points = sourceDir.x === currentDir ? targetSource : sourceTarget
    } else {
      points = sourceDir.y === currentDir ? sourceTarget : targetSource
    }

    if (sourceSide === targetSide) {
      const difference = Math.abs(source[axis] - target[axis])
      // Two handles on the same side closer than the offset would overlap the
      // added corner with the gapped ends; pull one end back.
      if (difference <= offset) {
        const gapOffset = Math.min(offset - 1, offset - difference)
        if (sourceDir[axis] === currentDir) {
          sourceGapOffset[axis] =
            (sourceGapped[axis] > source[axis] ? -1 : 1) * gapOffset
        } else {
          targetGapOffset[axis] =
            (targetGapped[axis] > target[axis] ? -1 : 1) * gapOffset
        }
      }
    }

    if (sourceSide !== targetSide) {
      const opposite: "x" | "y" = axis === "x" ? "y" : "x"
      const isSameDir = sourceDir[axis] === targetDir[opposite]
      const sourceAfterTarget = sourceGapped[opposite] > targetGapped[opposite]
      const sourceBeforeTarget = sourceGapped[opposite] < targetGapped[opposite]
      const shouldFlip =
        (sourceDir[axis] === 1 &&
          ((!isSameDir && sourceAfterTarget) ||
            (isSameDir && sourceBeforeTarget))) ||
        (sourceDir[axis] !== 1 &&
          ((!isSameDir && sourceBeforeTarget) ||
            (isSameDir && sourceAfterTarget)))
      if (shouldFlip) points = axis === "x" ? sourceTarget : targetSource
    }

    const sourceGapPoint = {
      x: sourceGapped.x + sourceGapOffset.x,
      y: sourceGapped.y + sourceGapOffset.y,
    }
    const targetGapPoint = {
      x: targetGapped.x + targetGapOffset.x,
      y: targetGapped.y + targetGapOffset.y,
    }
    const maxXDistance = Math.max(
      Math.abs(sourceGapPoint.x - points[0].x),
      Math.abs(targetGapPoint.x - points[0].x)
    )
    const maxYDistance = Math.max(
      Math.abs(sourceGapPoint.y - points[0].y),
      Math.abs(targetGapPoint.y - points[0].y)
    )
    // The label sits on the longest segment.
    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2
      centerY = points[0].y
    } else {
      centerX = points[0].x
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2
    }
  }

  const gappedSource = {
    x: sourceGapped.x + sourceGapOffset.x,
    y: sourceGapped.y + sourceGapOffset.y,
  }
  const gappedTarget = {
    x: targetGapped.x + targetGapOffset.x,
    y: targetGapped.y + targetGapOffset.y,
  }
  const pathPoints: CanvasPoint[] = []
  for (const point of [source, gappedSource, ...points, gappedTarget, target]) {
    const a = pathPoints[pathPoints.length - 2]
    const b = pathPoints[pathPoints.length - 1]
    // A point the path runs straight through would shrink the next bend.
    if (a && b && isBetween(a, b, point)) pathPoints.pop()
    pathPoints.push(point)
  }
  return [pathPoints, centerX, centerY]
}

function getBend(
  a: CanvasPoint,
  b: CanvasPoint,
  c: CanvasPoint,
  size: number
): string {
  "worklet"
  const bendSize = Math.min(getDistance(a, b) / 2, getDistance(b, c) / 2, size)
  const { x, y } = b
  if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) return `L${x} ${y}`
  if (a.y === y) {
    const xDir = a.x < c.x ? -1 : 1
    const yDir = a.y < c.y ? 1 : -1
    return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`
  }
  const xDir = a.x < c.x ? 1 : -1
  const yDir = a.y < c.y ? -1 : 1
  return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`
}

/** Right-angled path; `borderRadius` 0 is the hard "step" edge. */
function getSmoothStepPath(
  {
    sourceX,
    sourceY,
    sourceSide = "bottom",
    targetX,
    targetY,
    targetSide = "top",
  }: CanvasEdgeEnds,
  borderRadius = 5,
  offset = 20,
  stepPosition = 0.5
): CanvasEdgePath {
  "worklet"
  const [points, labelX, labelY] = getStepPoints(
    { x: sourceX, y: sourceY },
    sourceSide,
    { x: targetX, y: targetY },
    targetSide,
    offset,
    stepPosition
  )
  let path = `M${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length - 1; index++) {
    path += getBend(
      points[index - 1],
      points[index],
      points[index + 1],
      borderRadius
    )
  }
  const last = points[points.length - 1]
  path += `L${last.x} ${last.y}`
  return { path, labelX, labelY }
}

/** The path of an edge of any shape the Canvas draws. */
function getCanvasEdgePath(
  shape: CanvasEdgeShape,
  ends: CanvasEdgeEnds
): CanvasEdgePath {
  "worklet"
  if (shape === "straight") return getStraightPath(ends)
  if (shape === "step") return getSmoothStepPath(ends, 0)
  // The Fabricator smooth step bends on the control radius, not React
  // Flow's 5px, so a corner reads as the same shape as a button's.
  if (shape === "smoothstep") return getSmoothStepPath(ends, 8)
  return getBezierPath(ends)
}

/** Where a handle on a side of a rect sits, in the rect's coordinates. */
function getHandlePoint(
  rect: { x: number; y: number; width: number; height: number },
  side: CanvasSide,
  /** Share of the side's length, 0 to 1; the middle by default. */
  along = 0.5
): CanvasPoint {
  "worklet"
  if (side === "left") return { x: rect.x, y: rect.y + rect.height * along }
  if (side === "right")
    return { x: rect.x + rect.width, y: rect.y + rect.height * along }
  if (side === "top") return { x: rect.x + rect.width * along, y: rect.y }
  return { x: rect.x + rect.width * along, y: rect.y + rect.height }
}

export {
  getBezierPath,
  getCanvasEdgePath,
  getEdgeCenter,
  getHandlePoint,
  getSmoothStepPath,
  getStraightPath,
  type CanvasEdgeEnds,
  type CanvasEdgePath,
  type CanvasEdgeShape,
  type CanvasPoint,
  type CanvasSide,
}
