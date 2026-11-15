import { clampBotFaceGaze, getBotFaceIdleGaze } from "./bot-face-model"

export const BOT_FACE_STATES = [
  "idle",
  "listening",
  "thinking",
  "working",
  "speaking",
  "happy",
  "sad",
  "questioning",
  "awaiting-permission",
  "error",
] as const
export type BotFaceState = (typeof BOT_FACE_STATES)[number]
export const BOT_FACE_GAZE_TRAVEL = 6
export const BOT_FACE_MAX_TILT = 6

const POSE_KEYS = [
  "leftOpening",
  "rightOpening",
  "leftWidth",
  "rightWidth",
  "leftAngle",
  "rightAngle",
  "leftCurve",
  "rightCurve",
  "leftX",
  "rightX",
  "leftY",
  "rightY",
  "gazeX",
  "gazeY",
  "tilt",
  "pitch",
  "yaw",
  "slant",
  "waveform",
  "question",
  "error",
  "leftOuterOpening",
  "leftInnerOpening",
  "rightOuterOpening",
  "rightInnerOpening",
] as const
export type BotFacePose = Record<(typeof POSE_KEYS)[number], number>
export type BotFaceMotion = { pose: BotFacePose; velocity: BotFacePose }
export type BotFacePlayback = { state: BotFaceState; elapsed: number }

export function stepBotFacePlayback(
  current: BotFacePlayback,
  state: BotFaceState,
  delta: number
): BotFacePlayback {
  "worklet"
  return {
    state,
    elapsed: current.state === state ? current.elapsed + Math.max(0, delta) : 0,
  }
}

const NEUTRAL: BotFacePose = {
  leftOpening: 1,
  rightOpening: 1,
  leftWidth: 1,
  rightWidth: 1,
  leftAngle: 0,
  rightAngle: 0,
  leftCurve: 0,
  rightCurve: 0,
  leftX: 0,
  rightX: 0,
  leftY: 0,
  rightY: 0,
  gazeX: 0,
  gazeY: 0,
  tilt: 0,
  pitch: 0,
  yaw: 0,
  slant: 1,
  waveform: 0,
  question: 0,
  error: 0,
  leftOuterOpening: 0,
  leftInnerOpening: 0,
  rightOuterOpening: 0,
  rightInnerOpening: 0,
}
const EXPRESSIONS: Record<BotFaceState, Partial<BotFacePose>> = {
  idle: {},
  listening: {
    leftOpening: 1.15,
    rightOpening: 1.15,
    leftWidth: 1.1,
    rightWidth: 1.1,
    leftY: -1,
    rightY: -1,
    slant: 0.3,
  },
  thinking: {
    gazeX: -0.65,
    gazeY: -0.72,
    slant: 0.2,
  },
  working: {
    leftOpening: 0.46,
    rightOpening: 0.5,
    leftWidth: 1.35,
    rightWidth: 1.35,
    leftAngle: 8,
    rightAngle: -8,
    slant: 0.1,
  },
  speaking: {
    waveform: 1,
    leftX: 1.5,
    rightX: -1.5,
    slant: 0,
  },
  happy: {
    leftOpening: 0.23,
    rightOpening: 0.23,
    leftWidth: 1.25,
    rightWidth: 1.25,
    leftCurve: -6.5,
    rightCurve: -6.5,
    leftX: -0.5,
    rightX: 0.5,
    leftY: -1.2,
    rightY: -1.2,
    tilt: -0.8,
    slant: 0,
  },
  sad: {
    leftOpening: 0.36,
    rightOpening: 0.36,
    leftWidth: 1.18,
    rightWidth: 1.18,
    leftCurve: 3.8,
    rightCurve: 3.8,
    leftAngle: -12,
    rightAngle: 12,
    gazeY: 0.7,
    leftY: 2.5,
    rightY: 2.5,
    slant: 0,
  },
  questioning: {
    question: 1,
    leftY: -1,
    rightY: 1,
    tilt: 2,
    slant: 0,
  },
  "awaiting-permission": {
    leftOpening: 1.04,
    rightOpening: 1.04,
    leftWidth: 1.15,
    rightWidth: 1.15,
    leftY: -0.6,
    rightY: -0.6,
    slant: 0,
  },
  error: {
    error: 1,
    tilt: -1.2,
    slant: 0,
  },
}

