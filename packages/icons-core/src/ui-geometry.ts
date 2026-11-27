import svgpath from "svgpath"

import { getBounds } from "./geometry"
import type { IconElement } from "./types"

type Point = [number, number]
type Step = { command: string; values: number[]; end: Point }

const SCALE = 0.96

function coordinate(value: number) {
  return String(Number(value.toFixed(3)))
}

function point(values: Point) {
  return values.map(coordinate).join(" ")
}

function distance(start: Point, end: Point) {
  return Math.hypot(end[0] - start[0], end[1] - start[1])
}

function inset(from: Point, to: Point, amount: number): Point {
  const ratio = amount / distance(from, to)
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
  ]
}

function bend(previous: Point, corner: Point, next: Point) {
  const first = distance(corner, previous)
  const second = distance(corner, next)
  const trim = Math.min(1.15, first * 0.28, second * 0.28)
  if (trim < 0.18) return
  const before = inset(corner, previous, trim)
  const after = inset(corner, next, trim)
  const across = distance(before, after)
  if (across > 1.96 * trim || across < 0.5 * trim) return
  return { before, after }
}

function roundVertices(vertices: Point[], closed: boolean) {
  const corners = vertices.map((vertex, index) => {
    const previous =
      vertices[index - 1] ?? (closed ? vertices.at(-1) : undefined)
    const next = vertices[index + 1] ?? (closed ? vertices[0] : undefined)
    return previous && next ? bend(previous, vertex, next) : undefined
  })
  return (
    vertices
      .map((vertex, index) => {
        const corner = corners[index]
        const prefix = index === 0 ? "M" : "L"
        return corner
          ? `${prefix}${point(corner.before)}Q${point(vertex)} ${point(corner.after)}`
          : `${prefix}${point(vertex)}`
      })
      .join("") + (closed ? "Z" : "")
  )
}

function reshapeCorners(steps: Step[]) {
  for (const [index, arc] of steps.entries()) {
    if (arc.command !== "A") continue
    const previous = steps[index - 2]
    const entry = steps[index - 1]
    const exit = steps[index + 1]
    if (!previous || entry?.command !== "L" || exit?.command !== "L") continue
    const [radius, verticalRadius, angle, large] = arc.values
    if (!radius || radius !== verticalRadius || angle || large || radius > 3.25)
      continue

    const incoming = distance(previous.end, entry.end)
    const outgoing = distance(arc.end, exit.end)
    const extra = Math.min(radius * 0.32, incoming * 0.22, outgoing * 0.22)
    if (extra < 0.15) continue

    const tangentEntry = inset(entry.end, previous.end, radius)
    const tangentExit = inset(arc.end, exit.end, radius)
    const midpoint: Point = [
      entry.end[0] + (entry.end[0] - tangentEntry[0]),
      entry.end[1] + (entry.end[1] - tangentEntry[1]),
    ]
    // Only reshape a tangent quarter turn. Other arcs can be a lens, a joint,
    // or the entire face of an icon and keep their existing geometry.
    if (
      Math.abs(distance(entry.end, arc.end) - Math.SQRT2 * radius) > 0.04 ||
      distance(midpoint, [
        2 * arc.end[0] - tangentExit[0],
        2 * arc.end[1] - tangentExit[1],
      ]) > 0.04
    )
      continue

    const start = inset(entry.end, previous.end, extra)
    const end = inset(arc.end, exit.end, extra)
    const reach = (radius + extra) * 0.65
    const firstHandle = inset(
      start,
      [2 * start[0] - previous.end[0], 2 * start[1] - previous.end[1]],
      reach
    )
    const secondHandle = inset(
      end,
      [2 * end[0] - exit.end[0], 2 * end[1] - exit.end[1]],
      reach
    )
    steps[index - 1] = { command: "L", end: start, values: start }
    steps[index] = {
      command: "C",
      end,
      values: [...firstHandle, ...secondHandle, ...end],
    }
  }
}

