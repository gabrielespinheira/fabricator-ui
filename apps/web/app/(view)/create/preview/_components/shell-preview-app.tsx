"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import {
  loadShellPreviewOptions,
  readShellOptionsMessage,
  SHELL_PREVIEW_READY,
} from "@/app/(app)/(create)/lib/shell-preview"
import {
  PlaceholderPage,
  ShellDemo,
} from "@/app/(view)/app-shell/_components/shell-demo"
import { playgroundParsers } from "@/app/(view)/app-shell/_lib/options"

import { DashboardOverview } from "./dashboard-panels"
import {
  getPreviewNavGroups,
  PREVIEW_DOCUMENTS,
  PREVIEW_TABS,
  PREVIEW_USER,
  PREVIEW_WORKSPACES,
} from "./preview-data"

/**
 * The App Shell on /create, inside the page's iframe. It starts from its address
 * and follows the options the page sends, so a change never reloads it.
 */
export function ShellPreviewApp() {
  const [options, setOptions] = useQueryStates(playgroundParsers)
  const groups = React.useMemo(
    () => getPreviewNavGroups({ reorderable: options.reorder }),
    [options.reorder]
  )

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin
      ) {
        return
      }
      const query = readShellOptionsMessage(event.data)
      if (query !== null) setOptions(loadShellPreviewOptions(query))
    }
    window.addEventListener("message", onMessage)
    window.parent.postMessage(SHELL_PREVIEW_READY, window.location.origin)
    return () => window.removeEventListener("message", onMessage)
  }, [setOptions])

  return (
    <ShellDemo
      options={options}
      workspaces={PREVIEW_WORKSPACES}
      user={PREVIEW_USER}
      groups={groups}
      documents={PREVIEW_DOCUMENTS}
      initialTabs={PREVIEW_TABS}
      // The dashboard is what this preview shows; the panel opens on demand.
      isPanelOpenByDefault={false}
      renderPage={({ isHome, title }) =>
        isHome ? (
          <DashboardOverview />
        ) : (
          <PlaceholderPage title={title}>
            A page of your own goes here. Press F6 to move between the sidebar,
            the page and the panel.
          </PlaceholderPage>
        )
      }
    />
  )
}