// These are behavioral cadences, separate from the move/settle response speed.
const CADENCE = {
  idle: 3600,
  listening: 3400,
  thinking: 4000,
  working: 2800,
  speaking: 720,
  happy: 2400,
  sad: 5200,
  questioning: 3200,
  permission: 3800,
  error: 4000,
} as const
const WORK_SCAN = [
  [0, -0.85],
  [0.16, -0.85],
  [0.34, 0.85],
  [0.52, 0.85],
  [0.7, -0.85],
  [1, -0.85],
] as const
const THINK_SCAN = [
  [0, -0.65],
  [0.2, -0.65],
  [0.38, 0.65],
  [0.64, 0.65],
  [0.82, -0.65],
  [1, -0.65],
] as const
const THINK_LIFT = [
  [0, 0],
  [0.08, 0],
  [0.16, 1],
  [0.24, 0],
  [1, 0],
] as const
const LISTEN_NOD = [
  [0, 0],
  [0.1, 1],
  [0.21, -0.3],
  [0.3, 0.75],
  [0.42, 0],
  [1, 0],
] as const
const ATTENTION_RAISE = [
  [0, 0],
  [0.08, 1],
  [0.17, 0],
  [0.26, 0.8],
  [0.36, 0],
  [1, 0],
] as const

function getBeat(elapsed: number, period: number, offset = 0) {
  "worklet"
  return (1 - Math.cos(((elapsed + offset) / period) * Math.PI * 2)) / 2
}

function sampleTrack(
  phase: number,
  track: readonly (readonly [number, number])[]
) {
  "worklet"
  for (let index = 1; index < track.length; index++) {
    const left = track[index - 1]
    const right = track[index]
    if (phase > right[0]) continue
    const progress = (phase - left[0]) / (right[0] - left[0])
    const eased = progress * progress * (3 - 2 * progress)
    return left[1] + (right[1] - left[1]) * eased
  }
  return track[track.length - 1][1]
}

