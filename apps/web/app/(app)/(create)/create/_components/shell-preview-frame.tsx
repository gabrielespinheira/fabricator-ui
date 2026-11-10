"use client"

import * as React from "react"
import { cn } from "cn"

import {
  createShellOptionsMessage,
  getPreviewLayout,
  getShellPreviewQuery,
  isShellPreviewReady,
  SHELL_PREVIEW_PATH,
} from "@/app/(app)/(create)/lib/shell-preview"
import { WindowsCaptionButtons } from "@/app/(view)/app-shell/_components/windows-caption-buttons"
import type {
  PlaygroundOptions,
  PreviewSize,
} from "@/app/(view)/app-shell/_lib/options"

const FRAME_CLASSES: Record<PreviewSize, string> = {
  browser: "overflow-hidden rounded-2xl shadow-surface-2 ring-1 ring-border",
  macos:
    "overflow-hidden rounded-[14px] shadow-surface-6 ring-1 ring-foreground/15",
  windows:
    "overflow-hidden rounded-lg shadow-surface-6 ring-1 ring-foreground/15",
  phone:
    "rounded-[58px] bg-black p-2.5 shadow-surface-5 ring-1 ring-foreground/15",
}

const SCREEN_CLASSES: Record<PreviewSize, string> = {
  browser: "bg-background",
  macos: "bg-background",
  windows: "bg-background",
  phone: "rounded-[48px] bg-surface-1",
}

function useElementSize(element: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  React.useEffect(() => {
    if (!element.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(element.current)
    return () => observer.disconnect()
  }, [element])
  return size
}

function SignalGlyph() {
  return (
    <svg viewBox="0 0 18 12" className="h-3 w-[18px] fill-current">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  )
}

function BatteryGlyph() {
  return (
    <svg viewBox="0 0 27 13" className="h-[13px] w-[27px] fill-current">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="12"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        opacity="0.4"
      />
      <rect x="2" y="2" width="20" height="9" rx="2" />
      <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" opacity="0.5" />
    </svg>
  )
}

/** The top of a phone's screen, which the system keeps for itself. */
function PhoneStatusBar() {
  return (
    <div
      aria-hidden
      className="flex h-[54px] shrink-0 items-center justify-between px-9 text-[15px] font-semibold text-foreground select-none"
    >
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <SignalGlyph />
        <BatteryGlyph />
      </span>
    </div>
  )
}

function PhoneHomeBar() {
  return (
    <div
      aria-hidden
      className="flex h-5 shrink-0 items-center justify-center select-none"
    >
      <span className="h-[5px] w-[134px] rounded-full bg-foreground/80" />
    </div>
  )
}

/**
 * The real App Shell, in a frame of its own: it's drawn at the size it stands for
 * and scaled into the column, so its layouts are the ones that size gets, and its
 * menus and shortcuts stay inside. The first load reads the address; later choices
 * arrive as messages, so it keeps its state.
 */
export function ShellPreviewFrame({
  options,
  size = "browser",
  desktop = null,
  hasNativeTabBar = false,
  windowTitle,
  className,
}: {
  options: PlaygroundOptions
  size?: PreviewSize
  /** The project's desktop runtime, which changes what its window draws. */
  desktop?: "electron" | "tauri" | null
  /** Its tab bar stands for a React Native app's, in the style chosen for it. */
  hasNativeTabBar?: boolean
  /** What a native title bar shows: the project's name. */
  windowTitle?: string
  className?: string
}) {
  const stage = React.useRef<HTMLDivElement>(null)
  const frame = React.useRef<HTMLIFrameElement>(null)
  const query = getShellPreviewQuery(options, desktop, hasNativeTabBar)
  const [src] = React.useState(`${SHELL_PREVIEW_PATH}${query}`)
  const [isReady, setIsReady] = React.useState(false)
  const stageSize = useElementSize(stage)
  const layout = getPreviewLayout(size, stageSize)
  const isPhone = size === "phone"

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
      ref={stage}
      className={cn(
        "flex h-[80svh] min-h-[32rem] items-center justify-center lg:h-[calc(100svh-11rem)]",
        className
      )}
    >
      {/* Takes the scaled size in the layout; a transform doesn't. */}
      <div
        className={cn("shrink-0", stageSize.width === 0 && "invisible")}
        style={{
          width: layout.frame.width * layout.scale,
          height: layout.frame.height * layout.scale,
        }}
      >
        <div
          className={cn(
            "relative flex origin-top-left flex-col",
            FRAME_CLASSES[size]
          )}
          style={{
            width: layout.frame.width,
            height: layout.frame.height,
            transform: `scale(${layout.scale})`,
          }}
        >
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden",
              SCREEN_CLASSES[size]
            )}
          >
            {isPhone ? <PhoneStatusBar /> : null}
            {isPhone ? (
              <span
                aria-hidden
                className="absolute top-[11px] left-1/2 z-10 h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black"
              />
            ) : null}
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
            {isPhone ? <PhoneHomeBar /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
