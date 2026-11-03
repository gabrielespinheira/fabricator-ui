import { Resvg } from "@resvg/resvg-js"

/** Marks reaching further than this, relative to the median, get shrunk. */
export const SCALE_THRESHOLD = 1.08
/** Corrections never shrink a mark below this. */
export const SCALE_FLOOR = 0.84

const RENDER_SIZE = 240
const PERCENTILE = 0.95

/**
 * A mark's reach: the 95th-percentile distance of its ink from the centre of
 * a square render, as a fraction of half the side. Marks that touch the
 * corners reach further than round marks that only touch the edges.
 */
export function measureReach(svg: string) {
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: RENDER_SIZE },
    background: "rgba(0,0,0,0)",
  }).render()
  const { width, height, pixels } = rendered
  const centreX = width / 2
  const centreY = height / 2
  const distances: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels.readUInt8((y * width + x) * 4 + 3) < 128) continue
      distances.push(Math.hypot(x + 0.5 - centreX, y + 0.5 - centreY))
    }
  }
  return percentile(distances, PERCENTILE) / (RENDER_SIZE / 2)
}

export class EmptyMeasurementError extends Error {
  override name = "EmptyMeasurementError"
}

/** The value below which `fraction` of the values fall. */
function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.floor(sorted.length * fraction)
  )
  const value = sorted[index]
  if (value === undefined) {
    throw new EmptyMeasurementError("the mark rendered no ink")
  }
  return value
}

/** The shrink-only correction for a mark, or undefined when none is needed. */
export function getOpticalScale(reach: number, median: number) {
  const relative = reach / median
  if (relative <= SCALE_THRESHOLD) return undefined
  return Number(Math.max(SCALE_FLOOR, 1 / relative).toFixed(3))
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  // Equal for odd lengths; the two middle values for even ones.
  const lower = sorted[Math.ceil(sorted.length / 2) - 1]
  const upper = sorted[Math.floor(sorted.length / 2)]
  if (lower === undefined || upper === undefined) {
    throw new EmptyMeasurementError("there are no values to take a median of")
  }
  return (lower + upper) / 2
}
