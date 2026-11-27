"use client"

// Blueprint: wraps a component and sketches it into place. It measures what
// it wraps (the frame, boxes, text lines, small icons), draws a construction
// overlay from that (dot field, guides, a dotted outline with a size and a
// clock, each part traced under a reticle) and fades the real content in as
// the drawing clears. The timeline is blueprint-model; every time is a
// multiple of the reveal motion role, so `data-motion` and `--motion-scale`
// retime it. Reduce Motion skips the drawing and keeps a plain fade.
//
// Wrap one component, or put several in a BlueprintGroup to play them in
// turn. With `loading`, the sketch draws and then waits, scanning, until the
// content is ready, so it doubles as a loading state.
//
// The overlay sits under the content, so the content covers the drawing as
// it fades in. It is decoration and hidden from assistive technology; the
// content stays in the document the whole time.
import * as React from "react"
import { cn } from "cn"

import {
  BLUEPRINT_GEOMETRY,
  BLUEPRINT_HOLD,
  BLUEPRINT_STAGGER,
  formatBlueprintClock,
  formatBlueprintPoint,
  formatBlueprintSize,
  getBlueprintDuration,
  getBlueprintFrame,
  getBlueprintLength,
  getBracketPath,
  getCorners,
  getDottedDashArray,
  getFieldDotIntensity,
  getFieldDots,
  getFlyers,
  getFlyerState,
  getFrameGuides,
  getHoldReticle,
  getHoldScan,
  getKeyState,
  getLinePath,
  getOutlineHalfPaths,
  getOverlayInsets,
  getPartWindows,
  getPenDistance,
  getReticle,
  getRoundedRectPath,
  getStrokeProgress,
  mix,
  selectBlueprintParts,
  type BlueprintFrame,
  type BlueprintPartInput,
  type BlueprintRect,
} from "@/registry/bases/__base__/lib/blueprint-model"

type BlueprintTrigger = "mount" | "view"

type BlueprintState = "idle" | "playing" | "done"

const SVG_NS = "http://www.w3.org/2000/svg"
const SKIP = "script, style, template, [data-blueprint-skip]"
const ICON_SHAPES = "path, circle, ellipse, rect, line, polyline, polygon"
const ICON_MAX_SIZE = 120
const MAX_PARTS = 40
const KEY_COUNT = 4
/** The most one frame may move the sketch on, in ms: about four frames. */
const MAX_FRAME_STEP = 64

type MeasuredPart = BlueprintPartInput & {
  lines?: BlueprintRect[]
  shapes?: { element: SVGGraphicsElement; matrix: DOMMatrix }[]
}

type OverlayInsets = ReturnType<typeof getOverlayInsets>

type Measurement = {
  width: number
  height: number
  radius: number
  parts: MeasuredPart[]
}

function toViewportRect(rect: DOMRect): BlueprintRect {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

function isMotionReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function getAlpha(color: string) {
  const channels = color.match(/rgba?\(([^)]+)\)/)
  if (!channels) return color && color !== "transparent" ? 1 : 0
  const values = channels[1].split(/[ ,/]+/).filter(Boolean)
  return values.length > 3 ? Number(values[3]) : 1
}

function isHidden(element: Element, root: Element) {
  for (
    let node: Element | null = element;
    node && node !== root;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node)
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) < 0.05
    ) {
      return true
    }
  }
  return false
}

function getPartName(element: Element) {
  const role = element.getAttribute("role") ?? ""
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)) return "INPUT"
  if (element.tagName === "BUTTON" || role === "button") return "BUTTON"
  if (/^(IMG|CANVAS|VIDEO|PICTURE)$/.test(element.tagName)) return "IMAGE"
  return "FRAME"
}

