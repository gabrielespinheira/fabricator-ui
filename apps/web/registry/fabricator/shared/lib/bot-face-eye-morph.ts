import { type BotFaceEyes } from "./bot-face-model"
import {
  getBotFaceEyeContours,
  type BotFacePose,
  type BotFaceState,
} from "./bot-face-motion"

const POINTS = 48
type ContourOrder = { shift: number; direction: number }
export type BotFaceEyeMorph = {
  shouldMatch: boolean
  state: BotFaceState
  style: BotFaceEyes
  contours: number[][]
  velocity: number[][]
  orders: ContourOrder[]
  anchors: (number[] | null)[]
}

// Equal perimeter distances make a capsule, hook, arc and cross comparable.
function sampleContour(curve: number[]) {
  "worklet"
  const dense = [curve[0], curve[1]]
  const distances = [0]
  let startX = curve[0]
  let startY = curve[1]
  let length = 0
  for (let segment = 2; segment < curve.length; segment += 6) {
    for (let step = 1; step <= 8; step++) {
      const time = step / 8
      const inverse = 1 - time
      const first = inverse ** 3
      const second = 3 * inverse ** 2 * time
      const third = 3 * inverse * time ** 2
      const last = time ** 3
      const x =
        startX * first +
        curve[segment] * second +
        curve[segment + 2] * third +
        curve[segment + 4] * last
      const y =
        startY * first +
        curve[segment + 1] * second +
        curve[segment + 3] * third +
        curve[segment + 5] * last
      length += Math.hypot(
        x - dense[dense.length - 2],
        y - dense[dense.length - 1]
      )
      dense.push(x, y)
      distances.push(length)
    }
    startX = curve[segment + 4]
    startY = curve[segment + 5]
  }
  const points: number[] = []
  let cursor = 1
  for (let point = 0; point < POINTS; point++) {
    if (length < 0.000001) {
      points.push(curve[0], curve[1])
      continue
    }
    const distance = (point * length) / POINTS
    while (cursor < distances.length - 1 && distances[cursor] < distance)
      cursor++
    const span = distances[cursor] - distances[cursor - 1]
    const progress = span > 0 ? (distance - distances[cursor - 1]) / span : 0
    const index = cursor * 2
    points.push(
      dense[index - 2] + (dense[index] - dense[index - 2]) * progress,
      dense[index - 1] + (dense[index + 1] - dense[index - 1]) * progress
    )
  }
  return points
}

function getTargetContours(pose: BotFacePose, style: BotFaceEyes) {
  "worklet"
  return [
    ...getBotFaceEyeContours(pose, style, "left"),
    ...getBotFaceEyeContours(pose, style, "right"),
  ].map(sampleContour)
}

function getArea(contour: number[]) {
  "worklet"
  let area = 0
  for (let index = 0; index < contour.length; index += 2) {
    const next = (index + 2) % contour.length
    area +=
      contour[index] * contour[next + 1] - contour[next] * contour[index + 1]
  }
  return area / 2
}

function getCenter(contour: number[]) {
  "worklet"
  let x = 0
  let y = 0
  for (let index = 0; index < contour.length; index += 2) {
    x += contour[index] / POINTS
    y += contour[index + 1] / POINTS
  }
  return [x, y]
}

function getNearestPoint(contour: number[], center: number[]) {
  "worklet"
  let nearest = 0
  let distance = Infinity
  for (let index = 0; index < contour.length; index += 2) {
    const next =
      (contour[index] - center[0]) ** 2 + (contour[index + 1] - center[1]) ** 2
    if (next >= distance) continue
    nearest = index
    distance = next
  }
  return [contour[nearest], contour[nearest + 1]]
}

function getContourOrder(source: number[], target: number[]): ContourOrder {
  "worklet"
  const sourceArea = getArea(source)
  const targetArea = getArea(target)
  if (Math.abs(sourceArea) < 0.000001 || Math.abs(targetArea) < 0.000001)
    return { shift: 0, direction: 1 }
  const direction = sourceArea * targetArea < 0 ? -1 : 1
  let best = 0
  let distance = Infinity
  for (let shift = 0; shift < POINTS; shift++) {
    let cost = 0
    for (let point = 0; point < POINTS; point++) {
      const next = ((shift + direction * point + POINTS) % POINTS) * 2
      cost +=
        (source[point * 2] - target[next]) ** 2 +
        (source[point * 2 + 1] - target[next + 1]) ** 2
    }
    if (cost >= distance) continue
    best = shift
    distance = cost
  }
  return { shift: best, direction }
}

