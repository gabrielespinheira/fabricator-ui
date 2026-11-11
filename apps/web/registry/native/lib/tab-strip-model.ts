// The Tab Strip's geometry and order (the website reads both from the DOM), and
// the switcher a phone folds the strip into.

import { getShellSize } from "@/registry/fabricator/shared/lib/app-shell-model"

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

/**
 * A phone's width holds one tab and a half: there the strip shows the active
 * tab, and the rest are a press away in the switcher.
 */
export function isCompactTabStrip(windowWidth: number) {
  return getShellSize(windowWidth) === "phone"
}

const MAX_COUNT = 99

/** The count on the switcher's button, which keeps to two digits. */
export function getTabCountLabel(count: number) {
  return count > MAX_COUNT ? `${MAX_COUNT}+` : String(count)
}

export function describeTabCount(count: number) {
  return `${count} ${count === 1 ? "tab" : "tabs"}`
}

export function describeTabPosition(
  title: string,
  index: number,
  count: number
) {
  return `${title}, tab ${index + 1} of ${count}`
}
