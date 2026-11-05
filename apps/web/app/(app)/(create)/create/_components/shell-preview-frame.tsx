"use client"

import * as React from "react"
import { cn } from "cn"

import {
  createShellOptionsMessage,
  getShellPreviewQuery,
  isShellPreviewReady,
  SHELL_PREVIEW_PATH,
} from "@/app/(app)/(create)/lib/shell-preview"
import { WindowsCaptionButtons } from "@/app/(view)/app-shell/_components/windows-caption-buttons"
import type {
  PlaygroundOptions,
  PreviewSize,
} from "@/app/(view)/app-shell/_lib/options"

/**
 * The real App Shell, in a frame of its own: its width decides between the
 * desktop and phone layouts, and its menus and shortcuts stay inside. The first
 * load reads the address; later choices arrive as messages, so it keeps its
 * state.
 */
export function ShellPreviewFrame({
  options,
  size = "browser",
  desktop = null,
  windowTitle,
  className,
}: {
  options: PlaygroundOptions
  size?: PreviewSize
  /** The project's desktop runtime, which changes what its window draws. */
  desktop?: "electron" | "tauri" | null
  /** What a native title bar shows: the project's name. */
  windowTitle?: string
  className?: string
}) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  const query = getShellPreviewQuery(options, desktop)
  const [src] = React.useState(`${SHELL_PREVIEW_PATH}${query}`)
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        isShellPreviewReady(event.data)
      ) {
        setIsReady(true)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  React.useEffect(() => {
    if (!isReady) return
    frame.current?.contentWindow?.postMessage(
      createShellOptionsMessage(query),
      window.location.origin
    )
  }, [isReady, query])

  return (
    <div
      className={cn(
        "flex h-[80svh] min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-background shadow-surface-2 ring-1 ring-border lg:h-[calc(100svh-11rem)]",
        size === "phone" && "mx-auto w-full max-w-[390px]",
        className
      )}
    >
      {size === "windows" && desktop === "tauri" ? (
        // Tauri keeps Windows' own title bar, above the page.
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-surface-2 ps-3 text-xs">
          {windowTitle}
          <WindowsCaptionButtons className="h-full" />
        </div>
      ) : null}
      <iframe
        ref={frame}
        src={src}
        title="App Shell preview"
        className={cn(
          "min-h-0 w-full flex-1 border-0 opacity-0 transition-opacity duration-feedback",
          isReady && "opacity-100"
        )}
      />
    </div>
  )
}
