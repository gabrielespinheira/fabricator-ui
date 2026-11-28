"use client"

import * as React from "react"
import { cn } from "cn"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  LockIcon,
  RotateCwIcon,
} from "@/lib/site-icons"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

// macOS's window controls. They picture a window, so they keep their own
// colours rather than the interface's roles, in both themes.
const TRAFFIC_LIGHTS = ["bg-[#ff5f57]", "bg-[#febc2e]", "bg-[#28c840]"]

/**
 * A Safari-like window around a block preview: window controls, the page's
 * address, buttons to reload it or open it in a tab of its own, and an
 * optional tab row above the preview.
 */
export function BrowserWindow({
  host = "acme.com",
  path,
  href,
  onReload,
  className,
  style,
  tabs,
  children,
}: {
  host?: string
  path: string
  /** The page on its own, opened in a new tab. */
  href?: string
  onReload: () => void
  className?: string
  style?: React.CSSProperties
  tabs?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="browser-window"
      className={cn(
        "@container/browser-window flex min-h-0 flex-col overflow-hidden rounded-xl bg-surface-3 shadow-surface-3",
        className
      )}
      style={style}
    >
      {/* A faint wash sets the toolbar off the page below it, as a step
          rather than a line; the address field sits back on the page's
          colour, like Safari's in both themes. */}
      <div className="grid h-11 shrink-0 grid-cols-[minmax(3.25rem,1fr)_minmax(0,22rem)_minmax(3.25rem,1fr)] items-center gap-3 bg-hover px-3.5">
        {/* Decoration: only the buttons at the end can be used. */}
        <div aria-hidden className="flex items-center gap-4">
          <div className="flex gap-2">
            {TRAFFIC_LIGHTS.map((colour) => (
              <span
                key={colour}
                className={cn(
                  "size-3 rounded-full ring-1 ring-black/10 ring-inset",
                  colour
                )}
              />
            ))}
          </div>
          {/* By the window's width: a phone-sized window has no room. */}
          <div className="hidden items-center gap-1 text-muted-foreground/60 @lg/browser-window:flex [&_svg]:size-4">
            <ChevronLeftIcon />
            <ChevronRightIcon />
          </div>
        </div>
        <div
          aria-hidden
          className="flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-background px-3 text-[12px] text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0"
        >
          <LockIcon />
          <span className="truncate">
            <span className="text-foreground">{host}</span>
            {path === "/" ? "" : path}
          </span>
        </div>
        <div className="flex items-center gap-0.5 justify-self-end">
          {href && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Open in a new tab"
                    nativeButton={false}
                    render={<a href={href} target="_blank" rel="noreferrer" />}
                    className="text-muted-foreground"
                  />
                }
              >
                <ExternalLinkIcon className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Open in a new tab</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Reload"
                  onClick={onReload}
                  className="text-muted-foreground"
                />
              }
            >
              <RotateCwIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Reload</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {tabs && (
        <div className="shrink-0 border-b border-border bg-hover">{tabs}</div>
      )}
      <div className="relative min-h-0 flex-1 bg-background">{children}</div>
    </div>
  )
}
