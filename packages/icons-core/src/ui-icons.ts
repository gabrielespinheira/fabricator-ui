import fs from "node:fs"
import path from "node:path"

import { loadDuotoneIcons } from "./duotone"
import { getBounds } from "./geometry"
import { getArtworkScale, measureIconFootprint } from "./icon-footprint"
import { getIconMotion } from "./icon-motion"
import { loadOutlineIcons } from "./outline"
import { ROUNDED_SOURCES } from "./paths"
import {
  getSidebarToggleDrawing,
  SIDEBAR_TOGGLE_NAME,
} from "./runtime/sidebar-toggle"
import type { IconData, IconMotion, IconWeight } from "./runtime/types"
import { renderUiSvg } from "./runtime/ui-svg"
import { parseSvg } from "./svg"
import type { IconElement, OutlineIcon } from "./types"
import { drawCalendarGlyph, type CalendarFrame } from "./ui-calendar-glyphs"
import { getSharedFrame } from "./ui-families"
import {
  getContour,
  isInContour,
  sampleContour,
  splitPath,
} from "./ui-geometry"
import { drawUiGlyph } from "./ui-glyphs"
import { fitUiGrid } from "./ui-grid"
import { redrawUiOutline } from "./ui-redraw"
import { drawStateGlyph, hasStateFrame } from "./ui-state-glyphs"
import { UI_STROKE_WIDTH } from "./validate"

export { UI_STROKE_WIDTH } from "./validate"

export type UiIcon = OutlineIcon & {
  fill: { node: IconElement[]; cutout: IconElement[] }
  duotone: { name: string; node: IconElement[]; secondary: IconElement[] }
  motion: IconMotion
  opticalScales: Partial<Record<IconWeight, number>>
}

export function getUiIconData(
  icon: UiIcon,
  weight: IconWeight = "outline"
): IconData {
  const opticalScale = icon.opticalScales[weight]
  const base = {
    name: icon.name,
    ...(opticalScale !== undefined && { opticalScale }),
  }
  if (weight === "fill") {
    const { node, cutout } = icon.fill
    return {
      ...base,
      node,
      paint: "fill",
      ...(cutout.length > 0 && { cutout }),
    }
  }
  return {
    ...base,
    node: icon.node,
    ...(weight === "duotone" && { secondary: icon.duotone.secondary }),
  }
}

function getMaximumScale(data: IconData) {
  // Leave room around the artwork at the heaviest preview stroke.
  const edge = Math.max(
    ...[...data.node, ...(data.secondary ?? [])].map((shape) => {
      const { minX, minY, maxX, maxY } = getBounds([shape])
      const { stroke, "stroke-width": width } = shape[1]
      const inheritsStroke = data.node.includes(shape) && data.paint !== "fill"
      const margin =
        stroke === "none" || (!stroke && !inheritsStroke)
          ? 0
          : Number(width ?? 3) / 2
      return Math.max(12 - minX, 12 - minY, maxX - 12, maxY - 12) + margin
    })
  )
  return 11.7 / edge
}

function measureScale(data: IconData, maxScale: number) {
  return getArtworkScale(measureIconFootprint(renderUiSvg(data)), { maxScale })
}

type FramedDrawing = { icon: UiIcon; frame?: string }

function calibrateUiIcons(drawings: FramedDrawing[]) {
  const measured = drawings.map(({ icon, frame: family }) => {
    if (icon.name === SIDEBAR_TOGGLE_NAME)
      return { icon, family, outline: 1, fill: 1, limit: 1 }
    const outlineData = getUiIconData(icon)
    const fillData = getUiIconData(icon, "fill")
    const duotoneData = getUiIconData(icon, "duotone")
    const outlineLimit = Math.min(
      getMaximumScale(outlineData),
      getMaximumScale(duotoneData)
    )
    const fillLimit = getMaximumScale(fillData)
    const outline =
      (measureScale(outlineData, outlineLimit) +
        measureScale(duotoneData, outlineLimit)) /
      2
    return {
      icon,
      family,
      outline: Math.floor(outline * 1000) / 1000,
      fill: measureScale(fillData, fillLimit),
      limit: Math.min(outlineLimit, fillLimit),
    }
  })

  const families = new Map<string, typeof measured>()
  for (const drawing of measured) {
    if (!drawing.family) continue
    const members = families.get(drawing.family) ?? []
    members.push(drawing)
    families.set(drawing.family, members)
  }
  for (const [name, members] of families) {
    const reference =
      members.find(({ icon }) => icon.name === name) ?? members[0]
    if (!reference) continue
    const limit = Math.min(...members.map((member) => member.limit))
    // Keep stroke and solid ink balanced without moving the frame between weights.
    const target = (reference.outline + reference.fill) / 2
    const scale = Math.floor(Math.min(target, limit) * 1000) / 1000
    for (const member of members) {
      member.outline = scale
      member.fill = scale
    }
  }

  return measured.map(({ icon, outline, fill }) => ({
    ...icon,
    opticalScales: {
      ...(outline !== 1 && { outline, duotone: outline }),
      ...(fill !== 1 && { fill }),
    },
  }))
}

