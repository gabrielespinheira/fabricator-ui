import svgpath from "svgpath"

import type { IconElement } from "./types"
import { drawCommonGlyph } from "./ui-common-glyphs"
import { drawFamilyGlyph } from "./ui-families"
import { drawPaths, drawRoundedBox } from "./ui-grid"

const arrow = [
  "M3.25 12h17",
  "m13.75 5.25 6.13 5.87c.52.49.52 1.27 0 1.76l-6.13 5.87",
]
const chevron = ["m8.75 5.5 5.96 5.57c.57.53.57 1.33 0 1.86l-5.96 5.57"]
const doubleChevron = [
  "m5.25 6.75 4.85 4.43c.49.45.49 1.19 0 1.64l-4.85 4.43",
  "m12.6 6.75 4.85 4.43c.49.45.49 1.19 0 1.64l-4.85 4.43",
]
const blockArrow =
  "M3.25 9.05c0-.72.33-1.05 1.05-1.05h8.95V4.1c0-.91 1-1.31 1.63-.68l6.05 6.65c1.03 1.13 1.03 2.73 0 3.86l-6.05 6.65c-.63.63-1.63.23-1.63-.68V16H4.3c-.72 0-1.05-.33-1.05-1.05Z"
const blockArrowDash =
  "M7 9.05C7 8.33 7.33 8 8.05 8h5.2V4.1c0-.91 1-1.31 1.63-.68l6.05 6.65c1.03 1.13 1.03 2.73 0 3.86l-6.05 6.65c-.63.63-1.63.23-1.63-.68V16h-5.2C7.33 16 7 15.67 7 14.95Z"

const controls: Readonly<Record<string, readonly string[]>> = {
  check: ["m3.75 12.25 4.8 4.65c.83.81 2.05.78 2.82-.06L20.25 7.5"],
  "check-check": [
    "m2.55 12.1 4.15 4.2c.7.72 1.7.71 2.41-.02l8-8.43",
    "m11.8 16.75c.71.46 1.5.31 2.06-.28l7.55-8.62",
  ],
  x: ["m5.75 5.75 12.5 12.5m0-12.5-12.5 12.5"],
  plus: ["M12 4.75v14.5M4.75 12h14.5"],
  minus: ["M4.75 12h14.5"],
  equal: ["M4.75 8.9h14.5m-14.5 6.2h14.5"],
  slash: ["m5 19 14-14"],
  divide: ["M4.75 12h14.5", "M11.7 5.5h.6", "M11.7 18.5h.6"],
  asterisk: ["M12 4.5v15M5.5 8.25l13 7.5m0-7.5-13 7.5"],
  ellipsis: ["M4.5 12h.5", "M11.75 12h.5", "M19 12h.5"],
  "ellipsis-vertical": ["M12 4.5v.5", "M12 11.75v.5", "M12 19v.5"],
  "grip-horizontal": [
    "M5.75 8.25h.5",
    "M11.75 8.25h.5",
    "M17.75 8.25h.5",
    "M5.75 15.75h.5",
    "M11.75 15.75h.5",
    "M17.75 15.75h.5",
  ],
  "grip-vertical": [
    "M8.25 5.75v.5",
    "M8.25 11.75v.5",
    "M8.25 17.75v.5",
    "M15.75 5.75v.5",
    "M15.75 11.75v.5",
    "M15.75 17.75v.5",
  ],
  dot: ["M11.75 12h.5"],
  "exclamation-point": ["M12 4.5v9.25", "M11.75 18.25h.5"],
  info: ["M12 10.25v9", "M11.75 5.5h.5"],
  "question-mark": [
    "M7.75 8a4.25 4.25 0 0 1 8.5 0c0 2.1-1.22 3.08-2.7 4.07C12.6 12.71 12 13.4 12 14.75",
    "M11.75 19h.5",
  ],
  stop: [drawRoundedBox([5, 5, 19, 19], 3.75)],
  power: ["M12 3v8.25", "M6.65 6.34a8.45 8.45 0 1 0 10.7 0"],
  percent: [
    "m5.75 18.25 12.5-12.5",
    "M9.75 7.25a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
    "M19.25 16.75a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  ],
  heart: [
    "M12 20.25c-.65 0-1.17-.35-2.07-1.08C5.85 15.83 2.5 13.33 2.5 8.95c0-3.09 2.18-5.2 5.05-5.2 1.86 0 3.4.87 4.45 2.2 1.05-1.33 2.59-2.2 4.45-2.2 2.87 0 5.05 2.11 5.05 5.2 0 4.38-3.35 6.88-7.43 10.22-.9.73-1.42 1.08-2.07 1.08Z",
  ],
}

const heading = "M3.5 5.25v13.5m8.5-13.5v13.5M3.5 12H12"
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

function orient(paths: readonly string[], angle: number) {
  return drawPaths(
    paths.map((d) => svgpath(d).rotate(angle, 12, 12).rel().round(3).toString())
  )
}

function drawDirectionalGlyph(name: string) {
  const match =
    /^(arrow-big|arrow|chevron|chevrons)-(up-left|up-right|down-left|down-right|up|down|left|right)(?:-(dash|from-line|to-line))?$/.exec(
      name
    )
  if (!match) return
  const [, family, direction, modifier] = match
  if (!direction) return
  const angle = angles[direction]
  if (!Object.hasOwn(angles, direction) || angle === undefined) return
  if (family === "arrow-big") {
    return orient(
      modifier === "dash" ? [blockArrowDash, "M3.25 9.25v5.5"] : [blockArrow],
      angle
    )
  }
  if (modifier === "from-line" || modifier === "to-line") {
    const fromLine = modifier === "from-line"
    const parts = fromLine
      ? [
          "M3.25 5.25v13.5",
          "M7.25 12H20.5",
          "m14 5.25 6.13 5.87c.52.49.52 1.27 0 1.76L14 18.75",
        ]
      : [
          "M3 12h13.5",
          "m10 5.75 6.13 5.37c.52.45.52 1.31 0 1.76L10 18.25",
          "M21 5.25v13.5",
        ]
    return orient(parts, angle)
  }
  return orient(
    family === "arrow" ? arrow : family === "chevron" ? chevron : doubleChevron,
    angle
  )
}

export function drawUiMark(name: string): IconElement[] | undefined {
  const fixed = controls[name]
  if (Object.hasOwn(controls, name) && fixed) return drawPaths(fixed)
  return drawDirectionalGlyph(name) ?? drawCommonGlyph(name)
}

export function drawUiGlyph(name: string): IconElement[] | undefined {
  if (name === "info") return drawFamilyGlyph("circle-info", drawUiMark)
  const headingMatch = /^heading-([1-6])$/.exec(name)
  const number = headingNumbers[Number(headingMatch?.[1]) - 1]
  if (number) return drawPaths([heading, number])
  return drawUiMark(name) ?? drawFamilyGlyph(name, drawUiMark)
}