/** State-local gestures: gaze, eyelids and eye spacing tell the same story. */
export function getBotFaceTarget(
  state: BotFaceState,
  elapsed = 0
): BotFacePose {
  "worklet"
  const pose = { ...NEUTRAL, ...EXPRESSIONS[state] }
  const time = Math.max(0, elapsed)
  if (state === "idle") {
    const gaze = getBotFaceIdleGaze(time)
    pose.gazeX = gaze.x
    pose.gazeY = gaze.y
    pose.leftOpening = pose.rightOpening =
      0.97 + 0.06 * getBeat(time, CADENCE.idle)
  }
  if (state === "listening") {
    const nod = sampleTrack(
      (time % CADENCE.listening) / CADENCE.listening,
      LISTEN_NOD
    )
    pose.pitch = 12 * nod
    pose.tilt = -2.8 * nod
    pose.leftOpening = pose.rightOpening = 1.15 - 0.24 * nod
    pose.leftWidth = pose.rightWidth = 1.1 + 0.12 * nod
    pose.leftY = pose.rightY = -1 + 2.2 * nod
    pose.gazeY = 0.3 * nod
  }
  if (state === "thinking") {
    const phase = (time % CADENCE.thinking) / CADENCE.thinking
    const leftLift = sampleTrack(phase, THINK_LIFT)
    const rightLift = sampleTrack((phase + 0.7) % 1, THINK_LIFT)
    pose.gazeX = sampleTrack(phase, THINK_SCAN)
    pose.gazeY = -0.72
    pose.leftOpening = 0.62 - 0.12 * pose.gazeX + 0.2 * leftLift - 0.12 * rightLift
    pose.rightOpening = 0.62 + 0.12 * pose.gazeX + 0.2 * rightLift - 0.12 * leftLift
    pose.leftWidth = 1.14 + 0.14 * rightLift - 0.08 * leftLift
    pose.rightWidth = 1.14 + 0.14 * leftLift - 0.08 * rightLift
    pose.leftY = -0.5 - leftLift
    pose.rightY = -0.5 - rightLift
    pose.leftCurve = -0.5 - 1.2 * rightLift
    pose.rightCurve = -0.5 - 1.2 * leftLift
    pose.leftAngle = -3 + 5 * rightLift
    pose.rightAngle = 3 - 5 * leftLift
    pose.yaw = pose.gazeX * 8
    pose.tilt = pose.gazeX * 2.8
    pose.pitch = -6 - Math.max(leftLift, rightLift)
  }
  if (state === "working") {
    const focus = getBeat(time, CADENCE.working)
    pose.gazeX = sampleTrack(
      (time % CADENCE.working) / CADENCE.working,
      WORK_SCAN
    )
    pose.gazeY = -0.2 + 0.45 * focus
    pose.leftOpening += 0.12 * focus
    pose.rightOpening += 0.12 * focus
    pose.leftY = pose.rightY = 0.8 * focus
    pose.yaw = pose.gazeX * 10
    pose.tilt = pose.gazeX * 6
    pose.pitch = 3 + 5 * focus
  }
  if (state === "speaking") {
    pose.leftOuterOpening = 0.2 + 0.7 * getBeat(time, CADENCE.speaking, 210)
    pose.leftOpening = 0.3 + 0.9 * getBeat(time, CADENCE.speaking, 70)
    pose.leftInnerOpening = 0.2 + 0.65 * getBeat(time, 920, 410)
    pose.rightInnerOpening = 0.2 + 0.8 * getBeat(time, CADENCE.speaking, 340)
    pose.rightOpening = 0.3 + 0.9 * getBeat(time, 920, 140)
    pose.rightOuterOpening = 0.2 + 0.65 * getBeat(time, CADENCE.speaking, 510)
    pose.tilt = 0.9 * Math.sin((time / 2400) * Math.PI * 2)
    pose.pitch = -2 + 3 * getBeat(time, 1800)
  }
  if (state === "happy") {
    const smile = getBeat(time, CADENCE.happy)
    pose.leftCurve = pose.rightCurve = -6.5 - 1.5 * smile
    pose.leftOpening = pose.rightOpening = 0.23 + 0.12 * smile
    pose.leftY = pose.rightY = -1.2 - 1.5 * smile
    pose.tilt = -1.8 + 3.6 * smile
    pose.pitch = -4 - 5 * smile
  }
  if (state === "sad") {
    const sigh = getBeat(time, CADENCE.sad)
    pose.leftOpening = pose.rightOpening = 0.36 - 0.17 * sigh
    pose.leftY = pose.rightY = 2.5 + 1.2 * sigh
    pose.gazeY = 0.62 + 0.25 * sigh
    pose.tilt = -0.8 * sigh
    pose.pitch = 7 + 5 * sigh
  }
  if (state === "questioning") {
    const question = getBeat(time, CADENCE.questioning)
    pose.leftY = -1 - 1.5 * question
    pose.rightY = 1 + 0.5 * question
    pose.leftAngle = -5 * question
    pose.rightAngle = 5 * question
    pose.tilt = 2 - 4 * question
    pose.yaw = 4 - 8 * question
    pose.gazeY = -0.15 * question
  }
  if (state === "awaiting-permission") {
    const attention = sampleTrack(
      (time % CADENCE.permission) / CADENCE.permission,
      ATTENTION_RAISE
    )
    pose.leftOpening = pose.rightOpening = 1.04 + 0.38 * attention
    pose.leftWidth = pose.rightWidth = 1.15 + 0.08 * attention
    pose.leftY = pose.rightY = -0.6 - 2 * attention
    pose.gazeY = -0.1 - 0.2 * attention
    pose.pitch = -5 * attention
    pose.tilt = 2.4 * attention
  }
  if (state === "error") {
    const concern = getBeat(time, CADENCE.error)
    pose.leftY = pose.rightY = 0.6 * concern
    pose.pitch = 4 * concern
    pose.tilt = -1.2 + 1.2 * concern
  }
  return pose
}

