"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import {
  loadShellPreviewOptions,
  readShellOptionsMessage,
  SHELL_PREVIEW_READY,
  shellPreviewParsers,
} from "@/app/(app)/(create)/lib/shell-preview"
import { ShellDemo } from "@/app/(view)/app-shell/_components/shell-demo"

import {
  getPreviewNavGroups,
  PREVIEW_DOCUMENTS,
  PREVIEW_TABS,
  PREVIEW_USER,
  PREVIEW_WORKSPACES,
} from "./preview-data"
import { PreviewPage } from "./preview-pages"

/**
 * Stands in for a React Native app's tab bar, whose styles the web's doesn't have.
 * A blurred capsule is as close as a browser gets to Liquid Glass.
 */
const NATIVE_TAB_BAR_CLASSES = {
  flat: undefined,
  floating:
    "absolute inset-x-3 bottom-2 z-20 rounded-full border-0 bg-sidebar p-1 shadow-surface-3",
  glass:
    "absolute inset-x-3 bottom-2 z-20 rounded-full border border-foreground/10 bg-background/40 p-1 shadow-surface-3 backdrop-blur-xl backdrop-saturate-150",
}

/**
 * The App Shell on /create, inside the page's iframe. It starts from its address
 * and follows the options the page sends, so a change never reloads it.
 */
export function ShellPreviewApp() {
  const [{ desktop, nativeTabBar, ...options }, setOptions] =
    useQueryStates(shellPreviewParsers)
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
      desktopRuntime={desktop ?? undefined}
      bottomNavClassName={
        nativeTabBar
          ? NATIVE_TAB_BAR_CLASSES[options.bottomNavStyle]
          : undefined
      }
      workspaces={PREVIEW_WORKSPACES}
      user={PREVIEW_USER}
      groups={groups}
      documents={PREVIEW_DOCUMENTS}
      initialTabs={PREVIEW_TABS}
      // The page is what this preview shows; the panel opens on demand.
      isPanelOpenByDefault={false}
      renderPage={({ pathname, title }) => (
        <PreviewPage pathname={pathname} title={title} />
      )}
    />
  )
}
