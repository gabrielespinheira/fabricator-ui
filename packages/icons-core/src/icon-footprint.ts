import { Resvg } from "@resvg/resvg-js"

const SAMPLE_SIZE = 96
const PIXELS_PER_UNIT = SAMPLE_SIZE / 24
const CENTRE = SAMPLE_SIZE / 2
const TARGET_FOOTPRINT = 21.5
const INK_LIMIT = 11.25

const distances = Uint8Array.from({ length: SAMPLE_SIZE ** 2 }, (_, index) => {
  const x = (index % SAMPLE_SIZE) + 0.5 - CENTRE
  const y = Math.floor(index / SAMPLE_SIZE) + 0.5 - CENTRE
  return Math.floor(Math.hypot(x, y) * 3)
})

/** Measure the actual painted SVG, including masks, cutouts and opacity. */
export function measureIconFootprint(svg: string) {
  const {
    pixels,
    width: imageWidth,
    height: imageHeight,
  } = new Resvg(svg, {
    fitTo: { mode: "width", value: SAMPLE_SIZE },
    font: { loadSystemFonts: false },
  }).render()
  if (imageWidth !== SAMPLE_SIZE || imageHeight !== SAMPLE_SIZE)
    throw new Error("Icon measurement requires a square SVG viewport")
  const rings = new Uint32Array(205)
  let ink = 0
  let inkX = 0
  let inkY = 0
  let left = SAMPLE_SIZE
  let top = SAMPLE_SIZE
  let right = 0
  let bottom = 0
  for (const [index, distance] of distances.entries()) {
    const alpha = pixels.readUInt8(index * 4 + 3)
    if (alpha < 32) continue
    rings[distance] = (rings[distance] ?? 0) + alpha
    ink += alpha
    const x = index % SAMPLE_SIZE
    const y = Math.floor(index / SAMPLE_SIZE)
    inkX += (x + 0.5) * alpha
    inkY += (y + 0.5) * alpha
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x + 1)
    bottom = Math.max(bottom, y + 1)
  }
  if (!ink) throw new Error("The SVG has no measurable artwork")
  let ring = 0
  let inside = 0
  for (const alpha of rings) {
    inside += alpha
    if (inside >= ink * 0.9) break
    ring++
  }
  const width = (right - left) / PIXELS_PER_UNIT
  const height = (bottom - top) / PIXELS_PER_UNIT
  const span = Math.max(width, height)
  const reach = (ring + 0.5) / (3 * PIXELS_PER_UNIT)
  const edge =
    Math.max(CENTRE - left, CENTRE - top, right - CENTRE, bottom - CENTRE) /
    PIXELS_PER_UNIT
  const area = ink / (255 * PIXELS_PER_UNIT ** 2)
  // Long, thin symbols still read at their full span. Corner-heavy and
  // solid silhouettes need more room than line drawings with the same bounds.
  const footprint =
    (span * 0.64 + reach * 2 * 0.36) * Math.max(1, area / 160) ** 0.09
  const inkCentre = {
    x: inkX / ink / PIXELS_PER_UNIT,
    y: inkY / ink / PIXELS_PER_UNIT,
  }
  return { width, height, span, reach, edge, area, footprint, inkCentre }
}

export function getArtworkScale(
  { span, footprint, edge }: ReturnType<typeof measureIconFootprint>,
  { maxScale = Infinity, preserveSmall = true } = {}
) {
  const boundsScale = Math.min(1.18, maxScale, INK_LIMIT / edge)
  if (preserveSmall && span < 12 && boundsScale >= 1) return 1
  const scale = Math.min(TARGET_FOOTPRINT / footprint, boundsScale)
  return Math.abs(scale - 1) < 0.014 && boundsScale >= 1
    ? 1
    : Math.floor(scale * 1000) / 1000
}
