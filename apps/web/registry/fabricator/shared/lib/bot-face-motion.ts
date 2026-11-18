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
  idle: 5200,
  listening: 3400,
  thinking: 4000,
  working: 2800,
  speaking: 680,
  happy: 2600,
  sad: 5600,
  questioning: 3400,
  permission: 3800,
  error: 4600,
} as const
const WORK_SCAN = [
  [0, -0.85],
  [0.2, -0.85],
  [0.28, 0.85],
  [0.52, 0.85],
  [0.6, -0.85],
  [0.78, -0.85],
  [0.86, 0.15],
  [1, 0.15],
] as const
const WORK_ARC = [
  [0, -0.15],
  [0.2, -0.15],
  [0.24, 0.32],
  [0.3, -0.12],
  [0.52, -0.12],
  [0.56, 0.32],
  [0.62, -0.15],
  [1, -0.15],
] as const
const WORK_SQUINT = [
  [0, 0],
  [0.18, 0],
  [0.23, 1],
  [0.31, 0],
  [0.5, 0],
  [0.55, 1],
  [0.63, 0],
  [0.76, 0],
  [0.81, 0.7],
  [0.88, 0],
  [1, 0],
] as const
const THINK_SCAN = [
  [0, -0.65],
  [0.2, -0.65],
  [0.28, 0.65],
  [0.62, 0.65],
  [0.7, -0.65],
  [1, -0.65],
] as const
const THINK_LIFT = [
  [0, 0],
  [0.08, 0],
  [0.16, 1],
  [0.24, 0],
  [1, 0],
] as const
const THINK_SQUINT = [
  [0, 0],
  [0.18, 0],
  [0.23, 1],
  [0.3, 0],
  [0.6, 0],
  [0.65, 1],
  [0.73, 0],
  [1, 0],
] as const
const LISTEN_NOD = [
  [0, 0],
  [0.08, -0.12],
  [0.16, 1],
  [0.26, -0.3],
  [0.34, 0.75],
  [0.46, 0],
  [1, 0],
] as const
const ATTENTION_RAISE = [
  [0, 0],
  [0.06, -0.08],
  [0.14, 1],
  [0.22, 0],
  [0.3, 0.8],
  [0.4, 0],
  [1, 0],
] as const
const SMILE = [
  [0, 0.35],
  [0.06, 0.18],
  [0.16, 1],
  [0.26, 0.52],
  [0.38, 0.86],
  [0.52, 0.64],
  [0.78, 0.64],
  [1, 0.35],
] as const
const SIGH = [
  [0, 0.22],
  [0.12, 0.1],
  [0.4, 1],
  [0.58, 1],
  [0.82, 0.38],
  [1, 0.22],
] as const
const CURIOUS = [
  [0, 0.84],
  [0.1, 0.48],
  [0.2, 0.1],
  [0.34, 1],
  [0.52, 1],
  [0.66, 0.7],
  [0.86, 0.7],
  [1, 0.84],
] as const
const CONCERN = [
  [0, 0.16],
  [0.14, 0.06],
  [0.4, 1],
  [0.66, 0.78],
  [0.88, 0.28],
  [1, 0.16],
] as const
const PHRASE = [
  [0, 0],
  [0.18, 0.35],
  [0.42, -0.2],
  [0.7, 0.55],
  [1, 0],
] as const

function getPhase(elapsed: number, period: number, offset = 0) {
  "worklet"
  const span = Math.max(1, period)
  const wrapped = (((elapsed + offset) % span) + span) % span
  return wrapped / span
}

function getVoice(elapsed: number, period: number, offset = 0) {
  "worklet"
  const phase = getPhase(elapsed, period, offset)
  if (phase < 0.18) {
    const rise = phase / 0.18
    return 1 - (1 - rise) ** 3
  }
  const fall = (phase - 0.18) / 0.82
  return (1 - fall) * (1 - fall)
}