export function createBotFaceEyeMorph(
  pose: BotFacePose,
  style: BotFaceEyes,
  state: BotFaceState
): BotFaceEyeMorph {
  "worklet"
  const contours = getTargetContours(pose, style)
  return {
    shouldMatch: true,
    state,
    style,
    contours,
    velocity: contours.map((contour) => contour.map(() => 0)),
    orders: contours.map(() => ({ shift: 0, direction: 1 })),
    anchors: contours.map(() => null),
  }
}

/** Match once on entry; keep that correspondence through gestures and retargets. */
export function stepBotFaceEyeMorph(
  current: BotFaceEyeMorph,
  pose: BotFacePose,
  style: BotFaceEyes,
  state: BotFaceState,
  elapsed: number,
  duration: number
): BotFaceEyeMorph {
  "worklet"
  if (duration <= 0) return createBotFaceEyeMorph(pose, style, state)
  if (elapsed <= 0) return current
  const target = getTargetContours(pose, style)
  const isRetargeted =
    current.shouldMatch || current.state !== state || current.style !== style
  const source = current.contours.map((contour) => [...contour])
  const orders = isRetargeted
    ? target.map((contour, index) => getContourOrder(source[index], contour))
    : current.orders
  const anchors = isRetargeted
    ? target.map((contour, index) => {
        if (Math.abs(getArea(contour)) > 0.000001) return null
        return getNearestPoint(
          target[Math.floor(index / 3) * 3],
          getCenter(source[index])
        )
      })
    : current.anchors
  if (isRetargeted) {
    for (let index = 0; index < source.length; index++) {
      if (
        Math.abs(getArea(source[index])) > 0.000001 ||
        Math.abs(getArea(target[index])) < 0.000001
      )
        continue
      const anchor = getNearestPoint(
        source[Math.floor(index / 3) * 3],
        getCenter(target[index])
      )
      source[index] = source[index].map(
        (_, coordinate) => anchor[coordinate % 2]
      )
    }
  }
  const frequency = 6 / duration
  const decay = Math.exp(-frequency * elapsed)
  const contours: number[][] = []
  const velocity: number[][] = []
  for (let part = 0; part < source.length; part++) {
    const points: number[] = []
    const speeds: number[] = []
    for (let coordinate = 0; coordinate < source[part].length; coordinate++) {
      const point = Math.floor(coordinate / 2)
      const next =
        ((orders[part].shift + orders[part].direction * point + POINTS) %
          POINTS) *
          2 +
        (coordinate % 2)
      const destination = anchors[part]?.[coordinate % 2] ?? target[part][next]
      const displacement = source[part][coordinate] - destination
      const momentum =
        current.velocity[part][coordinate] + frequency * displacement
      points.push(destination + (displacement + momentum * elapsed) * decay)
      speeds.push(
        (current.velocity[part][coordinate] - frequency * momentum * elapsed) *
          decay
      )
    }
    contours.push(points)
    velocity.push(speeds)
  }
  return {
    shouldMatch: false,
    state,
    style,
    contours,
    velocity,
    orders,
    anchors,
  }
}

export function getBotFaceMorphedEyePath(
  morph: BotFaceEyeMorph,
  side: "left" | "right"
) {
  "worklet"
  let path = ""
  const first = side === "left" ? 0 : 3
  for (let part = first; part < first + 3; part++) {
    const contour = morph.contours[part]
    const last = contour.length - 2
    path += `M${((contour[last] + contour[0]) / 2).toFixed(3)} ${((contour[last + 1] + contour[1]) / 2).toFixed(3)}`
    for (let index = 0; index < contour.length; index += 2) {
      const next = (index + 2) % contour.length
      path += `Q${contour[index].toFixed(3)} ${contour[index + 1].toFixed(3)} ${((contour[index] + contour[next]) / 2).toFixed(3)} ${((contour[index + 1] + contour[next + 1]) / 2).toFixed(3)}`
    }
    path += "Z"
  }
  return path
}
