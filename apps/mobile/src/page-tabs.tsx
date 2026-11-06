import * as React from "react"

import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/registry/native/ui/tab-strip"

const FIRST_TAB = "tab-1"

/**
 * The page on screen, per tab, as on the website: going somewhere opens it in the
 * current tab, and each tab remembers where it was. Without the strip there's
 * simply one tab.
 */
export function usePageTabs({ homeHref }: { homeHref: string }) {
  const tabs = useTabStripState({
    defaultState: {
      tabs: [FIRST_TAB],
      pinned: [],
      recent: [FIRST_TAB],
      preview: null,
      closed: [],
    },
  })
  const [paths, setPaths] = React.useState<Record<string, string>>({})
  const nextTab = React.useRef(2)
  const activeId = tabs.activeId ?? FIRST_TAB

  const setPathname = (pathname: string) =>
    setPaths((current) => ({ ...current, [activeId]: pathname }))

  const openNewTab = () => {
    tabs.open(`tab-${nextTab.current}`)
    nextTab.current += 1
  }

  const getPath = (id: string) => paths[id] ?? homeHref

  return {
    tabs,
    getPath,
    openNewTab,
    pathname: getPath(activeId),
    setPathname,
  }
}

/** The strip. A tab's name is the page it's on. */
export function PageTabs({
  pageTabs,
  getTitle,
}: {
  pageTabs: ReturnType<typeof usePageTabs>
  getTitle: (pathname: string) => string
}) {
  const { tabs, getPath, openNewTab } = pageTabs
  return (
    <TabStrip
      {...tabs.stripProps}
      onNew={openNewTab}
      // Its first tab sits on the page's edge on a tablet, in the header or below it.
      className="min-w-0 flex-1 md:pl-0"
    >
      <TabStripList aria-label="Open pages">
        {tabs.state.tabs.map((id) => (
          <TabStripTab
            key={id}
            value={id}
            pinned={tabs.state.pinned.includes(id)}
          >
            {getTitle(getPath(id))}
          </TabStripTab>
        ))}
      </TabStripList>
      <TabStripNew />
      <TabStripOverflow />
    </TabStrip>
  )
}
