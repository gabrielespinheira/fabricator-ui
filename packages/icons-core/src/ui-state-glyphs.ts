import type { IconElement } from "./types"
import { drawInSlot } from "./ui-families"
import { drawUiGlyph, drawUiMark } from "./ui-glyphs"
import { drawPaths, drawRoundedBox } from "./ui-grid"

const marks: Readonly<Record<string, string>> = {
  code: "m8.75 8.25-3.75 3.75 3.75 3.75m6.5-7.5 3.75 3.75-3.75 3.75",
  key: "M14 9a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Zm.85 3-7.6 7.6H3.5v-3.75l4.25-4.25m1.75 4.25 2.5 2.5",
  lock: "M8 9V6.5a4 4 0 0 1 8 0V9" + drawRoundedBox([5.5, 9, 18.5, 20], 2.75),
  pen: "m4 20 4.6-.95L20 7.65a1.35 1.35 0 0 0 0-1.9L18.25 4a1.35 1.35 0 0 0-1.9 0L5 15.4Z",
  reply: "m9.75 6.25-6 5.75 6 5.75M4.25 12h10.5c3.5 0 5.25 1.75 5.25 5.5",
  search: "M16 10A6 6 0 1 1 4 10a6 6 0 0 1 12 0Zm-1.75 4.25 5.5 5.5",
  text: "M4 6h16M4 12h12M4 18h16",
  music:
    "M9 18V6.5l10-2.5v11.5M9 18c0 1.45-1.45 2.5-3.25 2.5S3 19.45 3 18s1.25-2.5 2.75-2.5S9 16.55 9 18Zm10-2.5c0 1.45-1.45 2.5-3.25 2.5S13 16.95 13 15.5s1.25-2.5 2.75-2.5S19 14.05 19 15.5Z",
  sync: "M20 9a8.25 8.25 0 0 0-14.9-2.3L3.5 9M20 4.75V9h-4.25M4 15a8.25 8.25 0 0 0 14.9 2.3l1.6-2.3M4 19.25V15h4.25",
  "1": "m9 8 3.5-2.75V19",
  pulse: "M4 12h4l2.25-4.75 3.5 9.5L16 12h4",
}
const commonStates = ["check", "minus", "plus", "x"]
const messageStates = [
  ...commonStates,
  "code",
  "exclamation-point",
  "heart",
  "lock",
  "more",
  "question-mark",
  "reply",
  "stop",
  "text",
]

type StateFamily = {
  name: string
  suffixes: readonly string[]
  mark: { x: number; y: number; span: number }
  body?: readonly string[]
}

const families: readonly StateFamily[] = [
  {
    name: "heart",
    suffixes: ["pulse"],
    mark: { x: 12, y: 11.3, span: 12.75 },
  },
  {
    name: "folder",
    suffixes: [
      ...commonStates,
      "code",
      "dot",
      "down",
      "heart",
      "key",
      "lock",
      "pen",
      "search",
      "sync",
      "up",
    ],
    mark: { x: 12, y: 15.4, span: 7.7 },
  },
  {
    name: "bookmark",
    suffixes: commonStates,
    mark: { x: 12, y: 10.3, span: 7.7 },
  },
  {
    name: "message-circle",
    suffixes: messageStates,
    mark: { x: 12.2, y: 11.6, span: 8.25 },
  },
  {
    name: "message-square",
    suffixes: messageStates,
    mark: { x: 12, y: 10.75, span: 8.5 },
  },
  {
    name: "file",
    suffixes: [
      ...commonStates,
      "code",
      "exclamation-point",
      "heart",
      "key",
      "lock",
      "music",
      "play",
      "question-mark",
      "search",
      "terminal",
      "down",
      "up",
    ],
    mark: { x: 12, y: 14.25, span: 7.25 },
  },
  {
    name: "monitor",
    suffixes: [
      "activity",
      "check",
      "dot",
      "down",
      "key",
      "lock",
      "pause",
      "play",
      "stop",
      "up",
      "x",
    ],
    mark: { x: 12, y: 10.7, span: 7.25 },
  },
  {
    name: "bell",
    suffixes: ["check", "dot", "minus", "plus"],
    mark: { x: 12, y: 11.6, span: 5.5 },
  },
  {
    name: "book",
    suffixes: [
      ...commonStates,
      "down",
      "up",
      "heart",
      "exclamation-point",
      "key",
      "lock",
      "search",
      "text",
    ],
    body: [
      "M3.75 6c0-2.25 1.3-3.5 3.55-3.5h12.45c.6 0 1 .4 1 1v16.75c0 .6-.4 1-1 1H7.3c-2.25 0-3.55-1.2-3.55-3.5Z",
      "M3.75 17.75c0-1.95 1.25-3 3.55-3h13.45",
    ],
    mark: { x: 12.4, y: 8.75, span: 7 },
  },
  {
    name: "user-round",
    suffixes: [
      ...commonStates,
      "arrow-left",
      "exclamation-point",
      "key",
      "pen",
      "search",
      "shield",
      "star",
    ],
    body: [
      "M13.25 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z",
      "M2.5 21.25c0-4 2.15-6.25 6.25-6.25 1.35 0 2.52.23 3.5.68",
    ],
    mark: { x: 17.75, y: 16.75, span: 7.2 },
  },
  {
    name: "user",
    suffixes: [
      ...commonStates,
      "exclamation-point",
      "key",
      "lock",
      "pen",
      "search",
      "shield",
      "star",
    ],
    body: [
      "M13.25 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z",
      "M2.5 21.25v-1.5C2.5 16.75 4.25 15 7.25 15H12",
    ],
    mark: { x: 17.75, y: 16.75, span: 7.2 },
  },
]

export function hasStateFrame(name: string) {
  return families.some((family) => family.name === name && !family.body)
}

export function drawStateMark(suffix: string) {
  const path = marks[suffix]
  if (Object.hasOwn(marks, suffix) && path) return drawPaths([path])
  if (suffix === "more") return drawUiMark("ellipsis")
  if (suffix === "up" || suffix === "down") return drawUiMark(`arrow-${suffix}`)
  const name = suffix.replace(/-2$/, "")
  return drawUiMark(name) ?? drawUiGlyph(name)
}

export function drawStateGlyph(
  name: string,
  getBase: (name: string) => IconElement[] | undefined
) {
  for (const { name: base, suffixes, mark, body } of families) {
    if (!name.startsWith(`${base}-`)) continue
    const suffix = name.slice(base.length + 1)
    if (!suffixes.includes(suffix)) continue
    const state = drawStateMark(suffix)
    const frame = body ? drawPaths(body) : getBase(base)
    if (!state || !frame) return
    const slot = suffix === "dot" ? { ...mark, span: 0.65 } : mark
    return {
      node: [...frame, ...drawInSlot(state, slot)],
      frame: body ? `${base}-state` : base,
      ...(body === undefined && { base }),
    }
  }
}
