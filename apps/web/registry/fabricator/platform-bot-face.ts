import { BOT_FACE_SHAPES, getBotFacePath } from "./shared/lib/bot-face-model"
import {
  BOT_FACE_STATES,
  getBotFaceEyeContours,
  getBotFaceTarget,
  type BotFaceState,
} from "./shared/lib/bot-face-motion"

// Native samplers interpolate these contours. Blink, pointer gaze and state
// transition continuity are runtime behavior, outside this geometry resource.
const SAMPLE_LOOPS: Record<BotFaceState, number> = {
  idle: 16800,
  listening: 3400,
  thinking: 4000,
  working: 2800,
  speaking: 720,
  happy: 2400,
  sad: 5200,
  questioning: 3200,
  "awaiting-permission": 3800,
  error: 4000,
}

export function createPlatformBotFaceGeometry() {
  const framesPerSecond = 25
  const frameMilliseconds = 1000 / framesPerSecond
  const round = (contour: number[]) =>
    contour.map((value) => Number(value.toFixed(3)))
  const frames = Object.fromEntries(
    BOT_FACE_STATES.map((state) => [
      state,
      Object.fromEntries(
        (["slant", "dots", "square"] as const).map((style) => [
          style,
          Array.from(
            { length: Math.ceil(SAMPLE_LOOPS[state] / frameMilliseconds) },
            (_, index) => {
              const pose = getBotFaceTarget(state, index * frameMilliseconds)
              return {
                left: getBotFaceEyeContours(pose, style, "left").map(round),
                right: getBotFaceEyeContours(pose, style, "right").map(round),
                tilt: pose.tilt,
                pitch: pose.pitch,
                yaw: pose.yaw,
                gazeX: pose.gazeX,
                gazeY: pose.gazeY,
              }
            }
          ),
        ])
      ),
    ])
  )
  return {
    framesPerSecond,
    shapes: Object.fromEntries(
      BOT_FACE_SHAPES.map((shape) => [shape, getBotFacePath(shape)])
    ),
    frames,
  }
}