/** Reads the parts worth drawing from the rendered content, relative to it. */
function measureContent(root: HTMLElement): Measurement {
  const origin = root.getBoundingClientRect()
  const area = origin.width * origin.height
  const parts: MeasuredPart[] = []
  const toRect = (rect: DOMRect): BlueprintRect => ({
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  })
  let radius = parseFloat(getComputedStyle(root).borderTopLeftRadius) || 0

  const walk = (parent: Element) => {
    for (const element of parent.children) {
      if (element.matches(SKIP) || isHidden(element, root)) continue
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      if (!box.width || !box.height) {
        walk(element)
        continue
      }
      const isFullSize =
        Math.abs(box.width - origin.width) < 2 &&
        Math.abs(box.height - origin.height) < 2
      if (isFullSize) {
        radius = Math.max(radius, parseFloat(style.borderTopLeftRadius) || 0)
      }
      if (element instanceof SVGSVGElement) {
        if (box.width <= ICON_MAX_SIZE && box.height <= ICON_MAX_SIZE) {
          const shapes = Array.from(
            element.querySelectorAll<SVGGraphicsElement>(ICON_SHAPES)
          ).flatMap((shape) => {
            if (shape.closest("defs, clipPath, mask, symbol")) return []
            const matrix = shape.getScreenCTM()
            if (!matrix) return []
            return [
              {
                element: shape,
                matrix: new DOMMatrix([
                  matrix.a,
                  matrix.b,
                  matrix.c,
                  matrix.d,
                  matrix.e - origin.left,
                  matrix.f - origin.top,
                ]),
              },
            ]
          })
          if (shapes.length) {
            parts.push({ kind: "icon", name: "SVG", rect: toRect(box), shapes })
          }
        }
        continue
      }
      const isBackdrop = box.width * box.height > area * 0.8
      const isDrawn =
        getAlpha(style.backgroundColor) > 0.02 ||
        parseFloat(style.borderTopWidth) > 0 ||
        style.backgroundImage !== "none" ||
        /^(IMG|CANVAS|VIDEO|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(
          element.tagName
        )
      if (!isBackdrop && isDrawn) {
        parts.push({
          kind: "box",
          name: getPartName(element),
          rect: toRect(box),
          radius: Math.min(
            parseFloat(style.borderTopLeftRadius) || 0,
            box.width / 2,
            box.height / 2
          ),
          isInteractive:
            /^(BUTTON|INPUT|A|SELECT|TEXTAREA)$/.test(element.tagName) ||
            /button|tab|switch|checkbox|slider/.test(
              element.getAttribute("role") ?? ""
            ),
        })
      }
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue?.trim()) {
          continue
        }
        const range = document.createRange()
        range.selectNodeContents(node)
        const lines: BlueprintRect[] = []
        for (const rect of range.getClientRects()) {
          const line = toRect(rect)
          const last = lines.at(-1)
          if (last && Math.abs(last.y - line.y) < 2) {
            last.width =
              Math.max(last.x + last.width, line.x + line.width) - last.x
          } else {
            lines.push(line)
          }
        }
        if (!lines.length) continue
        const left = Math.min(...lines.map((line) => line.x))
        parts.push({
          kind: "text",
          name: "TEXT",
          rect: {
            x: left,
            y: lines[0].y,
            width: Math.max(...lines.map((line) => line.x + line.width)) - left,
            height: lines.reduce((total, line) => total + line.height, 0),
          },
          lines,
        })
      }
      walk(element)
    }
  }
  walk(root)
  return {
    width: origin.width,
    height: origin.height,
    radius: Math.min(radius, origin.width / 2, origin.height / 2),
    parts,
  }
}

function createElement<Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attributes: Record<string, string | number>,
  parent: Element
) {
  const element = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }
  parent.appendChild(element)
  return element
}

