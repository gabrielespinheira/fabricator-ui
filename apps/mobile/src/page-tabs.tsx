import * as React from "react"
import {
  closeTabs,
  moveTab,
  reopenClosedTab,
  togglePinnedTab,
} from "@fabricator-ui/app-shell-model"

import { getNewTabId, isNewTab } from "@/lib/component-explorer"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
} from "@/registry/native/ui/tab-strip"

import {
  createPageTabs,
  HOME_HREF,
  openPage,
  updatePageTabs,
} from "./page-tabs-model"

export { HOME_HREF } from "./page-tabs-model"
/** Matches nothing in the navigation: a blank tab highlights no row. */
export const NEW_TAB_PATH = "/new"
export const NEW_TAB_TITLE = "New tab"

/**
 * The open pages, as the desktop example keeps them: a tab per page, the
 * overview outside the strip. Going somewhere opens it in the preview tab (or in
 * the blank tab on screen), so browsing doesn't pile tabs up.
 */
export function usePageTabs() {
  const [state, setState] = React.useState(createPageTabs)
  const activeId = state.pathname === HOME_HREF ? null : state.pathname
  const isBlankTab = isNewTab(activeId)
  const open = (pathname: string) =>
    setState((current) => openPage(current, pathname))
  const openNewTab = () =>
    setState((current) =>
      openPage(
        current,
        getNewTabId([...current.tabs.tabs, ...current.tabs.closed])
      )
    )
  const tabs = {
    state: state.tabs,
    activeId,
    stripProps: {
      value: activeId,
      onValueChange: (id: string) =>
        setState((current) =>
          openPage(current, id, { preview: current.tabs.preview === id })
        ),
      onClose: (ids: string[]) =>
        setState((current) =>
          updatePageTabs(current, closeTabs(current.tabs, ids))
        ),
      onReorder: (id: string, index: number) =>
        setState((current) =>
          updatePageTabs(current, moveTab(current.tabs, id, index))
        ),
      onPin: (id: string, pinned: boolean) =>
        setState((current) =>
          updatePageTabs(
            current,
            current.tabs.pinned.includes(id) === pinned
              ? current.tabs
              : togglePinnedTab(current.tabs, id)
          )
        ),
      onReopen: () =>
        setState((current) =>
          updatePageTabs(current, reopenClosedTab(current.tabs), true)
        ),
    },
  }

  return {
    tabs,
    open,
    openNewTab,
    isBlankTab,
    pathname: isBlankTab ? NEW_TAB_PATH : (tabs.activeId ?? HOME_HREF),
  }
}

/** The strip holds open pages; Overview stays in the navigation. */
export function PageTabs({
  pageTabs,
  getTitle,
}: {
  pageTabs: ReturnType<typeof usePageTabs>
  getTitle: (pathname: string) => string
}) {
  const { tabs, openNewTab } = pageTabs
  return (
    <TabStrip
      {...tabs.stripProps}
      onNew={openNewTab}
      // On a phone the header's gap spaces the strip, so it drops its own inset.
      // Its first tab sits on the page's edge on a tablet, in the header or below it.
      className="min-w-0 flex-1 px-0 md:px-(--density-6) md:pl-0"
    >
      <TabStripList aria-label="Open pages">
        {tabs.state.tabs.map((id) => (
          <TabStripTab
            key={id}
            value={id}
            pinned={tabs.state.pinned.includes(id)}
            preview={tabs.state.preview === id}
          >
            {isNewTab(id) ? NEW_TAB_TITLE : getTitle(id)}
          </TabStripTab>
        ))}
      </TabStripList>
      <TabStripNew />
      <TabStripOverflow />
    </TabStrip>
  )
}
