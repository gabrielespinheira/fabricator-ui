import svgpath from "svgpath"

import { getBounds } from "./geometry"
import { measureIconFootprint } from "./icon-footprint"
import { renderUiSvg } from "./runtime/ui-svg"
import type { IconElement } from "./types"
import { sampleContour } from "./ui-geometry"
import { drawPaths, drawRoundedBox, gridNumber } from "./ui-grid"

type DrawMark = (name: string) => IconElement[] | undefined
type MarkSlot = Readonly<{ x: number; y: number; span: number }>

/** Anchor a mark by its artwork, allowing the same drawing in several frames. */
export function drawInSlot(node: IconElement[], { x, y, span }: MarkSlot) {
  const { minX, minY, maxX, maxY } = getBounds(node)
  const scale = span / Math.max(maxX - minX, maxY - minY)
  return node.map(([tag, attrs]): IconElement => {
    if (tag !== "path" || !attrs.d) return [tag, attrs]
    return [
      "path",
      {
        ...attrs,
        d: svgpath(attrs.d)
          .scale(scale)
          .translate(
            x - ((minX + maxX) / 2) * scale,
            y - ((minY + maxY) / 2) * scale
          )
          .rel()
          .round(3)
          .toString(),
      },
    ]
  })
}

const circle =
  "M12 2.25C17.6 2.25 21.75 6.4 21.75 12C21.75 17.6 17.6 21.75 12 21.75C6.4 21.75 2.25 17.6 2.25 12C2.25 6.4 6.4 2.25 12 2.25Z"
const square = drawRoundedBox([2.5, 2.5, 21.5, 21.5], 5)
const triangle =
  "M10.43 4.2c.73-1.28 2.41-1.28 3.14 0l7.94 13.85c.77 1.35-.07 2.95-1.61 2.95H4.1c-1.54 0-2.38-1.6-1.61-2.95Z"
const octagon =
  "M9 2.5h6c1.05 0 1.62.24 2.37.99l3.14 3.14c.75.75.99 1.32.99 2.37v6c0 1.05-.24 1.62-.99 2.37l-3.14 3.14c-.75.75-1.32.99-2.37.99H9c-1.05 0-1.62-.24-2.37-.99l-3.14-3.14c-.75-.75-.99-1.32-.99-2.37V9c0-1.05.24-1.62.99-2.37l3.14-3.14c.75-.75 1.32-.99 2.37-.99Z"
const badge =
  "M10.5 3.08a2.48 2.48 0 0 1 3 0l1.22.88c.48.34.95.5 1.54.5h1.55c1.42 0 2.23.83 2.23 2.25v1.55c0 .59.16 1.06.5 1.54l.88 1.22a2.48 2.48 0 0 1 0 3l-.88 1.22c-.34.48-.5.95-.5 1.54v1.55c0 1.42-.81 2.25-2.23 2.25h-1.55c-.59 0-1.06.16-1.54.5l-1.22.88a2.48 2.48 0 0 1-3 0l-1.22-.88c-.48-.34-.95-.5-1.54-.5H6.19c-1.42 0-2.23-.83-2.23-2.25v-1.55c0-.59-.16-1.06-.5-1.54l-.88-1.22a2.48 2.48 0 0 1 0-3l.88-1.22c.34-.48.5-.95.5-1.54V6.71c0-1.42.81-2.25 2.23-2.25h1.55c.59 0 1.06-.16 1.54-.5Z"
const diamond =
  "M10.53 3.1a2.08 2.08 0 0 1 2.94 0l7.43 7.43a2.08 2.08 0 0 1 0 2.94l-7.43 7.43a2.08 2.08 0 0 1-2.94 0L3.1 13.47a2.08 2.08 0 0 1 0-2.94Z"
