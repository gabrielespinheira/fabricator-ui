import { HomeIcon } from "@fabricator-ui/icons-react-native"

import { getNewTabId, isNewTab } from "@/lib/component-explorer"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/registry/native/ui/tab-strip"

export const HOME_HREF = "/"
/** Matches nothing in the navigation: a blank tab highlights no row. */
export const NEW_TAB_PATH = "/new"
export const NEW_TAB_TITLE = "New tab"

/**
 * The open pages, as the desktop example keeps them: a tab per page, the
 * overview pinned first. Going somewhere opens it in the preview tab (or in
 * the blank tab on screen), so browsing doesn't pile tabs up.
 */
export function usePageTabs() {
  const tabs = useTabStripState({
    defaultState: {
      tabs: [HOME_HREF, "/components/button"],
      pinned: [HOME_HREF],
      recent: [HOME_HREF, "/components/button"],
      preview: null,
      closed: [],
    },
  })
  const isBlankTab = isNewTab(tabs.activeId)
  const open = (pathname: string) =>
    tabs.open(pathname, {
      preview: true,
      replace: isBlankTab && tabs.activeId ? tabs.activeId : undefined,
    })
  const openNewTab = () =>
    tabs.open(getNewTabId([...tabs.state.tabs, ...tabs.state.closed]))

  return {
    tabs,
    open,
    openNewTab,
    isBlankTab,
    pathname: isBlankTab ? NEW_TAB_PATH : (tabs.activeId ?? HOME_HREF),
  }
}

/** The strip. A tab's name is the page it's on; the overview's is its icon. */
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
            icon={id === HOME_HREF ? HomeIcon : undefined}
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
