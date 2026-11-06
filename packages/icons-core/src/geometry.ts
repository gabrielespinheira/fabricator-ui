import svgpath from "svgpath"

import type { IconElement } from "./types"

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

type Point = [number, number]

function cubicExtremes(p0: number, p1: number, p2: number, p3: number) {
  // Roots of the derivative of a cubic Bézier, in t ∈ (0, 1).
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0
  if (Math.abs(a) < 1e-12) {
    return Math.abs(b) < 1e-12 ? [] : [-c / b]
  }
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return []
  const root = Math.sqrt(discriminant)
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)]
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  )
}

function pathPoints(d: string) {
  const points: Point[] = []
  let current: Point = [0, 0]
  let start: Point = [0, 0]
  svgpath(d)
    .abs()
    .unarc()
    .unshort()
    .iterate((segment) => {
      switch (segment[0]) {
        case "M":
          current = [segment[1], segment[2]]
          start = current
          points.push(current)
          break
        case "L":
          current = [segment[1], segment[2]]
          points.push(current)
          break
        case "H":
          current = [segment[1], current[1]]
          points.push(current)
          break
        case "V":
          current = [current[0], segment[1]]
          points.push(current)
          break
        case "Q": {
          // Elevate to a cubic so one extremum routine covers both.
          const [, qx, qy, x, y] = segment
          const c1: Point = [
            current[0] + (2 / 3) * (qx - current[0]),
            current[1] + (2 / 3) * (qy - current[1]),
          ]
          const c2: Point = [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)]
          points.push(...cubicPoints(current, c1, c2, [x, y]))
          current = [x, y]
          break
        }
        case "C": {
          const [, x1, y1, x2, y2, x, y] = segment
          points.push(...cubicPoints(current, [x1, y1], [x2, y2], [x, y]))
          current = [x, y]
          break
        }
        case "Z":
        case "z":
          current = start
          break
      }
    })
  return points
}

function cubicPoints(p0: Point, p1: Point, p2: Point, p3: Point) {
  const points: Point[] = [p3]
  const ts = [
    ...cubicExtremes(p0[0], p1[0], p2[0], p3[0]),
    ...cubicExtremes(p0[1], p1[1], p2[1], p3[1]),
  ].filter((t) => t > 0 && t < 1)
  for (const t of ts) {
    points.push([
      cubicAt(p0[0], p1[0], p2[0], p3[0], t),
      cubicAt(p0[1], p1[1], p2[1], p3[1], t),
    ])
  }
  return points
}

function numbers(value: string | undefined) {
  return (value ?? "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
}

function elementPoints([tag, attributes]: IconElement): Point[] {
  const number = (name: string) => Number(attributes[name] ?? 0)
  switch (tag) {
    case "path":
      return pathPoints(attributes.d ?? "")
    case "circle":
      return [
        [number("cx") - number("r"), number("cy") - number("r")],
        [number("cx") + number("r"), number("cy") + number("r")],
      ]
    case "ellipse":
      return [
        [number("cx") - number("rx"), number("cy") - number("ry")],
        [number("cx") + number("rx"), number("cy") + number("ry")],
      ]
    case "rect":
      return [
        [number("x"), number("y")],
        [number("x") + number("width"), number("y") + number("height")],
      ]
    case "line":
      return [
        [number("x1"), number("y1")],
        [number("x2"), number("y2")],
      ]
    case "polyline":
    case "polygon": {
      const points: Point[] = []
      let x: number | undefined
      for (const value of numbers(attributes.points)) {
        if (x === undefined) {
          x = value
          continue
        }
        points.push([x, value])
        x = undefined
      }
      return points
    }
  }
}

/** The geometric bounds of a set of shapes, without stroke width. */
export function getBounds(node: IconElement[]): Bounds {
  const points = node.flatMap(elementPoints)
  const round = (value: number) => Math.round(value * 1000) / 1000
  return {
    minX: round(Math.min(...points.map(([x]) => x))),
    minY: round(Math.min(...points.map(([, y]) => y))),
    maxX: round(Math.max(...points.map(([x]) => x))),
    maxY: round(Math.max(...points.map(([, y]) => y))),
  }
}