export function createBotFaceMotion(state: BotFaceState): BotFaceMotion {
  "worklet"
  return {
    pose: getBotFaceTarget(state),
    velocity: {
      ...NEUTRAL,
      leftOpening: 0,
      rightOpening: 0,
      leftWidth: 0,
      rightWidth: 0,
      slant: 0,
    },
  }
}

/** Exact critically damped integration retains velocity across interruptions. */
export function stepBotFaceMotion(
  current: BotFaceMotion,
  target: BotFacePose,
  elapsed: number,
  moveDuration: number,
  settleDuration: number
): BotFaceMotion {
  "worklet"
  if (elapsed <= 0 && moveDuration > 0 && settleDuration > 0) return current
  const pose = { ...current.pose }
  const velocity = { ...current.velocity }
  const delta = Math.max(0, elapsed)
  for (const key of POSE_KEYS) {
    const duration =
      key === "gazeX" || key === "gazeY" ? settleDuration : moveDuration
    if (duration <= 0) {
      pose[key] = target[key]
      velocity[key] = 0
      continue
    }
    const frequency = 6 / duration
    const displacement = current.pose[key] - target[key]
    const momentum = current.velocity[key] + frequency * displacement
    const decay = Math.exp(-frequency * delta)
    pose[key] = target[key] + (displacement + momentum * delta) * decay
    velocity[key] =
      (current.velocity[key] - frequency * momentum * delta) * decay
  }
  const gaze = clampBotFaceGaze({ x: pose.gazeX, y: pose.gazeY })
  pose.gazeX = gaze.x
  pose.gazeY = gaze.y
  pose.tilt = Math.max(
    -BOT_FACE_MAX_TILT,
    Math.min(BOT_FACE_MAX_TILT, pose.tilt)
  )
  pose.leftOpening = Math.max(0.12, Math.min(1.45, pose.leftOpening))
  pose.rightOpening = Math.max(0.12, Math.min(1.45, pose.rightOpening))
  pose.leftWidth = Math.max(0.65, Math.min(1.5, pose.leftWidth))
  pose.rightWidth = Math.max(0.65, Math.min(1.5, pose.rightWidth))
  pose.slant = Math.max(0, Math.min(1, pose.slant))
  pose.pitch = Math.max(-14, Math.min(14, pose.pitch))
  pose.yaw = Math.max(-12, Math.min(12, pose.yaw))
  for (const key of ["waveform", "question", "error"] as const)
    pose[key] = Math.max(0, Math.min(1, pose[key]))
  return { pose, velocity }
}

type EyeStyle = "slant" | "dots" | "square"

