/** Sent by a page in a preview frame once it has hydrated and laid out. */
export const FRAME_READY_MESSAGE = "fabricator-frame-ready"

export function isFrameReadyMessage(data: unknown) {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === FRAME_READY_MESSAGE
  )
}

/**
 * How much a frame is scaled down: between `scaleFrom` and `minWidth` the
 * page renders at `minWidth` and shrinks to fit; narrower (a phone) or wider
 * it renders as is. A `minWidth` of 0 never scales.
 */
export function getFrameScale(
  width: number,
  { minWidth, scaleFrom }: { minWidth: number; scaleFrom: number }
) {
  if (width < scaleFrom || width >= minWidth) return 1
  return width / minWidth
}