// Writes an attribute or text only when it changes: every write restyles.
function setAttribute(element: Element, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function setStyle(
  element: HTMLElement | SVGElement,
  name: "opacity" | "filter",
  value: string
) {
  if (element.style[name] !== value) element.style[name] = value
}

// Labels change every frame. Replacing their text node would be a DOM
// insert, which pages with `:has()` rules answer by restyling everything, so
// the existing node's data changes instead.
function setText(element: Element, value: string) {
  const node = element.firstChild
  if (node instanceof Text) {
    if (node.data !== value) node.data = value
    return
  }
  element.textContent = value
}

type Stroke = {
  element: SVGGeometryElement
  length: number
  gap: number
  /** The drawing scale of an icon's stroke, 1 elsewhere. */
  scale: number
  /** Strokes with the same order draw together. */
  order: number
  head?: SVGCircleElement
  caps?: [SVGCircleElement, SVGCircleElement]
  isIcon: boolean
  /** Where each dot of the stroke sits, read once while building. */
  points: DOMPoint[]
  pen: DOMPoint | null
}

// Reading a path's geometry mid-frame would force a restyle after each
// write, so every dot position is read once, up front.
function samplePoints(
  element: SVGGeometryElement,
  length: number,
  gap: number
) {
  const count = Math.floor(length / gap) + 1
  return Array.from({ length: count }, (_, index) =>
    element.getPointAtLength(Math.min(length, index * gap))
  )
}

function createStroke(
  path: string,
  parent: Element,
  slot: string,
  gap: number,
  order = 0
): Stroke {
  const element = createElement(
    "path",
    { d: path, "data-slot": slot, opacity: 0 },
    parent
  )
  return {
    element,
    length: 0,
    gap,
    scale: 1,
    order,
    isIcon: false,
    points: [],
    pen: null,
  }
}

// Geometry is read once the whole drawing is in the page: reading it while
// building, between inserts, would restyle the page for every stroke.
function measureStroke(stroke: Stroke) {
  stroke.length = stroke.element.getTotalLength()
  stroke.points = samplePoints(
    stroke.element,
    stroke.length,
    stroke.gap / stroke.scale
  )
}

function drawStroke(stroke: Stroke, progress: number) {
  const gap = stroke.gap / stroke.scale
  const isDrawn = progress > 0
  setAttribute(stroke.element, "opacity", isDrawn ? "1" : "0")
  if (isDrawn) {
    const dashes = getDottedDashArray(stroke.length, gap, progress)
    if (dashes) setAttribute(stroke.element, "stroke-dasharray", dashes)
  }
  const isLive = progress > 0 && progress < 1
  const dot = Math.round(getPenDistance(stroke.length, gap, progress) / gap)
  stroke.pen = isLive
    ? stroke.points[Math.min(dot, stroke.points.length - 1)]
    : null
  if (stroke.head) {
    setAttribute(stroke.head, "opacity", isLive ? "1" : "0")
    if (stroke.pen) {
      setAttribute(stroke.head, "cx", stroke.pen.x.toFixed(2))
      setAttribute(stroke.head, "cy", stroke.pen.y.toFixed(2))
    }
  }
  if (stroke.caps) {
    setAttribute(stroke.caps[0], "opacity", isDrawn ? "1" : "0")
    setAttribute(stroke.caps[1], "opacity", progress >= 1 ? "1" : "0")
  }
}

function createHead(parent: Element, radius: number) {
  return createElement(
    "circle",
    { r: radius, "data-slot": "blueprint-head", opacity: 0 },
    parent
  )
}

function createHandle(parent: Element, x: number, y: number, size: number) {
  const element = createElement(
    "rect",
    {
      x: -size / 2,
      y: -size / 2,
      width: size,
      height: size,
      "data-slot": "blueprint-handle",
      transform: `translate(${x} ${y}) scale(0)`,
    },
    parent
  )
  return { element, x, y }
}

function scaleHandle(
  handle: { element: SVGRectElement; x: number; y: number },
  scale: number
) {
  setAttribute(
    handle.element,
    "transform",
    `translate(${handle.x.toFixed(2)} ${handle.y.toFixed(2)}) scale(${scale.toFixed(2)})`
  )
}

type DrawFrame = (frame: BlueprintFrame, holdElapsed: number | null) => void

/**
 * Builds the overlay for one measurement: every write, then a read phase
 * that takes the geometry it needs and returns the per-frame draw.
 */
function buildDrawing(
  overlay: HTMLDivElement,
  measurement: Measurement,
  insets: OverlayInsets,
  seed: number
) {
  const { width, height, radius } = measurement
  const { margin, fieldSpacing, strokeGap, guideGap, keyOvershoot } =
    BLUEPRINT_GEOMETRY
  const frameRect = { x: 0, y: 0, width, height }
  const { left, top, right, bottom } = insets
  const boxWidth = width + left + right
  const boxHeight = height + top + bottom
  Object.assign(overlay.style, {
    left: `${-left}px`,
    top: `${-top}px`,
    width: `${boxWidth}px`,
    height: `${boxHeight}px`,
  })
  // The dot field and the flyers are hundreds of marks that change every
  // frame, so they paint on one canvas; strokes and labels stay SVG.
  const canvas = document.createElement("canvas")
  canvas.setAttribute("data-slot", "blueprint-field")
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(boxWidth * ratio)
  canvas.height = Math.round(boxHeight * ratio)
  // Everything is built into a detached SVG and inserted once.
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", `${-left} ${-top} ${boxWidth} ${boxHeight}`)
  const fieldDots = getFieldDots(width, height, {
    margin,
    spacing: fieldSpacing,
    seed,
  })
  const { maxDistance } = fieldDots
  // Dots past a cut-back side would never show, so they aren't drawn.
  const dots = fieldDots.dots.filter(
    (dot) =>
      dot.x >= -left &&
      dot.x <= width + right &&
      dot.y >= -top &&
      dot.y <= height + bottom
  )

  const probe = createElement(
    "path",
    {
      d: `M0 ${-margin}V${height + margin}`,
      "data-slot": "blueprint-probe",
      opacity: 0,
    },
    svg
  )
  const guides = getFrameGuides(frameRect, margin).map((path) =>
    createStroke(path, svg, "blueprint-guide", guideGap)
  )
  const dimension = createElement(
    "text",
    { x: 0, y: -10, "data-slot": "blueprint-label", opacity: 0 },
    svg
  )

  const wire = createElement("g", { "data-slot": "blueprint-wire-group" }, svg)
  const outline = getOutlineHalfPaths(frameRect, radius).map((path) => {
    const stroke = createStroke(path, wire, "blueprint-wire", strokeGap)
    stroke.head = createHead(wire, 2.8)
    return stroke
  })

  const parts = selectBlueprintParts(measurement.parts, {
    maxParts: MAX_PARTS,
    keyCount: KEY_COUNT,
  })
  const windows = getPartWindows(parts.length)
  const partStrokes = parts.map((part) => {
    const strokes: Stroke[] = []
    if (part.kind === "box" && part.isKey) {
      for (const path of getOutlineHalfPaths(part.rect, part.radius ?? 0)) {
        strokes.push(createStroke(path, wire, "blueprint-wire", strokeGap))
      }
    } else if (part.kind === "box") {
      strokes.push(
        createStroke(
          getRoundedRectPath(part.rect, part.radius ?? 0),
          wire,
          "blueprint-wire",
          strokeGap
        )
      )
    }
    for (const [index, line] of (part.lines ?? []).entries()) {
      const y = line.y + line.height * 0.56
      const stroke = createStroke(
        getLinePath(line.x, y, line.x + line.width, y),
        wire,
        "blueprint-wire",
        strokeGap,
        index
      )
      stroke.caps = [
        createElement(
          "circle",
          {
            cx: line.x,
            cy: y,
            r: 1.7,
            opacity: 0,
            "data-slot": "blueprint-head",
          },
          wire
        ),
        createElement(
          "circle",
          {
            cx: line.x + line.width,
            cy: y,
            r: 1.7,
            opacity: 0,
            "data-slot": "blueprint-head",
          },
          wire
        ),
      ]
      strokes.push(stroke)
    }
    for (const [index, shape] of (part.shapes ?? []).entries()) {
      const { a, b, c, d, e, f } = shape.matrix
      const scale = Math.sqrt(Math.abs(a * d - b * c)) || 1
      const group = createElement(
        "g",
        {
          transform: `matrix(${[a, b, c, d, e, f].map((value) => value.toFixed(3)).join(" ")})`,
        },
        wire
      )
      group.style.setProperty("--blueprint-scale", String(scale))
      const element = shape.element.cloneNode(false) as SVGGeometryElement
      for (const name of [
        "class",
        "style",
        "fill",
        "stroke",
        "stroke-width",
        "opacity",
      ]) {
        element.removeAttribute(name)
      }
      element.setAttribute("data-slot", "blueprint-wire")
      element.setAttribute("opacity", "0")
      group.appendChild(element)
      strokes.push({
        element,
        length: 0,
        gap: 3.6,
        scale,
        order: index,
        head: createHead(group, 2.4 / scale),
        isIcon: true,
        points: [],
        pen: null,
      })
    }
    for (const stroke of strokes) {
      if (!stroke.head && !stroke.caps) stroke.head = createHead(wire, 2.4)
    }
    return strokes
  })

  const keys = parts.flatMap((part, index) => {
    if (!part.isKey) return []
    return [
      {
        part,
        window: windows[index],
        guides: getFrameGuides(part.rect, keyOvershoot).map((path) =>
          createStroke(path, svg, "blueprint-guide", guideGap)
        ),
        handles: getCorners(part.rect).map(([x, y]) =>
          createHandle(svg, x, y, 4)
        ),
        label: createElement(
          "text",
          {
            x: (part.rect.x + part.rect.width).toFixed(2),
            y: (part.rect.y + part.rect.height + 10).toFixed(2),
            "text-anchor": "end",
            "data-slot": "blueprint-label",
            "data-size": "sm",
            opacity: 0,
          },
          svg
        ),
      },
    ]
  })

  const reticle = createElement(
    "path",
    { "data-slot": "blueprint-reticle", opacity: 0 },
    svg
  )
  const tag = createElement(
    "text",
    { "data-slot": "blueprint-label", "data-size": "sm", opacity: 0 },
    svg
  )
  const handles = getCorners(frameRect).map(([x, y]) =>
    createHandle(svg, x, y, 5)
  )
  const readout = createElement(
    "text",
    { "data-slot": "blueprint-label", "data-size": "sm", opacity: 0 },
    svg
  )
  const span = height + 2 * margin

  overlay.replaceChildren(canvas, svg)
  return (): DrawFrame => {
    for (const stroke of [
      ...guides,
      ...outline,
      ...partStrokes.flat(),
      ...keys.flatMap((key) => key.guides),
    ]) {
      measureStroke(stroke)
    }
    const flyers = getFlyers(seed).map((flyer) => {
      const half = outline[flyer.half]
      const target = half.element.getPointAtLength(half.length * flyer.along)
      return {
        flyer,
        from: {
          x: target.x + Math.cos(flyer.angle) * flyer.distance,
          y: target.y + Math.sin(flyer.angle) * flyer.distance,
        },
        to: target,
      }
    })
    const context = canvas.getContext("2d")
    const canvasStyle = getComputedStyle(canvas)
    const inkColor = canvasStyle.color
    const penColor = canvasStyle.fill
    context?.setTransform(ratio, 0, 0, ratio, left * ratio, top * ratio)

    // `holdElapsed` is how long it has waited for the content, null when it
    // isn't waiting: the probe then sweeps on a loop and the reticle hops.
    return (frame, holdElapsed) => {
      const { e, elapsed, duration } = frame
      const scan =
        holdElapsed === null
          ? frame
          : { ...frame, ...getHoldScan(holdElapsed, duration) }
      const probeX = mix(-margin, width + margin, scan.probe)
      setAttribute(probe, "transform", `translate(${probeX.toFixed(2)} 0)`)
      setAttribute(probe, "opacity", scan.probeOpacity.toFixed(2))

      const current =
        holdElapsed === null
          ? getReticle(parts, windows, frameRect, e)
          : getHoldReticle(parts, holdElapsed, duration)
      context?.clearRect(-left, -top, boxWidth, boxHeight)
      for (const dot of dots) {
        const light = getFieldDotIntensity(dot, scan, {
          elapsed,
          span,
          margin,
          maxDistance,
          probeX,
          reticle: current?.rect,
          reticleOpacity: current?.opacity,
        })
        if (!context || light.opacity < 0.01) continue
        context.globalAlpha = light.opacity
        context.fillStyle = light.isLit ? penColor : inkColor
        context.beginPath()
        context.arc(dot.x, dot.y, light.radius, 0, Math.PI * 2)
        context.fill()
      }

      for (const [index, guide] of guides.entries()) {
        drawStroke(guide, frame.guides[index])
        setStyle(
          guide.element,
          "opacity",
          frame.guides[index] > 0 ? frame.guideOpacity.toFixed(2) : "0"
        )
      }

      setText(
        dimension,
        `${formatBlueprintSize(width * frame.outline, height * frame.outline)} ${formatBlueprintClock(elapsed)}`
      )
      setAttribute(dimension, "opacity", frame.dimOpacity.toFixed(2))
      for (const stroke of outline) drawStroke(stroke, frame.outline)
      for (const [index, handle] of handles.entries()) {
        scaleHandle(handle, frame.handleScales[index])
      }

      for (const { flyer, from, to } of flyers) {
        const state = getFlyerState(flyer, e)
        if (!context || state.opacity < 0.01) continue
        context.globalAlpha = state.opacity * frame.overlayOpacity
        context.fillStyle = inkColor
        context.beginPath()
        context.arc(
          mix(from.x, to.x, state.travel),
          mix(from.y, to.y, state.travel),
          1.6,
          0,
          Math.PI * 2
        )
        context.fill()
      }

      for (const [index, strokes] of partStrokes.entries()) {
        const count = Math.max(...strokes.map((stroke) => stroke.order)) + 1
        for (const stroke of strokes) {
          drawStroke(
            stroke,
            getStrokeProgress(windows[index], e, stroke.order, count)
          )
        }
      }

      for (const key of keys) {
        const state = getKeyState(key.window, e)
        for (const [index, guide] of key.guides.entries()) {
          drawStroke(guide, state.guides[index])
          setStyle(
            guide.element,
            "opacity",
            state.guides[index] > 0 ? (0.5 * frame.keyFade).toFixed(2) : "0"
          )
        }
        for (const handle of key.handles) {
          scaleHandle(handle, state.handleScale * frame.keyFade)
        }
        setAttribute(
          key.label,
          "opacity",
          state.isShown ? (0.9 * frame.keyFade).toFixed(2) : "0"
        )
        setText(
          key.label,
          formatBlueprintSize(
            key.part.rect.width * state.size,
            key.part.rect.height * state.size
          )
        )
      }

      const reticleOpacity = current ? current.opacity.toFixed(2) : "0"
      setAttribute(reticle, "opacity", reticleOpacity)
      setAttribute(tag, "opacity", reticleOpacity)
      if (current) {
        const part = parts[current.index]
        setAttribute(reticle, "d", getBracketPath(current.rect))
        setAttribute(tag, "x", current.rect.x.toFixed(2))
        setAttribute(tag, "y", (current.rect.y - 4).toFixed(2))
        setText(
          tag,
          `${part.name} ${Math.round(part.rect.width)}×${Math.round(part.rect.height)}`
        )
      }

      const pen = [...outline, ...partStrokes.flat()].findLast(
        (stroke) => stroke.pen && !stroke.isIcon
      )?.pen
      setAttribute(readout, "opacity", pen ? "1" : "0")
      if (pen) {
        setAttribute(readout, "x", (pen.x + 6).toFixed(2))
        setAttribute(readout, "y", (pen.y - 5).toFixed(2))
        setText(readout, formatBlueprintPoint(pen.x, pen.y))
      }

      setAttribute(wire, "opacity", frame.wireOpacity.toFixed(2))
      setStyle(overlay, "opacity", frame.overlayOpacity.toFixed(2))
    }
  }
}

let nextSeed = 1

// Drawings that start together build together: every write first, then every
// read, so the page restyles once for all of them instead of once each.
const pendingBuilds = new Set<() => () => void>()

function flushBuilds() {
  const builds = [...pendingBuilds]
  pendingBuilds.clear()
  const reads = builds.map((build) => build())
  for (const read of reads) read()
}

function scheduleBuild(build: () => () => void) {
  if (!pendingBuilds.size) requestAnimationFrame(flushBuilds)
  pendingBuilds.add(build)
  return () => {
    pendingBuilds.delete(build)
  }
}

/**
 * The scroll area around the element, in viewport px. The drawing reaches
 * past the element only as far as this, so it never adds a scrollbar.
 */
function getScrollBounds(element: HTMLElement): BlueprintRect {
  for (
    let node = element.parentElement;
    node && node !== document.body && node !== document.documentElement;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node)
    if (
      /auto|scroll|hidden|clip/.test(`${style.overflowX} ${style.overflowY}`)
    ) {
      const rect = node.getBoundingClientRect()
      return {
        x: rect.left + node.clientLeft - node.scrollLeft,
        y: rect.top + node.clientTop - node.scrollTop,
        width: Math.max(node.clientWidth, node.scrollWidth),
        height: Math.max(node.clientHeight, node.scrollHeight),
      }
    }
  }
  const root = document.documentElement
  return {
    x: -window.scrollX,
    y: -window.scrollY,
    width: root.clientWidth,
    height: Math.max(root.clientHeight, root.scrollHeight),
  }
}