// Every contour has twelve cubics. Auxiliary contours collapse into the eye
// when unused, so bars and symbols grow from the existing geometry.
function createEyeContour(
  style: EyeStyle,
  opening: number,
  curve: number,
  widthScale = 1
) {
  "worklet"
  const width = Math.min(8.8, 4.5 * widthScale + Math.abs(curve) * 0.4)
  const height = Math.max(1.5, (style === "slant" ? 10 : 4.5) * opening)
  const radius = Math.min(style === "square" ? 1 : 4.5, width, height)
  const inner = width - radius
  const edge = height - radius
  const corner = radius * 0.5522847498
  const contour = [
    -inner,
    -height,
    (-inner * 2) / 3,
    -height,
    -inner / 3,
    -height,
    0,
    -height,
    inner / 3,
    -height,
    (inner * 2) / 3,
    -height,
    inner,
    -height,
    inner + corner,
    -height,
    width,
    -edge - corner,
    width,
    -edge,
    width,
    (-edge * 2) / 3,
    width,
    -edge / 3,
    width,
    0,
    width,
    edge / 3,
    width,
    (edge * 2) / 3,
    width,
    edge,
    width,
    edge + corner,
    inner + corner,
    height,
    inner,
    height,
    (inner * 2) / 3,
    height,
    inner / 3,
    height,
    0,
    height,
    -inner / 3,
    height,
    (-inner * 2) / 3,
    height,
    -inner,
    height,
    -inner - corner,
    height,
    -width,
    edge + corner,
    -width,
    edge,
    -width,
    (edge * 2) / 3,
    -width,
    edge / 3,
    -width,
    0,
    -width,
    -edge / 3,
    -width,
    (-edge * 2) / 3,
    -width,
    -edge,
    -width,
    -edge - corner,
    -inner - corner,
    -height,
    -inner,
    -height,
  ]
  for (let index = 1; index < contour.length; index += 2)
    contour[index] += curve * (1 - (contour[index - 1] / width) ** 2)
  return contour
}

const CURIOUS_CONTOUR = [
  -4.8, -5, -4.8, -8, -2.4, -10, 0.4, -10, 4.6, -10, 6.6, -7, 6.6, -4.4, 6.6,
  -1.4, 4.8, -0.4, 4, 1, 3.2, 2.7, 3, 3.8, 3, 5.5, 3, 7.5, 1.5, 8.8, -0.5, 8.8,
  -2.7, 8.8, -4.5, 7.2, -4.5, 5.3, -4.5, 2.4, -4, 0.4, -2.7, -1.2, -1.7, -2.3,
  -1, -3.7, -1, -4.7, -1, -5.6, -1.4, -6.3, -2.1, -6.3, -2.7, -6.3, -3.1, -5.7,
  -3.1, -5, -3.1, -4.5, -3.5, -4.2, -4, -4.2, -4.4, -4.2, -4.8, -4.5, -4.8, -5,
]

function createErrorContour() {
  "worklet"
  const vertices = [
    [-6, -9],
    [0, -3],
    [6, -9],
    [9, -6],
    [3, 0],
    [9, 6],
    [6, 9],
    [0, 3],
    [-6, 9],
    [-9, 6],
    [-3, 0],
    [-9, -6],
  ]
  const contour = [-7.5, -7.5]
  for (let index = 0; index < vertices.length; index++) {
    const previous = vertices[(index + vertices.length - 1) % vertices.length]
    const vertex = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    contour.push(
      vertex[0] + (previous[0] - vertex[0]) / 6,
      vertex[1] + (previous[1] - vertex[1]) / 6,
      vertex[0] + (next[0] - vertex[0]) / 6,
      vertex[1] + (next[1] - vertex[1]) / 6,
      (vertex[0] + next[0]) / 2,
      (vertex[1] + next[1]) / 2
    )
  }
  return contour
}

const ERROR_CONTOUR = createErrorContour()
const COLLAPSED_CONTOUR = CURIOUS_CONTOUR.map(() => 0)

function moveContour(contour: number[], x: number, y: number) {
  "worklet"
  return contour.map((value, index) => value + (index % 2 === 0 ? x : y))
}

function createWaveContour(style: EyeStyle, opening: number, width: number) {
  "worklet"
  return createEyeContour(
    style === "square" ? "square" : "slant",
    style === "square" ? (opening * 10) / 4.5 : opening,
    0,
    width
  )
}

