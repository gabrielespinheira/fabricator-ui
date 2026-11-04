// A conversation scrolls in an inverted list: offset 0 is the newest message at
// the bottom, and the offset grows towards older messages at the top.

export type MessageScrollerScrollable = { start: boolean; end: boolean }

export type MessageScrollerVisibilityState = {
  currentAnchorId: string | null
  visibleMessageIds: string[]
}

export function getScrollableEdges({
  offset,
  contentSize,
  viewportSize,
  threshold,
}: {
  offset: number
  contentSize: number
  viewportSize: number
  threshold: number
}): MessageScrollerScrollable {
  return {
    start: contentSize - viewportSize - offset > threshold,
    end: offset > threshold,
  }
}

type MessageItem = { messageId?: string; scrollAnchor?: boolean }

/**
 * `items` in reading order. The current anchor is the last one at or above the
 * first visible message, as the website's is the last one above the fold.
 */
export function getVisibility(
  items: readonly MessageItem[],
  visibleIds: ReadonlySet<string>
): MessageScrollerVisibilityState {
  const visibleMessageIds: string[] = []
  let currentAnchorId: string | null = null
  let hasReachedVisible = false
  for (const { messageId, scrollAnchor } of items) {
    if (messageId === undefined) continue
    const isVisible = visibleIds.has(messageId)
    if (isVisible) visibleMessageIds.push(messageId)
    if (scrollAnchor && !hasReachedVisible) currentAnchorId = messageId
    if (isVisible) hasReachedVisible = true
  }
  return hasReachedVisible
    ? { currentAnchorId, visibleMessageIds }
    : { currentAnchorId: null, visibleMessageIds: [] }
}

/** A message's index in the list, which holds them newest first. */
export function getMessageIndex(items: readonly MessageItem[], id: string) {
  const index = items.findIndex((item) => item.messageId === id)
  return index === -1 ? -1 : items.length - 1 - index
}

/** A value `useSyncExternalStore` can read: scrolling shouldn't re-render rows. */
export function createScrollerStore<TValue>(
  initial: TValue,
  isEqual: (a: TValue, b: TValue) => boolean
) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: TValue) {
      if (isEqual(value, next)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
