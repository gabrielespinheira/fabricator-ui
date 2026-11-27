import fs from "node:fs"
import path from "node:path"
import svgpath from "svgpath"

import { loadDuotoneIcons } from "./duotone"
import { getBounds } from "./geometry"
import { loadOutlineIcons } from "./outline"
import { ROUNDED_SOURCES } from "./paths"
import type { IconMotion } from "./runtime/types"
import { parseSvg } from "./svg"
import type { IconElement, OutlineIcon } from "./types"
import {
  getContour,
  isInContour,
  roundOutline,
  sampleContour,
  splitPath,
} from "./ui-geometry"
import { redrawUiOutline } from "./ui-redraw"

export const UI_STROKE_WIDTH = 1.5

const directions = ["left", "right", "up", "down"] as const
export type UiIcon = OutlineIcon & {
  fill: { node: IconElement[]; cutout: IconElement[] }
  duotone: { name: string; node: IconElement[]; secondary: IconElement[] }
  motion: IconMotion
}

const categoryMotion: Record<string, IconMotion> = {
  arrows: "sweep",
  charts: "rise",
  layout: "widen",
  text: "press",
  "letters-digits": "press",
  audio: "pulse",
  multimedia: "pulse",
  connectivity: "pulse",
  communications: "lift",
  communication: "lift",
  mail: "lift",
  notifications: "pulse",
  weather: "sweep",
  devices: "press",
  development: "press",
  tools: "swing",
  design: "lean",
  shapes: "pulse",
  transportation: "right",
  travel: "right",
  navigation: "hop",
  cursors: "press",
  files: "open",
  shopping: "lift",
  finance: "rise",
  buildings: "rise",
  home: "rise",
  security: "press",
  photography: "spark",
  sustainability: "sweep",
  nature: "sweep",
  animals: "hop",
  sports: "hop",
  gaming: "press",
  emoji: "nod",
  time: "turn",
  people: "nod",
  account: "nod",
  social: "nod",
  accessibility: "nod",
  "food-beverage": "lean",
  math: "mark",
  science: "pulse",
  medical: "pulse",
  seasons: "sweep",
}

export function getIconMotion(
  name: string,
  categories: string[] = []
): IconMotion {
  if (
    /^(arrow|chevron|move|corner|shift|navigation|gesture-swipe)-/.test(name)
  ) {
    const direction = name
      .split("-")
      .find((part): part is (typeof directions)[number] =>
        directions.some((value) => value === part)
      )
    if (direction) return direction
  }
  if (/^(dot|circle-small|ellipsis-vertical)$/.test(name)) return "hop"
  if (/^(circle|disc|disc-2)$/.test(name)) return "pulse"
  if (/^(circle|octagon|triangle)-exclamation-point$/.test(name)) return "pulse"
  if (/^(bookmark|book-marked)(-|$)/.test(name)) return "bookmark"
  if (/^(pen|pencil|highlighter|edit|square-pen)(-|$)/.test(name))
    return "pencil"
  if (/^(bell|alarm-clock)(-|$)/.test(name)) return "bell"
  if (/^(toggle|switch)(-|$)/.test(name)) return "toggle"
  if (
    /^(rotate|refresh|repeat|spin|loader|circle-dashed|fan|orbit|clock|disc|settings|cog|sun)(-|$)/.test(
      name
    )
  )
    return "turn"
  if (/^(folder|door|book|archive|box|package|clipboard|file)(-|$)/.test(name))
    return "open"
  if (
    /^(heart|activity|radio|wifi|waves|volume|signal|bluetooth|audio|mic)(-|$)/.test(
      name
    )
  )
    return "pulse"
  if (/^(search|scan|focus|eye|locate|inspect|view|magnifying)(-|$)/.test(name))
    return "scan"
  if (
    /^(sparkle|sparkles|star|zap|flash|camera|lightbulb|flame)(-|$)/.test(name)
  )
    return "spark"
  if (
    /^(list|table|grid|panel|column|columns|rows|sidebar|layout|align|dock)(-|$)/.test(
      name
    )
  )
    return "widen"
  if (
    /^(hand|pointer|mouse|cursor|keyboard|fingerprint|lock|unlock|plug)(-|$)/.test(
      name
    )
  )
    return "press"
  if (
    /^(chart|chart-no-axes|trending|battery|database|server|gauge|meter)(-|$)/.test(
      name
    )
  )
    return "rise"
  if (
    /^(map-pin|map-pinned|pin|flag|signpost|footprints|step|person-standing)(-|$)/.test(
      name
    )
  )
    return "hop"
  if (
    /^(hammer|wrench|scissors|paintbrush|brush|paint|axe|pipette|sword)(-|$)/.test(
      name
    )
  )
    return "swing"
  if (/^(wind|cloud|umbrella|leaf|leaves|sailboat|antenna)(-|$)/.test(name))
    return "sweep"
  if (/^(user|users|contact|person|smile|laugh|frown|annoyed)(-|$)/.test(name))
    return "nod"
  if (/^(download|save|import)(-|$)/.test(name)) return "down"
  if (/^(upload|send|share|rocket|external-link|message|mail)(-|$)/.test(name))
    return "lift"
  if (/(^|-)(check|plus|minus|x|tick|dot)(-|$)/.test(name)) return "mark"
  const [primary] = categories.filter((category) => category in categoryMotion)
  return primary ? (categoryMotion[primary] ?? "settle") : "settle"
}

