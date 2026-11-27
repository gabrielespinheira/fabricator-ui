// Blueprint: the timeline and geometry of a component being sketched into
// place. A dot field ripples out, a probe sweeps across, guides and a dotted
// outline draw the frame while a readout tracks the pen, then each part
// (boxes, text lines, icons) is traced under a reticle before the real
// content fades in over the drawing, through a blur, and the rest clears.
//
// Progress `e` runs from 0 to BLUEPRINT_END in fractions of one duration, a
// multiple of the reveal motion role, so a project's speed, `data-motion`
// and `--motion-scale` retime it. While the content is still loading, the
// timeline waits at BLUEPRINT_HOLD: the drawing stays up, a probe keeps
// sweeping and the reticle hops between parts until it may reveal. Pure: no
// DOM, so a native port shares it.

export type BlueprintRect = {
  x: number
  y: number
  width: number
  height: number
}

type PhaseWindow = readonly [start: number, end: number]

/** When each layer of the drawing plays, in fractions of the duration. */
export const BLUEPRINT_PHASES = {
  field: [0, 0.3],
  probe: [0.02, 0.24],
  guides: [0.04, 0.3],
  outline: [0.1, 0.42],
  parts: [0.28, 0.74],
  content: [0.74, 1.037],
  wire: [0.74, 1.037],
  clean: [0.84, 1.04],
} as const satisfies Record<string, PhaseWindow>

/** Where the drawing is gone and the content stands alone. */
export const BLUEPRINT_END = 1.09

/** Where the timeline waits while the content loads: every part drawn, nothing revealed. */
export const BLUEPRINT_HOLD = 0.7

/** While waiting, one probe sweep and one reticle hop, in fractions of the duration. */
const HOLD_SWEEP = 0.6
const HOLD_HOP = 0.35

/** One sketch lasts this many reveals: about 1.6s at the default speed. */
export const BLUEPRINT_DURATION_FACTOR = 2.3

/** How much later each member of a set starts, in fractions of the duration. */
export const BLUEPRINT_STAGGER = 0.07

/** The drawing's geometry, in px around and inside the element. */
export const BLUEPRINT_GEOMETRY = {
  margin: 44,
  fieldSpacing: 15,
  strokeGap: 4.8,
  guideGap: 6.5,
  keyOvershoot: 16,
  reticlePadding: 5,
  contentBlur: 3,
} as const

/** The corners' handles, clockwise from the top left, and when each pops. */
const HANDLE_STARTS = [0.17, 0.17, 0.37, 0.37] as const

const FLYER_COUNT = 44

export function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

export function smoothstep(start: number, end: number, value: number) {
  const amount = clamp((value - start) / (end - start))
  return amount * amount * (3 - 2 * amount)
}

export function getPhaseProgress(window: PhaseWindow, e: number) {
  return clamp((e - window[0]) / (window[1] - window[0]))
}

/** A CSS cubic-bezier as a function of time, solved by bisection. */
export function createCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const curve = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (time: number) => {
    if (time <= 0) return 0
    if (time >= 1) return 1
    let low = 0
    let high = 1
    let t = 0.5
    for (let step = 0; step < 28; step++) {
      t = (low + high) / 2
      if (curve(x1, x2, t) < time) low = t
      else high = t
    }
    return curve(y1, y2, t)
  }
}

/** The pen: the enter curve, fast out and long settle. */
export const easeDraw = createCubicBezier(0.16, 1, 0.3, 1)
/** The content's fade: a softer enter curve. */
export const easeReveal = createCubicBezier(0.22, 1, 0.36, 1)

function invertEaseDraw(value: number) {
  let low = 0
  let high = 1
  for (let step = 0; step < 26; step++) {
    const middle = (low + high) / 2
    if (easeDraw(middle) < value) low = middle
    else high = middle
  }
  return low
}