function getBreath(elapsed: number, period: number, offset = 0) {
  "worklet"
  const phase = getPhase(elapsed, period, offset)
  if (phase < 0.32) {
    const rise = phase / 0.32
    return rise * rise * (3 - 2 * rise)
  }
  const fall = (phase - 0.32) / 0.68
  return 1 - fall * fall * (3 - 2 * fall)
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
    const breath = getBreath(time, CADENCE.idle)
    const follow = getBreath(time, CADENCE.idle, 480)
    pose.gazeX = gaze.x
    pose.gazeY = gaze.y
    pose.leftOpening = 0.9 + 0.16 * breath + 0.06 * gaze.y
    pose.rightOpening = 0.92 + 0.14 * follow + 0.04 * gaze.y
    pose.leftWidth = 1.04 - 0.1 * Math.abs(gaze.x)
    pose.rightWidth = 1.02 - 0.06 * Math.abs(gaze.x)
    pose.leftCurve = -0.7 * breath
    pose.rightCurve = -0.35 * follow
    pose.leftY = -0.7 * gaze.y
    pose.rightY = -0.35 * gaze.y
  }
  if (state === "listening") {
    const nod = sampleTrack(getPhase(time, CADENCE.listening), LISTEN_NOD)
    const lead = sampleTrack(
      getPhase(time, CADENCE.listening, -280),
      LISTEN_NOD
    )
    const follow = sampleTrack(
      getPhase(time, CADENCE.listening, -90),
      LISTEN_NOD
    )
    pose.pitch = 12 * nod
    pose.tilt = -2.2 * nod
    pose.leftOpening = 1.18 - 0.42 * lead
    pose.rightOpening = 1.16 - 0.36 * follow
    pose.leftWidth = 1.02 + 0.2 * lead
    pose.rightWidth = 1.04 + 0.14 * follow
    pose.leftCurve = -1.6 * Math.max(0, lead)
    pose.rightCurve = -0.9 * Math.max(0, follow)
    pose.leftY = -1.4 + 3.1 * lead
    pose.rightY = -0.9 + 2.6 * follow
    pose.gazeY = 0.34 * nod
  }
  if (state === "thinking") {
    const phase = getPhase(time, CADENCE.thinking)
    const leftLift = sampleTrack(phase, THINK_LIFT)
    const rightLift = sampleTrack((phase + 0.7) % 1, THINK_LIFT)
    const squint = sampleTrack(phase, THINK_SQUINT)
    const follow = sampleTrack((phase + 0.05) % 1, THINK_SQUINT)
    pose.gazeX = sampleTrack(phase, THINK_SCAN)
    pose.gazeY = -0.74
    pose.leftOpening = 0.64 - 0.1 * squint + 0.22 * leftLift - 0.08 * rightLift
    pose.rightOpening = 0.64 - 0.1 * follow + 0.22 * rightLift - 0.08 * leftLift
    pose.leftWidth = 1.14 + 0.16 * rightLift - 0.14 * leftLift - 0.08 * squint
    pose.rightWidth = 1.14 + 0.16 * leftLift - 0.14 * rightLift - 0.08 * follow
    pose.leftY = -0.3 - 2.1 * leftLift
    pose.rightY = -0.3 - 2.1 * rightLift
    pose.leftCurve = -0.3 - 1.8 * rightLift
    pose.rightCurve = -0.3 - 1.8 * leftLift
    pose.leftAngle = -4 + 8 * rightLift
    pose.rightAngle = 4 - 8 * leftLift
    pose.yaw = pose.gazeX * 7
    pose.tilt = pose.gazeX * 2.4
    pose.pitch = -5 - 2 * Math.max(leftLift, rightLift)
  }
  if (state === "working") {
    const phase = getPhase(time, CADENCE.working)
    const squint = sampleTrack(phase, WORK_SQUINT)
    const follow = sampleTrack(getPhase(time, CADENCE.working, 70), WORK_SQUINT)
    pose.gazeX = sampleTrack(phase, WORK_SCAN)
    pose.gazeY = sampleTrack(phase, WORK_ARC)
    pose.leftOpening = 0.58 - 0.24 * squint
    pose.rightOpening = 0.6 - 0.22 * follow
    pose.leftWidth = 1.28 - 0.18 * squint
    pose.rightWidth = 1.3 - 0.14 * follow
    pose.leftY = 0.2 + 1.15 * squint
    pose.rightY = 0.25 + 1.05 * follow
    pose.leftCurve = 0.8 * squint
    pose.rightCurve = 0.55 * follow
    pose.yaw = pose.gazeX * 10
    pose.tilt = pose.gazeX * 5
    pose.pitch = 2 + 4 * Math.max(squint, follow)
  }
  if (state === "speaking") {
    const phrase = sampleTrack(getPhase(time, 2600), PHRASE)
    pose.leftOuterOpening = 0.16 + 0.72 * getVoice(time, CADENCE.speaking, 180)
    pose.leftOpening = 0.22 + 0.9 * getVoice(time, CADENCE.speaking, 40)
    pose.leftInnerOpening = 0.14 + 0.7 * getVoice(time, 940, 360)
    pose.rightInnerOpening = 0.16 + 0.84 * getVoice(time, CADENCE.speaking, 300)
    pose.rightOpening = 0.22 + 0.9 * getVoice(time, 910, 120)
    pose.rightOuterOpening = 0.14 + 0.68 * getVoice(time, CADENCE.speaking, 460)
    pose.tilt = 1.6 * phrase
    pose.yaw = 2.4 * phrase
    pose.pitch = -1.2 + 3 * getBreath(time, 2100, 200)
  }
  if (state === "happy") {
    const smile = sampleTrack(getPhase(time, CADENCE.happy), SMILE)
    const follow = sampleTrack(getPhase(time, CADENCE.happy, 140), SMILE)
    pose.leftCurve = -4.6 - 3.6 * smile
    pose.rightCurve = -4.6 - 3.6 * follow
    pose.leftOpening = 0.16 + 0.24 * smile
    pose.rightOpening = 0.16 + 0.24 * follow
    pose.leftWidth = 1.12 + 0.22 * smile
    pose.rightWidth = 1.12 + 0.22 * follow
    pose.leftY = -0.35 - 2.4 * smile
    pose.rightY = -0.35 - 2.4 * follow
    pose.tilt = -1.2 + 2.2 * follow
    pose.pitch = -3 - 4 * follow
  }
  if (state === "sad") {
    const sigh = sampleTrack(getPhase(time, CADENCE.sad), SIGH)
    const follow = sampleTrack(getPhase(time, CADENCE.sad, 220), SIGH)
    pose.leftOpening = 0.5 - 0.24 * sigh
    pose.rightOpening = 0.5 - 0.24 * follow
    pose.leftCurve = 2.1 + 2.8 * sigh
    pose.rightCurve = 2.1 + 2.8 * follow
    pose.leftAngle = -7 - 6 * sigh
    pose.rightAngle = 7 + 6 * follow
    pose.leftY = 1.2 + 2.4 * sigh
    pose.rightY = 1.2 + 2.4 * follow
    pose.gazeY = 0.32 + 0.46 * sigh
    pose.tilt = -1.4 * follow
    pose.pitch = 4 + 7 * follow
  }
  if (state === "questioning") {
    const hook = sampleTrack(getPhase(time, CADENCE.questioning), CURIOUS)
    const follow = sampleTrack(
      getPhase(time, CADENCE.questioning, 180),
      CURIOUS
    )
    pose.question = 1
    pose.leftCurve = hook
    pose.rightCurve = 0.12 + 0.36 * follow
    pose.leftOpening = 0.86 + 0.1 * (1 - hook)
    pose.rightOpening = 0.9 + 0.08 * (1 - follow)
    pose.leftY = -0.85 - 0.9 * hook
    pose.rightY = 0.45 - 0.35 * follow
    pose.leftAngle = -1.5 - 2.5 * hook
    pose.rightAngle = 1.2 * follow
    pose.gazeX = 0.12 + 0.18 * hook
    pose.gazeY = -0.12 - 0.34 * hook
    pose.tilt = 0.6 + 1.8 * follow
    pose.yaw = 1.4 + 1.6 * hook
    pose.pitch = -1.4 - 2.2 * hook
  }
  if (state === "awaiting-permission") {
    const attention = sampleTrack(
      getPhase(time, CADENCE.permission),
      ATTENTION_RAISE
    )
    const follow = sampleTrack(
      getPhase(time, CADENCE.permission, 130),
      ATTENTION_RAISE
    )
    pose.leftOpening = 0.98 + 0.4 * attention
    pose.rightOpening = 0.98 + 0.4 * follow
    pose.leftWidth = 1.08 + 0.14 * attention
    pose.rightWidth = 1.14 - 0.08 * follow
    pose.leftCurve = -1.5 * attention
    pose.rightCurve = -0.9 * follow
    pose.leftY = -0.15 - 2.5 * attention
    pose.rightY = 0.05 - 2.3 * follow
    pose.gazeY = -0.08 - 0.34 * attention
    pose.pitch = -5.2 * attention
    pose.tilt = 2.1 * follow
  }
  if (state === "error") {
    const concern = sampleTrack(getPhase(time, CADENCE.error), CONCERN)
    const follow = sampleTrack(getPhase(time, CADENCE.error, 160), CONCERN)
    pose.leftAngle = -9 * concern
    pose.rightAngle = 11 * follow
    pose.leftY = -0.15 + 0.7 * concern
    pose.rightY = 0.2 + 1.15 * follow
    pose.pitch = 5.5 * concern
    pose.tilt = -2.2 * follow
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

function getChannelDuration(
  key: (typeof POSE_KEYS)[number],
  moveDuration: number,
  settleDuration: number
) {
  "worklet"
  if (key === "gazeX" || key === "gazeY") return settleDuration
  if (moveDuration <= 0) return 0
  if (key === "tilt" || key === "pitch" || key === "yaw")
    return moveDuration * 1.45
  if (
    key === "leftX" ||
    key === "rightX" ||
    key === "leftY" ||
    key === "rightY"
  )
    return moveDuration * 1.12
  if (
    key === "leftOpening" ||
    key === "rightOpening" ||
    key === "leftCurve" ||
    key === "rightCurve" ||
    key === "leftAngle" ||
    key === "rightAngle" ||
    key === "leftWidth" ||
    key === "rightWidth" ||
    key === "leftOuterOpening" ||
    key === "leftInnerOpening" ||
    key === "rightOuterOpening" ||
    key === "rightInnerOpening" ||
    key === "question" ||
    key === "waveform" ||
    key === "error"
  )
    return moveDuration * 0.82
  return moveDuration
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
    const duration = getChannelDuration(key, moveDuration, settleDuration)
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

function createCuriousContour(style: EyeStyle, hook: number) {
  "worklet"
  const amount = Math.max(0, Math.min(1, hook))
  const opening = style === "slant" ? 0.64 : 0.9
  const widthScale = style === "dots" ? 1.22 : style === "square" ? 1.28 : 1.3
  const width = Math.min(7.2, 4.15 * widthScale)
  const height = Math.max(1.5, (style === "slant" ? 9.2 : 4.7) * opening)
  const radius = Math.min(
    style === "square" ? 1.15 : width * 0.58,
    width * 0.72,
    height * 0.72
  )
  const inner = width - radius
  const edge = height - radius
  const corner = radius * 0.5522847498
  const tuck = style === "square" ? 0.7 : style === "dots" ? 0.58 : 0.96
  const liftScale = style === "square" ? 0.44 : style === "dots" ? 0.38 : 0.6
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
  for (let index = 0; index < contour.length; index += 2) {
    const x = contour[index]
    const y = contour[index + 1]
    const nx = x / width
    const ny = -y / height
    const right = Math.max(0, Math.min(1, (nx - 0.05) / 0.9))
    const crown = Math.max(0, Math.min(1, (ny - 0.22) / 0.5)) * right
    const notch =
      Math.max(0, Math.min(1, (nx + 0.05) / 0.85)) *
      Math.max(0, Math.min(1, (ny - 0.0) / 0.28)) *
      Math.max(0, Math.min(1, (0.62 - ny) / 0.28))
    const lip =
      Math.max(0, Math.min(1, (ny - 0.72) / 0.22)) *
      Math.max(0, Math.min(1, (nx - 0.2) / 0.6))
    contour[index] =
      x -
      amount * notch * notch * width * tuck -
      amount * lip * lip * width * (style === "slant" ? 0.92 : 0.5)
    contour[index + 1] = y - amount * crown * crown * height * liftScale
  }
  return contour
}

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
const COLLAPSED_CONTOUR = createEyeContour("dots", 1, 0).map(() => 0)

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
  const question = createCuriousContour(style, pose[`${side}Curve`])
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