const shield =
  "M10.8 2.65a3.1 3.1 0 0 1 2.4 0l6.6 2.72a1.9 1.9 0 0 1 1.2 1.76v4.47c0 4.78-3.85 7.93-7.75 9.79a2.92 2.92 0 0 1-2.5 0C6.85 19.53 3 16.38 3 11.6V7.13a1.9 1.9 0 0 1 1.2-1.76Z"
const outsideFrames: Readonly<
  Record<string, { path: string; slot: MarkSlot }>
> = {
  circle: { path: circle, slot: { x: 12, y: 12, span: 9.25 } },
  square: { path: square, slot: { x: 12, y: 12, span: 9.5 } },
  triangle: { path: triangle, slot: { x: 12, y: 13.75, span: 7.5 } },
  octagon: { path: octagon, slot: { x: 12, y: 12, span: 9 } },
  badge: { path: badge, slot: { x: 12, y: 12.5, span: 8.5 } },
  diamond: { path: diamond, slot: { x: 12, y: 12, span: 7.5 } },
  shield: { path: shield, slot: { x: 12, y: 11.5, span: 8 } },
}

const alphabet: Readonly<Record<string, string>> = {
  a: "m7.75 17 3.55-9.25q.7-1.45 1.4 0L16.25 17m-7.4-3.3h6.3",
  b: "M8.5 17V7h4.25c3.75 0 3.85 4.75.2 4.75h-4.4m4.1 0c4.45 0 4.6 5.25 0 5.25Z",
  c: "M15.8 8.5c-2.15-2.65-7.55-1.9-7.55 3.5s5.4 6.15 7.55 3.5",
  d: "M8.25 17V7h2.75c3.25 0 5 1.75 5 5s-1.75 5-5 5Z",
  e: "M15.75 7h-7.5v10h7.5m-7.5-5h5.85",
  f: "M15.75 7h-7.5v10m0-5h5.85",
  g: "M15.7 8.55c-2.25-2.7-7.65-1.9-7.65 3.45 0 4.9 5.35 6.55 8 3.25v-2.5H12.5",
  h: "M8.25 7v10m7.5-10v10m-7.5-5h7.5",
  i: "M9.5 7h5m-2.5 0v10m-2.5 0h5",
  j: "M15.25 7v6.75c0 2.2-1.1 3.25-3.25 3.25-1.35 0-2.45-.65-3-1.6",
  k: "M8.5 7v10m7-10-7 6.25m3.2-2.75 4 6.5",
  l: "M8.5 7v8.85c0 .75.4 1.15 1.15 1.15H16",
  m: "M7 17V7.6q0-.55.5-.2L12 12l4.5-4.6q.5-.35.5.2V17",
  n: "M8 17V7.5q0-.65.55-.25l6.9 9.5q.55.4.55-.25V7",
  o: "M16.25 12c0 3.1-1.7 5-4.25 5s-4.25-1.9-4.25-5 1.7-5 4.25-5 4.25 1.9 4.25 5Z",
  p: "M8.5 17V7h3.75c4.65 0 4.65 6 0 6H8.5",
  q: "M16.25 12c0 3.1-1.7 5-4.25 5s-4.25-1.9-4.25-5 1.7-5 4.25-5 4.25 1.9 4.25 5Zm-3.2 2.65 3.45 3.1",
  r: "M8.25 17V7h3.75c4.65 0 4.65 5.75 0 5.75H8.25m4 0L16 17",
  s: "M15.5 8.25c-2.1-2.35-6.8-1.36-6.8 1.15 0 3.25 6.7 1.55 6.7 4.9 0 2.6-4.65 3.75-7.05 1.45",
  t: "M7.75 7h8.5M12 7v10",
  u: "M8.25 7v6.4c0 2.35 1.4 3.6 3.75 3.6s3.75-1.25 3.75-3.6V7",
  v: "m7.75 7 3.55 9.4q.7 1.2 1.4 0L16.25 7",
  w: "m6.75 7 2.2 9.55q.3.9.75 0L12 11l2.3 5.55q.45.9.75 0L17.25 7",
  x: "m8.25 7 7.5 10m0-10-7.5 10",
  y: "m7.75 7 4.25 5.8L16.25 7M12 12.8V17",
  z: "M8.3 7h7.1q.75 0 .25.6l-7.3 8.8q-.5.6.25.6h7.1",
}

