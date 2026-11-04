// The Tab Strip's geometry and order. The website reads both from the DOM.

/** Where to scroll so a tab is in view, or null when it already is. */
export function getTabScrollOffset({
  start,
  end,
  scrollOffset,
  viewportWidth,
}: {
  start: number
  end: number
  scrollOffset: number
  viewportWidth: number
}) {
  if (viewportWidth <= 0) return null
  if (start < scrollOffset) return start
  if (end > scrollOffset + viewportWidth) return end - viewportWidth
  return null
}

/** Registered tabs in the order they show. */
export function orderTabs<TInfo extends { index: number }>(
  tabs: Map<string, TInfo>
) {
  return [...tabs.entries()]
    .map(([value, info]) => ({ value, info }))
    .sort((a, b) => a.info.index - b.info.index)
}