function readDrawing(name: string, weight: string) {
  const file = path.join(ROUNDED_SOURCES, `${name}-${weight}.svg`)
  if (!fs.existsSync(file)) return
  return parseSvg(fs.readFileSync(file, "utf8"))
}

function stroke([tag, attrs]: IconElement, width: number): IconElement {
  return [
    tag,
    {
      ...attrs,
      stroke: "currentColor",
      "stroke-width": String(width),
      fill: attrs.fill ?? "none",
    },
  ]
}

function isCovered(
  shape: IconElement,
  contours: ReturnType<typeof sampleContour>[]
) {
  const pointCloud = shape[0] === "path" ? sampleContour(shape[1].d ?? "") : []
  const { minX, minY, maxX, maxY } = getBounds([shape])
  pointCloud.push(
    [minX, (minY + maxY) / 2],
    [maxX, (minY + maxY) / 2],
    [(minX + maxX) / 2, minY],
    [(minX + maxX) / 2, maxY]
  )
  return contours.some(
    (contour) =>
      pointCloud.filter((point) => isInContour(point, contour)).length /
        pointCloud.length >=
      0.7
  )
}

function widthWithinCanvas(shape: IconElement, width: number) {
  const { minX, minY, maxX, maxY } = getBounds([shape])
  return Math.min(width, 2 * Math.min(minX, minY, 24 - maxX, 24 - maxY))
}

function isSameSurface(
  first: ReturnType<typeof sampleContour>,
  second: ReturnType<typeof sampleContour>
) {
  if (first.length !== second.length) return false
  return (
    first.every(([x, y]) =>
      second.some(
        ([otherX, otherY]) =>
          Math.abs(x - otherX) < 0.22 && Math.abs(y - otherY) < 0.22
      )
    ) &&
    second.every(([x, y]) =>
      first.some(
        ([otherX, otherY]) =>
          Math.abs(x - otherX) < 0.22 && Math.abs(y - otherY) < 0.22
      )
    )
  )
}

function buildPaint(node: IconElement[]) {
  const parts = node.flatMap(([tag, attrs]): IconElement[] => {
    if (tag !== "path") return [[tag, attrs]]
    return splitPath(attrs.d ?? "").map(([, part]) => [
      "path",
      { ...attrs, ...part },
    ])
  })
  const contours: string[] = []
  const polygons: ReturnType<typeof sampleContour>[] = []
  const details: IconElement[] = []
  for (const shape of parts) {
    const contour = getContour(shape)
    if (!contour) {
      details.push(shape)
      continue
    }
    const polygon = sampleContour(contour)
    // Coincident outlines would cancel under even-odd paint (for example mail-search's lens).
    if (polygons.some((other) => isSameSurface(other, polygon))) continue
    contours.push(contour)
    polygons.push(polygon)
  }

  const cutout: IconElement[] = []
  const linework: IconElement[] = []
  for (const shape of details) {
    if (isCovered(shape, polygons)) cutout.push(stroke(shape, 1.65))
    else linework.push(stroke(shape, widthWithinCanvas(shape, 2.6)))
  }

  if (contours.length > 0) {
    const face: IconElement = [
      "path",
      { d: contours.join(""), "fill-rule": "evenodd" },
    ]
    return {
      fill: { node: [face, ...linework], cutout },
      secondary: [face],
    }
  }

  const width = (shape: IconElement) => {
    const bounds = getBounds([shape])
    return Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  }
  const largest = details.reduce(
    (first, second) =>
      !first || width(second) > width(first) ? second : first,
    details[0]
  )
  return {
    fill: { node: linework, cutout },
    secondary: largest
      ? [stroke(largest, widthWithinCanvas(largest, 3.75))]
      : [],
  }
}