function roundsPath(steps: Step[]) {
  const closed = steps.at(-1)?.command === "Z"
  const drawing = closed ? steps.slice(0, -1) : steps
  const first = drawing[0]
  if (!first) return ""
  if (drawing.slice(1).every(({ command }) => command === "L")) {
    const vertices = drawing.map(({ end }) => end)
    const last = vertices.at(-1)
    if (closed && last && distance(first.end, last) < 0.001) vertices.pop()
    return roundVertices(vertices, closed)
  }
  reshapeCorners(steps)
  return steps
    .map((step, index) => {
      const previous = steps[index - 1]
      const next = steps[index + 1]
      const corner =
        step.command === "L" && next?.command === "L" && previous
          ? bend(previous.end, step.end, next.end)
          : undefined
      return corner
        ? `L${point(corner.before)}Q${point(step.end)} ${point(corner.after)}`
        : step.command + step.values.map(coordinate).join(" ")
    })
    .join("")
}

function roundPath(drawing: string) {
  const subpaths: Step[][] = []
  let current: Step[] = []
  svgpath(drawing)
    .abs()
    .unshort()
    .translate(-12, -12)
    .scale(SCALE)
    .translate(12, 12)
    .iterate(([tag, ...values], _index, x, y) => {
      if (tag === "M") {
        current = []
        subpaths.push(current)
      }
      const horizontal = tag === "H"
      const vertical = tag === "V"
      const end: Point =
        tag === "Z"
          ? (current[0]?.end ?? [x, y])
          : [
              vertical ? x : (values.at(horizontal ? -1 : -2) ?? x),
              horizontal ? y : (values.at(-1) ?? y),
            ]
      current.push({
        command: horizontal || vertical ? "L" : tag,
        values: horizontal || vertical ? end : values,
        end,
      })
    })
  return svgpath(subpaths.map(roundsPath).join("")).rel().round(3).toString()
}

const positionAttributes = new Set([
  "x",
  "y",
  "cx",
  "cy",
  "x1",
  "y1",
  "x2",
  "y2",
])
const sizeAttributes = new Set(["width", "height", "r", "rx", "ry"])

export function roundOutline(node: IconElement[]): IconElement[] {
  return node.map(([tag, attributes]) => {
    if (tag === "path")
      return [tag, { ...attributes, d: roundPath(attributes.d ?? "") }]
    if (tag === "polyline" || tag === "polygon") {
      const values = (attributes.points?.match(/-?(?:\d*\.)?\d+/g) ?? []).map(
        Number
      )
      const vertices: Point[] = []
      for (let index = 0; index < values.length; index += 2) {
        const x = values[index]
        const y = values[index + 1]
        if (x !== undefined && y !== undefined)
          vertices.push([scalePosition(x), scalePosition(y)])
      }
      const { points: _points, ...paint } = attributes
      return [
        "path",
        { ...paint, d: roundVertices(vertices, tag === "polygon") },
      ]
    }
    const scaled = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => {
        if (positionAttributes.has(key))
          return [key, coordinate(scalePosition(Number(value)))]
        if (sizeAttributes.has(key))
          return [key, coordinate(Number(value) * SCALE)]
        return [key, value]
      })
    )
    if (tag === "rect") {
      const limit = Math.min(Number(scaled.width), Number(scaled.height)) / 2
      for (const axis of ["rx", "ry"]) {
        const radius = scaled[axis]
        if (radius !== undefined)
          scaled[axis] = coordinate(Math.min(limit, 1.3 * Number(radius)))
      }
    }
    return [tag, scaled]
  })
}

function scalePosition(value: number) {
  return 12 + (value - 12) * SCALE
}

export function splitPath(drawing: string): IconElement[] {
  const paths: IconElement[] = []
  let commands: string[] = []
  svgpath(drawing)
    .abs()
    .unshort()
    .iterate(([tag, ...values]) => {
      if (tag === "M" && commands.length > 0) {
        paths.push(["path", { d: commands.join("") }])
        commands = []
      }
      commands.push(tag + values.map(coordinate).join(" "))
    })
  if (commands.length > 0) paths.push(["path", { d: commands.join("") }])
  return paths
}

