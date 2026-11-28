import { settle, type IconGesture } from "./animated-gestures.js"
import type { IconElement } from "./generated/runtime/types.js"

const menuLines = ["M3 5.5H21", "M3 12H21", "M3 18.5H21"]
const menuMorphs = [
  ["M3 5.5L21 5.5", "M6.5 6.5L17.5 17.5"],
  ["M3 12L21 12", "M10.5 12L13.5 12"],
  ["M3 18.5L21 18.5", "M6.5 17.5L17.5 6.5"],
] as const

export function splitMenuLines(node: IconElement[]): IconElement[] {
  const [shape] = node
  if (node.length !== 1 || shape?.[1].d !== "M3 5.5h18M3 12h18M3 18.5h18")
    return node
  return menuLines.map((d) => ["path", { ...shape[1], d }])
}

function morph(
  from: string,
  to: string,
  original: string,
  duration: number,
  opacity?: number
): IconGesture {
  return {
    play: {
      d: [from, to, to, from],
      ...(opacity !== undefined && { opacity: [1, opacity, opacity, 1] }),
      transition: { duration, times: [0, 0.35, 0.53, 1], ease: settle },
      transitionEnd: { d: original },
    },
  }
}

const eye =
  "M2.5 11C4.78 7.08 8.4 4.75 12 4.75C15.6 4.75 19.22 7.08 21.5 11C21.87 11.64 21.87 12.36 21.5 13C19.22 16.92 15.6 19.25 12 19.25C8.4 19.25 4.78 16.92 2.5 13C2.13 12.36 2.13 11.64 2.5 11Z"
const lid =
  "M2.5 11.6C4.78 11.85 8.4 12.45 12 12.45C15.6 12.45 19.22 11.85 21.5 11.6C21.87 11.6 21.87 12.2 21.5 12.3C19.22 12.65 15.6 13.1 12 13.1C8.4 13.1 4.78 12.65 2.5 12.3C2.13 12.2 2.13 11.6 2.5 11.6Z"
const pupil = "M15.35 12A3.35 3.35 0 1 1 8.65 12A3.35 3.35 0 0 1 15.35 12Z"
const closedPupil =
  "M12.08 12.75A0.08 0.04 0 1 1 11.92 12.75A0.08 0.04 0 0 1 12.08 12.75Z"
const activity =
  "M2.5 12H6.5C7.25 12 7.75 11.65 8.05 10.95L10.47 4.8C10.74 4.12 11.61 4.13 11.86 4.85L15.91 18.16C16.13 18.91 17.01 18.97 17.34 18.26L19 13.2C19.25 12.45 19.73 12 20.5 12H21.55"
const quietActivity =
  "M2.5 12H6.5C7.25 12 7.75 11.9 8.05 11.65L10.47 9.55C10.74 9.3 11.61 9.3 11.86 9.55L15.91 14.05C16.13 14.3 17.01 14.35 17.34 14.1L19 12.4C19.25 12.15 19.73 12 20.5 12H21.55"

const sliders = [
  { y: 6.5, left: 8, shift: 2.75 },
  { y: 12, left: 13, shift: -3.5 },
  { y: 17.5, left: 5, shift: 3.25 },
]
function sliderParts(progress: number) {
  return sliders.map(({ y, left, shift }) => {
    const start = left + shift * progress
    const end = start + 5
    return {
      rails: [`M3 ${y}H${start}`, `M${end} ${y}H21`],
      knob: `M${end} ${y}A2.5 2.5 0 1 1 ${start} ${y}A2.5 2.5 0 0 1 ${end} ${y}Z`,
    }
  })
}

const sliderRest = sliderParts(0)
const sliderMoved = sliderParts(1)
const sliderRestRails = sliderRest.flatMap(({ rails }) => rails)
const sliderMovedRails = sliderMoved.flatMap(({ rails }) => rails)
const sliderRestKnobs = sliderRest.map(({ knob }) => knob).join("")
const sliderMovedKnobs = sliderMoved.map(({ knob }) => knob).join("")

function morphSliders(d: string) {
  if (d.startsWith("M3 6.5h5m5"))
    return morph(sliderRestRails.join(""), sliderMovedRails.join(""), d, 0.6)
  if (d === sliderRestKnobs || d.startsWith("M13 6.5a2.5"))
    return morph(sliderRestKnobs, sliderMovedKnobs, d, 0.6)
  const track = sliderMovedRails[sliderRestRails.indexOf(d)]
  if (track) return morph(d, track, d, 0.6)
}

export function getPathMorph(
  name: string,
  shape: IconElement | undefined
): IconGesture | undefined {
  const d = shape?.[1].d
  if (!d) return

  if (name === "menu") {
    const lines = menuMorphs[menuLines.indexOf(d)]
    if (lines)
      return morph(lines[0], lines[1], d, 0.52, d === menuLines[1] ? 0 : 1)
  }
  if (name === "sliders-horizontal") return morphSliders(d)
  if (name === "eye") {
    if (d === eye + pupil) return morph(d, lid + closedPupil, d, 0.44)
    if (d.startsWith("M2.5 11")) return morph(eye, lid, d, 0.44)
    if (d.startsWith("M15.35 12")) return morph(pupil, closedPupil, d, 0.44, 0)
  }
  if (name === "activity" && d.startsWith("M2.5 12"))
    return morph(activity, quietActivity, d, 0.53)
  if (name === "heart-pulse" && d.startsWith("M5.625 11.3"))
    return morph(
      "M5.625 11.3H8.813L10.605 7.515L13.395 15.085L15.187 11.3H18.375",
      "M5.625 11.3H8.813L10.605 10.1L13.395 12.5L15.187 11.3H18.375",
      d,
      0.53
    )
  if (name === "mail" && d.startsWith("M2.326 6.719"))
    return morph(
      "M2.326 6.719L9.568 11.612C11.163 12.69 12.758 12.69 14.354 11.612L21.597 6.719",
      "M2.326 6.719L9.568 7.35C11.163 7.49 12.758 7.49 14.354 7.35L21.597 6.719",
      d,
      0.54
    )
}
