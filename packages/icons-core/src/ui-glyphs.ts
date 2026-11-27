import svgpath from "svgpath"

import type { IconElement } from "./types"

const arrow = [
  "M4.4 12h14.45",
  "m12.95 6.1 5.52 4.97c.58.52.58 1.34 0 1.86l-5.52 4.97",
]
const chevron = ["m8.9 6.3 5.04 4.7c.59.55.59 1.45 0 2l-5.04 4.7"]
const doubleChevron = [
  "m5.75 7.15 4.35 4.09c.47.44.47 1.08 0 1.52l-4.35 4.09",
  "m12.24 7.15 4.35 4.09c.47.44.47 1.08 0 1.52l-4.35 4.09",
]

const controls: Record<string, string[]> = {
  check: ["m4.82 12.28 4.23 4.06c.65.63 1.55.59 2.16-.05l8-8.35"],
  "check-check": [
    "m2.9 12.45 3.92 3.78c.6.57 1.44.55 2.01-.05l7.16-7.6",
    "m11.75 16.33c.59.49 1.37.42 1.89-.13l7.15-7.58",
  ],
  x: ["m6.85 6.85 10.3 10.3m0-10.3L6.85 17.15"],
  plus: ["M12 6.15v11.7M6.15 12h11.7"],
  minus: ["M6.15 12h11.7"],
  equals: ["M5.5 9.2h13m-13 5.6h13"],
}

const heading = "M4.25 6.55v10.9m7.15-10.9v10.9M4.25 12h7.15"
const headingNumbers = [
  "m16.45 11.85 2.47-1.46c.24-.14.53.02.53.31v6.8",
  "M16.22 11.2c.57-.6 1.31-.89 2.12-.89 1.17 0 2.11.68 2.11 1.75 0 .85-.45 1.42-1.25 2.08l-2.53 2.14a.73.73 0 0 0-.26.56v.66h4.19",
  "M16.39 10.8c.56-.33 1.18-.49 1.81-.49 1.35 0 2.23.71 2.23 1.76 0 1.04-.77 1.64-1.78 1.72 1.19.07 1.94.71 1.94 1.81 0 1.19-.93 1.96-2.35 1.96-.76 0-1.48-.2-2.08-.6",
  "M16.35 10.4v3.23c0 .56.33.87.89.87h3.37m-.41-4.1v7.1",
  "M20.31 10.51h-3.74l-.13 3.15c.54-.29 1.09-.38 1.68-.38 1.47 0 2.44.82 2.44 2.1 0 1.31-.97 2.15-2.42 2.15-.7 0-1.31-.19-1.91-.55",
  "M20.11 10.57c-2.27.33-3.68 2.03-3.68 4.44v.48a2.11 2.11 0 1 0 2.12-2.1c-.93 0-1.64.39-2.07 1.03",
]

const angles: Record<string, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: -90,
  "up-right": -45,
  "down-right": 45,
  "down-left": 135,
  "up-left": -135,
}

export function drawUiGlyph(name: string): IconElement[] | undefined {
  const fixed = controls[name]
  if (Object.hasOwn(controls, name) && fixed)
    return fixed.map((d) => ["path", { d }])
  const headingMatch = /^heading-([1-6])$/.exec(name)
  const number = headingNumbers[Number(headingMatch?.[1]) - 1]
  if (number) return [heading, number].map((d) => ["path", { d }])
  const match = /^(arrow|chevron|chevrons)-(.+)$/.exec(name)
  const type = match?.[1]
  const direction = match?.[2]
  if (!type || !direction) return
  if (type !== "arrow" && direction.includes("-")) return
  const angle = angles[direction]
  if (!Object.hasOwn(angles, direction) || angle === undefined) return
  const drawing =
    type === "arrow" ? arrow : type === "chevron" ? chevron : doubleChevron
  return drawing.map((d) => [
    "path",
    { d: svgpath(d).rotate(angle, 12, 12).rel().round(3).toString() },
  ])
}
