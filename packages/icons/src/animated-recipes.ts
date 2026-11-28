import {
  directions,
  gestures,
  nudge,
  revealFace,
  settle,
  traceLine,
  type IconGesture,
} from "./animated-gestures.js"
import { getPathMorph, splitMenuLines } from "./animated-morphs.js"
import type {
  IconData,
  IconDirection,
  IconElement,
  IconMotion,
} from "./generated/runtime/types.js"
import type { IconArtworkLayer } from "./icon.js"

export type PanelRecipe = "sidebar-toggle" | "panel-left" | "panel-right"
type ArtworkRecipe = Exclude<IconMotion, PanelRecipe>

type PartMotion = (
  layer: IconArtworkLayer,
  index: number
) => IconGesture | undefined

type PartFilter = (index: number) => boolean
const first: PartFilter = (index) => index === 0
const second: PartFilter = (index) => index === 1
const afterFirst: PartFilter = (index) => index > 0
const all: PartFilter = () => true

function hasStroke(
  data: IconData,
  layer: IconArtworkLayer,
  shape: IconElement
) {
  const [, attrs] = shape
  return attrs.stroke
    ? attrs.stroke !== "none"
    : layer === "primary" && data.paint !== "fill"
}

const traceDelays = [0, 0.035, 0.07, 0.105]
const strokes = traceDelays.map((delay) => traceLine(delay))
const faces = traceDelays.map(revealFace)

function traceParts(data: IconData, layer: IconArtworkLayer, index: number) {
  const shape = getLayer(data, layer)?.[index]
  if (!shape) return
  const offset = Math.min(index, traceDelays.length - 1)
  return hasStroke(data, layer, shape) ? strokes[offset] : faces[offset]
}

function getLayer(data: IconData, layer: IconArtworkLayer) {
  if (layer === "primary") return data.node
  return data[layer]
}

function moveParts(
  gesture: IconGesture,
  primary: PartFilter,
  cutout?: PartFilter,
  secondary?: PartFilter
): PartMotion {
  const targets = { primary, cutout, secondary }
  return (layer, index) => (targets[layer]?.(index) ? gesture : undefined)
}

function isDirection(recipe: ArtworkRecipe): recipe is IconDirection {
  return Object.hasOwn(directions, recipe)
}

function getFrameIndex(node: IconElement[]) {
  // The surround has substantially more path commands than its arrow.
  const lengths = node.map(([, attrs]) => attrs.d?.length ?? 0)
  return lengths.indexOf(Math.max(...lengths))
}

function getTonalStrokeIndex({ node, secondary }: IconData, index: number) {
  const details = secondary?.[index]?.[1]
  if (!details?.stroke || details.stroke === "none") return -1
  const start = /^[mM]\s*-?[\d.]+[ ,]+-?[\d.]+/
  const point = details.d?.match(start)?.[0]?.slice(1).trim()
  return point
    ? node.findIndex(
        ([, attrs]) => attrs.d?.match(start)?.[0]?.slice(1).trim() === point
      )
    : -1
}

function getDirectionalParts(
  { name, node, paint, cutout }: IconData,
  x: number,
  y: number
): PartMotion | undefined {
  if (/^(square|circle)-(arrow|chevron)/.test(name)) {
    const enters = name.endsWith("-enter")
    const exits = name.endsWith("-exit")
    const gesture = enters || exits ? nudge(x * 0.67, y * 0.67) : nudge(x, y)
    const frame = getFrameIndex(node)
    return moveParts(gesture, (index) => index !== frame, all)
  }
  if (/^arrow-.*-(from|to)-line$/.test(name)) {
    const line = name.endsWith("-from-line") ? 0 : node.length - 1
    return moveParts(nudge(x * 0.46, y * 0.46), (index) => index !== line)
  }
  if (
    /^arrow-.*-(from-dot|to-dot|[01]-[01]|[az]-[az]|narrow-wide|wide-narrow)$/.test(
      name
    )
  )
    return moveParts(nudge(x * 0.62, y * 0.62), (index) => index < 2)
  if (/^chevron-(first|last)$/.test(name))
    return moveParts(nudge(x * 0.46, y), first)
  if (/^arrow-big-.*-dash$/.test(name))
    return moveParts(nudge(x * 0.62, y * 0.62), first, undefined, all)
  if (name === "log-in" || name === "log-out")
    return moveParts(nudge(x * 0.59, y), (index) => index < 2, all)
  if (/^calendar-(arrow|chevrons)-/.test(name))
    return moveParts(
      nudge(x * 0.48, y * 0.48),
      (index) => !paint && index >= 4,
      all
    )
  if (/^(archive|clock|database|globe)-arrow-/.test(name))
    return moveParts(
      nudge(x * 0.62, y * 0.62),
      (index) => index >= node.length - 2,
      all
    )
  if (cutout?.length && name.includes("-arrow-"))
    return moveParts(nudge(x * 0.62, y * 0.62), () => false, afterFirst)
}