const frameMarks = new Set([
  "activity",
  "asterisk",
  "check",
  "code",
  "divide",
  "dot",
  "ellipsis",
  "equal",
  "exclamation-point",
  "info",
  "key",
  "lock",
  "menu",
  "minus",
  "pause",
  "percent",
  "play",
  "plus",
  "power",
  "question-mark",
  "slash",
  "star",
  "stop",
  "terminal",
  "x",
  "heart",
])

function getFrameMark(mark: string, drawMark: DrawMark) {
  if (
    frameMarks.has(mark) ||
    /^(arrow|chevrons?)-(up|down|left|right)(-(left|right))?$/.test(mark)
  )
    return drawMark(mark)
}

function drawFramedLetter(path: string, slot: MarkSlot) {
  const node = drawPaths([path])
  const letterSlot = { ...slot, span: 10.25 }
  const centred = drawInSlot(node, letterSlot)
  const { inkCentre } = measureIconFootprint(
    renderUiSvg({ name: "letter", node: centred })
  )
  // Preserve breathing room and the cap line on letters with one heavy stem.
  const shift = (delta: number, limit: number) =>
    Math.round(Math.max(-limit, Math.min(limit, delta)) * 20) / 20
  const x = shift(slot.x - inkCentre.x, 1)
  const y = shift(slot.y - inkCentre.y, 0.6)
  const positioned = drawInSlot(node, {
    ...letterSlot,
    x: slot.x + x,
    y: slot.y + y,
  })
  const reach = Math.max(
    ...positioned.flatMap(([, { d }]) =>
      sampleContour(d ?? "").map(([x, y]) => Math.hypot(x - slot.x, y - slot.y))
    )
  )
  // Reserve both three-unit strokes and a quarter unit of space inside the circle.
  if (reach <= 6.5) return positioned
  const scale = 6.5 / reach
  return drawInSlot(node, {
    x: slot.x + x * scale,
    y: slot.y + y * scale,
    span: letterSlot.span * scale,
  })
}

function drawEnclosedGlyph(name: string, drawMark: DrawMark) {
  const separator = name.indexOf("-")
  const frameName = separator === -1 ? name : name.slice(0, separator)
  const specification = outsideFrames[frameName]
  if (!specification || !Object.hasOwn(outsideFrames, frameName)) return
  const { path, slot } = specification
  const frame = drawPaths([path])
  if (separator === -1) return frame
  const markName = name.slice(separator + 1)
  const letter = /^letter-([a-z])$/.exec(markName)?.[1]
  if (letter) {
    const shape = alphabet[letter]
    if (!shape) return
    return [...frame, ...drawFramedLetter(shape, slot)]
  }
  const mark = getFrameMark(markName, drawMark)
  if (!mark) return
  const isPunctuation = markName === "dot" || markName === "ellipsis"
  return [
    ...frame,
    ...drawInSlot(mark, {
      ...slot,
      span: isPunctuation
        ? Math.min(slot.span, markName === "dot" ? 0.55 : 8.5)
        : slot.span,
    }),
  ]
}

const panelFrame = drawRoundedBox([2.25, 3.75, 21.75, 20.25], 4.25)
const sharedFrames = new Map(
  Object.entries(outsideFrames).map(([name, frame]) => [frame.path, name])
)
sharedFrames.set(panelFrame, "panel")

export function getSharedFrame(node: IconElement[]) {
  const frame = node[0]
  return frame?.[0] === "path" ? sharedFrames.get(frame[1].d ?? "") : undefined
}

