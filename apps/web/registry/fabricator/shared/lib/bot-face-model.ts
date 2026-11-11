// Original silhouettes and timing shared by the DOM and React Native renderers.
export const BOT_FACE_SHAPES = [
  "circle",
  "blob",
  "square",
  "star",
  "clover",
  "heart",
  "flower",
  "droplet",
  "pill",
  "triangle",
  "pentagon",
  "burst",
  "hexagon",
  "squircle",
] as const
export type BotFaceShape = (typeof BOT_FACE_SHAPES)[number]
export const BOT_FACE_COLORS = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "destructive",
  "neutral",
  "blue",
  "indigo",
  "violet",
  "pink",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
] as const
export type BotFaceColor = (typeof BOT_FACE_COLORS)[number]
export type BotFaceEyes = "slant" | "dots" | "square"
export type BotFaceSize = "sm" | "default" | "lg"
export type BotFaceGaze = { x: number; y: number }
export const BOT_FACE_SIZES = { sm: 40, default: 80, lg: 120 } as const

const PATHS: Record<BotFaceShape, string> = {
  circle:
    "M50 5C76 5 95 24 95 50C95 76 76 95 50 95C24 95 5 76 5 50C5 24 24 5 50 5Z",
  blob: "M46 9C61 -2 77 8 80 25C102 31 99 55 83 66C79 89 58 96 44 87C23 98 5 83 12 62C-1 42 12 23 29 23C31 15 38 10 46 9Z",
  square: "M22 8H78Q92 8 92 22V78Q92 92 78 92H22Q8 92 8 78V22Q8 8 22 8Z",
  star: "M50 2C63 2 64 27 71 29C79 32 98 37 98 50C98 63 74 64 71 71C68 79 63 98 50 98C37 98 36 74 29 71C21 68 2 63 2 50C2 37 26 36 29 29C32 21 37 2 50 2Z",
  clover:
    "M50 14C71 -7 99 16 85 40C108 60 84 94 61 83C41 108 7 83 17 61C-8 40 17 7 40 17Q46 17 50 14Z",
  heart:
    "M50 24C18 -7 -9 28 11 53L39 88Q50 101 61 88L89 53C109 28 82 -7 50 24Z",
  flower:
    "M50 8C64 -3 76 6 76 22C96 17 105 34 91 49C109 64 94 85 77 79C78 100 54 105 46 89C29 105 8 89 17 72C-4 68 -3 44 14 39C5 19 27 4 41 17Q44 10 50 8Z",
  droplet:
    "M41 5C48 1 53 4 59 8C77 20 95 40 95 61C95 83 76 97 52 95C24 93 5 76 7 54C9 37 27 13 41 5Z",
  pill: "M36 16H64C106 16 106 84 64 84H36C-6 84 -6 16 36 16Z",
  triangle: "M40 9Q50 1 60 9L92 68Q104 89 80 92H20Q-4 89 8 68Z",
  pentagon:
    "M43 7Q50 2 57 7L88 29Q96 35 93 45L80 83Q77 93 67 93H33Q23 93 20 83L7 45Q4 35 12 29Z",
  burst:
    "M46 7Q53 -2 59 9L67 23L84 19Q98 16 91 31L83 46L95 58Q105 69 89 73L73 77L70 93Q67 106 56 94L45 82L30 91Q16 99 18 83L20 66L6 58Q-6 50 9 43L24 36L23 19Q22 5 35 12L43 18Z",
  hexagon:
    "M34 7H66Q74 7 78 14L95 43Q99 50 95 57L78 86Q74 93 66 93H34Q26 93 22 86L5 57Q1 50 5 43L22 14Q26 7 34 7Z",
  squircle:
    "M50 5C88 5 95 12 95 50C95 88 88 95 50 95C12 95 5 88 5 50C5 12 12 5 50 5Z",
}
export function getBotFacePath(shape: BotFaceShape) {
  return PATHS[shape]
}
export function clampBotFaceGaze({ x, y }: BotFaceGaze): BotFaceGaze {
  "worklet"
  const length = Math.max(1, Math.hypot(x, y))
  return { x: x / length, y: y / length }
}
export function getBotFaceGaze(
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number }
): BotFaceGaze {
  if (bounds.width === 0 || bounds.height === 0) return { x: 0, y: 0 }
  return clampBotFaceGaze({
    x: (x - bounds.x - bounds.width / 2) / (bounds.width * 1.5),
    y: (y - bounds.y - bounds.height / 2) / (bounds.height * 1.5),
  })
}
const GLANCES: readonly BotFaceGaze[] = [
  { x: 0, y: 0 },
  { x: 0.55, y: -0.25 },
  { x: 0, y: 0 },
  { x: -0.5, y: 0.2 },
  { x: -0.25, y: -0.4 },
  { x: 0, y: 0 },
  { x: 0.35, y: 0.3 },
]
export function getBotFaceIdleGaze(elapsed: number): BotFaceGaze {
  "worklet"
  return (
    GLANCES[Math.floor(Math.max(0, elapsed) / 2400) % GLANCES.length] ?? {
      x: 0,
      y: 0,
    }
  )
}
export function getBotFaceBlink(elapsed: number, blink = true) {
  "worklet"
  const phase = ((elapsed % 4700) + 4700) % 4700
  if (!blink || phase < 3200 || phase > 3380) return 1
  return Math.max(0.08, Math.abs(phase - 3280) / (phase < 3280 ? 80 : 100))
}

/** Stable per-instance offsets keep a group of assistants from blinking in unison. */
export function getBotFacePhase(id: string) {
  let hash = 0
  for (const character of id)
    hash = (hash * 31 + character.charCodeAt(0)) % 4700
  return hash
}