/** One sketch's length in ms from the reveal role and the motion scale. */
export function getBlueprintDuration(reveal: string, scale: string) {
  const match = reveal.trim().match(/^(-?[\d.]+)(ms|s)$/)
  if (!match) return 0
  const milliseconds = Number(match[1]) * (match[2] === "s" ? 1000 : 1)
  const factor = scale.trim() === "" ? 1 : Number(scale)
  return Math.max(0, milliseconds * factor * BLUEPRINT_DURATION_FACTOR)
}

/** How long the whole sketch runs, cleanup included, in ms. */
export function getBlueprintLength(duration: number) {
  return duration * BLUEPRINT_END
}

/** A seeded noise in [0, 1): the same seed draws the same sketch. */
export function getNoise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const formatNumber = (value: number) => value.toFixed(2)

export function getRoundedRectPath(rect: BlueprintRect, radius: number) {
  const { x, y, width, height } = rect
  const r = formatNumber(Math.max(0, Math.min(radius, width / 2, height / 2)))
  const corner = Number(r)
  const n = formatNumber
  return (
    `M${n(x + corner)} ${n(y)}H${n(x + width - corner)}` +
    `A${r} ${r} 0 0 1 ${n(x + width)} ${n(y + corner)}V${n(y + height - corner)}` +
    `A${r} ${r} 0 0 1 ${n(x + width - corner)} ${n(y + height)}H${n(x + corner)}` +
    `A${r} ${r} 0 0 1 ${n(x)} ${n(y + height - corner)}V${n(y + corner)}` +
    `A${r} ${r} 0 0 1 ${n(x + corner)} ${n(y)}Z`
  )
}

/**
 * The outline as two halves that start together at the top centre and meet
 * at the bottom centre: the right half clockwise, the left anticlockwise.
 */
export function getOutlineHalfPaths(
  rect: BlueprintRect,
  radius: number
): [right: string, left: string] {
  const { x, y, width, height } = rect
  const corner = Math.max(0, Math.min(radius, width / 2, height / 2))
  const n = formatNumber
  const r = n(corner)
  const top = `M${n(x + width / 2)} ${n(y)}`
  const right =
    `${top}H${n(x + width - corner)}A${r} ${r} 0 0 1 ${n(x + width)} ${n(y + corner)}` +
    `V${n(y + height - corner)}A${r} ${r} 0 0 1 ${n(x + width - corner)} ${n(y + height)}` +
    `H${n(x + width / 2)}`
  const left =
    `${top}H${n(x + corner)}A${r} ${r} 0 0 0 ${n(x)} ${n(y + corner)}` +
    `V${n(y + height - corner)}A${r} ${r} 0 0 0 ${n(x + corner)} ${n(y + height)}` +
    `H${n(x + width / 2)}`
  return [right, left]
}