function getExchangeParts(
  data: IconData,
  isHorizontal: boolean
): PartMotion | undefined {
  const { name, node } = data
  const isChevron = name.startsWith("chevrons-")
  const divider = isChevron ? 1 : 2
  if (node.length < 2 * divider) return
  const isPositiveFirst = isHorizontal
    ? name.includes("right-left")
    : name.includes(isChevron ? "up-down" : "down-up")
  const shift = isPositiveFirst ? 1.7 : -1.7
  const firstHalf = nudge(isHorizontal ? shift : 0, isHorizontal ? 0 : shift)
  const secondHalf = nudge(isHorizontal ? -shift : 0, isHorizontal ? 0 : -shift)
  return (layer, index) => {
    if (layer === "cutout") return
    const arrow =
      layer === "secondary" ? getTonalStrokeIndex(data, index) : index
    if (arrow >= 0 && arrow < 2 * divider)
      return arrow < divider ? firstHalf : secondHalf
  }
}

const corners = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const

const cornerGestures = {
  expand: corners.map(([x, y]) => nudge(x * 1.42, y * 1.42)),
  contract: corners.map(([x, y]) => nudge(-x * 2, -y * 2)),
}

function getResizeParts(
  data: IconData,
  recipe: "expand" | "contract"
): PartMotion | undefined {
  const { name, node } = data
  if (node.length !== 4) return
  const moves = cornerGestures[recipe]
  const getCorner = (layer: IconArtworkLayer, index: number) =>
    layer === "secondary" ? getTonalStrokeIndex(data, index) : index
  if (name === "maximize" || name === "minimize") {
    return (layer, index) =>
      layer !== "cutout" ? moves[getCorner(layer, index)] : undefined
  }
  if (name === "maximize-2" || name === "minimize-2") {
    return (layer, index) => {
      const corner = getCorner(layer, index)
      if (layer !== "cutout" && corner >= 0) return moves[corner < 2 ? 1 : 2]
    }
  }
}

const envelopeFlap: IconGesture = {
  origin: "50% 29%",
  play: {
    scaleY: [1, 0.08, 0.15, 1],
    transition: { duration: 0.66, times: [0, 0.39, 0.58, 1], ease: settle },
  },
}

const shutterLens: IconGesture = {
  origin: "50% 54%",
  play: {
    scale: [1, 0.52, 0.88, 1],
    transition: { duration: 0.49, times: [0, 0.23, 0.51, 1], ease: settle },
  },
}

const ring: IconGesture = {
  play: {
    opacity: [1, 0.18, 1, 0.44, 1],
    scale: [1, 0.89, 1.025, 0.93, 1],
    transition: {
      duration: 0.7,
      times: [0, 0.15, 0.42, 0.68, 1],
      ease: settle,
    },
  },
}

const toggleShift = {
  "toggle-left": nudge(6.5, 0, 0.72),
  "toggle-right": nudge(-6.5, 0, 0.72),
}

function delayGesture(gesture: IconGesture, delay: number): IconGesture {
  return {
    ...gesture,
    play: {
      ...gesture.play,
      transition: { ...gesture.play.transition, delay },
    },
  }
}

function getBarParts(data: IconData): PartMotion | undefined {
  const { name, node } = data
  const isHorizontal = name.startsWith("chart-bar")
  const axis =
    name === "chart-column-increasing"
      ? 2
      : /^chart-(bar|column)$/.test(name)
        ? 0
        : /^(chart-no-axes-column|signal)(-|$)/.test(name)
          ? -1
          : undefined
  if (axis === undefined || node.length === 1) return
  const baseline = name.startsWith("signal")
    ? "80%"
    : name.includes("no-axes")
      ? "84%"
      : "69%"
  const gesture: IconGesture = isHorizontal
    ? {
        ...gestures.bars,
        play: {
          scaleX: gestures.bars.play.scaleY,
          transition: gestures.bars.play.transition,
        },
      }
    : { ...gestures.bars, origin: `50% ${baseline}` }
  const motions = node.map((_, index) =>
    delayGesture(gesture, (index % 4) * 0.05)
  )
  return (layer, index) => {
    if (layer === "cutout") return
    const bar = layer === "secondary" ? getTonalStrokeIndex(data, index) : index
    if (bar !== axis) return motions[bar]
  }
}

function getSignalParts(data: IconData): PartMotion | undefined {
  const { name, node } = data
  const isWifi = /^wifi(-low|-high)?$/.test(name)
  if (!isWifi && name !== "rss") return
  const motions = node.map((_, index) =>
    delayGesture(
      gestures.radiate,
      isWifi ? (node.length - 1 - index) * 0.062 : index * 0.09
    )
  )
  return (layer, index) => {
    if (layer === "cutout") return
    const ringIndex =
      layer === "secondary" ? getTonalStrokeIndex(data, index) : index
    if (isWifi ? ringIndex > 0 : ringIndex < 2) return motions[ringIndex]
  }
}

