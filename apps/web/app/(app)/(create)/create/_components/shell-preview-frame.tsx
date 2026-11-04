"use client"

import * as React from "react"
import { cn } from "cn"

import {
  createShellOptionsMessage,
  getShellPreviewQuery,
  isShellPreviewReady,
  SHELL_PREVIEW_PATH,
} from "@/app/(app)/(create)/lib/shell-preview"
import type { PlaygroundOptions } from "@/app/(view)/app-shell/_lib/options"

/**
 * The real App Shell, in a frame of its own: its width decides between the
 * desktop and phone layouts, and its menus and shortcuts stay inside. The first
 * load reads the address; later choices arrive as messages, so it keeps its
 * state.
 */
export function ShellPreviewFrame({
  options,
  className,
}: {
  options: PlaygroundOptions
  className?: string
}) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  const query = getShellPreviewQuery(options)
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
        "h-[80svh] min-h-[32rem] overflow-hidden rounded-2xl bg-background shadow-surface-2 ring-1 ring-border lg:h-[calc(100svh-7.5rem)]",
        className
      )}
    >
      <iframe
        ref={frame}
        src={src}
        title="App Shell preview"
        className={cn(
          "size-full border-0 opacity-0 transition-opacity duration-feedback",
          isReady && "opacity-100"
        )}
      />
    </div>
  )
}