/** Its place in the group around it, in document order; 0 alone. */
function getGroupOrder(element: HTMLElement) {
  const group = element.parentElement?.closest('[data-slot="blueprint-group"]')
  if (!group) return 0
  return Array.from(group.querySelectorAll('[data-slot="blueprint"]')).indexOf(
    element
  )
}

function useTrigger(
  ref: React.RefObject<HTMLElement | null>,
  trigger: BlueprintTrigger | null,
  onStart: () => void
) {
  React.useEffect(() => {
    const element = ref.current
    if (!element || !trigger) return
    if (trigger === "mount") {
      onStart()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        onStart()
      },
      // Any height plays, even one taller than the screen, once it is a
      // little way in, as Text Motion does.
      { rootMargin: "0px 0px -10% 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, trigger, onStart])
}

const BlueprintGroupContext = React.createContext<{
  isPlaying: boolean
} | null>(null)

function BlueprintGroup({
  trigger = "view",
  className,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  /** When the set plays: once in view, or as soon as it's on the page. */
  trigger?: BlueprintTrigger
}) {
  const innerRef = React.useRef<HTMLDivElement>(null)
  React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const start = React.useCallback(() => setIsPlaying(true), [])
  useTrigger(innerRef, trigger, start)
  const value = React.useMemo(() => ({ isPlaying }), [isPlaying])
  return (
    <BlueprintGroupContext.Provider value={value}>
      <div
        ref={innerRef}
        data-slot="blueprint-group"
        data-state={isPlaying ? "playing" : "idle"}
        className={className}
        {...props}
      />
    </BlueprintGroupContext.Provider>
  )
}

function Blueprint({
  trigger = "view",
  order,
  loading = false,
  onComplete,
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  /** When it plays: once in view, or as soon as it's on the page. Inside a BlueprintGroup, the group's trigger applies. */
  trigger?: BlueprintTrigger
  /** Its place in a set that plays in turn: each starts a beat after the last. Inside a BlueprintGroup, its position in the group. */
  order?: number
  /** Holds the finished sketch, scanning, until the content is ready, then reveals it. */
  loading?: boolean
  /** Called once the content stands alone. */
  onComplete?: () => void
}) {
  const group = React.useContext(BlueprintGroupContext)
  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const [state, setState] = React.useState<BlueprintState>("idle")
  const onCompleteRef = React.useRef(onComplete)
  const loadingRef = React.useRef(loading)
  React.useEffect(() => {
    onCompleteRef.current = onComplete
    loadingRef.current = loading
  })

  const start = React.useCallback(
    () => setState((current) => (current === "idle" ? "playing" : current)),
    []
  )
  useTrigger(rootRef, group ? null : trigger, start)
  const isGroupPlaying = group?.isPlaying ?? false
  React.useEffect(() => {
    if (isGroupPlaying) start()
  }, [isGroupPlaying, start])

  React.useLayoutEffect(() => {
    const root = rootRef.current
    const content = contentRef.current
    const overlay = overlayRef.current
    if (state !== "playing" || !root || !content || !overlay) return
    const style = getComputedStyle(root)
    const duration = getBlueprintDuration(
      style.getPropertyValue("--motion-reveal"),
      style.getPropertyValue("--motion-scale")
    )
    const finish = () => {
      setState("done")
      onCompleteRef.current?.()
    }
    if (!duration || isMotionReduced()) {
      finish()
      return
    }
    const measurement = measureContent(content)
    const insets = getOverlayInsets(
      toViewportRect(content.getBoundingClientRect()),
      getScrollBounds(root),
      BLUEPRINT_GEOMETRY.margin
    )
    const seed = nextSeed++
    const delay = (order ?? getGroupOrder(root)) * BLUEPRINT_STAGGER * duration
    const holdAt = BLUEPRINT_HOLD * duration
    const length = getBlueprintLength(duration)
    // The sketch keeps its own clock, from its first frame rather than now:
    // building the drawings that mount together can hold the page for a
    // moment, and that wait must not use up the sketch. A long frame moves
    // the clock on at most MAX_FRAME_STEP, so it slows the sketch down
    // instead of skipping part of it, and the stagger survives.
    let clock: number | null = null
    let last = 0
    // Where the sketch is (stopping at the hold while loading) and how long
    // it has waited there; the clock and the field keep running.
    let timeline = 0
    let holdElapsed: number | null = null
    let request = 0
    const play = (draw: DrawFrame) => {
      const tick = (now: number) => {
        const frameStep =
          clock === null ? 0 : Math.min(MAX_FRAME_STEP, now - last)
        last = now
        clock = (clock ?? 0) + frameStep
        const step = Math.max(0, Math.min(frameStep, clock - delay))
        if (loadingRef.current && timeline + step >= holdAt) {
          holdElapsed =
            (holdElapsed ?? 0) + step - Math.max(0, holdAt - timeline)
          timeline = holdAt
        } else {
          timeline += step
          holdElapsed = null
        }
        const frame = getBlueprintFrame(
          timeline / duration,
          Math.max(0, clock - delay),
          duration
        )
        draw(frame, holdElapsed)
        setStyle(content, "opacity", frame.contentOpacity.toFixed(2))
        setStyle(
          content,
          "filter",
          frame.contentBlur ? `blur(${frame.contentBlur.toFixed(2)}px)` : ""
        )
        if (timeline >= length) {
          finish()
          return
        }
        request = requestAnimationFrame(tick)
      }
      request = requestAnimationFrame(tick)
    }
    // Measured now, with every Blueprint that starts in this commit, and
    // built on the next frame together with them.
    const cancelBuild = scheduleBuild(() => {
      const read = buildDrawing(overlay, measurement, insets, seed)
      return () => play(read())
    })
    return () => {
      cancelBuild()
      cancelAnimationFrame(request)
      content.style.opacity = ""
      content.style.filter = ""
    }
  }, [state, order])

  return (
    <div
      ref={rootRef}
      data-slot="blueprint"
      data-state={state}
      aria-busy={loading && state !== "done" ? true : undefined}
      className={cn("cn-blueprint relative", className)}
      {...props}
    >
      {state !== "done" && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          data-slot="blueprint-overlay"
          className="cn-blueprint-overlay pointer-events-none absolute *:absolute *:inset-0 *:size-full *:overflow-visible"
        />
      )}
      <div
        ref={contentRef}
        data-slot="blueprint-content"
        data-state={state}
        className="cn-blueprint-content relative"
      >
        {children}
      </div>
    </div>
  )
}

export { Blueprint, BlueprintGroup, type BlueprintTrigger }