function getCheckParts(data: IconData): PartMotion | undefined {
  const { name, node, paint, cutout } = data
  const gesture =
    name === "shield-check" && paint === "fill" ? gestures.mark : gestures.check
  if (name === "check" || name === "check-check")
    return moveParts(gesture, all, all, all)
  if (name === "check-line") return moveParts(gesture, (index) => index !== 1)
  if (/^(circle|square|badge|shield)-check(-big)?$/.test(name))
    return moveParts(gesture, afterFirst, all)
  if (name === "calendar-check-2")
    return moveParts(gesture, (index) => index === node.length - 1)
  if (name === "copy-check")
    return moveParts(gesture, paint ? () => false : first, all)
  if (/^(bookmark|calendar|clipboard|folder|mail|list)-check$/.test(name))
    return moveParts(
      gesture,
      (index) => !cutout?.length && index === node.length - 1,
      (index) => index === (cutout?.length ?? 0) - 1
    )
}

function getSpecialParts(
  data: IconData,
  recipe: ArtworkRecipe
): PartMotion | undefined {
  const { name, node, paint, cutout, secondary } = data
  switch (recipe) {
    case "receive":
    case "dispatch": {
      const gesture = gestures[recipe]
      const parts = (index: number) => index >= node.length - 2
      const cuts = (index: number) => index >= (cutout?.length ?? 0) - 2
      if (name === "download") return moveParts(gesture, first)
      if (name === "cloud-upload")
        return moveParts(gesture, (index) => index !== 1)
      if (name === "upload" || name === "cloud-download")
        return moveParts(gesture, (index) => index < node.length - 1)
      return moveParts(gesture, paint ? afterFirst : parts, cuts)
    }
    case "exit-diagonal":
      return moveParts(gestures[recipe], (index) => index < node.length - 1)
    case "envelope":
      if (/^mail(-open)?$/.test(name))
        return moveParts(
          envelopeFlap,
          second,
          first,
          name === "mail" ? all : undefined
        )
      break
    case "bars":
      return getBarParts(data)
    case "radiate":
      return getSignalParts(data)
    case "stack":
      if (/^(copy|layers(-[23])?)$/.test(name))
        return moveParts(gestures.stack, first, undefined, all)
      break
    case "shutter":
      if (name === "camera" && !secondary?.length)
        return moveParts(shutterLens, second, first)
      break
    case "clock":
      if (/^clock(-[1-9][0-2]?)?$/.test(name))
        return moveParts(gestures.clock, afterFirst, all)
      if (name === "timer") return moveParts(gestures.clock, first, first)
      break
    case "toggle":
      if (
        (name === "toggle-left" || name === "toggle-right") &&
        !secondary?.length
      )
        return moveParts(toggleShift[name], first, first)
      break
    case "shackle":
      if (/^lock(-open)?$/.test(name))
        return moveParts(gestures.shackle, second)
      break
    case "pencil":
      if (name === "square-pen")
        return moveParts(gestures.pencil, afterFirst, all)
      break
    case "rise":
      if (name === "battery-charging") return moveParts(gestures.check, first)
      if (/^battery-(low|medium|full)$/.test(name)) {
        return (layer, index) => {
          if (layer === "cutout") return traceParts(data, layer, index)
          const d = data.node[index]?.[1].d
          if (
            layer === "primary" &&
            !cutout?.length &&
            d &&
            /^M(?:5\.85|9\.95|6\.5|11|15\.5) /.test(d)
          )
            return traceParts(data, layer, index)
        }
      }
      break
    case "sweep":
      if (/^cloud-(drizzle|rain|snow)$/.test(name)) {
        const drops = node.map((_, index) =>
          delayGesture(nudge(0, 2.15, 0.46), Math.max(0, index - 1) * 0.055)
        )
        return (layer, index) =>
          layer === "primary" && index > 0 ? drops[index] : undefined
      }
      break
    case "bell":
      if (/^bell(-ring)?$/.test(name))
        return (layer, index) =>
          layer === "primary" && index > 1 ? ring : gestures.bell
      break
    case "sound":
      if (name === "audio-lines") {
        const levels = [1.45, 0.58, 0.8, 1.48, 0.76, 1.42].map((level, index) =>
          delayGesture(
            {
              play: {
                scaleY: [1, level, 1 - (level - 1) * 0.48, 1],
                transition: { duration: 0.52, ease: settle },
              },
            },
            index * 0.032
          )
        )
        return (layer, index) => {
          if (layer === "primary") return levels[index]
          if (layer === "secondary")
            return levels[getTonalStrokeIndex(data, index)]
        }
      }
      if (/^volume-[12]$/.test(name)) {
        const outer = {
          origin: "48% 50%",
          play: {
            x: [0, 0.2, 0.86, 0.32, 0],
            opacity: [1, 0.27, 1, 0.7, 1],
            transition: {
              duration: 0.69,
              times: [0, 0.27, 0.53, 0.73, 1],
              ease: settle,
            },
          },
        }
        return (layer, index) =>
          layer === "primary" && index > 0
            ? index === 1
              ? gestures.sound
              : outer
            : undefined
      }
      break
    case "check":
      return getCheckParts(data)
    case "open":
      if (/^folder-open(-dot)?$/.test(name))
        return moveParts(gestures.open, second, undefined, all)
  }
}