/** Interior contour for shapes that own a face. Tiny dots remain stroke detail. */
export function getContour([tag, attrs]: IconElement) {
  if (tag === "circle" || tag === "ellipse") {
    const horizontal = Number(attrs.r ?? attrs.rx)
    const vertical = Number(attrs.r ?? attrs.ry)
    if (Math.min(horizontal, vertical) < 1.15) return
    return `M${coordinate(Number(attrs.cx) - horizontal)} ${attrs.cy}a${horizontal} ${vertical} 0 1 0 ${2 * horizontal} 0a${horizontal} ${vertical} 0 1 0 ${-2 * horizontal} 0Z`
  }
  if (tag === "rect") {
    const x = Number(attrs.x ?? 0)
    const y = Number(attrs.y ?? 0)
    const width = Number(attrs.width)
    const height = Number(attrs.height)
    if (Math.min(width, height) < 1.8) return
    const rx = Number(attrs.rx ?? attrs.ry ?? 0)
    const ry = Number(attrs.ry ?? attrs.rx ?? 0)
    if (!rx || !ry) return `M${x} ${y}h${width}v${height}h${-width}Z`
    const across = coordinate(width - 2 * rx)
    const down = coordinate(height - 2 * ry)
    const arc = `a${rx} ${ry} 0 0 1`
    return `M${coordinate(x + rx)} ${y}h${across}${arc} ${rx} ${ry}v${down}${arc} ${-rx} ${ry}h-${across}${arc} ${-rx} ${-ry}v-${down}${arc} ${rx} ${-ry}Z`
  }
  if (tag !== "path" || !attrs.d) return
  const { minX, minY, maxX, maxY } = getBounds([[tag, attrs]])
  if (Math.min(maxX - minX, maxY - minY) < 1.8) return
  const d = attrs.d
  if (/z$/i.test(d)) return d
  const first = d.match(/^M(-?[\d.]+) (-?[\d.]+)/)
  if (!first) return
  let last: Point = [0, 0]
  svgpath(d)
    .abs()
    .iterate(([tag, ...values], _index, x, y) => {
      last = [
        tag === "V" ? x : (values.at(tag === "H" ? -1 : -2) ?? x),
        tag === "H" ? y : (values.at(-1) ?? y),
      ]
    })
  if (distance([Number(first[1]), Number(first[2])], last) < 0.06)
    return `${d}Z`
}

/** Sample a contour for containment tests. Curves remain intact in the output. */
export function sampleContour(drawing: string) {
  const samples: Point[] = []
  svgpath(drawing)
    .abs()
    .unarc()
    .unshort()
    .iterate(([tag, ...values], _index, x, y) => {
      if (tag === "C" || tag === "Q") {
        const [
          firstX = x,
          firstY = y,
          secondX = x,
          secondY = y,
          endX = x,
          endY = y,
        ] = values
        for (let step = 1; step <= 8; step++) {
          const t = step / 8
          const u = 1 - t
          samples.push(
            tag === "C"
              ? [
                  u ** 3 * x +
                    3 * u ** 2 * t * firstX +
                    3 * u * t ** 2 * secondX +
                    t ** 3 * endX,
                  u ** 3 * y +
                    3 * u ** 2 * t * firstY +
                    3 * u * t ** 2 * secondY +
                    t ** 3 * endY,
                ]
              : [
                  u ** 2 * x + 2 * u * t * firstX + t ** 2 * secondX,
                  u ** 2 * y + 2 * u * t * firstY + t ** 2 * secondY,
                ]
          )
        }
      } else if (tag !== "Z") {
        const end: Point = [
          tag === "V" ? x : (values.at(tag === "H" ? -1 : -2) ?? x),
          tag === "H" ? y : (values.at(-1) ?? y),
        ]
        if (tag !== "M") {
          const length = distance([x, y], end)
          if (length > 0) {
            for (const fraction of [0.25, 0.5, 0.75]) {
              samples.push(inset([x, y], end, length * fraction))
            }
          }
        }
        samples.push(end)
      }
    })
  return samples
}

export function isInContour([x, y]: Point, contour: Point[]) {
  let isInside = false
  for (let index = 0; index < contour.length; index++) {
    const first = contour[index]
    const second = contour[index + 1] ?? contour[0]
    if (!first || !second) continue
    if (first[1] > y === second[1] > y) continue
    if (
      x <
      first[0] +
        ((second[0] - first[0]) * (y - first[1])) / (second[1] - first[1])
    ) {
      isInside = !isInside
    }
  }
  return isInside
}
