import type { IconElement } from "./types"
import { drawInSlot } from "./ui-families"
import { drawPaths, drawRoundedBox } from "./ui-grid"
import { drawStateMark } from "./ui-state-glyphs"
import { UI_STROKE_WIDTH } from "./validate"

export type CalendarFrame = {
  node: IconElement[]
  fill: IconElement[]
  secondary: IconElement[]
}

type CalendarDrawing = {
  node: IconElement[]
  fill: { node: IconElement[]; cutout: IconElement[] }
  secondary: IconElement[]
}

const cornerMarks: Readonly<Record<string, readonly string[]>> = {
  "check-2": ["m14.5 17.7 2 1.95q.47.45.92-.01l3.23-3.5"],
  clock: ["M13.25 17.25a4 4 0 1 1 8 0 4 4 0 1 1-8 0Z", "M17.25 15.35v2l1.55.9"],
  cog: [
    "M14.7 17.5a2.55 2.55 0 1 1 5.1 0 2.55 2.55 0 1 1-5.1 0Z",
    "M17.25 13.5v1.45m0 5.1v1.45m-3.47-6.02 1.26.73m4.42 2.55 1.26.73m0-4.01-1.26.73m-4.42 2.55-1.26.73",
  ],
  minus: ["M14.5 17.75H21.5"],
  plus: ["M14.5 17.75H21.5M18 14.25v7"],
  search: [
    "M13.8 16.85a3.05 3.05 0 1 1 6.1 0 3.05 3.05 0 1 1-6.1 0Z",
    "m19 19 2.55 2.5",
  ],
  "x-2": ["m15.25 15.25 5.5 5.5m0-5.5-5.5 5.5"],
}

function strokes(node: IconElement[]): IconElement[] {
  return node.map(([tag, attrs]) => [
    tag,
    {
      ...attrs,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": String(UI_STROKE_WIDTH),
    },
  ])
}

function surfaces(paths: string[]): IconElement[] {
  return paths.map((d) => [
    "path",
    {
      d,
      fill: "currentColor",
      stroke: "currentColor",
      "stroke-width": String(UI_STROKE_WIDTH),
    },
  ])
}

function drawDisabledCalendar(): CalendarDrawing {
  const top = "M7.9 4.75H17.5C19.75 4.75 21 6 21 8.25V18"
  const bottom = "M3 6.7V18C3 20.25 4.25 21.5 6.5 21.5H17.7"
  const faces = [`${top}Z`, `${bottom}Z`]
  const marks = drawPaths(["M16 2.5v4.65", "M2.5 2.5 21.5 21.5"])
  return {
    node: [...drawPaths([top, bottom, "M3 10.25h3.5m7.2 0H21"]), ...marks],
    fill: {
      node: [...surfaces(faces), ...strokes(marks)],
      cutout: strokes(drawPaths(["M1.5 10.25h5.55m6 0h9.45"])),
    },
    secondary: drawPaths(faces),
  }
}

function drawStackedCalendars(): CalendarDrawing {
  const front = drawRoundedBox([7.25, 4.25, 21, 17.25], 2.65)
  const back = "M3 8.75v9.65c0 1.95 1.15 3.1 3.1 3.1h10.25"
  const pins = "M11.25 2.5v3.75m5.75-3.75v3.75"
  return {
    node: drawPaths([back, front, "M7.25 8.75H21", pins]),
    fill: {
      node: [...surfaces([front]), ...strokes(drawPaths([back, pins]))],
      cutout: strokes(drawPaths(["M6 8.75H22.25"])),
    },
    secondary: drawPaths([front]),
  }
}

function drawDateMark(suffix: string) {
  if (suffix === "days")
    return drawPaths([
      "M8 13.75h.2m3.8 0h.2m3.8 0h.2M8 17.75h.2m3.8 0h.2m3.8 0h.2",
    ])
  if (suffix === "range")
    return drawPaths(["M7 13.75h.2m3.55 0H17M7 17.75h6.25m3.55 0h.2"])
  const mark = drawStateMark(suffix)
  return mark && drawInSlot(mark, { x: 12, y: 15.85, span: 6.5 })
}

/** Reuse the calendar's top, sides, pins and divider at their drawn coordinates. */
export function drawCalendarGlyph(
  name: string,
  frame: CalendarFrame
): CalendarDrawing | undefined {
  if (name === "calendar")
    return {
      node: frame.node,
      fill: { node: frame.fill, cutout: [] },
      secondary: frame.secondary,
    }
  if (name === "calendars") return drawStackedCalendars()
  if (!name.startsWith("calendar-")) return
  const suffix = name.slice("calendar-".length)
  if (suffix === "off") return drawDisabledCalendar()

  const [body, , divider, pins] = frame.node
  const spine = body?.[1].d
  if (!body || !spine || !divider || !pins)
    throw new Error("Calendar outline needs a body, corner, divider and pins")

  if (suffix === "fold") {
    const face = `${spine}V15.75L15.25 21.5H11Z`
    const fold = "M15.25 21.5v-3.4c0-1.47.88-2.35 2.35-2.35H21"
    return {
      node: [
        body,
        ...drawPaths(["M21 12.25v3.5l-5.75 5.75H11", fold]),
        divider,
        pins,
      ],
      fill: {
        node: [...surfaces([face]), ...strokes([pins])],
        cutout: strokes(drawPaths(["M1.5 10.25H22.5", fold])),
      },
      secondary: drawPaths([face]),
    }
  }

  const badge = Object.hasOwn(cornerMarks, suffix)
    ? cornerMarks[suffix]
    : undefined
  if (badge) {
    const mark = drawPaths(badge)
    const face = `${spine}H15.75c-3.15 0-4.75 1.8-4.75 4.9Z`
    return {
      node: [body, divider, pins, ...mark],
      fill: {
        node: [...surfaces([face]), ...strokes([pins, ...mark])],
        cutout: strokes(drawPaths(["M1.5 10.25H22.5"])),
      },
      secondary: drawPaths([face]),
    }
  }

  const mark = drawDateMark(suffix)
  if (!mark) return
  return {
    node: [...frame.node, ...mark],
    fill: { node: frame.fill, cutout: strokes(mark) },
    secondary: frame.secondary,
  }
}
