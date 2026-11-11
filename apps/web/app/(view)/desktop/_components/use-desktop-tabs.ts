"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  activateTab,
  closeTabs,
  getActiveTab,
  moveTab,
  reopenClosedTab,
  togglePinnedTab,
  type OpenTabOptions,
  type TabStripState,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import {
  createDesktopTabs,
  getDesktopHref,
  getDesktopTabId,
  openDesktopTab,
} from "../_lib/navigation"

/** The URL selects the document; the strip keeps its open and recently closed tabs. */
export function useDesktopTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams()
  const activeId = getDesktopTabId(pathname) ?? "overview"
  const [previousId, setPreviousId] = React.useState(activeId)
  const [state, setState] = React.useState(() => createDesktopTabs(activeId))

  // Adopt direct links and history navigation without remounting the shell.
  if (previousId !== activeId) {
    setPreviousId(activeId)
    setState(
      openDesktopTab(state, activeId, { preview: state.preview === activeId })
    )
  }

  function update(
    change: (current: TabStripState) => TabStripState,
    shouldActivate = false
  ) {
    const next = change(state)
    if (next === state) return
    setState(next)
    if (activeId === "overview" && !shouldActivate) return
    const nextId = getActiveTab(next) ?? "overview"
    if (nextId !== activeId)
      router.push(getDesktopHref(nextId, search.toString()))
  }

  return {
    state,
    activeId,
    open: (id: string, options?: OpenTabOptions) => {
      if (id === "overview") {
        router.push(getDesktopHref(id, search.toString()))
        return
      }
      update((current) => openDesktopTab(current, id, options), true)
    },
    stripProps: {
      value: activeId === "overview" ? null : activeId,
      onValueChange: (id: string) =>
        update((current) => activateTab(current, id), true),
      onClose: (ids: string[]) => update((current) => closeTabs(current, ids)),
      onReorder: (id: string, index: number) =>
        update((current) => moveTab(current, id, index)),
      onPin: (id: string, pinned: boolean) =>
        update((current) =>
          current.pinned.includes(id) === pinned
            ? current
            : togglePinnedTab(current, id)
        ),
      onReopen: () => update(reopenClosedTab, true),
    },
  }
}
