// Where each toast sits and how big it is. The website, React Native, SwiftUI
// and Compose draw the same stack.

/** Space between the toasts of an open stack, in px. */
export const TOAST_GAP = 10
/** How far each toast shows past the one in front of it. */
export const TOAST_PEEK = 8
/** How much narrower each toast is, per side, than the one in front of it. */
export const TOAST_INSET = 10

export type ToastSize = { width: number; height: number }

export type ToastStackOptions = {
  isExpanded: boolean
  gap: number
  peek: number
  inset: number
}

export type ToastPlacement = ToastSize & {
  /** Distance from the edge the stack grows from. */
  offset: number
  /** How far each side has stepped in from the front toast's. */
  inset: number
  /** Covered by the one in front, so its content is hidden. */
  isBehind: boolean
}

/**
 * Every toast has the same width. Actions that don't fit beside the text move
 * under it instead of squeezing it.
 */
export function shouldStackActions({
  rowWidth,
  toastWidth,
  hasActions,
}: {
  /** The width of everything on one row. */
  rowWidth: number
  toastWidth: number
  hasActions: boolean
}) {
  return hasActions && rowWidth > toastWidth
}

/**
 * Collapsed, the toasts behind take the front one's size, each a step back and
 * a step narrower. Expanded, each has its own size. The front toast comes first.
 */
export function getToastStack(
  sizes: readonly ToastSize[],
  { isExpanded, gap, peek, inset }: ToastStackOptions
): ToastPlacement[] {
  const front = sizes[0]
  if (!front) return []
  let offset = 0
  return sizes.map((size, index) => {
    if (isExpanded) {
      const placement = { ...size, offset, inset: 0, isBehind: false }
      offset += size.height + gap
      return placement
    }
    return {
      width: Math.max(0, front.width - index * inset * 2),
      height: front.height,
      offset: index * peek,
      inset: index * inset,
      isBehind: index > 0,
    }
  })
}
