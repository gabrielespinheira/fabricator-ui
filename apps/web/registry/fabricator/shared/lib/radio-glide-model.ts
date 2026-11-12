// Radio glide: the checked dot travels from the radio it leaves to the one
// just picked, instead of one dot fading out while another pops in.

export type GlideRect = {
  left: number
  top: number
  width: number
  height: number
}

export type GlideOffset = { x: number; y: number }

function getCentre({ left, top, width, height }: GlideRect) {
  return { x: left + width / 2, y: top + height / 2 }
}

/**
 * The translate that puts the new dot back over the dot it replaces, so it
 * can glide to rest. Rects are on-screen (`getBoundingClientRect`), so a
 * radio shrunk by its press still lines up by its centre; `scale` is the
 * group's on-screen scale (a popup growing in), undone because the translate
 * is in local pixels. Null on the first pick, or when nothing moves.
 */
export function getGlideOffset(
  from: GlideRect | null,
  to: GlideRect,
  scale = 1
): GlideOffset | null {
  if (!from) return null
  const start = getCentre(from)
  const end = getCentre(to)
  const x = (start.x - end.x) / scale
  const y = (start.y - end.y) / scale
  if (x === 0 && y === 0) return null
  return { x, y }
}
