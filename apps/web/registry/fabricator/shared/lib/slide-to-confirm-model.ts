// Slide to confirm: the thumb follows the finger along the track, gives like
// rubber past either end, and confirms once it has travelled most of the way.

// Past an end the thumb moves this share of the drag, up to the stretch limit.
const RUBBER = 0.25
const STRETCH = 0.04
export const CONFIRM_AT = 0.9

/** The thumb's place for a drag of `offset` px along `travel` px, 0 to 1. */
export function getSlideProgress(offset: number, travel: number) {
  if (travel <= 0) return 0
  const progress = offset / travel
  if (progress > 1) return Math.min(1 + (progress - 1) * RUBBER, 1 + STRETCH)
  if (progress < 0) return Math.max(progress * RUBBER, -STRETCH)
  return progress
}

export function shouldConfirmSlide(progress: number) {
  return progress >= CONFIRM_AT
}
