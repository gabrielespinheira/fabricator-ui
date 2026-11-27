"use client"

import * as React from "react"

import { getFrameScale, isFrameReadyMessage } from "@/lib/frame-preview-model"
import { useSiteSettings } from "@/lib/site-settings"
import { Blueprint } from "@/styles/base-fabricator/ui/blueprint"

/** Sent by a demo in a fitted frame (FrameHeight) with its height. */
export const FRAME_HEIGHT_MESSAGE = "fabricator-frame-height"

const isFrameHeight = (data: unknown): data is { height: number } =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === FRAME_HEIGHT_MESSAGE &&
  "height" in data &&
  typeof data.height === "number"

// Until a fitted demo reports its height.
const FIT_FALLBACK_HEIGHT = 900

// A page that never says it's ready (an error, an old build) still shows
// once it has loaded this long.
const READY_FALLBACK_MS = 3000

// A full-page demo in an iframe. Previews break out of the docs prose (see
// app/fabricator-site.css), so on a desktop the page renders at full size.
// Between `scaleFrom` and `minWidth` it renders at `minWidth` and is scaled
// down to fit, so app shells (Sidebar) keep their desktop layout; narrower
// than `scaleFrom` (a phone) it renders as is and shows the mobile layout.
//
// `fit` is for a responsive demo that needs a document of its own, as the
// Event Calendar does: every insert in the docs page restyles all of it, a
// frame restyles only the demo. It renders at the frame's width, unscaled,
// as tall as the demo says it is.
//
// `placeholder` covers the frame, in the same scaled box, until the page
// inside says it has hydrated (FrameReady), then fades out, so the preview
// never shows an empty frame or a layout that shifts as it settles.
export function FramePreview({
  src,
  title,
  minWidth = 820,
  scaleFrom = 560,
  fit = false,
  placeholder,
}: {
  src: string
  title: string
  minWidth?: number
  scaleFrom?: number
  fit?: boolean
  placeholder?: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const frameRef = React.useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = React.useState(1)
  const [height, setHeight] = React.useState<number>()
  const [isReady, setReady] = React.useState(false)
  // A new element each render; the effects only care whether there is one.
  const hasPlaceholder = placeholder != null
  const { loader } = useSiteSettings()

  React.useEffect(() => {
    if (!hasPlaceholder) return
    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) return
      if (message.source !== frameRef.current?.contentWindow) return
      if (isFrameReadyMessage(message.data)) setReady(true)
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [hasPlaceholder])

  React.useEffect(() => {
    const frame = frameRef.current
    if (!hasPlaceholder || !frame) return
    let timer: number | undefined
    const handleLoad = () => {
      timer = window.setTimeout(() => setReady(true), READY_FALLBACK_MS)
    }
    frame.addEventListener("load", handleLoad)
    return () => {
      frame.removeEventListener("load", handleLoad)
      window.clearTimeout(timer)
    }
  }, [hasPlaceholder])

  React.useEffect(() => {
    if (!fit) return
    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) return
      if (message.source !== frameRef.current?.contentWindow) return
      const data: unknown = message.data
      if (isFrameHeight(data)) setHeight(data.height)
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [fit])

  React.useEffect(() => {
    const element = ref.current
    if (!element || fit) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setScale(getFrameScale(width, { minWidth, scaleFrom }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fit, minWidth, scaleFrom])

  if (fit) {
    return (
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        loading="lazy"
        className="block w-full bg-background"
        style={{ height: height ?? FIT_FALLBACK_HEIGHT }}
      />
    )
  }

  return (
    <div ref={ref} className="relative size-full overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }}
      >
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          loading="lazy"
          className="block size-full bg-background"
        />
        {placeholder && (
          <div
            aria-hidden
            data-ready={isReady ? "" : undefined}
            className="absolute inset-0 transition-opacity duration-move ease-move data-ready:pointer-events-none data-ready:opacity-0"
          >
            {/* With the Blueprint loader, the page's outline is sketched and
                held, scanning, until the page is ready; then it fades into
                it as the placeholder always does. */}
            {loader === "blueprint" ? (
              <Blueprint
                loading={!isReady}
                trigger="mount"
                className="size-full *:data-[slot=blueprint-content]:size-full"
              >
                {placeholder}
              </Blueprint>
            ) : (
              placeholder
            )}
          </div>
        )}
      </div>
    </div>
  )
}