function drawEyeContour(
  contour: number[],
  angle: number,
  centerX: number,
  centerY: number
) {
  "worklet"
  const radians = (angle * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const coordinates: string[] = []
  for (let index = 0; index < contour.length; index += 2) {
    const x = contour[index]
    const y = contour[index + 1]
    coordinates.push(
      `${(centerX + x * cosine - y * sine).toFixed(3)} ${(centerY + x * sine + y * cosine).toFixed(3)}`
    )
  }
  let path = `M${coordinates[0]}`
  for (let index = 1; index < coordinates.length; index += 3)
    path += `C${coordinates[index]} ${coordinates[index + 1]} ${coordinates[index + 2]}`
  return `${path}Z`
}

export function getBotFaceEyePath(
  style: EyeStyle,
  opening: number,
  curve: number,
  angle = 0,
  centerX = 0,
  centerY = 0,
  widthScale = 1
) {
  "worklet"
  return drawEyeContour(
    createEyeContour(style, opening, curve, widthScale),
    angle,
    centerX,
    centerY
  )
}

export function getBotFaceBlinkOpening(pose: BotFacePose, opening: number) {
  "worklet"
  const symbol = Math.min(1, pose.waveform + pose.error)
  return 1 - (1 - opening) * (1 - symbol)
}

export function getBotFaceEyeContours(
  pose: BotFacePose,
  style: EyeStyle,
  side: "left" | "right"
) {
  "worklet"
  const baseAngle = style === "slant" ? -20 * pose.slant : 0
  const base = createEyeContour(
    style,
    pose[`${side}Opening`],
    pose[`${side}Curve`],
    pose[`${side}Width`]
  )
  const waveform = [
    createWaveContour(style, pose[`${side}Opening`], 0.38),
    moveContour(
      createWaveContour(style, pose[`${side}OuterOpening`], 0.36),
      side === "left" ? -5.5 : 5.5,
      0
    ),
    moveContour(
      createWaveContour(style, pose[`${side}InnerOpening`], 0.36),
      side === "left" ? 5.5 : -5.5,
      0
    ),
  ]
  const questionWidth = style === "dots" ? 0.88 : 1
  const questionHeight =
    (style === "slant" ? 1 : style === "dots" ? 0.52 : 0.58) *
    (side === "left" ? 0.82 : 1)
  const question = CURIOUS_CONTOUR.map(
    (value, index) => value * (index % 2 === 0 ? questionWidth : questionHeight)
  )
  const weights = [pose.waveform, pose.question, pose.error]
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const normalizer = Math.max(1, total)
  const symbolContours = [
    waveform,
    [question, COLLAPSED_CONTOUR, COLLAPSED_CONTOUR],
    [ERROR_CONTOUR, COLLAPSED_CONTOUR, COLLAPSED_CONTOUR],
  ]
  const contours: number[][] = []
  const angle = ((baseAngle + pose[`${side}Angle`]) * Math.PI) / 180
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const centerX = (side === "left" ? 40 : 60) + pose[`${side}X`]
  const centerY = 50 + pose[`${side}Y`]
  for (let part = 0; part < 3; part++) {
    const normal = part === 0 ? base : COLLAPSED_CONTOUR
    const contour = normal.map((value, index) => {
      let coordinate = value * Math.max(0, 1 - total)
      for (let symbol = 0; symbol < weights.length; symbol++)
        coordinate +=
          (symbolContours[symbol][part][index] * weights[symbol]) / normalizer
      return coordinate
    })
    const transformed: number[] = []
    for (let index = 0; index < contour.length; index += 2)
      transformed.push(
        centerX + contour[index] * cosine - contour[index + 1] * sine,
        centerY + contour[index] * sine + contour[index + 1] * cosine
      )
    contours.push(transformed)
  }
  return contours
}

export function getBotFaceEyeGeometry(
  pose: BotFacePose,
  style: EyeStyle,
  side: "left" | "right"
) {
  "worklet"
  return getBotFaceEyeContours(pose, style, side)
    .map((contour) => drawEyeContour(contour, 0, 0, 0))
    .join("")
}