function readDrawing(name: string, weight: string) {
  const file = path.join(ROUNDED_SOURCES, `${name}-${weight}.svg`)
  if (!fs.existsSync(file)) return
  return parseSvg(fs.readFileSync(file, "utf8"))
}

function readCalendarFrame(): CalendarFrame {
  const node = readDrawing("calendar", "outline")?.node
  const fill = readDrawing("calendar", "fill")?.node
  const secondary = readDrawing("calendar", "duotone")?.groups.find(
    ({ attributes }) => attributes.id === "secondary"
  )?.node
  if (!node?.length || !fill?.length || !secondary?.length)
    throw new Error(
      "Calendar family needs Outline, Fill and Duotone source artwork"
    )
  return { node, fill, secondary }
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

function buildPaint(node: IconElement[], hasSharedFrame: boolean) {
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
      {
        d: contours.join(""),
        "fill-rule": "evenodd",
      },
    ]
    const solid =
      hasSharedFrame && contours.length === 1
        ? stroke(
            ["path", { ...face[1], fill: "currentColor" }],
            UI_STROKE_WIDTH
          )
        : face
    return {
      fill: { node: [solid, ...linework], cutout },
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
      ? [stroke(largest, widthWithinCanvas(largest, 3.25))]
      : [],
  }
}

type AuthoredDrawing = {
  node: IconElement[]
  fill?: IconElement[]
  secondary?: IconElement[]
}

function readAuthoredDrawing(icon: OutlineIcon): AuthoredDrawing | undefined {
  const outline =
    readDrawing(icon.name, "outline")?.node ??
    (icon.strokeWidth === UI_STROKE_WIDTH ? icon.node : undefined)
  if (!outline) return

  const fill = readDrawing(icon.name, "fill")?.node
  const secondary = readDrawing(icon.name, "duotone")?.groups.find(
    ({ attributes }) => attributes.id === "secondary"
  )?.node
  const fit = fitUiGrid(icon, [
    ...outline,
    ...(fill ?? []),
    ...(secondary ?? []),
  ])
  return {
    node: fit(outline),
    ...(fill && { fill: fit(fill) }),
    ...(secondary && { secondary: fit(secondary) }),
  }
}

/** Resolve authored artwork and generate the published weights. */
export function loadUiIcons(icons = loadOutlineIcons()): UiIcon[] {
  const calendarFrame = readCalendarFrame()
  const authored = new Map<string, AuthoredDrawing>()
  for (const icon of icons) {
    if (icon.name === "calendar") continue
    const drawing = readAuthoredDrawing(icon)
    if (drawing) authored.set(icon.name, drawing)
  }
  const duotoneSources = new Map(
    loadDuotoneIcons().map((icon) => [icon.name, icon])
  )
  const getBase = (name: string) =>
    authored.get(name)?.node ?? drawUiGlyph(name)

  const drawings = icons.map<FramedDrawing>((icon) => {
    if (icon.name === SIDEBAR_TOGGLE_NAME) {
      const { node } = getSidebarToggleDrawing("outline")
      return {
        icon: {
          ...icon,
          node,
          fill: { node: getSidebarToggleDrawing("fill").node, cutout: [] },
          duotone: {
            name: icon.name,
            node,
            secondary: getSidebarToggleDrawing("duotone").secondary ?? [],
          },
          motion: "sidebar-toggle",
          opticalScales: {},
        },
      }
    }

    const calendar = drawCalendarGlyph(icon.name, calendarFrame)
    if (calendar) {
      return {
        frame: "calendar",
        icon: {
          ...icon,
          node: calendar.node,
          fill: calendar.fill,
          duotone: {
            name: icon.name,
            node: calendar.node,
            secondary: calendar.secondary,
          },
          motion: getIconMotion(icon.name, icon.categories),
          opticalScales: {},
        },
      }
    }

    const drawing = authored.get(icon.name)
    const family = drawing ? undefined : drawStateGlyph(icon.name, getBase)
    const node = drawing?.node ?? family?.node ?? redrawUiOutline(icon)
    const frame =
      family?.frame ??
      (hasStateFrame(icon.name) ? icon.name : getSharedFrame(node))
    const hasFramedLetter =
      frame !== undefined && /-letter-[a-z]$/.test(icon.name)
    const { fill, secondary } = buildPaint(
      hasFramedLetter ? node.slice(0, 1) : node,
      frame !== undefined
    )
    if (hasFramedLetter)
      fill.cutout = node.slice(1).map((mark) => stroke(mark, UI_STROKE_WIDTH))
    const legacySecondary = duotoneSources.get(icon.name)?.secondary
    const tonalFace =
      drawing?.secondary ??
      (family?.base ? authored.get(family.base)?.secondary : undefined) ??
      (legacySecondary
        ? fitUiGrid(icon, icon.node)(legacySecondary)
        : secondary)

    return {
      frame,
      icon: {
        ...icon,
        node,
        fill: drawing?.fill ? { node: drawing.fill, cutout: [] } : fill,
        duotone: { name: icon.name, node, secondary: tonalFace },
        motion: getIconMotion(icon.name, icon.categories),
        opticalScales: {},
      },
    }
  })
  return calibrateUiIcons(drawings)
}
