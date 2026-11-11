import { isNewTab } from "../../web/lib/component-explorer"
import {
  getActiveTab,
  openTab,
  type OpenTabOptions,
  type TabStripState,
} from "../../web/registry/fabricator/shared/lib/app-shell-model"

export const HOME_HREF = "/"

type PageTabsState = { pathname: string; tabs: TabStripState }

export function createPageTabs(): PageTabsState {
  return {
    pathname: HOME_HREF,
    tabs: {
      tabs: ["/components/button"],
      pinned: [],
      recent: ["/components/button"],
      preview: null,
      closed: [],
    },
  }
}

/** Overview is navigation outside the documents, so it never takes a tab. */
export function openPage(
  current: PageTabsState,
  pathname: string,
  options?: OpenTabOptions
): PageTabsState {
  if (pathname === HOME_HREF) return { ...current, pathname }
  return {
    pathname,
    tabs: openTab(current.tabs, pathname, {
      preview: !isNewTab(pathname),
      replace: isNewTab(current.pathname) ? current.pathname : undefined,
      ...options,
    }),
  }
}

export function updatePageTabs(
  current: PageTabsState,
  tabs: TabStripState,
  shouldActivate = false
): PageTabsState {
  if (tabs === current.tabs) return current
  const shouldSelect =
    shouldActivate ||
    (current.pathname !== HOME_HREF && !tabs.tabs.includes(current.pathname))
  return {
    pathname: shouldSelect
      ? (getActiveTab(tabs) ?? HOME_HREF)
      : current.pathname,
    tabs,
  }
}