const panelDividers = {
  left: "M8.75 3.75v16.5",
  right: "M15.25 3.75v16.5",
  top: "M2.25 9h19.5",
  bottom: "M2.25 15h19.5",
}
const panelCenters = {
  left: { x: 15.25, y: 12 },
  right: { x: 8.75, y: 12 },
  top: { x: 12, y: 14.6 },
  bottom: { x: 12, y: 9.4 },
}
const panelOpeningDirection = {
  left: "right",
  right: "left",
  top: "down",
  bottom: "up",
}
const opposite = {
  left: "right",
  right: "left",
  up: "down",
  down: "up",
} as const

function drawPanelGlyph(name: string, drawMark: DrawMark) {
  const match = /^panel-(left|right|top|bottom)(?:-(open|close|dashed))?$/.exec(
    name
  )
  const side = match?.[1]
  if (
    side !== "left" &&
    side !== "right" &&
    side !== "top" &&
    side !== "bottom"
  )
    return
  const state = match?.[2]
  const opening = panelOpeningDirection[side]
  const direction =
    state === "close" &&
    (opening === "left" ||
      opening === "right" ||
      opening === "up" ||
      opening === "down")
      ? opposite[opening]
      : opening
  if (state === "dashed") {
    const dashes = {
      left: "M8.75 6v1.5m0 3.75v1.5m0 3.75V18",
      right: "M15.25 6v1.5m0 3.75v1.5m0 3.75V18",
      top: "M4.75 9h1.5m5 0h1.5m5 0h1.5",
      bottom: "M4.75 15h1.5m5 0h1.5m5 0h1.5",
    }
    return drawPaths([panelFrame, dashes[side]])
  }
  const mark = state ? drawMark(`chevron-${direction}`) : undefined
  return [
    ...drawPaths([panelFrame, panelDividers[side]]),
    ...(mark ? drawInSlot(mark, { ...panelCenters[side], span: 5.5 }) : []),
  ]
}

const bars = {
  bar: [8.25, 15.25, 11.75],
  increasing: [6.75, 11.25, 16.25],
  decreasing: [16.25, 11.25, 6.75],
  big: [13, 18.25, 10],
  stacked: [12, 16, 9.5],
}

function drawChartGlyph(name: string) {
  const match =
    /^chart-(no-axes-)?(bar|column)(?:-(increasing|decreasing|big|stacked))?$/.exec(
      name
    )
  if (!match) return
  const hasAxes = !match[1]
  const horizontal = match[2] === "bar"
  const style = match[3]
  const heights =
    style === "increasing" ||
    style === "decreasing" ||
    style === "big" ||
    style === "stacked"
      ? bars[style]
      : bars.bar
  const bottom = hasAxes ? 17.75 : 21
  const shapes = heights.flatMap((height, index) => {
    const left = (hasAxes ? 6.5 : 3.25) + (hasAxes ? 5.2 : 6.5) * index
    const right = left + (hasAxes ? 2.6 : 4)
    const top = Math.max(2.5, bottom - height)
    const bar = drawRoundedBox([left, top, right, bottom], 0.85)
    return style === "stacked"
      ? [
          bar,
          `M${gridNumber(left)} ${gridNumber(bottom - (bottom - top) * 0.47)}H${gridNumber(right)}`,
        ]
      : [bar]
  })
  if (hasAxes) shapes.unshift("M3 3.25v14.5c0 2.15 1.1 3.25 3.25 3.25h14.5")
  return drawPaths(
    horizontal
      ? shapes.map((shape) =>
          svgpath(shape)
            .matrix([0, -1, -1, 0, 24, 24])
            .rel()
            .round(3)
            .toString()
        )
      : shapes
  )
}

export function drawFamilyGlyph(name: string, drawMark: DrawMark) {
  return (
    drawEnclosedGlyph(name, drawMark) ??
    drawPanelGlyph(name, drawMark) ??
    drawChartGlyph(name)
  )
}