const authoredFamilies = {
  folder: ["check", "down", "minus", "plus", "up", "x"],
  calendar: ["1", "check", "days", "minus-2", "plus-2", "range", "x"],
  "message-circle": [
    "check",
    "code",
    "exclamation-point",
    "heart",
    "more",
    "plus",
    "question-mark",
    "reply",
    "x",
  ],
  bell: ["ring"],
  heart: ["pulse"],
}

function getFamilyDrawings(icons: OutlineIcon[]) {
  const result = new Map<
    string,
    { node: IconElement[]; secondary?: IconElement[] }
  >()
  const byName = new Map(icons.map((icon) => [icon.name, icon]))
  for (const [name, suffixes] of Object.entries(authoredFamilies)) {
    const base = byName.get(name)
    const drawing = readDrawing(name, "outline")
    if (!base || !drawing) continue
    const secondary = readDrawing(name, "duotone")?.groups.find(
      ({ attributes }) => attributes.id === "secondary"
    )?.node
    const baseParts = base.node.map((part) => JSON.stringify(part))
    for (const suffix of suffixes) {
      const member = byName.get(`${name}-${suffix}`)
      if (!member) continue
      const memberParts = new Set(
        member.node.map((part) => JSON.stringify(part))
      )
      if (!baseParts.every((part) => memberParts.has(part))) continue
      const modifiers = roundOutline(
        member.node.filter((part) => !baseParts.includes(JSON.stringify(part)))
      )
      // The folder seam uses the top portion of the existing modifier's space.
      const details =
        name === "folder"
          ? modifiers.map(
              ([tag, attrs]): IconElement => [
                tag,
                tag === "path" && attrs.d
                  ? {
                      ...attrs,
                      d: svgpath(attrs.d)
                        .translate(0, 1.55)
                        .round(3)
                        .toString(),
                    }
                  : attrs,
              ]
            )
          : modifiers
      result.set(member.name, {
        node: [...drawing.node, ...details],
        ...(secondary && { secondary }),
      })
    }
  }
  return result
}

/** Derive the shipped drawings from the frozen name inventory and authored overrides. */
export function loadUiIcons(): UiIcon[] {
  const bookmark = readDrawing("bookmark", "outline")?.node[0]
  const duotoneSources = new Map(
    loadDuotoneIcons().map((icon) => [icon.name, icon])
  )
  const icons = loadOutlineIcons()
  const families = getFamilyDrawings(icons)
  return icons.map((icon) => {
    const authoredOutline = readDrawing(icon.name, "outline")
    const authoredFill = readDrawing(icon.name, "fill")
    const authoredDuotone = readDrawing(icon.name, "duotone")
    const isBookmarkModifier = /^bookmark-(check|minus|plus|x)$/.test(icon.name)
    const family = families.get(icon.name)
    const node =
      authoredOutline?.node ??
      family?.node ??
      (isBookmarkModifier && bookmark
        ? [
            bookmark,
            ...roundOutline(icon.node.filter((shape) => !getContour(shape))),
          ]
        : redrawUiOutline(icon))
    const { fill, secondary } = buildPaint(node)
    return {
      ...icon,
      node,
      fill: authoredFill ? { node: authoredFill.node, cutout: [] } : fill,
      duotone: {
        name: icon.name,
        node,
        secondary:
          authoredDuotone?.groups.find(
            ({ attributes }) => attributes.id === "secondary"
          )?.node ??
          family?.secondary ??
          duotoneSources.get(icon.name)?.secondary ??
          secondary,
      },
      motion: getIconMotion(icon.name, icon.categories),
    }
  })
}