export function getIconGestures(data: IconData, recipe: ArtworkRecipe) {
  if (recipe === "expand" && /^move-(horizontal|vertical)$/.test(data.name)) {
    const axis = data.name === "move-horizontal" ? "scaleX" : "scaleY"
    const { scale, ...timing } = gestures.expand.play
    return { whole: { play: { ...timing, [axis]: scale } } }
  }
  const partMotion = isDirection(recipe)
    ? getDirectionalParts(data, ...directions[recipe])
    : recipe === "exchange-horizontal" || recipe === "exchange-vertical"
      ? getExchangeParts(data, recipe === "exchange-horizontal")
      : recipe === "expand" || recipe === "contract"
        ? getResizeParts(data, recipe)
        : getSpecialParts(data, recipe)
  const parts: PartMotion = (layer, index) => {
    const shape = getLayer(data, layer)?.[index]
    const gesture = getPathMorph(data.name, shape) ?? partMotion?.(layer, index)
    if (gesture?.trace && shape && !hasStroke(data, layer, shape))
      return faces[0]
    return gesture
  }
  const layers = ["primary", "secondary", "cutout"] as const
  if (
    layers.some((layer) =>
      getLayer(data, layer)?.some((_, i) => parts(layer, i))
    )
  )
    return { parts }
  if (isDirection(recipe)) return { whole: nudge(...directions[recipe]) }
  if (recipe === "open" && /^(folder|door|book|archive|box)$/.test(data.name))
    return { whole: gestures.open }
  if (
    recipe === "open" ||
    recipe === "settle" ||
    recipe === "widen" ||
    recipe === "rows" ||
    recipe === "check"
  )
    return {
      parts: (layer: IconArtworkLayer, index: number) =>
        traceParts(data, layer, index),
    }
  return { whole: gestures[recipe] }
}

/** Reuse the separate surfaces from the static paint as independently moving parts. */
export function getAnimatedDrawing(data: IconData): IconData {
  if (data.name === "menu") return { ...data, node: splitMenuLines(data.node) }
  if (data.name === "battery-full" && data.paint !== "fill") {
    const [body, details] = data.node
    if (body && details?.[1].d === "M22 10.25v3.5M6.5 10.5v3m4.5-3v3m4.5-3v3")
      return {
        ...data,
        node: [
          body,
          ...[
            "M22 10.25V13.75",
            "M6.5 10.5V13.5",
            "M11 10.5V13.5",
            "M15.5 10.5V13.5",
          ].map((d): IconElement => ["path", { ...details[1], d }]),
        ],
      }
  }
  if (
    (data.name === "lock" || data.name === "lock-open") &&
    data.paint !== "fill"
  ) {
    const shackle = data.node[1]
    const [arch, keyhole] = shackle?.[1].d?.match(/M[^M]+/g) ?? []
    if (shackle && arch && keyhole) {
      return {
        ...data,
        node: [
          ...data.node.slice(0, 1),
          ["path", { ...shackle[1], d: arch }],
          ["path", { ...shackle[1], d: keyhole }],
        ],
      }
    }
  }
  if (data.paint !== "fill" || data.node.length !== 1 || data.cutout?.length)
    return data
  const [shape] = data.node
  if (!shape || shape[0] !== "path") return data
  const [, attrs] = shape
  const [first, second, ...others] = attrs.d?.match(/M[^M]+/g) ?? []
  if (!first || !second || others.length > 0) return data

  if (data.name === "download") {
    return {
      ...data,
      node: [
        ["path", { ...attrs, d: first }],
        ["path", { ...attrs, d: second }],
      ],
    }
  }

  if (
    ["mail", "camera", "shield-check"].includes(data.name) ||
    data.name in toggleShift
  ) {
    const isToggle = data.name in toggleShift
    return {
      ...data,
      node: [["path", { ...attrs, d: isToggle ? second : first }]],
      cutout: [
        [
          "path",
          { d: isToggle ? first : second, fill: "black", stroke: "none" },
        ],
      ],
    }
  }
  return data
}