export function getLinePath(x1: number, y1: number, x2: number, y2: number) {
  const n = formatNumber
  return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`
}

/** Four lines along a rect's sides that run past its corners. */
export function getFrameGuides(rect: BlueprintRect, overshoot: number) {
  const { x, y, width, height } = rect
  return [
    getLinePath(x - overshoot, y, x + width + overshoot, y),
    getLinePath(x + width, y - overshoot, x + width, y + height + overshoot),
    getLinePath(x + width + overshoot, y + height, x - overshoot, y + height),
    getLinePath(x, y + height + overshoot, x, y - overshoot),
  ]
}

/** The four corners of a rect, clockwise from the top left. */
export function getCorners(rect: BlueprintRect) {
  const { x, y, width, height } = rect
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ] as const
}

/** Corner brackets around a rect: the reticle that hops between parts. */
export function getBracketPath(rect: BlueprintRect) {
  const { x, y, width, height } = rect
  const arm = Math.min(7, width / 3, height / 3)
  const n = formatNumber
  return (
    `M${n(x)} ${n(y + arm)}V${n(y)}H${n(x + arm)}` +
    `M${n(x + width - arm)} ${n(y)}H${n(x + width)}V${n(y + arm)}` +
    `M${n(x + width)} ${n(y + height - arm)}V${n(y + height)}H${n(x + width - arm)}` +
    `M${n(x + arm)} ${n(y + height)}H${n(x)}V${n(y + height - arm)}`
  )
}

/**
 * A dotted stroke drawn up to `progress`: one round dot every `gap` along
 * the path, the rest hidden by a final gap longer than the path. Null hides
 * the stroke.
 */
export function getDottedDashArray(
  length: number,
  gap: number,
  progress: number
) {
  if (progress <= 0) return null
  const count = Math.floor((length * Math.min(1, progress)) / gap) + 1
  return `${`0 ${formatNumber(gap).replace(/\.00$/, "")} `.repeat(count - 1)}0 ${formatNumber(length + 10).replace(/\.00$/, "")}`
}

/** How far along the path the pen is: on the last dot drawn. */
export function getPenDistance(length: number, gap: number, progress: number) {
  return Math.floor((length * clamp(progress)) / gap) * gap
}

export type FieldDot = {
  x: number
  y: number
  /** From the element's centre. */
  distance: number
  /** 1 on the element, falling to 0 at the margin's outer edge. */
  edge: number
  isInside: boolean
  /** How fast its light drifts down, in px per ms. */
  speed: number
  phase: number
  /** How long the drifting light's tail is, in px. */
  trail: number
}

export function getFieldDots(
  width: number,
  height: number,
  options: { margin: number; spacing: number; seed: number }
) {
  const { margin, spacing, seed } = options
  const first = -Math.floor(margin / spacing) * spacing
  const dots: FieldDot[] = []
  let maxDistance = 0
  for (let x = first; x <= width + margin; x += spacing) {
    const column = Math.round(x / spacing)
    for (let y = first; y <= height + margin; y += spacing) {
      const outside = Math.max(0, -x, x - width, -y, y - height)
      const distance = Math.hypot(x - width / 2, y - height / 2)
      maxDistance = Math.max(maxDistance, distance)
      dots.push({
        x,
        y,
        distance,
        edge: 1 - clamp(outside / margin),
        isInside: outside === 0,
        speed: 0.07 + 0.09 * getNoise(column * 7.13 + seed * 31.7),
        phase: getNoise(column * 3.71 + seed * 11.3) * 900,
        trail: 50 + 70 * getNoise(column * 1.91 + seed),
      })
    }
  }
  return { dots, maxDistance }
}

export type BlueprintFrame = ReturnType<typeof getBlueprintFrame>

/** Everything about one moment of the sketch that isn't per dot or part. */
export function getBlueprintFrame(
  e: number,
  elapsed: number,
  duration: number
) {
  const probe = getPhaseProgress(BLUEPRINT_PHASES.probe, e)
  const outline = easeDraw(getPhaseProgress(BLUEPRINT_PHASES.outline, e))
  const content = easeReveal(getPhaseProgress(BLUEPRINT_PHASES.content, e))
  const wireFade = easeReveal(getPhaseProgress(BLUEPRINT_PHASES.wire, e))
  const clean = 1 - smoothstep(...BLUEPRINT_PHASES.clean, e)
  const [guideStart, guideEnd] = BLUEPRINT_PHASES.guides
  return {
    e,
    elapsed,
    duration,
    wave: easeDraw(getPhaseProgress(BLUEPRINT_PHASES.field, e)),
    isWaving: e < BLUEPRINT_PHASES.field[1] + 0.05,
    rain: smoothstep(0.04, 0.2, e) * (1 - smoothstep(0.62, 0.86, e)),
    probe: easeDraw(probe),
    probeOpacity:
      probe > 0 && probe < 1
        ? smoothstep(0, 0.1, probe) * (1 - smoothstep(0.85, 1, probe)) * 0.8
        : 0,
    guides: [0, 1, 2, 3].map((index) =>
      easeDraw(
        clamp((e - guideStart - index * 0.03) / (guideEnd - guideStart - 0.09))
      )
    ),
    guideOpacity: 0.5 * (1 - smoothstep(0.66, 0.92, e)),
    outline,
    dimOpacity:
      e > BLUEPRINT_PHASES.outline[0]
        ? (1 - smoothstep(0.66, 0.9, e)) * 0.9
        : 0,
    handleScales: HANDLE_STARTS.map(
      (start) =>
        easeDraw(clamp((e - start) / 0.1)) * (1 - smoothstep(0.82, 0.96, e))
    ),
    keyFade:
      1 -
      smoothstep(
        BLUEPRINT_PHASES.parts[1] - 0.02,
        BLUEPRINT_PHASES.parts[1] + 0.1,
        e
      ),
    contentOpacity: content,
    contentBlur:
      content > 0 && content < 0.99
        ? BLUEPRINT_GEOMETRY.contentBlur * (1 - content)
        : 0,
    wireOpacity: 1 - wireFade,
    overlayOpacity: clean,
  }
}

/** A dot's light at this moment: the ripple, the drifting rain, the probe and the reticle. */
export function getFieldDotIntensity(
  dot: FieldDot,
  frame: BlueprintFrame,
  context: {
    elapsed: number
    span: number
    margin: number
    maxDistance: number
    probeX?: number
    reticle?: BlueprintRect | null
    reticleOpacity?: number
  }
) {
  const front = frame.wave * (context.maxDistance + 60) - dot.distance
  const passed = clamp(front / 50)
  const ring =
    frame.isWaving && frame.wave > 0 ? Math.exp(-(((front - 6) / 14) ** 2)) : 0
  const drop =
    ((context.elapsed * dot.speed + dot.phase) % (context.span + dot.trail)) -
    context.margin -
    dot.y
  const rain =
    drop >= 0 && drop < dot.trail
      ? (1 - drop / dot.trail) ** 1.6 * frame.rain * passed * dot.edge
      : 0
  const probe =
    frame.probeOpacity > 0 && context.probeX !== undefined
      ? Math.exp(-(((dot.x - context.probeX) / 9) ** 2)) *
        frame.probeOpacity *
        passed
      : 0
  const reticle = context.reticle
    ? getReticleGlow(dot, context.reticle) * (context.reticleOpacity ?? 0) * 0.8
    : 0
  const light = Math.max(ring, rain, probe, reticle)
  return {
    opacity:
      Math.max(passed * 0.5 * dot.edge, light * dot.edge) *
      frame.overlayOpacity *
      frame.wireOpacity,
    radius: 1.05 + light * 0.85,
    isLit: light > 0.35,
  }
}

function getReticleGlow(dot: { x: number; y: number }, rect: BlueprintRect) {
  const outside = Math.max(
    rect.x - dot.x,
    dot.x - rect.x - rect.width,
    rect.y - dot.y,
    dot.y - rect.y - rect.height,
    0
  )
  const isWithin = outside === 0
  return Math.max(0, 1 - outside / 16) * (isWithin ? 1 : 0.6)
}

export type BlueprintPartKind = "box" | "text" | "icon"

export type BlueprintPartInput = {
  kind: BlueprintPartKind
  /** What the reticle's tag calls it: FRAME, BUTTON, INPUT, IMAGE, TEXT, SVG. */
  name: string
  rect: BlueprintRect
  radius?: number
  isInteractive?: boolean
}

export type BlueprintPart<
  Input extends BlueprintPartInput = BlueprintPartInput,
> = Input & { isKey: boolean }

const isSameRect = (a: BlueprintRect, b: BlueprintRect) =>
  Math.abs(a.x - b.x) < 1.5 &&
  Math.abs(a.y - b.y) < 1.5 &&
  Math.abs(a.width - b.width) < 1.5 &&
  Math.abs(a.height - b.height) < 1.5

const getArea = (part: BlueprintPartInput) => part.rect.width * part.rect.height

/**
 * The parts worth drawing, in document order: repeated boxes dropped, the
 * largest `maxParts` kept, and up to `keyCount` keys (controls first, then
 * the largest boxes) that get their own guides, handles and size.
 */
export function selectBlueprintParts<Input extends BlueprintPartInput>(
  parts: Input[],
  options: { maxParts: number; keyCount: number }
): BlueprintPart<Input>[] {
  const unique = parts.filter(
    (part, index) =>
      part.kind !== "box" ||
      !parts
        .slice(0, index)
        .some(
          (earlier) =>
            earlier.kind === "box" && isSameRect(earlier.rect, part.rect)
        )
  )
  const kept = new Set(
    [...unique]
      .sort((a, b) => getArea(b) - getArea(a))
      .slice(0, options.maxParts)
  )
  const selected = unique.filter((part) => kept.has(part))
  const boxes = selected.filter((part) => part.kind === "box")
  const keys = new Set(
    [
      ...boxes.filter((part) => part.isInteractive),
      ...boxes
        .filter((part) => !part.isInteractive)
        .sort((a, b) => getArea(b) - getArea(a)),
    ].slice(0, options.keyCount)
  )
  return selected.map((part) => ({ ...part, isKey: keys.has(part) }))
}

/** When each part draws: spread over the parts phase, overlapping. */
export function getPartWindows(count: number) {
  const [start, end] = BLUEPRINT_PHASES.parts
  const span = end - start
  const length = Math.min(0.2, span * 0.6)
  return Array.from({ length: count }, (_, index) => {
    const partStart =
      start + (count > 1 ? (span - length) * (index / (count - 1)) : 0)
    return { start: partStart, end: partStart + length }
  })
}

/** How far one of a part's strokes has drawn: strokes follow each other. */
export function getStrokeProgress(
  window: { start: number; end: number },
  e: number,
  index: number,
  count: number
) {
  const local = clamp((e - window.start) / (window.end - window.start))
  return easeDraw(clamp(local * count - index * 0.75))
}

/** A key part's guides, handles and size label at this moment. */
export function getKeyState(window: { start: number; end: number }, e: number) {
  const guideStart = window.start - 0.03
  return {
    guides: [0, 1, 2, 3].map((index) =>
      easeDraw(clamp((e - guideStart - index * 0.012) / 0.1))
    ),
    isShown: e > guideStart,
    handleScale: easeDraw(clamp((e - window.start - 0.04) / 0.08)),
    size: easeDraw(clamp((e - window.start) / (window.end - window.start))),
  }
}

/**
 * The reticle around the part being drawn: it hops from the last part (the
 * whole element for the first) to the current one, padded, and fades with
 * the parts phase.
 */
export function getReticle(
  parts: { rect: BlueprintRect }[],
  windows: { start: number; end: number }[],
  frameRect: BlueprintRect,
  e: number
) {
  const current = windows.reduce(
    (found, window, index) => (e >= window.start ? index : found),
    -1
  )
  if (current < 0 || e >= BLUEPRINT_PHASES.parts[1] + 0.06) return null
  const from = current > 0 ? parts[current - 1].rect : frameRect
  const to = parts[current].rect
  const travel = easeDraw(clamp((e - windows[current].start) / 0.05))
  const pad = BLUEPRINT_GEOMETRY.reticlePadding
  const [phaseStart, phaseEnd] = BLUEPRINT_PHASES.parts
  return {
    index: current,
    rect: {
      x: mix(from.x, to.x, travel) - pad,
      y: mix(from.y, to.y, travel) - pad,
      width: mix(from.width, to.width, travel) + 2 * pad,
      height: mix(from.height, to.height, travel) + 2 * pad,
    },
    opacity:
      smoothstep(phaseStart, phaseStart + 0.04, e) *
      (1 - smoothstep(phaseEnd, phaseEnd + 0.06, e)),
  }
}

/** The probe while the timeline waits: it sweeps across, again and again. */
export function getHoldScan(holdElapsed: number, duration: number) {
  const sweep = (holdElapsed / (duration * HOLD_SWEEP)) % 1
  return {
    probe: easeDraw(sweep),
    probeOpacity:
      smoothstep(0, 0.1, sweep) * (1 - smoothstep(0.85, 1, sweep)) * 0.8,
  }
}

/** The reticle while the timeline waits: it hops from part to part, in order. */
export function getHoldReticle(
  parts: { rect: BlueprintRect }[],
  holdElapsed: number,
  duration: number
) {
  if (!parts.length) return null
  const hops = holdElapsed / (duration * HOLD_HOP)
  const index = Math.floor(hops) % parts.length
  const from = parts[(index + parts.length - 1) % parts.length].rect
  const to = parts[index].rect
  const travel = easeDraw(clamp((hops % 1) / 0.25))
  const pad = BLUEPRINT_GEOMETRY.reticlePadding
  return {
    index,
    rect: {
      x: mix(from.x, to.x, travel) - pad,
      y: mix(from.y, to.y, travel) - pad,
      width: mix(from.width, to.width, travel) + 2 * pad,
      height: mix(from.height, to.height, travel) + 2 * pad,
    },
    opacity: 1,
  }
}

/**
 * How far the drawing may reach past each side of the element: the margin,
 * cut back to the scroll area around it, so a sketch near an edge never adds
 * a scrollbar.
 */
export function getOverlayInsets(
  rect: BlueprintRect,
  bounds: BlueprintRect,
  margin: number
) {
  const room = (value: number) =>
    Math.max(0, Math.min(margin, Math.floor(value)))
  return {
    left: room(rect.x - bounds.x),
    top: room(rect.y - bounds.y),
    right: room(bounds.x + bounds.width - rect.x - rect.width),
    bottom: room(bounds.y + bounds.height - rect.y - rect.height),
  }
}

export type BlueprintFlyer = {
  /** Where on the outline it lands, as a fraction of the half's length. */
  along: number
  /** Which half of the outline: 0 right, 1 left. */
  half: 0 | 1
  angle: number
  distance: number
  start: number
  arrive: number
}

/**
 * Particles that fly in and land on the outline just as the pen reaches
 * their spot.
 */
export function getFlyers(seed: number): BlueprintFlyer[] {
  const [start, end] = BLUEPRINT_PHASES.outline
  return Array.from({ length: FLYER_COUNT }, (_, index) => {
    const along = 0.06 + 0.9 * (Math.floor(index / 2) / (FLYER_COUNT / 2 - 1))
    const arrive = start + (end - start) * invertEaseDraw(along)
    return {
      along,
      half: (index % 2) as 0 | 1,
      angle: getNoise(index * 9.1 + seed) * Math.PI * 2,
      distance: 30 + 70 * getNoise(index * 4.7 + seed * 2),
      start: arrive - 0.09,
      arrive,
    }
  })
}

/** A flyer's travel (0 at its start, 1 landed) and opacity at this moment. */
export function getFlyerState(flyer: BlueprintFlyer, e: number) {
  const travel = clamp((e - flyer.start) / (flyer.arrive - flyer.start))
  const isFlying = e >= flyer.start && e < flyer.arrive + 0.01
  return {
    travel: easeDraw(travel),
    opacity: isFlying ? smoothstep(0, 0.25, travel) : 0,
  }
}

export function formatBlueprintSize(width: number, height: number) {
  return `${Math.round(width)} × ${Math.round(height)}`
}

/** The clock beside the size: time since the sketch began, waiting included. */
export function formatBlueprintClock(elapsed: number) {
  return `t+${(elapsed / 1000).toFixed(2)}s`
}

export function formatBlueprintPoint(x: number, y: number) {
  const pad = (value: number) =>
    String(Math.max(0, Math.round(value))).padStart(3, "0")
  return `${pad(x)}·${pad(y)}`
}
